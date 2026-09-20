import { Link, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components';
import { useTheme } from '@/hooks/useTheme';

export default function HomeScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();

  return (
    <Screen>
      <View style={[styles.content, { gap: spacing.md }]}>
        <Text style={[typography.title, { color: colors.text }]}>Lisa&apos;s Mess</Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          Structure de départ : Expo + TypeScript + expo-router. Les écrans se créent en
          ajoutant un fichier dans app/.
        </Text>

        <Button label="Aller au détail" onPress={() => router.push('/details?id=42')} />

        <Link href="/details?id=7" style={[typography.caption, { color: colors.primary }]}>
          …ou via un composant Link
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
});
