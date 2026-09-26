import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/theme';

export type PillEntry<T extends string> = {
  key: T;
  label: string;
  /** Couleur déjà résolue pour le thème courant. */
  color: string;
};

type FilterPillsProps<T extends string> = {
  entries: PillEntry<T>[];
  selected: T;
  onSelect: (key: T) => void;
};

/**
 * Rangée de pilules défilante, base commune des filtres de l'app.
 *
 * Un seul endroit porte le piège de mise en page : la `ScrollView` horizontale
 * de React Native a `flexGrow: 1` par défaut (`styles.baseHorizontal`), donc
 * dans une colonne elle se partage la hauteur restante avec ses voisins au lieu
 * de se limiter à la hauteur des pilules.
 */
export function FilterPills<T extends string>({
  entries,
  selected,
  onSelect,
}: FilterPillsProps<T>) {
  const { colors, radius, spacing } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}
    >
      {entries.map((entry) => {
        const isSelected = entry.key === selected;

        return (
          <Pressable
            key={entry.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(entry.key)}
            style={({ pressed }) => [
              styles.pill,
              {
                paddingHorizontal: spacing.md,
                borderRadius: radius.full,
                backgroundColor: isSelected ? entry.color : colors.surface,
                borderColor: isSelected ? entry.color : colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[styles.label, { color: isSelected ? colors.onPrimary : entry.color }]}
            >
              {entry.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    flexShrink: 0,
  },
  pill: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.heading,
  },
});
