import { Pressable, StyleSheet, Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: ButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          paddingVertical: spacing.md + 2,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.full,
          backgroundColor: isPrimary ? colors.primary : colors.surface,
          borderColor: isPrimary ? 'transparent' : colors.border,
          borderWidth: isPrimary ? 0 : 1,
          shadowColor: colors.primary,
          shadowOpacity: isPrimary && !disabled ? 0.35 : 0,
          elevation: isPrimary && !disabled ? 6 : 0,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: isPrimary ? colors.onPrimary : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
