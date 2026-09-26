import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/theme';

import { SewingButton } from './SewingButton';

/**
 * `pending` : la tenue en cours ne relève pas encore le défi.
 * `matched` : elle le relève, il suffit de l'enregistrer.
 * `done` : le défi du jour est déjà réussi.
 */
export type ChallengeState = 'pending' | 'matched' | 'done';

type ChallengeBannerProps = {
  label: string;
  reward: number;
  state: ChallengeState;
};

/**
 * Rappel compact du défi du jour, en haut du composeur : même carte moutarde
 * cousue qu'à l'accueil, en une seule ligne, avec l'état de la tenue en cours.
 */
export function ChallengeBanner({ label, reward, state }: ChallengeBannerProps) {
  const { colors, radius } = useTheme();
  const ok = state !== 'pending';

  return (
    <View
      accessible
      accessibilityLabel={`Défi du jour : ${label}. ${
        state === 'done' ? 'Déjà réussi.' : state === 'matched' ? 'Ta tenue le relève.' : ''
      }`}
      style={[
        styles.banner,
        { backgroundColor: colors.accent, borderBottomColor: colors.accentDeep, borderRadius: radius.md },
      ]}
    >
      <View style={[styles.stitch, { borderColor: colors.accentDeep }]} />
      <View style={[styles.icon, { backgroundColor: colors.secondary, borderBottomColor: colors.secondaryDeep }]}>
        <Ionicons name="ribbon" size={15} color={colors.onSecondary} />
      </View>

      <View style={styles.text}>
        <Text style={[styles.kicker, { color: colors.onAccent }]}>Défi du jour</Text>
        <Text style={[styles.label, { color: colors.onAccent }]} numberOfLines={2}>
          {label}
        </Text>
      </View>

      {ok ? (
        <View style={[styles.chip, { backgroundColor: colors.secondary }]}>
          <Ionicons name="checkmark" size={14} color={colors.onSecondary} />
          <Text style={[styles.chipText, { color: colors.onSecondary }]}>
            {state === 'done' ? 'Réussi' : 'Relevé'}
          </Text>
        </View>
      ) : (
        <View style={[styles.chip, { backgroundColor: colors.surface }]}>
          <Text style={[styles.chipText, { color: colors.accentDeep }]}>+{reward}</Text>
          <SewingButton size={11} color={colors.accent} holeColor={colors.accentDeep} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderBottomWidth: 3,
  },
  stitch: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderRadius: 10,
    opacity: 0.55,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
  },
  text: { flex: 1 },
  kicker: { fontFamily: fonts.heading, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.8 },
  label: { fontFamily: fonts.heading, fontSize: 14, lineHeight: 17 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  chipText: { fontFamily: fonts.heading, fontSize: 12 },
});
