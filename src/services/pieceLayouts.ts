import { File, Paths } from 'expo-file-system';

/**
 * Cadrage d'affichage de chaque pièce : taille et position.
 *
 * Deux photos cadrées différemment — une paire de chaussures en gros plan, un
 * pantalon photographié de loin — se retrouvent à des tailles incomparables une
 * fois empilées. Ce réglage corrige le cadrage sans toucher au fichier image.
 *
 * C'est le second attribut d'une pièce, après la catégorie. Celle-ci tient dans
 * le nom du fichier ; des décimales n'y tiendraient pas proprement, d'où ce
 * fichier séparé, indexé par nom de fichier de la photo.
 */
const LAYOUTS_FILE = new File(Paths.document, 'piece-scales.json');

export const MIN_SCALE = 0.3;
export const MAX_SCALE = 3;

/**
 * Le décalage est une **fraction** de la zone d'affichage, jamais des pixels :
 * la même pièce est dessinée dans une vignette de 175 points, dans une bande du
 * composeur et en plein écran. Une valeur en pixels donnerait trois cadrages
 * différents.
 */
export const MAX_OFFSET = 1;

export type PieceLayout = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export const DEFAULT_LAYOUT: PieceLayout = { scale: 1, offsetX: 0, offsetY: 0 };

type LayoutMap = Record<string, PieceLayout>;

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function clampLayout(layout: Partial<PieceLayout>): PieceLayout {
  return {
    scale: clamp(layout.scale ?? 1, MIN_SCALE, MAX_SCALE, 1),
    offsetX: clamp(layout.offsetX ?? 0, -MAX_OFFSET, MAX_OFFSET, 0),
    offsetY: clamp(layout.offsetY ?? 0, -MAX_OFFSET, MAX_OFFSET, 0),
  };
}

function readAll(): LayoutMap {
  if (!LAYOUTS_FILE.exists) return {};

  try {
    const parsed: unknown = JSON.parse(LAYOUTS_FILE.textSync());
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const entries = Object.entries(parsed as Record<string, unknown>).map(([id, value]) => [
      id,
      // Les réglages d'avant le déplacement n'étaient qu'un nombre : l'échelle.
      typeof value === 'number'
        ? clampLayout({ scale: value })
        : clampLayout((value ?? {}) as Partial<PieceLayout>),
    ]);

    return Object.fromEntries(entries) as LayoutMap;
  } catch {
    // Un fichier illisible ne doit pas empêcher d'afficher la garde-robe : on
    // repart de cadrages neutres, les photos sont intactes.
    return {};
  }
}

function writeAll(layouts: LayoutMap): void {
  if (!LAYOUTS_FILE.exists) {
    LAYOUTS_FILE.create({ intermediates: true, overwrite: true });
  }
  LAYOUTS_FILE.write(JSON.stringify(layouts));
}

export function listLayouts(): LayoutMap {
  return readAll();
}

export function setPieceLayout(pieceId: string, layout: Partial<PieceLayout>): void {
  writeAll({ ...readAll(), [pieceId]: clampLayout(layout) });
}

export function forgetPieceLayout(pieceId: string): void {
  const layouts = readAll();
  delete layouts[pieceId];
  writeAll(layouts);
}
