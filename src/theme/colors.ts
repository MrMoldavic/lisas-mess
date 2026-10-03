/**
 * Palette « atelier » : toile de lin et bois en clair, atelier le soir (brun
 * profond) en sombre. Trois couleurs vives portent l'interface — framboise,
 * canard, moutarde —, chacune avec sa version foncée (`…Deep`) qui dessine
 * l'ombre pleine des boutons en relief.
 *
 * Les familles de pièces (hauts / bas / chaussures) gardent chacune leur
 * couleur, réutilisée dans toute l'app pour rendre le tri lisible d'un coup d'œil.
 */
export const palette = {
  background: { light: '#F6EBDA', dark: '#221A16' },
  surface: { light: '#FFF9F0', dark: '#30251F' },
  surfaceAlt: { light: '#EFE0C8', dark: '#3B2E26' },
  border: { light: '#E6D3B7', dark: '#4B3B31' },
  text: { light: '#4A3A33', dark: '#F6EADB' },
  textMuted: { light: '#8A7263', dark: '#B9A08C' },
  // Framboise : action principale.
  primary: { light: '#E4577E', dark: '#EC6189' },
  primaryDeep: { light: '#BC3D61', dark: '#B03F62' },
  onPrimary: { light: '#FFFFFF', dark: '#FFFFFF' },
  // Canard : action secondaire (tirage au sort, navigation).
  secondary: { light: '#36A89F', dark: '#3DB5AB' },
  secondaryDeep: { light: '#257C75', dark: '#257C75' },
  onSecondary: { light: '#FFFFFF', dark: '#FFFFFF' },
  // Moutarde : défis et récompenses.
  accent: { light: '#EDB847', dark: '#F0C25A' },
  accentDeep: { light: '#C7922A', dark: '#B98A26' },
  onAccent: { light: '#5A3E0C', dark: '#4A320A' },
  // Bois : enseignes et étagères.
  wood: { light: '#C48A57', dark: '#A8733F' },
  woodDeep: { light: '#8E5C33', dark: '#6E4523' },
  onWood: { light: '#FFF4E2', dark: '#FFF1DC' },
  /** Ombre pleine des éléments posés sur le fond (cartes, bulles, flèches). */
  surfaceDeep: { light: '#E6D3B7', dark: '#16100D' },
  /** Couture pointillée des cartes et des coupons. */
  stitch: { light: '#D8A56D', dark: '#8F6A45' },
  onHero: { light: '#FFFFFF', dark: '#FDECEF' },
  top: { light: '#F28C6B', dark: '#FF9B7A' },
  bottom: { light: '#4F9BD1', dark: '#7DB8E6' },
  shoes: { light: '#D9A232', dark: '#F0C25A' },
  // Coupons de tissu des postes du composeur. Ils restent clairs en mode
  // sombre, à peine atténués : c'est ce qui garde une pièce noire lisible dessus.
  topSoft: { light: '#FFD4C2', dark: '#EBC5B6' },
  bottomSoft: { light: '#C6E6F5', dark: '#B5D3E1' },
  shoesSoft: { light: '#F8E2A6', dark: '#E5D09A' },
  // Coupon for pieces that cover the whole outfit (dresses, accessories).
  fullSoft: { light: '#F9D3DE', dark: '#E6C2CD' },
  // Saisons : teintes franchement distinctes de celles des familles ci-dessus,
  // car les deux jeux de pilules se ressemblent visuellement.
  spring: { light: '#3FA46A', dark: '#6FD49F' },
  summer: { light: '#C98A00', dark: '#FFCF5C' },
  autumn: { light: '#B5521C', dark: '#E5824A' },
  winter: { light: '#3A79C9', dark: '#8CB8F2' },
  danger: { light: '#C8352C', dark: '#FF6B60' },
} as const;

export type ColorName = keyof typeof palette;
export type ColorScheme = 'light' | 'dark';
export type Colors = Record<ColorName, string>;

/** Background fabrics sold in the shop: each one replaces the linen surfaces of the light theme. */
export const fabrics = {
  lin: {},
  jean: {
    background: '#DDE6EF',
    surface: '#F5F8FC',
    surfaceAlt: '#C8D6E5',
    border: '#B4C6DA',
    surfaceDeep: '#B4C6DA',
    stitch: '#E0A458',
  },
  vichy: {
    background: '#F9E6EC',
    surface: '#FFF6F8',
    surfaceAlt: '#F2D3DD',
    border: '#EBC3D0',
    surfaceDeep: '#EBC3D0',
    stitch: '#E2A0B4',
  },
  menthe: {
    background: '#E3F2EC',
    surface: '#F6FCF9',
    surfaceAlt: '#CFE8DE',
    border: '#BBDCCF',
    surfaceDeep: '#BBDCCF',
    stitch: '#86C2AA',
  },
} satisfies Record<string, Partial<Colors>>;

export type FabricName = keyof typeof fabrics;

export function isFabricName(name: string): name is FabricName {
  return name in fabrics;
}

export function colorsFor(scheme: ColorScheme, fabric: FabricName = 'lin'): Colors {
  const base = Object.fromEntries(
    Object.entries(palette).map(([name, variants]) => [name, variants[scheme]])
  ) as Colors;
  return scheme === 'light' ? { ...base, ...fabrics[fabric] } : base;
}

/** Dégradés de l'app. Le tuple est figé car LinearGradient exige au moins 2 couleurs. */
export const gradients = {
  hero: {
    light: ['#FFB592', '#E4577E', '#C48A57'],
    dark: ['#7A2E45', '#A8435E', '#7A5231'],
  },
} as const;

export type Gradient = readonly [string, string, ...string[]];
export type GradientName = keyof typeof gradients;

export function gradientsFor(scheme: ColorScheme): Record<GradientName, Gradient> {
  return { hero: gradients.hero[scheme] };
}
