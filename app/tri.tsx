import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useAnimatedValue,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path, Rect } from 'react-native-svg';

import { Bobine, Button, PieceSticker, Relief, ScatteredButtons, Screen } from '@/components';
import type { Scattered, Tone } from '@/components';
import { useTheme } from '@/hooks/useTheme';
import {
  listOutfits,
  listPieces,
  resetVerdicts,
  setVerdict,
  sortQueue,
  usageCounts,
} from '@/services';
import type { Outfit, Piece, Verdict } from '@/services';
import { fonts } from '@/theme';
import { colorNameForCategory, familyForCategory, findCategory } from '@/types';
import type { OutfitSlot } from '@/types';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Distance à parcourir pour que le geste compte comme une décision. */
const THRESHOLD = 110;
const FLY_OUT = 220;

type Tally = Record<Verdict, number>;

const NO_TALLY: Tally = { keep: 0, unsure: 0, out: 0 };

/** Ce qu'on peut trier : une famille de pièces à la fois. */
const FAMILIES: { key: OutfitSlot; label: string; tone: Tone }[] = [
  { key: 'top', label: 'Les hauts', tone: 'primary' },
  { key: 'bottom', label: 'Les bas', tone: 'secondary' },
  { key: 'shoes', label: 'Les chaussures', tone: 'accent' },
];

/**
 * Boutons éparpillés en fond du tri : en haut au-dessus de Bobine, en bas sous
 * les choix, quelques petits sur les bords. Ils passent derrière le contenu.
 */
const SCATTERED: Scattered[] = [
  { top: '3%', left: '8%', size: 34, color: 'primary', holes: 'primaryDeep', period: 7000, direction: 1 },
  { top: '6%', left: '76%', size: 24, color: 'secondary', holes: 'secondaryDeep', period: 5200, direction: -1 },
  { top: '14%', left: '60%', size: 46, color: 'accent', holes: 'accentDeep', period: 9000, direction: 1 },
  { top: '17%', left: '18%', size: 18, color: 'bottom', period: 4600, direction: -1 },
  { top: '45%', left: '90%', size: 16, color: 'top', period: 5600, direction: 1 },
  { top: '79%', left: '5%', size: 42, color: 'wood', holes: 'woodDeep', period: 8200, direction: -1 },
  { top: '86%', left: '40%', size: 22, color: 'spring', period: 4800, direction: 1 },
  { top: '80%', left: '74%', size: 30, color: 'primary', holes: 'primaryDeep', period: 6400, direction: -1 },
  { top: '92%', left: '66%', size: 16, color: 'accent', holes: 'accentDeep', period: 4200, direction: 1 },
];

/** Silhouette de chaque famille, dessinée à la couleur d'encre du bouton. */
function FamilyGlyph({ family, color }: { family: OutfitSlot; color: string }) {
  if (family === 'top') {
    return (
      <Svg width={46} height={42} viewBox="0 0 100 92">
        <Path fill={color} d="M30 4 L42 1 Q50 10 58 1 L70 4 L96 22 L85 40 L73 33 L73 90 L27 90 L27 33 L15 40 L4 22 Z" />
      </Svg>
    );
  }
  if (family === 'bottom') {
    return (
      <Svg width={28} height={46} viewBox="0 0 60 100">
        <Path fill={color} d="M7 2 H53 L57 98 H37 L30 32 L23 98 H3 Z" />
      </Svg>
    );
  }
  return (
    <Svg width={56} height={24} viewBox="0 0 124 48">
      <Path fill={color} d="M3 32 Q3 15 17 13 L33 11 Q39 21 52 25 Q59 27 59 35 L59 38 H3 Z" />
      <Rect fill={color} x={2} y={40} width={58} height={6} rx={3} />
      <Path fill={color} d="M67 32 Q67 15 81 13 L97 11 Q103 21 116 25 Q123 27 123 35 L123 38 H67 Z" />
      <Rect fill={color} x={66} y={40} width={58} height={6} rx={3} />
    </Svg>
  );
}

/** Les trois décisions, avec leur geste, leur libellé et leur couleur. */
const DECISIONS: Record<Verdict, { label: string; icon: IconName; tone: Tone; hint: string }> = {
  unsure: { label: 'Je ne sais pas', icon: 'help', tone: 'accent', hint: 'glisse à gauche' },
  out: { label: 'Je trie', icon: 'cube', tone: 'primary', hint: 'glisse vers le haut' },
  keep: { label: 'Je garde', icon: 'heart', tone: 'secondary', hint: 'glisse à droite' },
};

/**
 * Le tri, une pièce à la fois : glisser à droite « je garde », à gauche « je ne
 * sais pas », vers le haut « je trie » (la pièce passe « À sortir »). Les boutons du bas
 * font la même chose, pour qui préfère toucher.
 *
 * On commence par choisir ce qu'on trie : les hauts, les bas ou les chaussures.
 * La file est ensuite figée (voir sortQueue) : décider d'une pièce ne rebat pas
 * les cartes suivantes.
 */
export default function SortScreen() {
  const { colors, radius, spacing, typography } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [pieces, setPieces] = useState<Piece[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  /** Famille en cours de tri, `null` tant qu'on ne l'a pas choisie. */
  const [family, setFamily] = useState<OutfitSlot | null>(null);
  const [queue, setQueue] = useState<Piece[]>([]);
  const [position, setPosition] = useState(0);
  const [tally, setTally] = useState<Tally>(NO_TALLY);

  /** Relit la garde-robe : au départ, et après un tri, pour recompter. */
  const reload = useCallback(() => {
    setPieces(listPieces());
    setOutfits(listOutfits());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const usage = useMemo(() => usageCounts(outfits), [outfits]);

  /** File de tri de chaque famille : sert à la fois au compte et au lancement. */
  const queues = useMemo(() => {
    const byFamily = (key: OutfitSlot) =>
      sortQueue(
        pieces.filter((piece) => familyForCategory(piece.category) === key),
        outfits
      );
    return { top: byFamily('top'), bottom: byFamily('bottom'), shoes: byFamily('shoes') };
  }, [pieces, outfits]);

  const start = useCallback(
    (key: OutfitSlot) => {
      setQueue(queues[key]);
      setPosition(0);
      setTally(NO_TALLY);
      setFamily(key);
    },
    [queues]
  );

  /** Retour au choix de la famille, avec des comptes à jour. */
  const chooseAgain = useCallback(() => {
    reload();
    setFamily(null);
  }, [reload]);

  /**
   * Pièces de chaque famille dont on peut effacer la décision pour un inventaire :
   * gardées ou « je ne sais pas ». Les pièces « À sortir » n'en font pas partie.
   */
  const resettable = useMemo(() => {
    const byFamily = (key: OutfitSlot) =>
      pieces
        .filter((piece) => familyForCategory(piece.category) === key)
        .filter((piece) => piece.verdict === 'keep' || piece.verdict === 'unsure')
        .map((piece) => piece.id);
    return { top: byFamily('top'), bottom: byFamily('bottom'), shoes: byFamily('shoes') };
  }, [pieces]);

  /** Inventaire d'une famille : ses décisions « garde » et « je ne sais pas » sont oubliées. */
  const confirmInventory = useCallback(
    (key: OutfitSlot, label: string) => {
      Alert.alert(
        `Tout retrier : ${label.toLowerCase()} ?`,
        "Toutes ces pièces repassent au tri, même celles gardées il y a moins de 30 jours. Les pièces « À sortir » ne sont pas touchées.",
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Tout retrier',
            onPress: () => {
              resetVerdicts(resettable[key]);
              reload();
            },
          },
        ]
      );
    },
    [reload, resettable]
  );

  const piece = queue[position] ?? null;
  const done = family !== null && piece === null;

  const x = useAnimatedValue(0);
  const y = useAnimatedValue(0);
  const busy = useRef(false);

  /** Enregistre la décision, fait sortir la carte dans sa direction, passe à la suivante. */
  const decide = useCallback(
    (verdict: Verdict) => {
      if (!piece || busy.current) return;
      busy.current = true;

      setVerdict(piece.id, verdict);
      setTally((current) => ({ ...current, [verdict]: current[verdict] + 1 }));

      const target =
        verdict === 'keep'
          ? { x: width * 1.3, y: 0 }
          : verdict === 'unsure'
            ? { x: -width * 1.3, y: 0 }
            : { x: 0, y: -900 };

      Animated.parallel([
        Animated.timing(x, { toValue: target.x, duration: FLY_OUT, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: target.y, duration: FLY_OUT, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(() => {
        x.setValue(0);
        y.setValue(0);
        setPosition((current) => current + 1);
        busy.current = false;
      });
    },
    [piece, width, x, y]
  );

  const decideRef = useRef(decide);
  decideRef.current = decide;

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onUpdate((event) => {
          if (busy.current) return;
          x.setValue(event.translationX);
          // On ne descend pas la carte : vers le bas, aucune décision.
          y.setValue(Math.min(0, event.translationY));
        })
        .onEnd((event) => {
          if (busy.current) return;
          const { translationX: dx, translationY: dy } = event;

          if (-dy > THRESHOLD && -dy > Math.abs(dx)) decideRef.current('out');
          else if (dx > THRESHOLD) decideRef.current('keep');
          else if (dx < -THRESHOLD) decideRef.current('unsure');
          else {
            Animated.parallel([
              Animated.spring(x, { toValue: 0, useNativeDriver: true }),
              Animated.spring(y, { toValue: 0, useNativeDriver: true }),
            ]).start();
          }
        }),
    [x, y]
  );

  const rotate = x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-14deg', '0deg', '14deg'] });
  const keepOpacity = x.interpolate({ inputRange: [0, THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const unsureOpacity = x.interpolate({ inputRange: [-THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const outOpacity = y.interpolate({ inputRange: [-THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  if (family === null) {
    return (
      <Screen>
        <ScatteredButtons items={SCATTERED} />
        <View style={[styles.choose, { gap: spacing.lg }]}>
          <View style={[styles.chooseHead, { gap: spacing.sm }]}>
            <Bobine size={64} />
            <Text style={[typography.title, { color: colors.text, textAlign: 'center' }]}>
              On trie quoi aujourd&apos;hui ?
            </Text>
          </View>

          <View style={{ gap: spacing.md }}>
            {FAMILIES.map(({ key, label, tone }) => {
              const count = queues[key].length;
              return (
                <View key={key} style={[styles.familyRow, { gap: spacing.sm }]}>
                  <Relief
                    tone={tone}
                    onPress={() => start(key)}
                    disabled={count === 0}
                    borderRadius={radius.lg}
                    accessibilityLabel={`${label}, ${count} à trier`}
                    style={styles.familyButton}
                    faceStyle={[styles.familyFace, { paddingHorizontal: spacing.lg, gap: spacing.md }]}
                  >
                    {(ink) => (
                      <>
                        <View style={styles.glyph}>
                          <FamilyGlyph family={key} color={ink} />
                        </View>
                        <View style={styles.familyText}>
                          <Text style={[styles.familyLabel, { color: ink }]}>{label}</Text>
                          <Text style={[styles.familyCount, { color: ink }]}>
                            {count === 0 ? 'Tout est trié pour le moment' : `${count} pièce${count > 1 ? 's' : ''} à trier`}
                          </Text>
                        </View>
                        {count > 0 && <Ionicons name="chevron-forward" size={22} color={ink} />}
                      </>
                    )}
                  </Relief>

                  {/* Inventaire de cette famille seule, s'il y a des décisions à effacer. */}
                  {resettable[key].length > 0 && (
                    <Relief
                      tone="surface"
                      onPress={() => confirmInventory(key, label)}
                      borderRadius={radius.lg}
                      accessibilityLabel={`Tout retrier : ${label.toLowerCase()}`}
                      faceStyle={styles.inventoryFace}
                    >
                      {(ink) => <Ionicons name="refresh" size={24} color={ink} />}
                    </Relief>
                  )}
                </View>
              );
            })}
          </View>

        </View>
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen>
        <ScatteredButtons items={SCATTERED} />
        <View style={[styles.end, { gap: spacing.md }]}>
          <Bobine size={80} />
          <Text style={[typography.title, { color: colors.text, textAlign: 'center' }]}>
            {queue.length === 0 ? 'Rien à trier ici' : 'Tri terminé !'}
          </Text>
          <Text style={[typography.body, styles.endText, { color: colors.textMuted }]}>
            {queue.length === 0
              ? 'Toutes tes pièces ont été triées récemment. Reviens dans quelques jours !'
              : `${tally.keep} gardée${tally.keep > 1 ? 's' : ''} · ${tally.unsure} à revoir · ${tally.out} à sortir`}
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          {tally.out > 0 && (
            <Button
              label="Voir les pièces à sortir"
              icon={(ink) => <Ionicons name="cube" size={20} color={ink} />}
              onPress={() => router.replace('/sortie')}
            />
          )}
          <Button
            label="Trier une autre catégorie"
            variant="secondary"
            icon={(ink) => <Ionicons name="swap-horizontal" size={20} color={ink} />}
            onPress={chooseAgain}
          />
          <Button label="Retour à l'atelier" variant="surface" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  if (!piece) return <Screen>{null}</Screen>;

  const category = findCategory(piece.category);
  const uses = usage.get(piece.id) ?? 0;

  return (
    <Screen>
      <Text style={[styles.progress, { color: colors.textMuted }]}>
        {position + 1} / {queue.length}
      </Text>

      <View style={styles.stage}>
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.surfaceDeep,
                borderRadius: radius.xl,
                transform: [{ translateX: x }, { translateY: y }, { rotate }],
              },
            ]}
          >
            <View style={[styles.stitch, { borderColor: colors.stitch }]} />

            <View style={[styles.cardHead, { gap: spacing.xs }]}>
              <View
                style={[
                  styles.chip,
                  { backgroundColor: colors[colorNameForCategory(piece.category)], borderRadius: radius.full },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.onPrimary }]}>{category?.label ?? 'À classer'}</Text>
              </View>
              <Text style={[styles.usage, { color: uses === 0 ? colors.primary : colors.textMuted }]}>
                {uses === 0 ? 'Jamais dans une tenue' : `Dans ${uses} tenue${uses > 1 ? 's' : ''}`}
              </Text>
            </View>

            <PieceSticker uri={piece.uri} style={styles.sticker} />

            {/* Tampons qui apparaissent pendant le geste. */}
            <Animated.View style={[styles.stamp, styles.stampKeep, { borderColor: colors.secondary, opacity: keepOpacity }]}>
              <Text style={[styles.stampText, { color: colors.secondary }]}>Je garde</Text>
            </Animated.View>
            <Animated.View style={[styles.stamp, styles.stampUnsure, { borderColor: colors.accentDeep, opacity: unsureOpacity }]}>
              <Text style={[styles.stampText, { color: colors.accentDeep }]}>Je ne sais pas</Text>
            </Animated.View>
            <Animated.View style={[styles.stamp, styles.stampOut, { borderColor: colors.primary, opacity: outOpacity }]}>
              <Text style={[styles.stampText, { color: colors.primary }]}>Je trie</Text>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={[styles.actions, { paddingTop: spacing.md }]}>
        {(['unsure', 'out', 'keep'] as Verdict[]).map((verdict) => {
          const decision = DECISIONS[verdict];
          return (
            <View key={verdict} style={styles.action}>
              <Relief
                tone={decision.tone}
                onPress={() => decide(verdict)}
                borderRadius={radius.full}
                accessibilityLabel={decision.label}
                faceStyle={verdict === 'out' ? styles.actionBig : styles.actionFace}
              >
                {(ink) => <Ionicons name={decision.icon} size={verdict === 'out' ? 30 : 24} color={ink} />}
              </Relief>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{decision.label}</Text>
              <Text style={[styles.actionHint, { color: colors.textMuted }]}>{decision.hint}</Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { fontFamily: fonts.heading, fontSize: 14, textAlign: 'center' },
  stage: { flex: 1, justifyContent: 'center', paddingVertical: 12 },
  card: { flex: 1, borderBottomWidth: 5, padding: 18, overflow: 'hidden' },
  stitch: {
    position: 'absolute',
    top: 7,
    left: 7,
    right: 7,
    bottom: 7,
    borderWidth: 1.6,
    borderStyle: 'dashed',
    borderRadius: 26,
  },
  cardHead: { alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 5 },
  chipText: { fontFamily: fonts.heading, fontSize: 14 },
  usage: { fontFamily: fonts.bodyBold, fontSize: 12 },
  sticker: { flex: 1, margin: 14 },
  stamp: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 249, 240, 0.9)',
  },
  stampKeep: { top: 60, left: 22, transform: [{ rotate: '-12deg' }] },
  stampUnsure: { top: 60, right: 22, transform: [{ rotate: '12deg' }] },
  stampOut: { bottom: 40, alignSelf: 'center', transform: [{ rotate: '-4deg' }] },
  stampText: { fontFamily: fonts.display, fontSize: 20, textTransform: 'uppercase', letterSpacing: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  action: { alignItems: 'center', gap: 3, width: '32%' },
  actionFace: { width: 56, height: 56 },
  actionBig: { width: 68, height: 68 },
  actionLabel: { fontFamily: fonts.heading, fontSize: 13, marginTop: 3 },
  actionHint: { fontFamily: fonts.body, fontSize: 10.5 },
  end: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  choose: { flex: 1, justifyContent: 'center' },
  chooseHead: { alignItems: 'center' },
  familyRow: { flexDirection: 'row', alignItems: 'stretch' },
  familyButton: { flex: 1 },
  familyFace: { flexDirection: 'row', justifyContent: 'flex-start', minHeight: 84 },
  inventoryFace: { width: 58, minHeight: 84 },
  glyph: { width: 60, alignItems: 'center' },
  familyText: { flex: 1 },
  familyLabel: { fontFamily: fonts.heading, fontSize: 19 },
  familyCount: { fontFamily: fonts.bodyBold, fontSize: 13, opacity: 0.9, marginTop: 1 },
  endText: { textAlign: 'center', maxWidth: 300 },
});
