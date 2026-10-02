import type { CategoryId, SeasonId } from '@/types';
import { OUTFIT_SLOTS, SEASONS, familyForCategory } from '@/types';

import type { Outfit } from './outfits';
import type { Piece } from './pieces';

/**
 * L'atelier : le défi du jour et les bobinous à collectionner.
 *
 * Tout est **déduit des tenues déjà enregistrées**, rien n'est stocké à part :
 * un défi est réussi si une tenue créée ce jour-là y répond, et le bocal
 * compte les bobinous gagnés par les tenues et les défis réussis. Pas de
 * fichier de progression à tenir synchronisé, et rien à migrer le jour où les
 * règles changent.
 *
 * Les défis ne portent que sur ce que l'app sait vérifier : saison,
 * catégories des pièces, tenue complète, pièce encore jamais utilisée.
 */

/** Bobinous gagnés pour chaque tenue créée. */
export const BUTTONS_PER_OUTFIT = 10;
/** Bobinous gagnés en plus quand une tenue réussit le défi du jour. */
export const BUTTONS_PER_CHALLENGE = 30;
/** Bobinous gagnés pour chaque pièce sortie pour de bon (voir removeForGood). */
export const BUTTONS_PER_LEFT = 15;

type Context = {
  pieceById: Map<string, Piece>;
  /** Tenues créées avant celle qu'on examine. */
  earlier: Outfit[];
};

type Challenge = {
  id: string;
  label: string;
  /** Le défi peut-il être relevé avec la garde-robe actuelle ? */
  feasible: (pieces: Piece[]) => boolean;
  matches: (outfit: Outfit, context: Context) => boolean;
};

export type ChallengeInfo = { id: string; label: string; reward: number };

export type WorkshopStatus = {
  /** `null` si la garde-robe ne permet encore aucun défi. */
  challenge: ChallengeInfo | null;
  challengeDone: boolean;
  /** Défis réussis cette semaine (du lundi au jour même). */
  weekDone: number;
  /** Jours écoulés de la semaine, aujourd'hui compris. */
  weekElapsed: number;
  /** Les sept jours de la semaine, du lundi au dimanche. */
  week: DayState[];
  buttons: number;
};

/** État d'un jour dans la semaine des défis. */
export type DayState = 'done' | 'missed' | 'today' | 'future';

function piecesOf(outfit: Outfit, pieceById: Map<string, Piece>): Piece[] {
  return OUTFIT_SLOTS.flatMap((slot) => {
    const id = outfit[slot.key];
    const piece = id ? pieceById.get(id) : undefined;
    return piece ? [piece] : [];
  });
}

/** Article et nom de chaque catégorie qu'un défi peut demander. */
const ASKED_CATEGORIES: { id: CategoryId; phrase: string }[] = [
  { id: 'tshirt', phrase: 'un t-shirt' },
  { id: 'chemise', phrase: 'une chemise' },
  { id: 'pull', phrase: 'un pull' },
  { id: 'veste', phrase: 'une veste' },
  { id: 'manteau', phrase: 'un manteau' },
  { id: 'pantalon', phrase: 'un pantalon' },
  { id: 'jean', phrase: 'un jean' },
  { id: 'jupe', phrase: 'une jupe' },
  { id: 'short', phrase: 'un short' },
];

const CHALLENGES: Challenge[] = [
  ...SEASONS.map(
    (season): Challenge => ({
      id: `season-${season.id}`,
      label: `Une tenue à porter ${season.inPhrase}`,
      feasible: () => true,
      matches: (outfit) => outfit.season === (season.id as SeasonId),
    })
  ),
  ...ASKED_CATEGORIES.map(
    ({ id, phrase }): Challenge => ({
      id: `category-${id}`,
      label: `Une tenue avec ${phrase}`,
      feasible: (pieces) => pieces.some((piece) => piece.category === id),
      matches: (outfit, { pieceById }) =>
        piecesOf(outfit, pieceById).some((piece) => piece.category === id),
    })
  ),
  {
    id: 'complete',
    label: 'Une tenue complète : haut, bas et chaussures',
    feasible: (pieces) =>
      OUTFIT_SLOTS.every((slot) =>
        pieces.some((piece) => familyForCategory(piece.category) === slot.family)
      ),
    matches: (outfit) => OUTFIT_SLOTS.every((slot) => outfit[slot.key] !== null),
  },
  {
    id: 'fresh',
    label: 'Une tenue avec une pièce encore jamais utilisée',
    feasible: (pieces) => pieces.length > 0,
    matches: (outfit, { pieceById, earlier }) => {
      const used = new Set(earlier.flatMap((o) => OUTFIT_SLOTS.map((slot) => o[slot.key])));
      return piecesOf(outfit, pieceById).some((piece) => !used.has(piece.id));
    },
  },
];

/** Jour local au format AAAA-MM-JJ : le défi change à minuit, heure du téléphone. */
function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function hash(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i++) value = (value * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(value);
}

/** Défi d'un jour donné : tiré de la date, parmi ceux que la garde-robe permet. */
function challengeFor(day: string, feasible: Challenge[]): Challenge | null {
  return feasible.length === 0 ? null : feasible[hash(day) % feasible.length];
}

export function workshopStatus(
  pieces: Piece[],
  outfits: Outfit[],
  /** Pièces déjà sorties de l'app (voir leftCount). */
  left: number = 0,
  now: number = Date.now()
): WorkshopStatus {
  const pieceById = new Map(pieces.map((piece) => [piece.id, piece]));
  const feasible = CHALLENGES.filter((challenge) => challenge.feasible(pieces));
  const chronological = [...outfits].sort((a, b) => a.createdAt - b.createdAt);

  /** Jours dont le défi a été réussi. */
  const succeeded = new Set<string>();
  chronological.forEach((outfit, index) => {
    const day = dayKey(outfit.createdAt);
    if (succeeded.has(day)) return;

    const challenge = challengeFor(day, feasible);
    if (challenge?.matches(outfit, { pieceById, earlier: chronological.slice(0, index) })) {
      succeeded.add(day);
    }
  });

  const today = dayKey(now);
  const challenge = challengeFor(today, feasible);

  // Semaine du lundi au dimanche, autour d'aujourd'hui.
  const DAY = 24 * 60 * 60 * 1000;
  const weekday = (new Date(now).getDay() + 6) % 7;
  const week = Array.from({ length: 7 }, (_, i): DayState => {
    if (succeeded.has(dayKey(now + (i - weekday) * DAY))) return 'done';
    if (i < weekday) return 'missed';
    return i === weekday ? 'today' : 'future';
  });
  const weekDone = week.filter((day) => day === 'done').length;

  return {
    challenge: challenge ? { id: challenge.id, label: challenge.label, reward: BUTTONS_PER_CHALLENGE } : null,
    challengeDone: succeeded.has(today),
    weekDone,
    weekElapsed: weekday + 1,
    week,
    buttons:
      outfits.length * BUTTONS_PER_OUTFIT +
      succeeded.size * BUTTONS_PER_CHALLENGE +
      left * BUTTONS_PER_LEFT,
  };
}

/** Ce qu'il faut d'une tenue en cours de composition pour la juger. */
export type OutfitDraftCheck = Pick<Outfit, 'top' | 'bottom' | 'shoes' | 'season'>;

/**
 * Juge une tenue **pas encore enregistrée** contre le défi du jour, pour
 * l'indiquer en direct dans le composeur. `null` s'il n'y a pas de défi.
 *
 * Même règle qu'à l'enregistrement : la tenue est jugée comme si elle était
 * créée maintenant, après toutes les tenues existantes.
 */
export function challengeCheck(
  pieces: Piece[],
  outfits: Outfit[],
  now: number = Date.now()
): ((draft: OutfitDraftCheck) => boolean) | null {
  const feasible = CHALLENGES.filter((challenge) => challenge.feasible(pieces));
  const challenge = challengeFor(dayKey(now), feasible);
  if (!challenge) return null;

  const context = { pieceById: new Map(pieces.map((piece) => [piece.id, piece])), earlier: outfits };

  return (draft) =>
    challenge.matches(
      { ...draft, id: 'brouillon', favorite: false, layouts: {}, createdAt: now },
      context
    );
}
