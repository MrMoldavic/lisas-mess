import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Reveal } from '@/components';
import { useTheme } from '@/hooks/useTheme';
import type { ColorName } from '@/theme';

/** Les trois familles de pièces qui composent une tenue. */
const CATEGORIES: { emoji: string; label: string; color: ColorName; rotate: string }[] = [
  { emoji: '👕', label: 'Hauts', color: 'top', rotate: '-9deg' },
  { emoji: '👖', label: 'Bas', color: 'bottom', rotate: '3deg' },
  { emoji: '👟', label: 'Chaussures', color: 'shoes', rotate: '11deg' },
];

/**
 * Chronologie de l'ouverture : les cartes tombent une à une, la signature
 * apparaît au-dessus, puis le titre, et le bouton ferme la marche.
 */
const STEP = 500;
const KICKER_DELAY = CATEGORIES.length * STEP;
const TITLE_DELAY = KICKER_DELAY + STEP;
const CTA_DELAY = TITLE_DELAY + STEP;

export default function HomeScreen() {
  const { colors, gradients, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}
      >
        <View style={[styles.heading, { gap: spacing.sm }]}>
          <Reveal delay={TITLE_DELAY} travel={0}>
            <Text style={[styles.title, { color: colors.onHero }]}>Lisa&apos;s Mess</Text>
          </Reveal>

          <Reveal delay={KICKER_DELAY}>
            <Text style={[styles.kicker, { color: colors.onHero }]}>Ta garde-robe, rangée</Text>
          </Reveal>
        </View>

        <View style={styles.cards}>
          {CATEGORIES.map((category, index) => (
            <Reveal
              key={category.label}
              delay={index * STEP}
              style={{ marginLeft: index === 0 ? 0 : -spacing.md }}
            >
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    transform: [{ rotate: category.rotate }, { translateY: index * 6 }],
                  },
                ]}
              >
                <Text style={styles.cardEmoji}>{category.emoji}</Text>
                <Text style={[styles.cardLabel, { color: colors[category.color] }]}>
                  {category.label}
                </Text>
              </View>
            </Reveal>
          ))}
        </View>
      </LinearGradient>

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            gap: spacing.md,
          },
        ]}
      >
        <Reveal delay={TITLE_DELAY}>
          <Text style={[styles.tagline, { color: colors.textMuted }]}>
            Photographie tes habits, compose tes tenues, repère ce que tu ne portes plus.
          </Text>
        </Reveal>

        <Reveal delay={CTA_DELAY}>
          <Button label="Ouvrir" onPress={() => router.push('/pieces')} style={styles.cta} />
        </Reveal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 56,
    gap: 28,
  },
  heading: {
    alignItems: 'center',
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  cards: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: 96,
    height: 116,
    shadowColor: '#3A1220',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  cardEmoji: { fontSize: 34 },
  cardLabel: { fontSize: 12, fontWeight: '700' },
  sheet: {
    marginTop: -32,
    paddingTop: 32,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1.2,
    textAlign: 'center',
    // Le titre est posé sur le dégradé : une ombre douce le décolle des teintes claires.
    textShadowColor: 'rgba(58, 18, 32, 0.28)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 23,
  },
  cta: { marginTop: 8 },
});
