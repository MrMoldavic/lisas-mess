import { StyleSheet, View } from 'react-native';

/** Trous d'un bouton de couture, en fraction de son diamètre. */
const HOLES = [
  [0.36, 0.36],
  [0.64, 0.36],
  [0.36, 0.64],
  [0.64, 0.64],
];

type SewingButtonProps = {
  size: number;
  color: string;
  holeColor: string;
};

/**
 * Un bouton de couture à quatre trous : le dessin des bobinous, la monnaie de
 * l'atelier, et celui du bouton de tirage au sort du composeur.
 */
export function SewingButton({ size, color, holeColor }: SewingButtonProps) {
  const hole = Math.max(2, size * 0.18);

  return (
    <View
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      {HOLES.map(([x, y]) => (
        <View
          key={`${x},${y}`}
          style={[
            styles.hole,
            {
              width: hole,
              height: hole,
              borderRadius: hole / 2,
              backgroundColor: holeColor,
              left: x * size - hole / 2,
              top: y * size - hole / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    // Petit liseré foncé en bas : le relief d'un vrai bouton.
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.18)',
  },
  hole: { position: 'absolute' },
});
