import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Détourage automatique via Replicate.
 *
 * Le modèle et le nom du champ d'entrée sont isolés ici : ce sont les deux
 * seules choses à changer pour basculer sur un autre modèle. `bria/remove-background`
 * est un modèle « officiel » Replicate, donc appelable sur une URL sans hash de
 * version — contrairement aux modèles communautaires, dont le hash change à
 * chaque republication et casse le code en silence.
 */
const MODEL = 'bria/remove-background';
const INPUT_FIELD = 'image';

/** Largeur d'envoi. Réduire l'image divise le temps de réponse et le poids de la requête. */
const MAX_WIDTH = 1024;

/** `Prefer: wait` tient 60 s ; au-delà on repasse en scrutation. */
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 90_000;

const TOKEN = process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN;

/**
 * Interrupteur explicite, volontairement séparé du jeton.
 *
 * Avoir un jeton ne veut pas dire vouloir appeler l'API : sans crédit sur le
 * compte, chaque photo déclenchait un appel voué à l'échec et une alerte. Le
 * détourage reste donc éteint tant que cette variable ne vaut pas `true`.
 */
const ENABLED = process.env.EXPO_PUBLIC_CUTOUT_ENABLED === 'true';

export class CutoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CutoutError';
  }
}

/** L'UI n'appelle le détourage que s'il est activé ET qu'un jeton est présent. */
export function isCutoutConfigured(): boolean {
  return ENABLED && Boolean(TOKEN);
}

async function toDataUri(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: MAX_WIDTH });

  const rendered = await context.renderAsync();
  const { base64 } = await rendered.saveAsync({
    base64: true,
    compress: 0.85,
    format: SaveFormat.JPEG,
  });

  if (!base64) {
    throw new CutoutError("L'image n'a pas pu être encodée.");
  }

  return `data:image/jpeg;base64,${base64}`;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/** Extrait l'URL du résultat : selon le modèle, `output` est une chaîne ou un tableau. */
function readOutputUrl(output: unknown): string {
  const url = typeof output === 'string' ? output : Array.isArray(output) ? output[0] : null;

  if (typeof url !== 'string' || !url.startsWith('http')) {
    throw new CutoutError(`Réponse inattendue du modèle : ${JSON.stringify(output)}`);
  }

  return url;
}

async function waitForCompletion(getUrl: string): Promise<unknown> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const response = await fetch(getUrl, { headers: authHeaders() });
    const prediction = await response.json();

    if (prediction.status === 'succeeded') return prediction.output;
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      throw new CutoutError(prediction.error ?? 'Le détourage a échoué.');
    }
  }

  throw new CutoutError('Le détourage a dépassé le délai imparti.');
}

/**
 * Détoure la photo et renvoie l'URL du PNG transparent produit.
 * L'URL est temporaire côté Replicate : à télécharger tout de suite.
 */
export async function removeBackground(uri: string): Promise<string> {
  if (!TOKEN) {
    throw new CutoutError(
      'EXPO_PUBLIC_REPLICATE_API_TOKEN absent. Copie .env.example en .env et renseigne ton jeton.'
    );
  }

  const dataUri = await toDataUri(uri);

  const response = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
    method: 'POST',
    headers: { ...authHeaders(), Prefer: 'wait' },
    body: JSON.stringify({ input: { [INPUT_FIELD]: dataUri } }),
  });

  const prediction = await response.json();

  if (!response.ok) {
    throw new CutoutError(prediction?.detail ?? `Replicate a répondu ${response.status}.`);
  }

  if (prediction.status === 'succeeded') {
    return readOutputUrl(prediction.output);
  }

  if (prediction.status === 'failed' || prediction.status === 'canceled') {
    throw new CutoutError(prediction.error ?? 'Le détourage a échoué.');
  }

  // `Prefer: wait` a rendu la main avant la fin : on scrute jusqu'au résultat.
  return readOutputUrl(await waitForCompletion(prediction.urls.get));
}
