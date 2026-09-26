import { colorsFor, gradientsFor, radius, spacing, typography } from '@/theme';
import type { Colors, ColorScheme, Gradient, GradientName } from '@/theme';

export type Theme = {
  scheme: ColorScheme;
  colors: Colors;
  gradients: Record<GradientName, Gradient>;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
};

/**
 * L'atelier est toujours en thème clair : la toile de lin fait l'identité de
 * l'app, et le mode sombre du système la rendait grise. Le thème système n'est
 * donc **pas** suivi (voir aussi `userInterfaceStyle: "light"` dans app.json,
 * qui fige les éléments natifs : alertes, sélecteur de photos).
 *
 * Les variantes sombres de la palette restent définies : rebrancher
 * `useColorScheme()` ici suffirait à réactiver le mode sombre.
 */
const SCHEME: ColorScheme = 'light';

const THEME: Theme = {
  scheme: SCHEME,
  colors: colorsFor(SCHEME),
  gradients: gradientsFor(SCHEME),
  spacing,
  radius,
  typography,
};

/** Point d'entrée unique pour le style : palette résolue et échelles. */
export function useTheme(): Theme {
  return THEME;
}
