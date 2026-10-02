import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/theme';
import { OUTFIT_SLOTS, slotBand, softColorNameForFamily } from '@/types';

import type { Canvas } from './GarmentLayer';

const GAP = 9;

/** Rayon d'un coupon : presque droit, comme un morceau de tissu coupé. */
export const BAND_RADIUS = 6;

/** Pas des dents du bord cranté (ciseaux à cranter), en points. */
const TOOTH = 6;

/**
 * Les coupons restent clairs dans les deux thèmes : leur encre (couture,
 * étiquette) est donc fixe, et non tirée du thème.
 */
export const FABRIC_INK = '#4A3A33';
const SEAM = 'rgba(74, 58, 51, 0.28)';

export type Rect = { x: number; y: number; width: number; height: number };

/**
 * Encart d'un poste sur la toile : sa zone (`slotBand`), moins un petit écart
 * entre deux encarts. Partagé avec `GarmentLayer`, qui y enferme le vêtement :
 * le coupon et la zone autorisée coïncident ainsi au pixel près.
 */
export function bandRect(rank: number, canvas: Canvas): Rect {
  const band = slotBand(rank);
  const first = rank === 0;
  const last = rank === OUTFIT_SLOTS.length - 1;
  const y = band.start * canvas.height + (first ? 0 : GAP / 2);
  const height = band.share * canvas.height - (first ? 0 : GAP / 2) - (last ? 0 : GAP / 2);

  return { x: 0, y, width: canvas.width, height: Math.max(0, height) };
}

/**
 * Coupons de tissu des postes, à poser sous les `GarmentLayer` de la même toile :
 * couture pointillée, étiquette cousue, et bord inférieur cranté
 * (sauf le dernier, posé sur le fond).
 */
export function SlotBands({ canvas }: { canvas: Canvas }) {
  const { colors } = useTheme();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {OUTFIT_SLOTS.map((slot, rank) => {
        const rect = bandRect(rank, canvas);
        const fabric = colors[softColorNameForFamily(slot.family)];
        const pinked = rank < OUTFIT_SLOTS.length - 1;

        return (
          <View
            key={slot.key}
            style={[
              styles.band,
              { left: rect.x, top: rect.y, width: rect.width, height: rect.height },
            ]}
          >
            <Fabric color={fabric} width={rect.width} pinked={pinked} />

            {/* Étiquette en haut à droite : sur le coupon des chaussures, les flèches
                sont descendues en bas pour lui laisser la place. */}
            <View style={styles.label}>
              <View style={[styles.labelHole, { backgroundColor: fabric }]} />
              <Text style={styles.labelText}>{slot.label.toUpperCase()}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

type FabricProps = {
  color: string;
  /** Width of the coupon, to count the teeth of the pinked edge. */
  width: number;
  pinked?: boolean;
};

/** Cloth of a coupon (plain fabric, dashed seam, optional pinked bottom edge), to lay inside a positioned parent. */
export function Fabric({ color, width, pinked = false }: FabricProps) {
  return (
    <>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius: BAND_RADIUS }]} />

      {pinked && (
        <View style={styles.pinking}>
          {Array.from({ length: Math.ceil(width / TOOTH) }, (_, i) => (
            <View
              key={i}
              style={[styles.tooth, { left: i * TOOTH + TOOTH / 2 - TOOTH_SIDE / 2, backgroundColor: color }]}
            />
          ))}
        </View>
      )}

      <View style={styles.seam} />
    </>
  );
}

/** Côté du carré tourné à 45° dont la diagonale fait une dent. */
const TOOTH_SIDE = TOOTH / Math.SQRT2;

const styles = StyleSheet.create({
  band: { position: 'absolute' },
  pinking: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 0 },
  tooth: {
    position: 'absolute',
    top: -TOOTH_SIDE / 2,
    width: TOOTH_SIDE,
    height: TOOTH_SIDE,
    transform: [{ rotate: '45deg' }],
  },
  seam: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: SEAM,
    borderRadius: 4,
  },
  label: {
    position: 'absolute',
    top: 9,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 2,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
  },
  labelHole: { width: 4, height: 4, borderRadius: 2 },
  labelText: { fontFamily: fonts.heading, fontSize: 10, letterSpacing: 0.8, color: FABRIC_INK },
});
