import { File, Paths } from 'expo-file-system';

/**
 * Échelle d'affichage de chaque pièce.
 *
 * Deux photos cadrées différemment — une paire de chaussures en gros plan, un
 * pantalon photographié de loin — se retrouvent à des tailles incomparables une
 * fois empilées. Ce facteur corrige le cadrage sans toucher au fichier image.
 *
 * C'est le second attribut d'une pièce, après la catégorie. Celle-ci tient dans
 * le nom du fichier ; une échelle décimale n'y tiendrait pas proprement, d'où ce
 * fichier séparé, indexé par nom de fichier de la photo.
 */
const SCALES_FILE = new File(Paths.document, 'piece-scales.json');

export const MIN_SCALE = 0.3;
export const MAX_SCALE = 3;
export const DEFAULT_SCALE = 1;

type ScaleMap = Record<string, number>;

function readAll(): ScaleMap {
  if (!SCALES_FILE.exists) return {};

  try {
    const parsed: unknown = JSON.parse(SCALES_FILE.textSync());
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as ScaleMap)
      : {};
  } catch {
    // Un fichier illisible ne doit pas empêcher d'afficher la garde-robe : on
    // repart d'échelles neutres, les photos sont intactes.
    return {};
  }
}

function writeAll(scales: ScaleMap): void {
  if (!SCALES_FILE.exists) {
    SCALES_FILE.create({ intermediates: true, overwrite: true });
  }
  SCALES_FILE.write(JSON.stringify(scales));
}

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return DEFAULT_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function listScales(): ScaleMap {
  return readAll();
}

export function setPieceScale(pieceId: string, scale: number): void {
  writeAll({ ...readAll(), [pieceId]: clampScale(scale) });
}

export function forgetPieceScale(pieceId: string): void {
  const scales = readAll();
  delete scales[pieceId];
  writeAll(scales);
}
