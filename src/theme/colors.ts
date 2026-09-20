/**
 * Palette de l'application. Chaque clé existe en clair et en sombre pour que
 * les composants puissent piocher dans un seul objet via `useTheme()`.
 */
export const palette = {
  background: { light: '#ffffff', dark: '#101014' },
  surface: { light: '#f4f4f6', dark: '#1b1b21' },
  border: { light: '#e2e2e8', dark: '#2c2c34' },
  text: { light: '#16161a', dark: '#f5f5f7' },
  textMuted: { light: '#6b6b76', dark: '#9a9aa6' },
  primary: { light: '#5b4bff', dark: '#8d82ff' },
  onPrimary: { light: '#ffffff', dark: '#101014' },
  danger: { light: '#c8352c', dark: '#ff6b60' },
} as const;

export type ColorName = keyof typeof palette;
export type ColorScheme = 'light' | 'dark';

export type Colors = Record<ColorName, string>;

export function colorsFor(scheme: ColorScheme): Colors {
  return Object.fromEntries(
    Object.entries(palette).map(([name, variants]) => [name, variants[scheme]])
  ) as Colors;
}
