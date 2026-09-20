import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { CATEGORIES, colorNameForCategory } from '@/types';
import type { CategoryId } from '@/types';

/** `all` montre tout, `unclassified` les pièces d'avant les catégories. */
export type CategoryFilter = 'all' | 'unclassified' | CategoryId;

type CategoryPillsProps = {
  selected: CategoryFilter;
  onSelect: (filter: CategoryFilter) => void;
  /** Affichée seulement s'il reste des pièces sans catégorie. */
  showUnclassified?: boolean;
};

export function CategoryPills({
  selected,
  onSelect,
  showUnclassified = false,
}: CategoryPillsProps) {
  const { colors, radius, spacing } = useTheme();

  const entries: { key: CategoryFilter; label: string; color: string }[] = [
    { key: 'all', label: 'Tout', color: colors.text },
    ...(showUnclassified
      ? [{ key: 'unclassified' as CategoryFilter, label: 'À classer', color: colors.textMuted }]
      : []),
    ...CATEGORIES.map((category) => ({
      key: category.id as CategoryFilter,
      label: category.label,
      color: colors[colorNameForCategory(category.id)],
    })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Indispensable : la ScrollView horizontale de React Native porte
      // `flexGrow: 1` par défaut (styles.baseHorizontal). Dans une colonne, elle
      // se partagerait la hauteur restante avec ses voisins au lieu de se
      // limiter à la hauteur des pilules.
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
              style={[
                styles.label,
                { color: isSelected ? colors.onPrimary : entry.color },
              ]}
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
    fontWeight: '700',
  },
});
