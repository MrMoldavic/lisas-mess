import { useTheme } from '@/hooks/useTheme';
import { SEASONS, colorNameForSeason } from '@/types';
import type { SeasonId } from '@/types';

import { FilterPills } from './FilterPills';
import type { PillEntry } from './FilterPills';

/** `all` ne filtre rien. */
export type SeasonFilter = 'all' | SeasonId;

type SeasonPillsProps = {
  selected: SeasonFilter;
  onSelect: (filter: SeasonFilter) => void;
};

export function SeasonPills({ selected, onSelect }: SeasonPillsProps) {
  const { colors } = useTheme();

  const entries: PillEntry<SeasonFilter>[] = [
    { key: 'all', label: 'Toute saison', color: colors.primary },
    ...SEASONS.map((season) => ({
      key: season.id as SeasonFilter,
      label: season.label,
      color: colors[colorNameForSeason(season.id)],
    })),
  ];

  return <FilterPills entries={entries} selected={selected} onSelect={onSelect} />;
}
