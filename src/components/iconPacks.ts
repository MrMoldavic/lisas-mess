import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type IconPack = { pieces: IconName; outfits: IconName; create: IconName; shop: IconName };

/** Icons of the four home tiles, swapped by the icon packs of the shop. */
export const ICON_PACKS: Record<string, IconPack> = {
  default: { pieces: 'shirt', outfits: 'albums', create: 'sparkles', shop: 'storefront' },
  'icones-fleuries': { pieces: 'rose', outfits: 'flower', create: 'leaf', shop: 'gift' },
  'icones-espace': { pieces: 'planet', outfits: 'moon', create: 'rocket', shop: 'star' },
};

export function iconPack(id: string | null): IconPack {
  return ICON_PACKS[id ?? 'default'] ?? ICON_PACKS.default;
}
