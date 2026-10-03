import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'react-native';

/** Longest side kept for a piece photo: sharp on any phone screen, even zoomed in the composer. */
export const MAX_PHOTO_SIDE = 1600;
/** Longest side of the small copies used by grids and outfit thumbnails. */
export const THUMB_SIDE = 512;

function sizeOf(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

/** URI of a copy no larger than `side` (default `MAX_PHOTO_SIDE`), or `null` if the photo already fits; never throws. */
export async function shrinkPhoto(uri: string, side: number = MAX_PHOTO_SIDE): Promise<string | null> {
  try {
    const { width, height } = await sizeOf(uri);
    if (Math.max(width, height) <= side) return null;

    const context = ImageManipulator.manipulate(uri);
    context.resize(width >= height ? { width: side } : { height: side });
    // Cut-out pieces are PNG and must keep their transparency.
    const png = /\.png$/i.test(uri.split('?')[0]);
    const saved = await (await context.renderAsync()).saveAsync(
      png ? { format: SaveFormat.PNG } : { format: SaveFormat.JPEG, compress: 0.85 }
    );
    return saved.uri;
  } catch {
    return null;
  }
}
