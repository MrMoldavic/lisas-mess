import { useTheme } from '@/hooks/useTheme';
import { CATEGORIES, colorNameForCategory } from '@/types';
import type { CategoryId } from '@/types';

import { FilterPills } from './FilterPills';
import type { PillEntry } from './FilterPills';

/**
 * `all` montre toute la garde-robe (hors caisse), `unclassified` les pièces
 * d'avant les catégories, `crate` la caisse « À donner ».
 */
export type CategoryFilter = 'all' | 'unclassified' | 'crate' | CategoryId;

type CategoryPillsProps = {
  selected: CategoryFilter;
  onSelect: (filter: CategoryFilter) => void;
  /** Affichée seulement s'il reste des pièces sans catégorie. */
  showUnclassified?: boolean;
  /** Affichée seulement si la caisse « À donner » n'est pas vide. */
  showCrate?: boolean;
};

export function CategoryPills({
  selected,
  onSelect,
  showUnclassified = false,
  showCrate = false,
}: CategoryPillsProps) {
  const { colors } = useTheme();

  const entries: PillEntry<CategoryFilter>[] = [
    { key: 'all', label: 'Tout', color: colors.primary },
    ...(showUnclassified
      ? [{ key: 'unclassified' as CategoryFilter, label: 'À classer', color: colors.textMuted }]
      : []),
    ...(showCrate
      ? [{ key: 'crate' as CategoryFilter, label: 'À donner', color: colors.wood }]
      : []),
    ...CATEGORIES.map((category) => ({
      key: category.id as CategoryFilter,
      label: category.label,
      color: colors[colorNameForCategory(category.id)],
    })),
  ];

  return <FilterPills entries={entries} selected={selected} onSelect={onSelect} />;
}
