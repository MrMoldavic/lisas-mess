import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bobine, Button, Relief, Reveal, SewingButton } from '@/components';
import type { Tone } from '@/components';
import { useTheme } from '@/hooks/useTheme';
import {
  givenCount,
  isInCrate,
  listOutfits,
  listPieces,
  sortQueue,
  workshopStatus,
} from '@/services';
import type { DayState, Outfit, Piece, WorkshopStatus } from '@/services';
import { fonts } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Ce que Bobine dit en ouvrant l'atelier. */
function bobineSays(status: WorkshopStatus, pieceCount: number, now: Date): string {
  if (pieceCount === 0) return "Bienvenue à l'atelier ! Commence par photographier une pièce.";
  if (status.challengeDone) {
    return `Défi réussi, bravo ! +${status.challenge?.reward ?? 0} boutons dans ton bocal.`;
  }

  const hour = now.getHours();
  const hello = hour < 12 ? 'Bonjour Lisa !' : hour < 18 ? 'Coucou Lisa !' : 'Bonsoir Lisa !';
  return `${hello} Un nouveau défi t'attend, on se crée une tenue ?`;
}

const STEP = 110;

/**
 * Page principale de l'atelier, de haut en bas : Bobine qui parle, le défi du jour et
 * sa semaine, les quatre rubriques en grandes icônes, et le bilan (pièces,
 * tenues, boutons) calé en bas de l'écran.
 *
 * Relu à chaque retour sur l'écran, pour que le défi et le bocal suivent les
 * tenues qu'on vient de créer.
 */
export default function AtelierScreen() {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [pieces, setPieces] = useState<Piece[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);

  useFocusEffect(
    useCallback(() => {
      setPieces(listPieces());
      setOutfits(listOutfits());
    }, [])
  );

  const status = useMemo(() => workshopStatus(pieces, outfits, givenCount()), [pieces, outfits]);
  const toSort = useMemo(() => sortQueue(pieces, outfits).length, [pieces, outfits]);
  const inCrate = useMemo(() => pieces.filter(isInCrate).length, [pieces]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.md,
          paddingHorizontal: spacing.lg,
          gap: spacing.lg,
        },
      ]}
    >
      {/* Bobine parle, son nom cousu sur une étiquette. */}
      <Reveal>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.surfaceDeep,
              borderRadius: radius.lg,
              gap: spacing.sm + 2,
            },
          ]}
        >
          <View style={[styles.nameTag, { backgroundColor: colors.primary, borderBottomColor: colors.primaryDeep }]}>
            <View style={[styles.nameHole, { backgroundColor: colors.surface }]} />
            <Text style={[styles.nameText, { color: colors.onPrimary }]}>Bobine</Text>
          </View>
          <Bobine size={46} />
          <Text style={[styles.dialogText, { color: colors.text }]}>
            {bobineSays(status, pieces.length, new Date())}
          </Text>
        </View>
      </Reveal>

      {/* Défi du jour et semaine des défis. */}
      <Reveal delay={STEP}>
        <Relief
          tone="accent"
          // Sans pièce, pas de défi possible : on envoie d'abord à la garde-robe.
          onPress={() =>
            pieces.length === 0
              ? router.push('/pieces')
              : router.push({ pathname: '/tenue', params: { challenge: '1' } })
          }
          borderRadius={radius.lg}
          accessibilityLabel={
            status.challenge ? `Défi du jour : ${status.challenge.label}` : 'Ajouter une pièce'
          }
          faceStyle={[styles.challenge, { padding: spacing.md - 2, gap: spacing.sm + 2 }]}
        >
          {(ink) => (
            <>
              <View style={[styles.stitch, { borderColor: colors.accentDeep }]} />
              <View style={styles.challengeRow}>
                <View style={[styles.challengeIcon, { backgroundColor: colors.secondary, borderBottomColor: colors.secondaryDeep }]}>
                  <Ionicons name="ribbon" size={20} color={colors.onSecondary} />
                </View>
                <View style={styles.challengeText}>
                  <Text style={[styles.challengeKicker, { color: ink }]}>Défi du jour</Text>
                  <Text style={[styles.challengeLabel, { color: ink }]}>
                    {status.challenge?.label ?? 'Photographie ta première pièce pour débloquer les défis'}
                  </Text>
                </View>
                {status.challenge && !status.challengeDone && (
                  <View style={[styles.reward, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.rewardText, { color: colors.accentDeep }]}>+{status.challenge.reward}</Text>
                    <SewingButton size={12} color={colors.accent} holeColor={colors.accentDeep} />
                  </View>
                )}
                {status.challengeDone && (
                  <View style={[styles.stamp, { borderColor: colors.secondaryDeep }]}>
                    <Text style={[styles.stampText, { color: colors.secondaryDeep }]}>Réussi</Text>
                  </View>
                )}
              </View>

              {status.challenge && (
                <View style={styles.week}>
                  {status.week.map((day, i) => (
                    <WeekDay key={i} state={day} letter={WEEKDAYS[i]} ink={ink} />
                  ))}
                </View>
              )}
            </>
          )}
        </Relief>
      </Reveal>

      {/* Le tri, une pièce à la fois : l'autre moitié de l'app. */}
      {toSort > 0 && (
        <Reveal delay={STEP * 1.5}>
          <Button
            label={`Commencer le tri · ${toSort} pièce${toSort > 1 ? 's' : ''}`}
            variant="wood"
            icon={(ink) => <Ionicons name="swap-horizontal" size={20} color={ink} />}
            onPress={() => router.push('/tri')}
          />
        </Reveal>
      )}

      {/* Les quatre rubriques, en grandes icônes. */}
      <Reveal delay={STEP * 2}>
        <View style={[styles.apps, { rowGap: spacing.md }]}>
          <AppIcon tone="primary" icon="shirt" label="Garde-robe" onPress={() => router.push('/pieces')} />
          <AppIcon tone="secondary" icon="sparkles" label="Créer" onPress={() => router.push('/tenue')} />
          <AppIcon
            tone="accent"
            icon="albums"
            label="Mes tenues"
            onPress={() => router.push({ pathname: '/pieces', params: { mode: 'outfits' } })}
          />
          <AppIcon
            tone="wood"
            icon="dice"
            label="Au hasard"
            onPress={() => router.push({ pathname: '/tenue', params: { surprise: '1' } })}
          />
        </View>
      </Reveal>

      {/* Bilan, calé en bas de l'écran. */}
      <View
        accessible
        accessibilityLabel={`${pieces.length} pièces, ${outfits.length} tenues, ${status.buttons} boutons`}
        style={[
          styles.summary,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.surfaceDeep,
            borderRadius: radius.full,
          },
        ]}
      >
        <Text style={[styles.summaryText, { color: colors.textMuted }]}>
          {pieces.length - inCrate} pièce{pieces.length - inCrate > 1 ? 's' : ''} · {outfits.length} tenue
          {outfits.length > 1 ? 's' : ''}
          {inCrate > 0 ? ` · ${inCrate} à donner` : ''}
        </Text>
        <View style={styles.jar}>
          <SewingButton size={16} color={colors.accent} holeColor={colors.accentDeep} />
          <Text style={[styles.summaryButtons, { color: colors.accentDeep }]}>
            {status.buttons} boutons
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

/** Un jour de la semaine des défis : un bouton cousu s'il est réussi. */
function WeekDay({ state, letter, ink }: { state: DayState; letter: string; ink: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.day}>
      {state === 'done' ? (
        <SewingButton size={20} color={colors.primary} holeColor={colors.primaryDeep} />
      ) : (
        <View
          style={[
            styles.dayEmpty,
            {
              borderColor: ink,
              borderStyle: state === 'today' ? 'solid' : 'dashed',
              opacity: state === 'today' ? 0.9 : 0.35,
            },
          ]}
        />
      )}
      <Text style={[styles.dayLetter, { color: ink, opacity: state === 'future' ? 0.5 : 0.85 }]}>
        {letter}
      </Text>
    </View>
  );
}

type AppIconProps = {
  tone: Tone;
  icon: IconName;
  label: string;
  onPress: () => void;
};

/** Une rubrique : une grande icône carrée en relief, son nom dessous. */
function AppIcon({ tone, icon, label, onPress }: AppIconProps) {
  const { colors, radius } = useTheme();

  return (
    <View style={styles.app}>
      <Relief
        tone={tone}
        onPress={onPress}
        borderRadius={radius.xl}
        accessibilityLabel={label}
        style={styles.appButton}
        faceStyle={styles.appFace}
      >
        {(ink) => <Ionicons name={icon} size={46} color={ink} />}
      </Relief>
      <Text style={[styles.appLabel, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },

  dialog: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 4,
  },
  nameTag: {
    position: 'absolute',
    top: -12,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 3,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomWidth: 2,
    transform: [{ rotate: '-4deg' }],
  },
  nameHole: { width: 5, height: 5, borderRadius: 3 },
  nameText: { fontFamily: fonts.heading, fontSize: 13 },
  dialogText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 },

  challenge: { flexDirection: 'column', alignItems: 'stretch' },
  stitch: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 18,
    opacity: 0.6,
  },
  challengeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  challengeIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
  },
  challengeText: { flex: 1 },
  challengeKicker: { fontFamily: fonts.heading, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.8 },
  challengeLabel: { fontFamily: fonts.heading, fontSize: 16, lineHeight: 20 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  rewardText: { fontFamily: fonts.heading, fontSize: 13 },
  stamp: {
    borderWidth: 2.5,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 1,
    transform: [{ rotate: '-10deg' }],
  },
  stampText: { fontFamily: fonts.display, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' },
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  day: { alignItems: 'center', gap: 3 },
  dayEmpty: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  dayLetter: { fontFamily: fonts.heading, fontSize: 11 },

  apps: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
  app: { width: '50%', alignItems: 'center', gap: 8 },
  // Carré proportionnel à la colonne : grand sur tous les écrans, sans déborder.
  appButton: { width: '78%' },
  appFace: { aspectRatio: 1 },
  appLabel: { fontFamily: fonts.heading, fontSize: 16 },

  summary: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 3,
  },
  summaryText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  jar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryButtons: { fontFamily: fonts.heading, fontSize: 14 },
});
