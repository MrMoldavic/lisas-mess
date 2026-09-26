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

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export type Season = {
  id: SeasonId;
  label: string;
  /**
   * Tournure à insérer dans une phrase. Les prépositions diffèrent en français
   * — « au printemps » mais « en été » — donc on les stocke plutôt que de les
   * dériver, ce qui produirait des fautes.
   */
  inPhrase: string;
};

export const SEASONS: Season[] = [
  { id: 'spring', label: 'Printemps', inPhrase: 'au printemps' },
  { id: 'summer', label: 'Été', inPhrase: 'en été' },
  { id: 'autumn', label: 'Automne', inPhrase: 'en automne' },
  { id: 'winter', label: 'Hiver', inPhrase: 'en hiver' },
];

export function findSeason(id: string | null): Season | null {
  return SEASONS.find((season) => season.id === id) ?? null;
}

export function colorNameForSeason(id: SeasonId): ColorName {
  return id;
}

export function findCategory(id: string | null): Category | null {
  return CATEGORIES.find((category) => category.id === id) ?? null;
}

export function colorNameForCategory(id: string | null): ColorName {
  const category = findCategory(id);
  return category ? FAMILY_COLORS[category.family] : 'textMuted';
}

/** Famille d'une pièce, déduite de sa catégorie. */
export function familyForCategory(id: string | null): Family | null {
  return findCategory(id)?.family ?? null;
}

/**
 * Les trois postes qui composent une tenue, dans l'ordre d'affichage.
 *
 * `anchor` place le vêtement dans son encart : `center` le centre, `start` et
 * `end` le collent en haut ou en bas. Tous sont centrés : chaque pièce a son
 * propre coupon, bien séparé des autres, et un short collé en haut du sien
 * (pour aligner les ceintures) paraissait simplement mal placé.
 *
 * `share` est la part de la hauteur de la toile réservée au poste, calquée sur
 * les proportions d'un corps : des parts égales donneraient aux chaussures autant
 * de place qu'à un pantalon, et une paire photographiée de profil s'étalerait sur
 * toute la largeur. La somme doit faire 1.
 *
 * `tilt` est le sens d'inclinaison du sticker : 1 penche à droite (sens horaire),
 * -1 à gauche. Les postes alternent, comme des autocollants collés à la main.
 *
 * `maxWidth` est la largeur maximale d'une pièce, en fraction de la toile : un
 * haut peut prendre toute la largeur (épaules et manches), un bas s'arrête à
 * celle des hanches. C'est ce qui garde les pièces cohérentes entre elles : sans
 * ce plafond, chaque pièce grandit jusqu'à remplir son coupon, et un short
 * presque carré sort plus large que le t-shirt.
 */
export const OUTFIT_SLOTS = [
  { key: 'top', label: 'Haut', family: 'top', anchor: 'center', share: 0.37, tilt: 1, maxWidth: 1 },
  { key: 'bottom', label: 'Bas', family: 'bottom', anchor: 'center', share: 0.44, tilt: -1, maxWidth: 0.5 },
  { key: 'shoes', label: 'Chaussures', family: 'shoes', anchor: 'center', share: 0.19, tilt: 1, maxWidth: 0.6 },
] as const;

/** Zone verticale d'un poste, en fraction de la hauteur de la toile. */
export function slotBand(rank: number): { start: number; share: number } {
  const start = OUTFIT_SLOTS.slice(0, rank).reduce((sum, slot) => sum + slot.share, 0);
  return { start, share: OUTFIT_SLOTS[rank]?.share ?? 0 };
}

export type OutfitSlot = (typeof OUTFIT_SLOTS)[number]['key'];
