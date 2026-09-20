import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { CATEGORIES, colorNameForCategory } from '@/types';
import type { CategoryId } from '@/types';

type CategorySheetProps = {
  visible: boolean;
  /** Catégorie actuelle de la pièce, mise en avant dans la liste. */
  current: CategoryId | null;
  onSelect: (category: CategoryId | null) => void;
  onDelete: () => void;
  onClose: () => void;
};

/** Panneau de classement d'une pièce, ouvert en appuyant sur sa vignette. */
export function CategorySheet({
  visible,
  current,
  onSelect,
  onDelete,
  onClose,
}: CategorySheetProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            gap: spacing.md,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <Text style={[typography.heading, { color: colors.text }]}>Classer cette pièce</Text>

        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: spacing.sm }}>
          <View style={[styles.options, { gap: spacing.sm }]}>
            {CATEGORIES.map((category) => {
              const isCurrent = category.id === current;
              const color = colors[colorNameForCategory(category.id)];

              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isCurrent }}
                  onPress={() => onSelect(category.id)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      paddingHorizontal: spacing.md,
                      borderRadius: radius.full,
                      backgroundColor: isCurrent ? color : colors.surface,
                      borderColor: isCurrent ? color : colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[styles.optionLabel, { color: isCurrent ? colors.onPrimary : color }]}
                  >
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {current !== null && (
          <Pressable onPress={() => onSelect(null)} style={styles.textAction}>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              Retirer de la catégorie
            </Text>
          </Pressable>
        )}

        <Pressable onPress={onDelete} style={styles.textAction}>
          <Text style={[typography.body, styles.danger, { color: colors.danger }]}>
            Supprimer la pièce
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 8, 14, 0.45)',
  },
  sheet: {
    marginTop: 'auto',
    paddingTop: 10,
    maxHeight: '80%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 6,
  },
  list: { flexGrow: 0 },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  option: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  optionLabel: { fontSize: 14, fontWeight: '700' },
  textAction: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  danger: { fontWeight: '600' },
});
