import type { ColorName } from '@/theme';

/** Types métier partagés. */

export type Id = string;

export type Timestamped = {
  createdAt: string;
  updatedAt: string;
};

/**
 * Famille d'une pièce : c'est elle qui détermine la place du vêtement dans une
 * tenue. `full` couvre les pièces qui remplacent haut + bas à elles seules.
 */
export type Family = 'top' | 'bottom' | 'shoes' | 'full';

export type CategoryId =
  | 'tshirt'
  | 'chemise'
  | 'pull'
  | 'veste'
  | 'manteau'
  | 'robe'
  | 'pantalon'
  | 'jean'
  | 'jupe'
  | 'short'
  | 'chaussures'
  | 'accessoire';

export type Category = {
  id: CategoryId;
  label: string;
  family: Family;
};

/** L'ordre fait foi : c'est celui des pilules à l'écran, du haut vers le bas du corps. */
export const CATEGORIES: Category[] = [
  { id: 'tshirt', label: 'T-shirt', family: 'top' },
  { id: 'chemise', label: 'Chemise', family: 'top' },
  { id: 'pull', label: 'Pull', family: 'top' },
  { id: 'veste', label: 'Veste', family: 'top' },
  { id: 'manteau', label: 'Manteau', family: 'top' },
  { id: 'robe', label: 'Robe', family: 'full' },
  { id: 'pantalon', label: 'Pantalon', family: 'bottom' },
  { id: 'jean', label: 'Jean', family: 'bottom' },
  { id: 'jupe', label: 'Jupe', family: 'bottom' },
  { id: 'short', label: 'Short', family: 'bottom' },
  { id: 'chaussures', label: 'Chaussures', family: 'shoes' },
  { id: 'accessoire', label: 'Accessoire', family: 'full' },
];

/** Couleur de la palette associée à chaque famille. */
const FAMILY_COLORS: Record<Family, ColorName> = {
  top: 'top',
  bottom: 'bottom',
  shoes: 'shoes',
  full: 'primary',
};

export function findCategory(id: string | null): Category | null {
  return CATEGORIES.find((category) => category.id === id) ?? null;
}

export function colorNameForCategory(id: string | null): ColorName {
  const category = findCategory(id);
  return category ? FAMILY_COLORS[category.family] : 'textMuted';
}
