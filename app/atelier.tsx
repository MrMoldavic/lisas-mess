import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, FabricPattern, Mascot, RELIEF_DEPTH, Relief, Reveal, SewingButton } from '@/components';
import type { Tone } from '@/components';
import { iconPack } from '@/components/iconPacks';
import { voiceFor } from '@/components/voices';
import { useShop } from '@/hooks/useShop';
import { useTheme } from '@/hooks/useTheme';
import { useWeather } from '@/hooks/useWeather';
import {
  leftCount,
  isLeaving,
  listOutfits,
  listPieces,
  sortQueue,
  weatherAnnouncement,
  findShopItem,
  shrinkExistingPieces,
  ensureThumbnails,
  jokersLeft,
  spendJoker,
  bobinousBalance,
  workshopStatus,
} from '@/services';
import type { DayState, Outfit, Piece, Sky, Weather, WorkshopStatus } from '@/services';
import { fonts } from '@/theme';
import type { ColorName } from '@/theme';
import { familyForCategory } from '@/types';

type IconName = ComponentProps<typeof Ionicons>['name'];

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const SKY_ICONS: Record<Sky, IconName> = {
  sun: 'sunny',
  clouds: 'partly-sunny',
  overcast: 'cloudy',
  fog: 'cloudy',
  drizzle: 'rainy',
  rain: 'rainy',
  snow: 'snow',
  storm: 'thunderstorm',
};

const SKY_COLORS: Record<Sky, ColorName> = {
  sun: 'accentDeep',
  clouds: 'accentDeep',
  overcast: 'textMuted',
  fog: 'textMuted',
  drizzle: 'winter',
  rain: 'winter',
  snow: 'winter',
  storm: 'winter',
};

/** Ce que Bobine dit en ouvrant l'atelier, dans le ton choisi en boutique. */
function bobineSays(status: WorkshopStatus, pieceCount: number, now: Date, voiceId: string | null): string {
  const voice = voiceFor(voiceId);
  if (pieceCount === 0) return voice.welcome;
  if (status.challengeDone) return voice.done(status.challenge?.reward ?? 0);

  const hour = now.getHours();
  const hello = voice.hello[hour < 12 ? 0 : hour < 18 ? 1 : 2];
  return `${hello} ${voice.prompt}`;
}


const STEP = 110;

/** Smallest app icon side: below it, the whole page shrinks instead (the home page never scrolls). */
const MIN_ICON = 48;
const APP_LABEL_HEIGHT = 20;
const APP_LABEL_GAP = 8;
const APP_ROW_GAP = 16;
/** Height a row of apps takes besides its icon: relief, label and their gap. */
const APP_ROW_EXTRA = RELIEF_DEPTH + APP_LABEL_GAP + APP_LABEL_HEIGHT;

type AppsLayout = { columns: 2 | 4; iconSize: number; deficit: number };

/** Biggest icons the area allows, in a 2×2 grid or a single row of 4; `deficit` is the height still missing at the minimum size. */
function appsLayout(width: number, height: number): AppsLayout {
  const grid = Math.min((width / 2) * 0.78, (height - APP_ROW_GAP - 2 * APP_ROW_EXTRA) / 2);
  const row = Math.min((width / 4) * 0.82, height - APP_ROW_EXTRA);
  if (Math.max(grid, row) < MIN_ICON) {
    return { columns: 4, iconSize: MIN_ICON, deficit: MIN_ICON + APP_ROW_EXTRA - height };
  }
  return grid >= row
    ? { columns: 2, iconSize: Math.floor(grid), deficit: 0 }
    : { columns: 4, iconSize: Math.floor(row), deficit: 0 };
}

/**
 * Page principale de l'atelier, de haut en bas : Bobine qui parle, le défi du jour et
 * sa semaine, les quatre rubriques, dont les icônes s'ajustent pour que tout tienne
 * sans défiler, et le bilan (pièces, tenues, bobinous) calé en bas de l'écran.
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
  const weather = useWeather();
  const shop = useShop();
  const [appsArea, setAppsArea] = useState({ width: 0, height: 0 });
  const [pageHeight, setPageHeight] = useState(0);
  /** Bottom of the summary, i.e. the natural height of the page content. */
  const [contentBottom, setContentBottom] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setPieces(listPieces());
      setOutfits(listOutfits());
    }, [])
  );

  // Photos saved at full resolution slow every screen down: shrink them once, after the first render.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      // Then the small copies used by the grids, for photos saved before they existed.
      shrinkExistingPieces()
        .then(async (shrunk) => shrunk + (await ensureThumbnails()))
        .then((changed) => {
          if (changed > 0) setPieces(listPieces());
        });
    });
    return () => task.cancel();
  }, []);

  const status = useMemo(
    () => workshopStatus(pieces, outfits, leftCount(), shop.jokerDays),
    [pieces, outfits, shop.jokerDays]
  );
  const icons = iconPack(shop.icons);

  /** A missed day of the week is caught up with a joker, bought in the shop. */
  const catchUp = (day: string) => {
    const left = jokersLeft(shop);
    if (left <= 0) {
      Alert.alert('Jour raté', 'Un joker peut le rattraper : la boutique en vend.', [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Boutique', onPress: () => router.push('/boutique') },
      ]);
      return;
    }
    const after = left - 1;
    Alert.alert('Utiliser un joker ?', `Ce jour comptera dans ta semaine. Il te restera ${after} joker${after > 1 ? 's' : ''}.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Utiliser', onPress: () => spendJoker(day) },
    ]);
  };
  const bobinous = bobinousBalance(status.buttons, shop);
  const companion = findShopItem(shop.avatar)?.name ?? 'Bobine';
  // Seules les familles proposées au tri comptent : hauts, bas, chaussures.
  const sortable = useMemo(
    () =>
      pieces.filter((piece) => {
        const family = familyForCategory(piece.category);
        return family === 'top' || family === 'bottom' || family === 'shoes';
      }),
    [pieces]
  );
  const toSort = useMemo(() => sortQueue(sortable, outfits).length, [sortable, outfits]);
  const leaving = useMemo(() => pieces.filter(isLeaving).length, [pieces]);

  // Icons fill what the rest of the page leaves; measured from the summary's bottom so it holds when the icons overflow.
  const available = contentBottom > 0 ? pageHeight - (contentBottom - appsArea.height) : appsArea.height;
  const { columns, iconSize, deficit } = appsLayout(appsArea.width, available);
  // On the smallest screens, the icons keep their minimum size and the whole page scales down to fit.
  const scale = contentBottom - pageHeight > 1 ? pageHeight / contentBottom : 1;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.md,
      }}
    >
      <FabricPattern />
      <View
        style={[
          styles.content,
          { paddingHorizontal: spacing.lg, gap: spacing.md, transform: [{ scale }], transformOrigin: 'top' },
        ]}
        onLayout={(event) => setPageHeight(event.nativeEvent.layout.height)}
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
              <Text style={[styles.nameText, { color: colors.onPrimary }]}>{companion}</Text>
            </View>
            <Mascot size={46} />
            <View style={[styles.dialogBody, { gap: spacing.sm }]}>
              <Text style={[styles.dialogText, { color: colors.text }]}>
                {bobineSays(status, pieces.length, new Date(), shop.voice)}
              </Text>
              {weather && (
                <Reveal travel={6}>
                  <WeatherLine weather={weather} />
                </Reveal>
              )}
            </View>
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
                      <WeekDay
                        key={i}
                        state={day}
                        letter={WEEKDAYS[i]}
                        ink={ink}
                        onPress={day === 'missed' ? () => catchUp(status.weekDays[i]) : undefined}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </Relief>
        </Reveal>

        {/* Le tri, une pièce à la fois : l'autre moitié de l'app. */}
        {/* Le tri est visible même quand tout est trié : c'est par là qu'on retrie.
            Les pièces « À sortir » ont leur bouton dès qu'il y en a. */}
        {(sortable.length > 0 || leaving > 0) && (
          <Reveal delay={STEP * 1.5}>
            <View style={{ gap: spacing.sm }}>
              {sortable.length > 0 && (
                <Button
                  label={
                    toSort > 0
                      ? `Commencer le tri · ${toSort} pièce${toSort > 1 ? 's' : ''}`
                      : 'Le tri · tout est à jour'
                  }
                  variant="wood"
                  icon={(ink) => <Ionicons name="swap-horizontal" size={20} color={ink} />}
                  onPress={() => router.push('/tri')}
                />
              )}
              {leaving > 0 && (
                <Button
                  label={`À sortir · ${leaving} pièce${leaving > 1 ? 's' : ''}`}
                  variant="surface"
                  icon={(ink) => <Ionicons name="exit" size={20} color={ink} />}
                  onPress={() => router.push('/sortie')}
                />
              )}
            </View>
          </Reveal>
        )}

        {/* Les quatre rubriques, en grandes icônes. */}
        <Reveal delay={STEP * 2} style={deficit > 0 ? { height: MIN_ICON + APP_ROW_EXTRA } : styles.appsArea}>
          <View
            style={[
            styles.apps,
            { opacity: appsArea.height > 0 ? 1 : 0 },
          ]}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setAppsArea({ width, height });
            }}
          >
            <AppIcon
              size={iconSize}
              columns={columns}
              tone="primary"
              icon={icons.pieces}
              label="Garde-robe"
              onPress={() => router.push('/pieces')}
            />
            <AppIcon
              size={iconSize}
              columns={columns}
              tone="accent"
              icon={icons.outfits}
              label="Mes tenues"
              onPress={() => router.push({ pathname: '/pieces', params: { mode: 'outfits' } })}
            />
            <AppIcon
              size={iconSize}
              columns={columns}
              tone="secondary"
              icon={icons.create}
              label="Créer"
              onPress={() => router.push('/tenue')}
            />
            <AppIcon
              size={iconSize}
              columns={columns}
              tone="wood"
              icon={icons.shop}
              label="Boutique"
              onPress={() => router.push('/boutique')}
            />
          </View>
        </Reveal>

        {/* Bilan, calé en bas de l'écran. */}
        <View
          onLayout={(event) => {
            const { y, height } = event.nativeEvent.layout;
            setContentBottom(y + height);
          }}
        >
          <Reveal delay={STEP * 2.5}>
            <View
              accessible
              accessibilityLabel={`${pieces.length} pièces, ${outfits.length} tenues, ${bobinous} bobinous`}
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
                {pieces.length - leaving} pièce{pieces.length - leaving > 1 ? 's' : ''} · {outfits.length} tenue
                {outfits.length > 1 ? 's' : ''}
                {leaving > 0 ? ` · ${leaving} à sortir` : ''}
              </Text>
              <View style={styles.jar}>
                <SewingButton size={16} color={colors.accent} holeColor={colors.accentDeep} />
                <Text style={[styles.summaryButtons, { color: colors.accentDeep }]}>
                  {bobinous} bobinous
                </Text>
              </View>
            </View>
          </Reveal>
        </View>
      </View>
    </View>
  );
}

type WeekDayProps = {
  state: DayState;
  letter: string;
  ink: string;
  /** Only for a missed day, which a joker can catch up. */
  onPress?: () => void;
};

/** Un jour de la semaine des défis : un bouton cousu s'il est réussi, une étoile s'il est rattrapé par un joker. */
function WeekDay({ state, letter, ink, onPress }: WeekDayProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? 'Rattraper ce jour avec un joker' : undefined}
      style={styles.day}
    >
      {state === 'done' ? (
        <SewingButton size={20} color={colors.primary} holeColor={colors.primaryDeep} />
      ) : state === 'joker' ? (
        <View style={[styles.dayJoker, { backgroundColor: colors.secondary }]}>
          <Ionicons name="star" size={11} color={colors.onSecondary} />
        </View>
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
    </Pressable>
  );
}

/** Bobine's weather announcement, under her greeting. */
function WeatherLine({ weather }: { weather: Weather }) {
  const { colors } = useTheme();

  return (
    <View style={styles.weather}>
      <Ionicons name={SKY_ICONS[weather.sky]} size={18} color={colors[SKY_COLORS[weather.sky]]} />
      <Text style={[styles.weatherText, { color: colors.text }]}>{weatherAnnouncement(weather)}</Text>
    </View>
  );
}

type AppIconProps = {
  /** Side of the square icon, in points. */
  size: number;
  columns: 2 | 4;
  tone: Tone;
  icon: IconName;
  label: string;
  onPress: () => void;
};

/** Une rubrique : une grande icône carrée en relief, son nom dessous. */
function AppIcon({ size, columns, tone, icon, label, onPress }: AppIconProps) {
  const { colors, radius } = useTheme();

  return (
    <View style={[styles.app, { width: columns === 2 ? '50%' : '25%' }]}>
      <Relief
        tone={tone}
        onPress={onPress}
        borderRadius={Math.min(radius.xl, size * 0.3)}
        accessibilityLabel={label}
        style={{ width: size }}
        faceStyle={{ width: size, height: size }}
      >
        {(ink) => <Ionicons name={icon} size={Math.round(size * 0.32)} color={ink} />}
      </Relief>
      <Text
        style={[styles.appLabel, { color: colors.text, fontSize: columns === 2 ? 16 : 13 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },

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
  dialogBody: { flex: 1 },
  dialogText: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 },
  weather: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  weatherText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 19 },

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
  dayJoker: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dayLetter: { fontFamily: fonts.heading, fontSize: 11 },

  appsArea: { flex: 1 },
  apps: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignContent: 'center',
    rowGap: APP_ROW_GAP,
  },
  app: { alignItems: 'center', gap: APP_LABEL_GAP, paddingHorizontal: 2 },
  appLabel: { fontFamily: fonts.heading, lineHeight: APP_LABEL_HEIGHT },

  summary: {
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
