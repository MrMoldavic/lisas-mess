import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/theme';
import type { ColorName } from '@/theme';

/** Hauteur de l'ombre pleine sous un élément en relief. */
export const RELIEF_DEPTH = 4;

export type Tone = 'primary' | 'secondary' | 'accent' | 'wood' | 'surface';

/** Couleurs de chaque ton : face, ombre pleine dessous, texte. */
const TONES: Record<Tone, { face: ColorName; deep: ColorName; ink: ColorName }> = {
  primary: { face: 'primary', deep: 'primaryDeep', ink: 'onPrimary' },
  secondary: { face: 'secondary', deep: 'secondaryDeep', ink: 'onSecondary' },
  accent: { face: 'accent', deep: 'accentDeep', ink: 'onAccent' },
  wood: { face: 'wood', deep: 'woodDeep', ink: 'onWood' },
  surface: { face: 'surface', deep: 'surfaceDeep', ink: 'text' },
};

type ReliefProps = {
  tone?: Tone;
  onPress: () => void;
  disabled?: boolean;
  /** Rayon de la face ; `radius.full` pour une pastille ou un rond. */
  borderRadius?: number;
  /** Style de la face (taille, marges intérieures, alignement du contenu). */
  faceStyle?: StyleProp<ViewStyle>;
  /** Style du conteneur (placement dans le parent, `flex`…). */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean };
  hitSlop?: number;
  children: (ink: string) => ReactNode;
};

/**
 * Élément « en relief » de l'atelier : une face posée sur une ombre pleine de
 * sa couleur foncée. Au toucher, la face descend et recouvre l'ombre, comme un
 * bouton qu'on enfonce.
 *
 * `children` reçoit la couleur d'encre du ton, pour colorer texte et icônes.
 */
export function Relief({
  tone = 'primary',
  onPress,
  disabled = false,
  borderRadius,
  faceStyle,
  style,
  accessibilityLabel,
  accessibilityState,
  hitSlop,
  children,
}: ReliefProps) {
  const { colors, radius } = useTheme();
  const palette = TONES[tone];
  const corner = borderRadius ?? radius.lg;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, ...accessibilityState }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={hitSlop}
      style={[
        {
          borderRadius: corner,
          backgroundColor: colors[palette.deep],
          paddingBottom: RELIEF_DEPTH,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.face,
            {
              borderRadius: corner,
              backgroundColor: colors[palette.face],
              transform: [{ translateY: pressed && !disabled ? RELIEF_DEPTH - 1 : 0 }],
            },
            faceStyle,
          ]}
        >
          {children(colors[palette.ink])}
        </View>
      )}
    </Pressable>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** `primary` framboise, `secondary` canard, `accent` moutarde, `wood` bois, `surface` papier. */
  variant?: Tone;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Icône avant le libellé, dessinée avec la couleur d'encre reçue. */
  icon?: (ink: string) => ReactNode;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  icon,
}: ButtonProps) {
  const { radius, spacing } = useTheme();

  return (
    <Relief
      tone={variant}
      onPress={onPress}
      disabled={disabled}
      borderRadius={radius.lg}
      style={style}
      faceStyle={{ paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.sm }}
    >
      {(ink) => (
        <>
          {icon?.(ink)}
          <Text style={[styles.label, { color: ink }]}>{label}</Text>
        </>
      )}
    </Relief>
  );
}

const styles = StyleSheet.create({
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 17,
    fontFamily: fonts.heading,
    letterSpacing: 0.2,
  },
});
