import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

export default function NotFoundScreen() {
  const { colors, spacing, typography } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Oups' }} />
      <View style={[styles.container, { backgroundColor: colors.background, gap: spacing.sm }]}>
        <Text style={[typography.heading, { color: colors.text }]}>Cette page n&apos;existe pas.</Text>
        <Link href="/atelier" style={[typography.body, { color: colors.primary }]}>
          Retour à l&apos;atelier
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
