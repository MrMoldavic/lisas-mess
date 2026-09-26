import { StyleSheet, View } from 'react-native';

import type { Outfit, Piece } from '@/services';
import { OUTFIT_SLOTS } from '@/types';

import { GarmentLayer } from './GarmentLayer';

/**
 * Toile de référence des vignettes, aux proportions de celle du composeur sur
 * un téléphone.
 *
 * La vignette est dessinée **à cette taille**, avec exactement la mise en page
 * du composeur (cadrage dans l'encart, inclinaison, liseré), puis réduite d'un
 * seul bloc pour tenir dans la carte. Calculer la mise en page directement à la
 * taille de la carte donnait d'autres proportions : la carte change de forme
 * selon l'écran, et les marges fixes (écart entre coupons, liseré) n'y pèsent
 * pas le même poids.
 *
 * Les coupons de tissu, eux, ne sont pas dessinés : en vignette, ils
 * alourdissent la grille. Les pièces restent cadrées dans leurs encarts.
 */
const REFERENCE = { width: 340, height: 520 };

type OutfitThumbnailProps = {
  outfit: Outfit;
  pieces: Map<string, Piece>;
  width: number;
  height: number;
};

/** Une tenue en réduction, telle qu'elle a été composée. */
export function OutfitThumbnail({ outfit, pieces, width, height }: OutfitThumbnailProps) {
  const scale = Math.min(width / REFERENCE.width, height / REFERENCE.height);

  return (
    <View pointerEvents="none" style={[styles.frame, { width, height }]}>
      <View style={[styles.canvas, REFERENCE, { transform: [{ scale }] }]}>
        {OUTFIT_SLOTS.map((slot, rank) => {
          const pieceId = outfit[slot.key];
          const piece = pieceId ? pieces.get(pieceId) : undefined;
          if (!piece) return null;

          return (
            <GarmentLayer
              key={slot.key}
              pieces={[piece]}
              index={0}
              slot={rank}
              canvas={REFERENCE}
              layout={outfit.layouts[slot.key] ?? piece.layout}
              interactive={false}
              lite
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // La toile de référence, plus grande que la carte, est centrée puis réduite
  // autour de son centre : elle retombe pile dans la carte.
  frame: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  canvas: { flexShrink: 0 },
});
