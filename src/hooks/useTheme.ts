import { colorsFor, gradientsFor, isFabricName, radius, spacing, typography } from '@/theme';
import type { Colors, ColorScheme, Gradient, GradientName } from '@/theme';

import { useShop } from './useShop';

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

/** One theme object per fabric, built once, so screens keep a stable reference. */
const themes = new Map<string, Theme>();

function themeFor(fabric: string): Theme {
  let theme = themes.get(fabric);
  if (!theme) {
    theme = {
      scheme: SCHEME,
      colors: colorsFor(SCHEME, isFabricName(fabric) ? fabric : 'lin'),
      gradients: gradientsFor(SCHEME),
      spacing,
      radius,
      typography,
    };
    themes.set(fabric, theme);
  }
  return theme;
}

/** Point d'entrée unique pour le style : palette résolue (selon le tissu porté, voir la boutique) et échelles. */
export function useTheme(): Theme {
  return themeFor(useShop().fabric);
}
