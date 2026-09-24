import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useAnimatedValue,
  useWindowDimensions,
} from 'react-native';
import type { GestureResponderEvent } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { clampScale } from '@/services';
import type { Piece } from '@/services';

type GarmentSliderProps = {
  pieces: Piece[];
  index: number;
  onIndexChange: (next: number) => void;
  /** Appelé au relâchement du pincement, avec l'échelle à enregistrer. */
  onScaleChange: (piece: Piece, scale: number) => void;
  /** Texte affiché quand la famille ne contient aucune pièce. */
  emptyLabel: string;
};

const DURATION_OUT = 160;
const DURATION_IN = 200;

/** Distance entre deux doigts, en pixels. */
function pinchDistance(event: GestureResponderEvent): number {
  const [a, b] = event.nativeEvent.touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

/**
 * Un poste de la tenue : le vêtement courant, deux flèches en surimpression, et
 * un pincement à deux doigts pour corriger son cadrage.
 *
 * Le changement de vêtement se joue en deux temps — il sort par un bord, l'index
 * change pendant qu'il est hors champ, puis le suivant entre par le bord opposé.
 * La translation vaut une largeur d'écran entière pour que la sortie paraisse
 * franchir le bord, et non s'arrêter au bord du composant.
 */
export function GarmentSlider({
  pieces,
  index,
  onIndexChange,
  onScaleChange,
  emptyLabel,
}: GarmentSliderProps) {
  const { colors, radius, typography } = useTheme();
  const { width } = useWindowDimensions();

  const translateX = useAnimatedValue(0);
  /** Empêche d'enchaîner deux glissements avant la fin du premier. */
  const animating = useRef(false);

  const piece = pieces[index] ?? null;
  const canCycle = pieces.length > 1;

  const scale = useAnimatedValue(piece?.scale ?? 1);
  /** Échelle au moment où le pincement commence, et écartement initial. */
  const pinchStart = useRef({ scale: 1, distance: 0 });
  /** Dernière valeur atteinte, lue au relâchement pour l'enregistrer. */
  const liveScale = useRef(piece?.scale ?? 1);

  // La pièce change sous nos pieds à chaque flèche : l'échelle doit suivre.
  useEffect(() => {
    const next = piece?.scale ?? 1;
    liveScale.current = next;
    scale.setValue(next);
  }, [piece?.id, piece?.scale, scale]);

  const pinch = useRef(
    PanResponder.create({
      // Un seul doigt ne revendique rien : les flèches restent cliquables et le
      // défilement de l'écran continue de fonctionner.
      onMoveShouldSetPanResponder: (event) => event.nativeEvent.touches.length === 2,
      onPanResponderGrant: (event) => {
        if (event.nativeEvent.touches.length !== 2) return;
        pinchStart.current = {
          scale: liveScale.current,
          distance: pinchDistance(event),
        };
      },
      onPanResponderMove: (event) => {
        if (event.nativeEvent.touches.length !== 2) return;

        const start = pinchStart.current;
        // Au premier mouvement à deux doigts, `grant` a pu se produire avec un
        // seul doigt posé : on fixe la référence ici si elle manque.
        if (start.distance === 0) {
          pinchStart.current = { scale: liveScale.current, distance: pinchDistance(event) };
          return;
        }

        const next = clampScale(start.scale * (pinchDistance(event) / start.distance));
        liveScale.current = next;
        scale.setValue(next);
      },
      onPanResponderRelease: () => {
        pinchStart.current = { scale: liveScale.current, distance: 0 };
        onReleaseRef.current();
      },
      onPanResponderTerminate: () => {
        pinchStart.current = { scale: liveScale.current, distance: 0 };
        onReleaseRef.current();
      },
    })
  ).current;

  /**
   * Le PanResponder est créé une seule fois, donc il capturerait les toutes
   * premières valeurs de `piece` et `onScaleChange`. Cette référence lui donne
   * toujours la version courante.
   */
  const onReleaseRef = useRef(() => {});
  onReleaseRef.current = () => {
    if (piece) onScaleChange(piece, liveScale.current);
  };

  const step = useCallback(
    (direction: -1 | 1) => {
      if (!canCycle || animating.current) return;
      animating.current = true;

      Animated.timing(translateX, {
        toValue: -direction * width,
        duration: DURATION_OUT,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        onIndexChange((index + direction + pieces.length) % pieces.length);
        translateX.setValue(direction * width);

        Animated.timing(translateX, {
          toValue: 0,
          duration: DURATION_IN,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          animating.current = false;
        });
      });
    },
    [canCycle, index, onIndexChange, pieces.length, translateX, width]
  );

  return (
    <View style={styles.container} {...pinch.panHandlers}>
      <Animated.View style={[styles.stage, { transform: [{ translateX }] }]}>
        {piece ? (
          <Animated.Image
            source={{ uri: piece.uri }}
            style={[styles.photo, { transform: [{ scale }] }]}
            resizeMode="contain"
          />
        ) : (
          <Text style={[typography.body, { color: colors.textMuted }]}>{emptyLabel}</Text>
        )}
      </Animated.View>

      <Arrow side="left" visible={canCycle} onPress={() => step(-1)} radius={radius.full} />
      <Arrow side="right" visible={canCycle} onPress={() => step(1)} radius={radius.full} />
    </View>
  );
}

type ArrowProps = {
  side: 'left' | 'right';
  visible: boolean;
  onPress: () => void;
  radius: number;
};

function Arrow({ side, visible, onPress, radius }: ArrowProps) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={side === 'left' ? 'Vêtement précédent' : 'Vêtement suivant'}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [
        styles.arrow,
        side === 'left' ? styles.arrowLeft : styles.arrowRight,
        {
          backgroundColor: colors.surface,
          borderRadius: radius,
          opacity: pressed ? 0.6 : 0.92,
        },
      ]}
    >
      <Text style={[styles.arrowGlyph, { color: colors.primary }]}>
        {side === 'left' ? '‹' : '›'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: { left: 0 },
  arrowRight: { right: 0 },
  arrowGlyph: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '600',
  },
});
