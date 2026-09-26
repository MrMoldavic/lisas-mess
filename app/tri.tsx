import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useAnimatedValue,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Bobine, Button, PieceSticker, Relief, Screen } from '@/components';
import type { Tone } from '@/components';
import { useTheme } from '@/hooks/useTheme';
import { listOutfits, listPieces, setVerdict, sortQueue, usageCounts } from '@/services';
import type { Piece, Verdict } from '@/services';
import { fonts } from '@/theme';
import { colorNameForCategory, findCategory } from '@/types';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Distance à parcourir pour que le geste compte comme une décision. */
const THRESHOLD = 110;
const FLY_OUT = 220;

type Tally = Record<Verdict, number>;

/** Les trois décisions, avec leur geste, leur libellé et leur couleur. */
const DECISIONS: Record<Verdict, { label: string; icon: IconName; tone: Tone; hint: string }> = {
  unsure: { label: 'Je ne sais pas', icon: 'help', tone: 'accent', hint: 'glisse à gauche' },
  donate: { label: 'Je trie', icon: 'cube', tone: 'primary', hint: 'glisse vers le haut' },
  keep: { label: 'Je garde', icon: 'heart', tone: 'secondary', hint: 'glisse à droite' },
};

/**
 * Le tri, une pièce à la fois : glisser à droite « je garde », à gauche « je ne
 * sais pas », vers le haut « je trie » (caisse « À donner »). Les boutons du bas
 * font la même chose, pour qui préfère toucher.
 *
 * La file est figée à l'ouverture (voir sortQueue) : décider d'une pièce ne
 * rebat pas les cartes suivantes.
 */
export default function SortScreen() {
  const { colors, radius, spacing, typography } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [queue, setQueue] = useState<Piece[]>([]);
  const [usage, setUsage] = useState<Map<string, number>>(new Map());
  const [position, setPosition] = useState(0);
  const [tally, setTally] = useState<Tally>({ keep: 0, unsure: 0, donate: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const outfits = listOutfits();
    setQueue(sortQueue(listPieces(), outfits));
    setUsage(usageCounts(outfits));
    setLoaded(true);
  }, []);

  const piece = queue[position] ?? null;
  const done = loaded && piece === null;

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

          if (-dy > THRESHOLD && -dy > Math.abs(dx)) decideRef.current('donate');
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
  const donateOpacity = y.interpolate({ inputRange: [-THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  if (done) {
    return (
      <Screen>
        <View style={[styles.end, { gap: spacing.md }]}>
          <Bobine size={80} />
          <Text style={[typography.title, { color: colors.text, textAlign: 'center' }]}>
            {queue.length === 0 ? 'Rien à trier pour le moment' : 'Tri terminé !'}
          </Text>
          <Text style={[typography.body, styles.endText, { color: colors.textMuted }]}>
            {queue.length === 0
              ? 'Toutes tes pièces ont été triées récemment. Reviens dans quelques jours !'
              : `${tally.keep} gardée${tally.keep > 1 ? 's' : ''} · ${tally.unsure} à revoir · ${tally.donate} dans la caisse`}
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          {tally.donate > 0 && (
            <Button
              label="Voir la caisse à donner"
              icon={(ink) => <Ionicons name="cube" size={20} color={ink} />}
              onPress={() => router.replace({ pathname: '/pieces', params: { filter: 'crate' } })}
            />
          )}
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
            <Animated.View style={[styles.stamp, styles.stampDonate, { borderColor: colors.primary, opacity: donateOpacity }]}>
              <Text style={[styles.stampText, { color: colors.primary }]}>Je trie</Text>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={[styles.actions, { paddingTop: spacing.md }]}>
        {(['unsure', 'donate', 'keep'] as Verdict[]).map((verdict) => {
          const decision = DECISIONS[verdict];
          return (
            <View key={verdict} style={styles.action}>
              <Relief
                tone={decision.tone}
                onPress={() => decide(verdict)}
                borderRadius={radius.full}
                accessibilityLabel={decision.label}
                faceStyle={verdict === 'donate' ? styles.actionBig : styles.actionFace}
              >
                {(ink) => <Ionicons name={decision.icon} size={verdict === 'donate' ? 30 : 24} color={ink} />}
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
  stampDonate: { bottom: 40, alignSelf: 'center', transform: [{ rotate: '-4deg' }] },
  stampText: { fontFamily: fonts.display, fontSize: 20, textTransform: 'uppercase', letterSpacing: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  action: { alignItems: 'center', gap: 3, width: '32%' },
  actionFace: { width: 56, height: 56 },
  actionBig: { width: 68, height: 68 },
  actionLabel: { fontFamily: fonts.heading, fontSize: 13, marginTop: 3 },
  actionHint: { fontFamily: fonts.body, fontSize: 10.5 },
  end: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  endText: { textAlign: 'center', maxWidth: 300 },
});
