import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, useAnimatedValue } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { ColorName } from '@/theme';

import { SewingButton } from './SewingButton';

export type SpinningButtonProps = {
  size: number;
  color: ColorName;
  /** Couleur des trous ; à défaut, une ombre neutre. */
  holes?: ColorName;
  /** Durée d'un tour complet, en millisecondes. */
  period: number;
  /** 1 sens horaire, -1 sens inverse. */
  direction?: 1 | -1;
  /** Placement (position absolue sur l'accueil, marge dans une rangée…). */
  style?: StyleProp<ViewStyle>;
};

/**
 * Un bouton de couture qui tourne sur lui-même, en boucle : le décor de
 * l'écran d'accueil et du tri. Il reste immobile si « Réduire les animations »
 * est activé sur le téléphone.
 */
export function SpinningButton({
  size,
  color,
  holes,
  period,
  direction = 1,
  style,
}: SpinningButtonProps) {
  const { colors } = useTheme();
  const turn = useAnimatedValue(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {});
  }, []);

  useEffect(() => {
    if (still) return;

    const loop = Animated.loop(
      Animated.timing(turn, { toValue: 1, duration: period, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [period, still, turn]);

  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${direction * 360}deg`] });

  return (
    <Animated.View pointerEvents="none" style={[style, { transform: [{ rotate }] }]}>
      <SewingButton
        size={size}
        color={colors[color]}
        holeColor={holes ? colors[holes] : 'rgba(0, 0, 0, 0.28)'}
      />
    </Animated.View>
  );
}
