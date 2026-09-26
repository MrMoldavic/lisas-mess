export { palette, gradients, colorsFor, gradientsFor } from './colors';
export type { Colors, ColorName, ColorScheme, Gradient, GradientName } from './colors';

/** Échelle d'espacement : toujours utiliser ces valeurs plutôt que des nombres en dur. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 24,
  xl: 32,
  full: 999,
} as const;

/**
 * Familles de police, chargées dans `app/_layout.tsx`. Fredoka, ronde et
 * épaisse, pour les titres et les boutons ; Nunito pour les textes.
 *
 * Avec une police chargée, la graisse est **dans le nom de la famille** : ne pas
 * y ajouter de `fontWeight`, iOS chercherait une variante qui n'existe pas et
 * retomberait sur la police système.
 */
export const fonts = {
  display: 'Fredoka_700Bold',
  heading: 'Fredoka_600SemiBold',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_800ExtraBold',
} as const;

export const typography = {
  display: { fontSize: 42, fontFamily: fonts.display, letterSpacing: -0.6 },
  title: { fontSize: 28, fontFamily: fonts.display, letterSpacing: -0.2 },
  heading: { fontSize: 20, fontFamily: fonts.heading },
  body: { fontSize: 16, fontFamily: fonts.body },
  caption: { fontSize: 13, fontFamily: fonts.body },
} as const;
