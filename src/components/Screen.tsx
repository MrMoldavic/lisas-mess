import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';

type ScreenProps = {
  children: ReactNode;
  /** Passe le contenu dans une ScrollView (écrans longs / formulaires). */
  scrollable?: boolean;
};

/** Conteneur d'écran : safe area, fond du thème et padding standard. */
export function Screen({ children, scrollable = false }: ScreenProps) {
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {scrollable ? (
        <ScrollView style={styles.flex} contentContainerStyle={{ padding: spacing.md }}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, { padding: spacing.md }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
