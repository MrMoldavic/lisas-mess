import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import type { Piece } from '@/services';
import { fonts } from '@/theme';
import { CATEGORIES, colorNameForCategory, findCategory } from '@/types';
import type { CategoryId } from '@/types';

import { Relief } from './Button';
import type { Tone } from './Button';
import { PieceSticker } from './PieceSticker';

type IconName = ComponentProps<typeof Ionicons>['name'];

type PieceViewerProps = {
  /** `null` ferme la vue. */
  piece: Piece | null;
  /** Nombre de tenues qui utilisent la pièce. */
  usage: number;
  onClassify: (piece: Piece, category: CategoryId | null) => void;
  /** Met la pièce « À sortir ». */
  onSort: (piece: Piece) => void;
  /** Finalement, on la garde : elle retourne dans les vêtements. */
  onKeep: (piece: Piece) => void;
  /** Elle est partie : suppression définitive (la confirmation est à la charge de l'appelant). */
  onRemoveForGood: (piece: Piece) => void;
  onDelete: (piece: Piece) => void;
  onClose: () => void;
};

/**
 * Une pièce en grand, avec ce qu'on peut en faire : la trier (« À sortir »),
 * la classer, la supprimer. Une pièce à sortir propose plutôt « Supprimer
 * définitivement » et « Je la garde ».
 *
 * Le choix de catégorie s'ouvre **dans** la vue plutôt que dans un second
 * panneau : iOS gère mal deux fenêtres modales empilées.
 */
export function PieceViewer({
  piece,
  usage,
  onClassify,
  onSort,
  onKeep,
  onRemoveForGood,
  onDelete,
  onClose,
}: PieceViewerProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [classifying, setClassifying] = useState(false);

  const pieceId = piece?.id ?? null;
  useEffect(() => {
    setClassifying(false);
  }, [pieceId]);

  if (!piece) return null;

  const category = findCategory(piece.category);
  const leaving = piece.verdict === 'out';

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.md,
            paddingHorizontal: spacing.lg,
            gap: spacing.md,
          },
        ]}
      >
        <View style={styles.bar}>
          <Relief
            tone="surface"
            onPress={onClose}
            borderRadius={radius.full}
            accessibilityLabel="Fermer"
            hitSlop={6}
            faceStyle={styles.circle}
          >
            {(ink) => <Ionicons name="close" size={22} color={ink} />}
          </Relief>

          <View style={[styles.chips, { gap: spacing.xs }]}>
            <View
              style={[
                styles.chip,
                { backgroundColor: colors[colorNameForCategory(piece.category)], borderRadius: radius.full },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.onPrimary }]}>
                {category?.label ?? 'À classer'}
              </Text>
            </View>
            <Text style={[styles.usage, { color: usage === 0 ? colors.primary : colors.textMuted }]}>
              {usage === 0 ? 'Jamais dans une tenue' : `Dans ${usage} tenue${usage > 1 ? 's' : ''}`}
            </Text>
          </View>

          <View style={styles.circle} />
        </View>

        {leaving && (
          <View style={[styles.leavingNote, { backgroundColor: colors.surfaceAlt, borderRadius: radius.full }]}>
            <Ionicons name="exit" size={16} color={colors.wood} />
            <Text style={[typography.caption, { color: colors.text }]}>À sortir de ta garde-robe</Text>
          </View>
        )}

        {classifying ? (
          <ScrollView style={styles.body} contentContainerStyle={[styles.options, { gap: spacing.sm }]}>
            {CATEGORIES.map((option) => {
              const selected = option.id === piece.category;
              const color = colors[colorNameForCategory(option.id)];

              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onClassify(piece, option.id);
                    setClassifying(false);
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      borderRadius: radius.full,
                      borderColor: color,
                      backgroundColor: selected ? color : colors.surface,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.optionText, { color: selected ? colors.onPrimary : color }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.body}>
            <PieceSticker uri={piece.uri} style={styles.sticker} />
          </View>
        )}

        <View
          style={[
            styles.dock,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.surfaceDeep,
              borderRadius: radius.xl,
              paddingVertical: spacing.sm + 2,
            },
          ]}
        >
          {leaving ? (
            <>
              <DockAction tone="secondary" icon="arrow-undo" label="Je la garde" onPress={() => onKeep(piece)} />
              <DockAction
                tone="surface"
                icon="trash"
                label="Supprimer"
                danger
                onPress={() => onRemoveForGood(piece)}
              />
            </>
          ) : (
            <>
              <DockAction tone="primary" icon="exit" label="Trier" onPress={() => onSort(piece)} />
              <DockAction
                tone={classifying ? 'accent' : 'secondary'}
                icon="pricetag"
                label={classifying ? 'Fermer' : 'Classer'}
                onPress={() => setClassifying((open) => !open)}
              />
              <DockAction tone="surface" icon="trash" label="Supprimer" danger onPress={() => onDelete(piece)} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

type DockActionProps = {
  tone: Tone;
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Icône rouge sur face papier, pour la suppression. */
  danger?: boolean;
};

function DockAction({ tone, icon, label, onPress, danger = false }: DockActionProps) {
  const { colors, radius } = useTheme();

  return (
    <View style={styles.action}>
      <Relief
        tone={tone}
        onPress={onPress}
        borderRadius={radius.full}
        accessibilityLabel={label}
        faceStyle={styles.actionFace}
      >
        {(ink) => <Ionicons name={icon} size={24} color={danger ? colors.danger : ink} />}
      </Relief>
      <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circle: { width: 46, height: 46 },
  chips: { alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 5 },
  chipText: { fontFamily: fonts.heading, fontSize: 14 },
  usage: { fontFamily: fonts.bodyBold, fontSize: 12 },
  leavingNote: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  body: { flex: 1 },
  sticker: { flex: 1, margin: 12 },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingVertical: 12 },
  option: { borderWidth: 2, paddingHorizontal: 16, paddingVertical: 8 },
  optionText: { fontFamily: fonts.heading, fontSize: 15 },
  dock: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    borderBottomWidth: 4,
  },
  action: { alignItems: 'center', gap: 6, minWidth: 86 },
  actionFace: { width: 54, height: 54 },
  actionLabel: { fontFamily: fonts.heading, fontSize: 13 },
});
