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

export const typography = {
  display: { fontSize: 42, fontWeight: '800', letterSpacing: -1.2 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '500' },
} as const;
