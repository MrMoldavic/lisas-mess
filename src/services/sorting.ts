import { File, Paths } from 'expo-file-system';

/**
 * Le tri de la garde-robe : ce qu'on a décidé pour chaque pièce, et combien de
 * pièces ont déjà quitté la garde-robe.
 *
 * Un verdict par pièce, indexé par nom de fichier comme les cadrages (voir
 * pieceLayouts) : reclasser une pièce renomme son fichier, donc l'entrée doit
 * suivre (`moveVerdict`), et supprimer une pièce doit l'oublier.
 *
 * - `keep` : je garde. La pièce ne revient pas au tri avant un moment.
 * - `unsure` : je ne sais pas. Elle reviendra au prochain tri.
 * - `donate` : je trie. Elle est dans la caisse « À donner » : plus proposée
 *   dans le composeur, jusqu'à ce qu'on la donne ou qu'on la ressorte.
 */
const SORTING_FILE = new File(Paths.document, 'sorting.json');

export type Verdict = 'keep' | 'unsure' | 'donate';

type VerdictEntry = { verdict: Verdict; at: number };

type SortingData = {
  verdicts: Record<string, VerdictEntry>;
  /** Pièces réellement données : elles n'existent plus, seul le compte reste. */
  given: number;
};

const EMPTY: SortingData = { verdicts: {}, given: 0 };

function isVerdict(value: unknown): value is Verdict {
  return value === 'keep' || value === 'unsure' || value === 'donate';
}

function readAll(): SortingData {
  if (!SORTING_FILE.exists) return { verdicts: {}, given: 0 };

  try {
    const parsed = JSON.parse(SORTING_FILE.textSync()) as Partial<SortingData>;
    const verdicts: Record<string, VerdictEntry> = {};

    for (const [id, entry] of Object.entries(parsed.verdicts ?? {})) {
      if (entry && isVerdict(entry.verdict)) {
        verdicts[id] = { verdict: entry.verdict, at: Number(entry.at) || 0 };
      }
    }

    return { verdicts, given: Math.max(0, Number(parsed.given) || 0) };
  } catch {
    // Fichier illisible : on repart d'un tri vierge, les photos sont intactes.
    return { ...EMPTY, verdicts: {} };
  }
}

function writeAll(data: SortingData): void {
  if (!SORTING_FILE.exists) {
    SORTING_FILE.create({ intermediates: true, overwrite: true });
  }
  SORTING_FILE.write(JSON.stringify(data));
}

/** Verdict de chaque pièce triée, par identifiant. */
export function listVerdicts(): Record<string, Verdict> {
  return Object.fromEntries(
    Object.entries(readAll().verdicts).map(([id, entry]) => [id, entry.verdict])
  );
}

/** Date du dernier verdict de chaque pièce, pour ordonner le tri. */
export function listVerdictDates(): Record<string, number> {
  return Object.fromEntries(
    Object.entries(readAll().verdicts).map(([id, entry]) => [id, entry.at])
  );
}

export function setVerdict(pieceId: string, verdict: Verdict, now: number = Date.now()): void {
  const data = readAll();
  writeAll({ ...data, verdicts: { ...data.verdicts, [pieceId]: { verdict, at: now } } });
}

/** Oublie le verdict d'une pièce (ressortie de la caisse, ou supprimée). */
export function clearVerdict(pieceId: string): void {
  const data = readAll();
  if (!data.verdicts[pieceId]) return;
  delete data.verdicts[pieceId];
  writeAll(data);
}

/** Reporte le verdict d'une pièce renommée (reclassement). */
export function moveVerdict(oldId: string, newId: string): void {
  const data = readAll();
  const entry = data.verdicts[oldId];
  if (!entry) return;
  delete data.verdicts[oldId];
  data.verdicts[newId] = entry;
  writeAll(data);
}

export function givenCount(): number {
  return readAll().given;
}

/** Compte une pièce donnée de plus. La suppression de la pièce se fait à part. */
export function countGiven(): void {
  const data = readAll();
  writeAll({ ...data, given: data.given + 1 });
}

/** Une pièce gardée ne repasse pas au tri avant ce délai. */
const KEEP_REST = 30 * 24 * 60 * 60 * 1000;

type SortablePiece = { id: string; verdict: Verdict | null };
type OutfitRefs = { top: string | null; bottom: string | null; shoes: string | null };

/** Nombre de tenues qui utilisent chaque pièce. */
export function usageCounts(outfits: OutfitRefs[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const outfit of outfits) {
    for (const id of [outfit.top, outfit.bottom, outfit.shoes]) {
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Les pièces à passer au tri, dans l'ordre où les proposer :
 *
 * 1. jamais triées et dans aucune tenue : les meilleures candidates au départ ;
 * 2. « je ne sais pas », la plus ancienne hésitation d'abord ;
 * 3. jamais triées mais portées dans des tenues ;
 * 4. gardées il y a plus de 30 jours, pour refaire le point.
 *
 * Les pièces de la caisse et celles gardées récemment n'y sont pas.
 */
export function sortQueue<T extends SortablePiece>(
  pieces: T[],
  outfits: OutfitRefs[],
  now: number = Date.now()
): T[] {
  const usage = usageCounts(outfits);
  const dates = listVerdictDates();

  const group = (piece: T): number | null => {
    if (piece.verdict === 'donate') return null;
    if (piece.verdict === 'keep') return now - (dates[piece.id] ?? 0) > KEEP_REST ? 3 : null;
    if (piece.verdict === 'unsure') return 1;
    return usage.has(piece.id) ? 2 : 0;
  };

  return pieces
    .map((piece) => ({ piece, group: group(piece) }))
    .filter((entry): entry is { piece: T; group: number } => entry.group !== null)
    .sort((a, b) => {
      if (a.group !== b.group) return a.group - b.group;
      // Hésitations et pièces gardées : la plus ancienne décision d'abord.
      if (a.group === 1 || a.group === 3) return (dates[a.piece.id] ?? 0) - (dates[b.piece.id] ?? 0);
      // Sinon la plus ancienne pièce d'abord (les noms de fichier sont horodatés).
      return a.piece.id.localeCompare(b.piece.id);
    })
    .map((entry) => entry.piece);
}
