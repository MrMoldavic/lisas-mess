import { useTheme } from '@/hooks/useTheme';
import { CATEGORIES, colorNameForCategory } from '@/types';
import type { CategoryId } from '@/types';

import { FilterPills } from './FilterPills';
import type { PillEntry } from './FilterPills';

/**
 * `all` montre toute la garde-robe (hors pièces « À sortir »), `unclassified`
 * les pièces d'avant les catégories.
 */
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
  const { colors } = useTheme();

  const entries: PillEntry<CategoryFilter>[] = [
    { key: 'all', label: 'Tout', color: colors.primary },
    ...(showUnclassified
      ? [{ key: 'unclassified' as CategoryFilter, label: 'À classer', color: colors.textMuted }]
      : []),
    ...CATEGORIES.map((category) => ({
      key: category.id as CategoryFilter,
      label: category.label,
      color: colors[colorNameForCategory(category.id)],
    })),
  ];

  return <FilterPills entries={entries} selected={selected} onSelect={onSelect} />;
}
