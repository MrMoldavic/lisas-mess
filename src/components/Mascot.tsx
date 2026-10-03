import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';

import { useShop } from '@/hooks/useShop';

import { AccessoryLayer } from './Accessories';
import { Chaussette, Cubik, Grignote, JeanMiette, Myopie, Pif, Pique, Roucoule, Timbre } from './Avatars';
import { Bobine } from './Bobine';
import { SilhouetteContext } from './CompanionPaint';

type DrawingProps = { size?: number; shadow?: boolean };

const AVATARS: Record<string, ComponentType<DrawingProps>> = {
  bobine: Bobine,
  chaussette: Chaussette,
  timbre: Timbre,
  pique: Pique,
  roucoule: Roucoule,
  grignote: Grignote,
  myopie: Myopie,
  'jean-miette': JeanMiette,
  cubik: Cubik,
  pif: Pif,
};

/** Directions of the white copies that draw the sticker outline, as in PieceSticker. */
const OUTLINE: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71],
];

type MascotProps = {
  size?: number;
  /** A given companion, for shop previews; the equipped one otherwise. */
  avatar?: string;
  /** Width of a white sticker outline, in points; none by default. */
  outline?: number;
  shadow?: boolean;
  /** Accessory to wear: the equipped one by default, `null` for none (shop previews). */
  accessory?: string | null;
};

/** The companion who talks in the app: the one equipped in the shop, or `avatar` for a shop preview. */
export function Mascot({ size = 60, avatar, outline = 0, shadow = true, accessory }: MascotProps) {
  const shop = useShop();
  const companion = avatar ?? shop.avatar;
  const Drawing = AVATARS[companion] ?? Bobine;
  const worn = accessory === undefined ? shop.accessory : accessory;
  const overlay = worn ? <AccessoryLayer accessory={worn} avatar={companion} size={size} /> : null;

  if (outline <= 0) {
    if (!overlay) return <Drawing size={size} shadow={shadow} />;
    return (
      <View style={{ width: size, height: (size * 70) / 60 }}>
        <Drawing size={size} shadow={shadow} />
        {overlay}
      </View>
    );
  }

  return (
    <View style={{ width: size, height: (size * 70) / 60 }}>
      <SilhouetteContext.Provider value="#FFFFFF">
        {OUTLINE.map(([dx, dy]) => (
          <View
            key={`${dx},${dy}`}
            style={[StyleSheet.absoluteFill, { transform: [{ translateX: dx * outline }, { translateY: dy * outline }] }]}
          >
            <Drawing size={size} shadow={false} />
          </View>
        ))}
      </SilhouetteContext.Provider>
      <View style={StyleSheet.absoluteFill}>
        <Drawing size={size} shadow={shadow} />
      </View>
      {overlay}
    </View>
  );
}
