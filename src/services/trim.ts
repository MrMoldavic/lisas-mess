import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import UPNG from 'upng-js';

/**
 * Rognage des marges transparentes d'un PNG.
 *
 * L'affichage cadre chaque image entière dans sa zone : une marge transparente
 * autour du vêtement le fait paraître plus petit et le décale. Rogner à l'import
 * fait coïncider le cadre de l'image avec le vêtement lui-même.
 *
 * Décoder un PNG de plusieurs mégapixels en JavaScript serait lent sur un
 * téléphone. On repère donc le contour sur une **miniature**, puis on rogne
 * l'original en natif avec les coordonnées remises à l'échelle.
 */

/** Largeur de la miniature d'analyse : assez fine pour un contour à ~0,5 % près. */
const PROBE_WIDTH = 256;

/**
 * Opacité (0-255) sous laquelle un pixel compte comme transparent. Assez haute
 * pour ignorer les ombres douces et les halos que laissent les outils de
 * détourage, qui sinon gonflent le contour bien au-delà du vêtement.
 */
const ALPHA_THRESHOLD = 48;

/**
 * Part minimale de pixels visibles pour qu'une ligne ou une colonne compte comme
 * du vêtement. Quelques pixels parasites isolés dans une marge ne suffisent
 * plus à la conserver.
 */
const MIN_COVERAGE = 0.01;

/** Marge gardée autour du vêtement, en pixels de miniature, contre l'imprécision de l'échelle. */
const PADDING = 1;

type Box = { x: number; y: number; width: number; height: number };

function isPng(uri: string): boolean {
  return /\.png$/i.test(uri.split('?')[0]);
}

/** Premier et dernier indice dont le compte atteint le seuil, `null` s'il n'y en a aucun. */
function span(counts: Uint32Array, threshold: number): [number, number] | null {
  let first = -1;
  let last = -1;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] >= threshold) {
      if (first < 0) first = i;
      last = i;
    }
  }
  return first < 0 ? null : [first, last];
}

/** Contour du vêtement, `null` si l'image est vide ou n'a aucune marge. */
function visibleBox(rgba: Uint8Array, width: number, height: number): Box | null {
  const rows = new Uint32Array(height);
  const columns = new Uint32Array(width);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
        rows[y]++;
        columns[x]++;
      }
    }
  }

  const vertical = span(rows, Math.max(2, width * MIN_COVERAGE));
  const horizontal = span(columns, Math.max(2, height * MIN_COVERAGE));
  if (!vertical || !horizontal) return null;

  let [minY, maxY] = vertical;
  let [minX, maxX] = horizontal;

  minX = Math.max(0, minX - PADDING);
  minY = Math.max(0, minY - PADDING);
  maxX = Math.min(width - 1, maxX + PADDING);
  maxY = Math.min(height - 1, maxY + PADDING);

  if (minX === 0 && minY === 0 && maxX === width - 1 && maxY === height - 1) return null;

  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Renvoie l'URI d'une copie rognée dans le cache, ou `null` s'il n'y a rien à
 * rogner (JPEG, PNG sans marge, image entièrement transparente).
 *
 * Ne lève jamais : le rognage est un confort, un échec garde l'image telle quelle.
 */
export async function trimTransparentMargins(uri: string): Promise<string | null> {
  if (!isPng(uri)) return null;

  try {
    const original = await ImageManipulator.manipulate(uri).renderAsync();

    const probeContext = ImageManipulator.manipulate(uri);
    probeContext.resize({ width: Math.min(PROBE_WIDTH, original.width) });
    const probe = await (await probeContext.renderAsync()).saveAsync({ format: SaveFormat.PNG });

    const decoded = UPNG.decode(await new File(probe.uri).arrayBuffer());
    const rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
    const box = visibleBox(rgba, decoded.width, decoded.height);
    if (!box) return null;

    // Remise à l'échelle de l'original, arrondie vers l'extérieur.
    const ratioX = original.width / decoded.width;
    const ratioY = original.height / decoded.height;
    const originX = Math.floor(box.x * ratioX);
    const originY = Math.floor(box.y * ratioY);
    const crop = {
      originX,
      originY,
      width: Math.min(original.width - originX, Math.ceil(box.width * ratioX)),
      height: Math.min(original.height - originY, Math.ceil(box.height * ratioY)),
    };

    const cropContext = ImageManipulator.manipulate(uri);
    cropContext.crop(crop);
    const trimmed = await (await cropContext.renderAsync()).saveAsync({ format: SaveFormat.PNG });

    return trimmed.uri;
  } catch {
    return null;
  }
}
