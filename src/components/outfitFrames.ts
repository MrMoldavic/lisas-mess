import type { ViewStyle } from 'react-native';

import type { Colors } from '@/theme';

type Insets = { top: number; right: number; bottom: number; left: number };

/** How a frame bought in the shop dresses an outfit card: its look, and the room it keeps around the thumbnail. */
export type OutfitFrame = { style: ViewStyle; inset: Insets };

const GOLD = '#C9A13B';
const GOLD_BORDER = 4;

/** `index` alternates the tilt of polaroids along the grid; `null` when no frame is equipped. */
export function outfitFrame(frame: string | null, colors: Colors, index = 0): OutfitFrame | null {
  if (frame === 'cadre-polaroid') {
    const inset = { top: 8, right: 8, bottom: 26, left: 8 };
    return {
      inset,
      style: {
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        paddingTop: inset.top,
        paddingRight: inset.right,
        paddingBottom: inset.bottom,
        paddingLeft: inset.left,
        transform: [{ rotate: index % 2 === 0 ? '-1.5deg' : '1.5deg' }],
      },
    };
  }
  if (frame === 'cadre-dore') {
    const inset = { top: 7, right: 7, bottom: 7, left: 7 };
    return {
      inset,
      style: {
        backgroundColor: colors.surface,
        borderWidth: GOLD_BORDER,
        borderColor: GOLD,
        borderRadius: 6,
        padding: inset.top - GOLD_BORDER,
      },
    };
  }
  return null;
}
