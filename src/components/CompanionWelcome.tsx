import { useEffect } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View, useAnimatedValue, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import type { ShopItem } from '@/services';
import { fonts } from '@/theme';
import type { ColorName } from '@/theme';

import { Button } from './Button';
import { Confetti } from './Confetti';
import { Mascot } from './Mascot';
import { FABRIC_INK } from './SlotBands';

/** Pastel fabric behind each newcomer, taken from the coupon tints. */
const WELCOME_FABRICS: Record<string, ColorName> = {
  bobine: 'fullSoft',
  chaussette: 'fullSoft',
  timbre: 'bottomSoft',
  pique: 'topSoft',
  roucoule: 'bottomSoft',
  grignote: 'shoesSoft',
  myopie: 'shoesSoft',
  'jean-miette': 'bottomSoft',
  cubik: 'topSoft',
  pif: 'fullSoft',
};

/** Height taken by the title, the button, the gaps and the margins around the companion. */
const RESERVED_HEIGHT = 300;

/** One swing, from one side to the other, in ms. */
const SWING = 1100;

type CompanionWelcomeProps = {
  /** The companion just bought; `null` hides the page. */
  companion: ShopItem | null;
  onContinue: () => void;
};

/** Full-screen welcome after buying a companion: it rocks 20° each way under confetti. */
export function CompanionWelcome({ companion, onContinue }: CompanionWelcomeProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const sway = useAnimatedValue(0);

  useEffect(() => {
    if (!companion) return;
    sway.setValue(0);
    // Each lap starts and ends upright at full speed (out, in-out, then in): the loop's reset to 0 is seamless.
    const swing = (toValue: number, duration: number, easing: (t: number) => number) =>
      Animated.timing(sway, { toValue, duration, easing, useNativeDriver: true });
    const animation = Animated.loop(
      Animated.sequence([
        swing(1, SWING / 2, Easing.out(Easing.sin)),
        swing(-1, SWING, Easing.inOut(Easing.sin)),
        swing(0, SWING / 2, Easing.in(Easing.sin)),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [companion, sway]);

  if (!companion) return null;

  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-20deg', '20deg'] });
  // As big as the screen allows once the title, the button and their gaps are placed (drawings are 60×70).
  const room = height - insets.top - insets.bottom - RESERVED_HEIGHT;
  const mascotSize = Math.max(140, Math.min(270, width * 0.68, (room * 60) / 70));

  return (
    <Modal visible animationType="fade" onRequestClose={onContinue}>
      <View style={[styles.root, { backgroundColor: colors[WELCOME_FABRICS[companion.id] ?? 'surfaceAlt'] }]}>
        <View
          pointerEvents="none"
          style={[styles.seam, { top: insets.top + 10, bottom: insets.bottom + 10 }]}
        />

        {/* Title, companion and button kept together in the middle of the screen. */}
        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top + spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              paddingHorizontal: spacing.xl,
            },
          ]}
        >
          <View style={styles.titles}>
            <Text style={styles.kicker}>Bienvenue à</Text>
            <Text style={styles.name}>{companion.name} !</Text>
          </View>

          {/* Rocks from its base, like a toy set down on the table. */}
          <Animated.View style={[styles.mascot, { transform: [{ rotate }], transformOrigin: 'bottom' }]}>
            <Mascot avatar={companion.id} size={mascotSize} outline={5} shadow={false} />
          </Animated.View>

          <Button label="Continuer" onPress={onContinue} style={styles.continue} />
        </View>

        <Confetti duration={4200} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  seam: {
    position: 'absolute',
    left: 10,
    right: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(74, 58, 51, 0.28)',
    borderRadius: 18,
  },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titles: { alignItems: 'center', gap: 2 },
  mascot: { marginTop: 24, marginBottom: 32 },
  kicker: { fontFamily: fonts.heading, fontSize: 20, color: FABRIC_INK, opacity: 0.8 },
  name: { fontFamily: fonts.display, fontSize: 42, letterSpacing: -0.5, color: FABRIC_INK, textAlign: 'center' },
  continue: { width: '100%', maxWidth: 340 },
});
