import * as Location from 'expo-location';

// Open-Meteo is free and keyless, but its free tier is non-commercial only: revisit before publishing.
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const CACHE_TTL = 30 * 60 * 1000;
const TIMEOUT = 10_000;
/** From this hour on, Bobine announces tomorrow's weather, to prepare the outfit the night before. */
const EVENING_HOUR = 18;

export type Sky = 'sun' | 'clouds' | 'overcast' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

export type Weather = {
  day: 'today' | 'tomorrow';
  /** City name, when the phone can tell. */
  place: string | null;
  min: number;
  max: number;
  /** Most severe sky of the day. */
  sky: Sky;
  /** Highest chance of rain of the day, in %. */
  rainChance: number;
};

type ForecastResponse = {
  daily: {
    weather_code: number[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    precipitation_probability_max: (number | null)[];
  };
};

const SKY_PHRASES: Record<Sky, string> = {
  sun: 'grand soleil',
  clouds: 'quelques nuages',
  overcast: 'ciel couvert',
  fog: 'du brouillard',
  drizzle: 'de la bruine',
  rain: 'de la pluie',
  snow: 'de la neige',
  storm: "de l'orage",
};

let cache: { weather: Weather; at: number } | null = null;

/** Maps a WMO weather code, as sent by Open-Meteo, to a sky. */
function skyFor(code: number): Sky {
  if (code === 0) return 'sun';
  if (code <= 2) return 'clouds';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'clouds';
}

function dayFor(now: number): Weather['day'] {
  return new Date(now).getHours() >= EVENING_HOUR ? 'tomorrow' : 'today';
}

function withTimeout<T>(promise: Promise<T>): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT))]);
}

/** Asks for the location only once: after a refusal, it's up to the user to allow it in the settings. */
async function locate(): Promise<Location.LocationObjectCoords | null> {
  const current = await Location.getForegroundPermissionsAsync();
  const permission =
    current.status === Location.PermissionStatus.UNDETERMINED
      ? await Location.requestForegroundPermissionsAsync()
      : current;
  if (!permission.granted) return null;

  const position =
    (await Location.getLastKnownPositionAsync({ maxAge: 60 * 60 * 1000 })) ??
    (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })));
  return position?.coords ?? null;
}

async function placeName(coords: Location.LocationObjectCoords): Promise<string | null> {
  try {
    const [address] = await Location.reverseGeocodeAsync(coords);
    return address?.city ?? address?.subregion ?? null;
  } catch {
    return null;
  }
}

async function fetchForecast(coords: Location.LocationObjectCoords): Promise<ForecastResponse> {
  // Rounded to ~10 km: enough for a forecast, and Open-Meteo never learns the exact address.
  const params = new URLSearchParams({
    latitude: coords.latitude.toFixed(1),
    longitude: coords.longitude.toFixed(1),
    daily: 'weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '2',
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(`${FORECAST_URL}?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
    return (await response.json()) as ForecastResponse;
  } finally {
    clearTimeout(timer);
  }
}

/** Weather of the day to dress for, or `null` when it can't be known (no permission, offline). Never throws. */
export async function getWeather(now: number = Date.now()): Promise<Weather | null> {
  const day = dayFor(now);
  const cached = cache?.weather.day === day ? cache : null;
  if (cached && now - cached.at < CACHE_TTL) return cached.weather;

  try {
    const coords = await locate();
    if (!coords) return null;

    const [forecast, place] = await Promise.all([fetchForecast(coords), placeName(coords)]);
    const index = day === 'tomorrow' ? 1 : 0;
    const { daily } = forecast;
    const weather: Weather = {
      day,
      place,
      min: Math.round(daily.temperature_2m_min[index]),
      max: Math.round(daily.temperature_2m_max[index]),
      sky: skyFor(daily.weather_code[index]),
      rainChance: daily.precipitation_probability_max[index] ?? 0,
    };
    cache = { weather, at: now };
    return weather;
  } catch {
    return cached?.weather ?? null;
  }
}

/** Clothing levels, warmest first: `piece` goes into a sentence, `alone` is the whole advice. */
const LEVELS = [
  { from: 26, piece: 'short ou robe', alone: 'Short ou robe, ce sera parfait !' },
  { from: 20, piece: 'un t-shirt', alone: 'Un t-shirt suffira.' },
  { from: 15, piece: 'une veste légère', alone: 'Prévois une veste légère.' },
  { from: 9, piece: 'un pull ou une veste', alone: 'Sors un pull ou une veste.' },
  { from: -Infinity, piece: 'un manteau', alone: "C'est un temps à manteau !" },
];

/** Below this gap between morning and afternoon, the afternoon level alone is advised. */
const MORNING_GAP = 5;

function levelFor(temperature: number): (typeof LEVELS)[number] {
  return LEVELS.find((level) => temperature >= level.from) ?? LEVELS[LEVELS.length - 1];
}

/** What to wear in the afternoon (max), plus a warmer layer when the morning (min) calls for one. */
function clothingFor(min: number, max: number, sky: Sky): string {
  if (sky === 'snow') return 'Manteau et chaussures bien chaudes !';

  const afternoon = levelFor(max);
  const morning = levelFor(min);
  if (afternoon === morning || max - min < MORNING_GAP) return afternoon.alone;

  const piece = afternoon.piece.charAt(0).toUpperCase() + afternoon.piece.slice(1);
  return `${piece} en journée, ${morning.piece} le matin.`;
}

/** Bobine's weather announcement, e.g. « À Lyon : de la pluie, 8° à 17°. Prévois une veste légère. ». */
export function weatherAnnouncement({ day, place, min, max, sky, rainChance }: Weather): string {
  const where =
    day === 'tomorrow' ? (place ? `Demain à ${place}` : 'Demain') : place ? `À ${place}` : "Aujourd'hui";
  const wet = sky !== 'snow' && (sky === 'drizzle' || sky === 'rain' || sky === 'storm' || rainChance >= 50);
  const extra = wet ? " N'oublie pas le parapluie." : '';

  return `${where} : ${SKY_PHRASES[sky]}, ${min}° à ${max}°. ${clothingFor(min, max, sky)}${extra}`;
}
