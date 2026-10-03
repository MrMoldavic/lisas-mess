import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useAnimatedValue,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import type { Piece } from '@/services';
import { fonts } from '@/theme';
import {
  CATEGORIES,
  colorNameForCategory,
  familyForCategory,
  findCategory,
  softColorNameForCategory,
} from '@/types';
import type { CategoryId } from '@/types';

import { Relief } from './Button';
import { Mascot } from './Mascot';
import type { Tone } from './Button';
import { PieceSticker } from './PieceSticker';
import { FABRIC_INK, Fabric } from './SlotBands';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** How far the sewn category tag rises above the coupon's top edge. */
const TAG_RISE = 16;
/** How long the classification confirmation stays fully visible, in ms. */
const NOTICE_HOLD = 1600;

/** What Bobine says about the piece: `strong` is highlighted, `rest` completes the sentence. */
function bobineSpeech(usage: number, leaving: boolean, asking: boolean): { strong: string; rest: string } {
  if (asking) return { strong: 'Nouvelle pièce', rest: ' ! Dans quelle catégorie je la range ?' };
  if (leaving) return { strong: 'À sortir de ta garde-robe', rest: ' : tu la gardes finalement, ou elle part ?' };
  if (usage === 0) return { strong: 'Jamais dans une tenue', rest: ' : on essaie ?' };
  const outfits = usage === 1 ? 'une tenue' : `${usage} tenues`;
  return { strong: `Déjà dans ${outfits}`, rest: usage >= 3 ? ', une valeur sûre !' : ' !' };
}

type PieceViewerProps = {
  /** `null` ferme la vue. */
  piece: Piece | null;
  /** Nombre de tenues qui utilisent la pièce. */
  usage: number;
  /** Opens straight on the category choice, for a piece just added. */
  classifyOnOpen?: boolean;
  /** Starts an outfit around the piece; without it, no « + » is offered. */
  onCreateOutfit?: (piece: Piece) => void;
  /** Returns `false` when the classification failed, so no confirmation is shown. */
  onClassify: (piece: Piece, category: CategoryId | null) => boolean;
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
  classifyOnOpen = false,
  onCreateOutfit,
  onClassify,
  onSort,
  onKeep,
  onRemoveForGood,
  onDelete,
  onClose,
}: PieceViewerProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [classifying, setClassifying] = useState(false);
  const [couponWidth, setCouponWidth] = useState(0);
  /** Confirmation shown after a classification; `key` replays the animation on each one. */
  const [notice, setNotice] = useState<{ text: string; key: number } | null>(null);
  const noticeProgress = useAnimatedValue(0);

  const pieceId = piece?.id ?? null;
  useEffect(() => {
    setClassifying(classifyOnOpen);
  }, [pieceId, classifyOnOpen]);

  const open = piece !== null;
  useEffect(() => {
    if (!open) setNotice(null);
  }, [open]);

  useEffect(() => {
    if (!notice) return;
    AccessibilityInfo.announceForAccessibility(notice.text);
    noticeProgress.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(noticeProgress, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(NOTICE_HOLD),
      Animated.timing(noticeProgress, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => {
      if (finished) setNotice(null);
    });
    return () => animation.stop();
  }, [notice, noticeProgress]);

  if (!piece) return null;

  const category = findCategory(piece.category);
  const leaving = piece.verdict === 'out';
  const asking = classifying && piece.category === null;
  // Only a piece the composer can place (top, bottom or shoes) can start an outfit.
  const family = familyForCategory(piece.category);
  const canCreate =
    onCreateOutfit !== undefined &&
    usage === 0 &&
    !leaving &&
    !asking &&
    (family === 'top' || family === 'bottom' || family === 'shoes');
  const speech = bobineSpeech(usage, leaving, asking);
  const strongColor = asking || (!leaving && usage === 0) ? colors.primary : leaving ? colors.woodDeep : colors.secondaryDeep;

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
        </View>

        {/* Same fabric coupon as in the composer, tinted by the piece's family, with its category sewn on top. */}
        <View
          style={[styles.coupon, { marginTop: TAG_RISE }]}
          onLayout={(event) => setCouponWidth(event.nativeEvent.layout.width)}
        >
          <Fabric color={colors[softColorNameForCategory(piece.category)]} width={couponWidth} pinked />

          {classifying ? (
            <ScrollView style={styles.couponContent} contentContainerStyle={[styles.options, { gap: spacing.sm }]}>
              {CATEGORIES.map((option) => {
                const selected = option.id === piece.category;
                const color = colors[colorNameForCategory(option.id)];

                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      if (onClassify(piece, option.id)) {
                        setNotice({ text: `C'est noté : ${option.label} !`, key: Date.now() });
                      }
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
            <PieceSticker uri={piece.uri} style={styles.couponContent} />
          )}

          <View pointerEvents="none" style={styles.tagRow}>
            <View style={styles.tag}>
              <View style={[styles.tagHole, { backgroundColor: colors[colorNameForCategory(piece.category)] }]} />
              <Text style={styles.tagText}>{(category?.label ?? 'À classer').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Bobine comments on the piece; a classification confirmation briefly takes her line. */}
        <View style={[styles.speaker, { gap: spacing.sm }]}>
          <Mascot size={56} />
          <View
            style={[
              styles.bubble,
              { backgroundColor: colors.surface, borderBottomColor: colors.surfaceDeep, borderRadius: radius.md },
            ]}
          >
            <View style={[styles.tail, { backgroundColor: colors.surface }]} />
            <Animated.View
              style={[
                styles.speechRow,
                { opacity: notice ? noticeProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) : 1 },
              ]}
            >
              <Text style={[styles.speech, { color: colors.text }]}>
                <Text style={{ color: strongColor }}>{speech.strong}</Text>
                {speech.rest}
              </Text>
              {canCreate && (
                <Relief
                  tone="primary"
                  onPress={() => onCreateOutfit(piece)}
                  borderRadius={radius.full}
                  accessibilityLabel="Créer une tenue avec cette pièce"
                  hitSlop={8}
                  faceStyle={styles.plus}
                >
                  {(ink) => <Ionicons name="add" size={22} color={ink} />}
                </Relief>
              )}
            </Animated.View>
            {notice && (
              <Animated.View
                key={notice.key}
                pointerEvents="none"
                style={[
                  styles.notice,
                  {
                    opacity: noticeProgress,
                    transform: [
                      { scale: noticeProgress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                    ],
                  },
                ]}
              >
                <Ionicons name="checkmark-circle" size={24} color={colors.secondary} />
                <Text style={[styles.noticeText, { color: colors.secondaryDeep }]} numberOfLines={1}>
                  {notice.text}
                </Text>
              </Animated.View>
            )}
          </View>
        </View>

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
  bar: { flexDirection: 'row', alignItems: 'center' },
  circle: { width: 46, height: 46 },
  speaker: { flexDirection: 'row', alignItems: 'center' },
  bubble: { flex: 1, justifyContent: 'center', minHeight: 60, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 4 },
  tail: { position: 'absolute', left: -6, top: '50%', marginTop: -7, width: 14, height: 14, transform: [{ rotate: '45deg' }] },
  speechRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  speech: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21 },
  plus: { width: 34, height: 34 },
  notice: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  noticeText: { fontFamily: fonts.heading, fontSize: 18 },
  coupon: { flex: 1 },
  couponContent: { flex: 1, marginTop: 42, marginHorizontal: 18, marginBottom: 20 },
  tagRow: { position: 'absolute', top: -TAG_RISE, left: 0, right: 0, alignItems: 'center' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingLeft: 10,
    paddingRight: 18,
    paddingVertical: 7,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(74, 58, 51, 0.18)',
    transform: [{ rotate: '-2deg' }],
  },
  tagHole: { width: 9, height: 9, borderRadius: 4.5 },
  tagText: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1.2, color: FABRIC_INK },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingVertical: 4 },
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
