import { StyleSheet, View } from 'react-native';
import type { DimensionValue } from 'react-native';

import { SpinningButton } from './SpinningButton';
import type { SpinningButtonProps } from './SpinningButton';

export type Scattered = Omit<SpinningButtonProps, 'style'> & {
  top: DimensionValue;
  left: DimensionValue;
};

/**
 * Des boutons de couture éparpillés qui tournent, en fond d'écran. Posé en
 * premier dans l'écran, il passe **derrière** le contenu et ne capte aucun
 * toucher. Les positions sont fixes, choisies par écran pour laisser le texte
 * lisible.
 */
export function ScatteredButtons({ items }: { items: Scattered[] }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {items.map(({ top, left, ...spinner }, index) => (
        <SpinningButton key={index} {...spinner} style={[styles.item, { top, left }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { position: 'absolute' },
});
