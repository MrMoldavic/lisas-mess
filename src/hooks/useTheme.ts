import { useColorScheme } from 'react-native';

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
 * Point d'entrée unique pour le style : suit le thème système et renvoie la
 * palette résolue ainsi que les échelles d'espacement / typographie.
 */
export function useTheme(): Theme {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return {
    scheme,
    colors: colorsFor(scheme),
    gradients: gradientsFor(scheme),
    spacing,
    radius,
    typography,
  };
}
