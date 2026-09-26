import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/theme';

/** Les deux grandes vues de la garde-robe. */
export type Mode = 'pieces' | 'outfits';

const MODES: { key: Mode; label: string }[] = [
  { key: 'pieces', label: 'Pièces' },
  { key: 'outfits', label: 'Tenues' },
];

type ModeSwitchProps = {
  selected: Mode;
  onSelect: (mode: Mode) => void;
};

export function ModeSwitch({ selected, onSelect }: ModeSwitchProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={[styles.row, { gap: spacing.sm }]}>
      {MODES.map((mode) => {
        const isSelected = mode.key === selected;

        return (
          <Pressable
            key={mode.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(mode.key)}
            style={({ pressed }) => [
              styles.segment,
              {
                borderRadius: radius.md,
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isSelected ? colors.onPrimary : colors.textMuted },
              ]}
            >
              {mode.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    fontSize: 17,
    fontFamily: fonts.heading,
    letterSpacing: 0.2,
  },
});
