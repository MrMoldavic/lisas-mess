import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { ColorName } from '@/theme';
import { OUTFIT_SLOTS, slotBand } from '@/types';
import type { OutfitSlot } from '@/types';

import type { Canvas } from './GarmentLayer';

const SOFT_COLORS: Record<OutfitSlot, ColorName> = {
  top: 'topSoft',
  bottom: 'bottomSoft',
  shoes: 'shoesSoft',
};

const GAP = 6;

export type Rect = { x: number; y: number; width: number; height: number };

/**
 * Encart d'un poste sur la toile : sa zone (`slotBand`), moins un petit écart
 * entre deux encarts. Partagé avec `GarmentLayer`, qui y enferme le vêtement :
 * le fond pastel et la zone autorisée coïncident ainsi au pixel près.
 */
export function bandRect(rank: number, canvas: Canvas): Rect {
  const band = slotBand(rank);
  const first = rank === 0;
  const last = rank === OUTFIT_SLOTS.length - 1;
  const y = band.start * canvas.height + (first ? 0 : GAP / 2);
  const height = band.share * canvas.height - (first ? 0 : GAP / 2) - (last ? 0 : GAP / 2);

  return { x: 0, y, width: canvas.width, height: Math.max(0, height) };
}

/** Fonds pastel des postes, à poser sous les `GarmentLayer` de la même toile. */
export function SlotBands({ canvas }: { canvas: Canvas }) {
  const { colors, radius } = useTheme();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {OUTFIT_SLOTS.map((slot, rank) => {
        const rect = bandRect(rank, canvas);

        return (
          <View
            key={slot.key}
            style={[
              styles.band,
              {
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                backgroundColor: colors[SOFT_COLORS[slot.key]],
                borderRadius: radius.md,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute' },
});
