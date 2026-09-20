/**
 * Palette de l'application : crème chaud en clair, prune profond en sombre,
 * avec une couleur dédiée par catégorie de pièce (hauts / bas / chaussures)
 * réutilisée dans toute l'app pour rendre le tri lisible d'un coup d'œil.
 */
export const palette = {
  background: { light: '#FFF7F2', dark: '#161114' },
  surface: { light: '#FFFFFF', dark: '#221A1E' },
  surfaceAlt: { light: '#FDEEE7', dark: '#2C2126' },
  border: { light: '#F2DED4', dark: '#3A2C32' },
  text: { light: '#241C1A', dark: '#F8F0ED' },
  textMuted: { light: '#8C7A72', dark: '#A89490' },
  primary: { light: '#E0466B', dark: '#FF7A9C' },
  onPrimary: { light: '#FFFFFF', dark: '#2B0C17' },
  onHero: { light: '#FFFFFF', dark: '#FDECEF' },
  top: { light: '#F4845F', dark: '#FF9B74' },
  bottom: { light: '#5B8FF9', dark: '#7FA9FF' },
  shoes: { light: '#E0A32E', dark: '#FFC96B' },
  danger: { light: '#C8352C', dark: '#FF6B60' },
} as const;

export type ColorName = keyof typeof palette;
export type ColorScheme = 'light' | 'dark';
export type Colors = Record<ColorName, string>;

export function colorsFor(scheme: ColorScheme): Colors {
  return Object.fromEntries(
    Object.entries(palette).map(([name, variants]) => [name, variants[scheme]])
  ) as Colors;
}

/** Dégradés de l'app. Le tuple est figé car LinearGradient exige au moins 2 couleurs. */
export const gradients = {
  hero: {
    light: ['#FF9FBE', '#E0466B', '#F4845F'],
    dark: ['#6E2242', '#A83657', '#B85C46'],
  },
} as const;

export type Gradient = readonly [string, string, ...string[]];
export type GradientName = keyof typeof gradients;

export function gradientsFor(scheme: ColorScheme): Record<GradientName, Gradient> {
  return { hero: gradients.hero[scheme] };
}
