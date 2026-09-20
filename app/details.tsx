import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components';
import { useTheme } from '@/hooks/useTheme';

/** Exemple d'écran lisant un paramètre de route (/details?id=…). */
export default function DetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors, spacing, typography } = useTheme();

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.heading, { color: colors.text }]}>Détail</Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          Paramètre reçu : {id ?? 'aucun'}
        </Text>
      </View>
    </Screen>
  );
}
