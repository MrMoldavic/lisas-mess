import { useEffect, useRef } from 'react';
import { Animated, Easing, useAnimatedValue } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  /** Décalage avant l'apparition, en millisecondes. */
  delay?: number;
  /** Remontée pendant le fondu, en pixels. `0` donne un fondu pur. */
  travel?: number;
  style?: StyleProp<ViewStyle>;
};

const DURATION = 420;
const DEFAULT_TRAVEL = 14;

/**
 * Fait apparaître son contenu en fondu, avec une légère remontée.
 *
 * Utilise l'API `Animated` de React Native plutôt que Reanimated : l'animation
 * se résume à une opacité et une translation, et `useNativeDriver` suffit à la
 * jouer sur le thread natif — inutile d'ajouter une dépendance pour ça.
 */
export function Reveal({ children, delay = 0, travel = DEFAULT_TRAVEL, style }: RevealProps) {
  const progress = useAnimatedValue(0);
  const delayRef = useRef(delay);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      delay: delayRef.current,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [travel, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
