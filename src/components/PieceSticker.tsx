import { Image, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

/** Directions des copies blanches qui dessinent le liseré. */
const OUTLINE: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71],
];

type PieceStickerProps = {
  uri: string;
  /** Épaisseur du liseré blanc, en points. */
  outline?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Une pièce seule, en grand, avec le même traitement « sticker » que dans les
 * tenues : liseré blanc et ombre portée, faits de copies teintées de l'image.
 * Pour la vue d'une pièce et le tri, où il n'y a ni coupon ni toile.
 */
export function PieceSticker({ uri, outline = 3, style }: PieceStickerProps) {
  return (
    <View style={[styles.frame, style]}>
      <Image
        source={{ uri }}
        resizeMode="contain"
        style={[styles.copy, styles.shadow, { transform: [{ translateY: outline * 2 }] }]}
      />
      {OUTLINE.map(([dx, dy]) => (
        <Image
          key={`${dx},${dy}`}
          source={{ uri }}
          resizeMode="contain"
          style={[
            styles.copy,
            styles.outline,
            { transform: [{ translateX: dx * outline }, { translateY: dy * outline }] },
          ]}
        />
      ))}
      <Image source={{ uri }} resizeMode="contain" style={styles.photo} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { position: 'relative' },
  photo: { width: '100%', height: '100%' },
  copy: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  outline: { tintColor: '#FFFFFF' },
  shadow: { tintColor: '#000000', opacity: 0.22 },
});
