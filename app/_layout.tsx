import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';

/**
 * Layout racine : tout écran ajouté dans app/ hérite de cette Stack.
 *
 * `GestureHandlerRootView` doit envelopper toute l'application : sans elle, les
 * gestes déclarés plus bas — le glissement et le pincement des vêtements — ne
 * sont jamais reconnus, et ce, sans erreur visible.
 */
export default function RootLayout() {
  const { colors, scheme } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="pieces" options={{ title: 'Ma garde-robe' }} />
          <Stack.Screen name="tenue" options={{ title: 'Nouvelle tenue' }} />
          <Stack.Screen name="+not-found" options={{ title: 'Introuvable' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
