import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Reveal, ScatteredButtons } from '@/components';
import type { Scattered } from '@/components';
import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/theme';

/**
 * Les boutons de couture qui tournent autour du titre : placés dans les marges
 * de l'écran pour ne jamais passer sous le texte, chacun à sa taille, sa
 * vitesse et son sens.
 */
const SPINNERS: Scattered[] = [
  { top: '9%', left: '10%', size: 46, color: 'primary', holes: 'primaryDeep', period: 7000, direction: 1 },
  { top: '14%', left: '72%', size: 32, color: 'secondary', holes: 'secondaryDeep', period: 5200, direction: -1 },
  { top: '27%', left: '80%', size: 54, color: 'accent', holes: 'accentDeep', period: 9000, direction: 1 },
  { top: '31%', left: '6%', size: 26, color: 'top', period: 5600, direction: -1 },
  { top: '63%', left: '8%', size: 40, color: 'bottom', period: 6400, direction: -1 },
  { top: '68%', left: '72%', size: 48, color: 'wood', holes: 'woodDeep', period: 8200, direction: 1 },
  { top: '77%', left: '34%', size: 28, color: 'spring', period: 4600, direction: 1 },
];

/**
 * Écran d'ouverture : le nom, la promesse de l'app et « Continuer ».
 *
 * La phrase d'accroche est à garder telle quelle. « Continuer » **remplace**
 * l'écran par l'atelier : le retour arrière ne ramène pas ici.
 */
export default function WelcomeScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + spacing.lg,
          paddingHorizontal: spacing.lg,
        },
      ]}
    >
      <ScatteredButtons items={SPINNERS} />

      <View style={[styles.center, { gap: spacing.md }]}>
        <Reveal travel={0}>
          <Text style={[styles.title, { color: colors.primary }]}>Lisa&apos;s Mess</Text>
        </Reveal>
        <Reveal delay={250}>
          <Text style={[styles.tagline, { color: colors.text }]}>
            Photographie tes habits, compose tes tenues, repère ce que tu ne portes plus.
          </Text>
        </Reveal>
      </View>

      <Reveal delay={500}>
        <Button
          label="Continuer"
          icon={(ink) => <Ionicons name="arrow-forward" size={20} color={ink} />}
          onPress={() => router.replace('/atelier')}
        />
      </Reveal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 48, letterSpacing: -0.5, textAlign: 'center' },
  tagline: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 300,
  },
});
