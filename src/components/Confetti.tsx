import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, useAnimatedValue, useWindowDimensions } from 'react-native';

import { useShop } from '@/hooks/useShop';
import { useTheme } from '@/hooks/useTheme';
import type { ColorName } from '@/theme';

/** Glyph of each confetti style sold in the shop (an emoji keeps its own colors); plain paper strips otherwise. */
export const CONFETTI_GLYPHS: Record<string, string> = {
  'confettis-coeurs': '♥',
  'confettis-etoiles': '★',
  'confettis-cacas': '💩',
};

type ConfettiProps = {
  /** Appelé une fois la dernière particule éteinte. */
  onDone?: () => void;
  /** Duration of the whole fall, in ms; longer means slower confetti. */
  duration?: number;
  /** A given confetti style, for shop previews; the equipped one otherwise. */
  variant?: string | null;
};

const PARTICLE_COUNT = 140;
const DURATION = 2000;

/**
 * Nombre de points échantillonnés par trajectoire.
 *
 * `interpolate` relie ses points par des segments droits. Trois points
 * suffisaient à décrire « monte puis descend », mais produisaient un angle vif
 * au sommet : la vitesse s'inversait d'un seul coup. En échantillonnant la
 * parabole, les segments deviennent assez courts pour que l'œil ne voie plus la
 * brisure, et la décélération à la montée comme l'accélération à la chute
 * apparaissent d'elles-mêmes.
 */
const SAMPLES = 24;

/** Les confettis reprennent les couleurs de l'app plutôt qu'un arc-en-ciel générique. */
const CONFETTI_COLORS: ColorName[] = [
  'primary',
  'top',
  'bottom',
  'shoes',
  'spring',
  'summer',
  'winter',
];

type Particle = {
  colorName: ColorName;
  /** Déplacement horizontal total, en fraction de la largeur de l'écran. */
  driftX: number;
  /** Hauteur du sommet de la trajectoire, en fraction de la hauteur. */
  rise: number;
  /** Profondeur de chute finale, en fraction de la hauteur. */
  fall: number;
  spin: number;
  width: number;
  height: number;
  delay: number;
};

function buildParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    colorName: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    driftX: (Math.random() - 0.5) * 1.6,
    rise: 0.18 + Math.random() * 0.32,
    fall: 0.55 + Math.random() * 0.6,
    spin: (Math.random() - 0.5) * 1080,
    width: 6 + Math.random() * 6,
    height: 10 + Math.random() * 8,
    delay: Math.random() * 0.12,
  }));
}

/**
 * Trajectoire balistique : `y(u) = v0·u + ½·g·u²`, avec `u` le temps normalisé.
 *
 * Les deux inconnues sont fixées par ce qu'on veut voir : le sommet vaut
 * exactement `rise` et l'arrivée exactement `fall`. Il n'y a donc aucun réglage
 * arbitraire, et la courbe est dérivable partout — c'est ce qui la rend fluide.
 */
function ballistic(rise: number, fall: number): (u: number) => number {
  const s = Math.sqrt(1 + fall / rise);
  const v0 = -2 * rise * (1 + s);
  const g = (v0 * v0) / (2 * rise);

  return (u) => v0 * u + 0.5 * g * u * u;
}

/** Amortit la dérive horizontale, comme freinée par l'air. */
function drag(u: number): number {
  return 1 - (1 - u) * (1 - u);
}

/** Extinction douce sur le dernier tiers, sans rupture de pente. */
function fade(u: number): number {
  const startFading = 0.62;
  if (u <= startFading) return 1;

  const t = (u - startFading) / (1 - startFading);
  // Lissage cubique : pente nulle aux deux extrémités.
  return 1 - t * t * (3 - 2 * t);
}

/**
 * Gerbe de confettis partant du centre de l'écran.
 *
 * Une seule valeur animée pilote toutes les particules : chacune n'est qu'un jeu
 * d'interpolations de cette progression. Autant d'`Animated.Value` indépendantes
 * seraient inutilement coûteuses, alors qu'ici tout se joue sur le fil natif —
 * seules des transformations et l'opacité sont animées.
 */
export function Confetti({ onDone, duration = DURATION, variant }: ConfettiProps) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const equipped = useShop().confetti;
  const glyph = CONFETTI_GLYPHS[(variant === undefined ? equipped : variant) ?? ''];

  const progress = useAnimatedValue(0);
  const particles = useMemo(buildParticles, []);

  /**
   * Chaque trajectoire est échantillonnée une fois pour toutes. Le délai propre
   * à la particule resserre sa fenêtre utile dans `[delay, 1]`.
   */
  const tracks = useMemo(
    () =>
      particles.map((particle) => {
        const curve = ballistic(particle.rise, particle.fall);
        const span = 1 - particle.delay;

        const input: number[] = [];
        const offsetX: number[] = [];
        const offsetY: number[] = [];
        const alpha: number[] = [];

        for (let i = 0; i <= SAMPLES; i++) {
          const u = i / SAMPLES;
          input.push(particle.delay + span * u);
          offsetX.push(particle.driftX * width * drag(u));
          offsetY.push(curve(u) * height);
          alpha.push(fade(u));
        }

        return { input, offsetX, offsetY, alpha };
      }),
    [particles, width, height]
  );

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      // Le temps doit rester linéaire : toute la dynamique est dans la
      // trajectoire. Une accélération ici la déformerait deux fois.
      easing: Easing.linear,
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) onDone?.();
    });

    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View pointerEvents="none" style={styles.layer}>
      {particles.map((particle, i) => {
        const track = tracks[i];

        const translateX = progress.interpolate({
          inputRange: track.input,
          outputRange: track.offsetX,
          extrapolate: 'clamp',
        });

        const translateY = progress.interpolate({
          inputRange: track.input,
          outputRange: track.offsetY,
          extrapolate: 'clamp',
        });

        const opacity = progress.interpolate({
          inputRange: track.input,
          outputRange: track.alpha,
          extrapolate: 'clamp',
        });

        const rotate = progress.interpolate({
          inputRange: [particle.delay, 1],
          outputRange: ['0deg', `${particle.spin}deg`],
          extrapolate: 'clamp',
        });

        if (glyph) {
          return (
            <Animated.Text
              key={i}
              style={[
                styles.particle,
                {
                  fontSize: particle.height + 4,
                  color: colors[particle.colorName],
                  opacity,
                  transform: [{ translateX }, { translateY }, { rotate }],
                },
              ]}
            >
              {glyph}
            </Animated.Text>
          );
        }

        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                width: particle.width,
                height: particle.height,
                backgroundColor: colors[particle.colorName],
                opacity,
                transform: [{ translateX }, { translateY }, { rotate }],
              },
            ]}
          />
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    borderRadius: 2,
  },
});
