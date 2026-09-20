import { useColorScheme } from 'react-native';

import { colorsFor, radius, spacing, typography } from '@/theme';
import type { Colors, ColorScheme } from '@/theme';

export type Theme = {
  scheme: ColorScheme;
  colors: Colors;
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
    spacing,
    radius,
    typography,
  };
}
