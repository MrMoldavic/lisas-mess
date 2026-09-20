import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';

type ScreenProps = {
  children: ReactNode;
  /** Passe le contenu dans une ScrollView (écrans longs / formulaires). */
  scrollable?: boolean;
  /**
   * Bords où appliquer la zone de sécurité.
   *
   * Par défaut, uniquement `bottom` : ces écrans sont affichés sous un en-tête
   * de navigation, qui occupe déjà l'encoche haute. Ajouter `top` ici la
   * compterait une seconde fois et creuserait un vide sous l'en-tête. Un écran
   * sans en-tête doit passer `['top', 'bottom']` explicitement.
   */
  edges?: readonly Edge[];
};

/** Conteneur d'écran : zone de sécurité, fond du thème et padding standard. */
export function Screen({ children, scrollable = false, edges = ['bottom'] }: ScreenProps) {
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={edges}>
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
