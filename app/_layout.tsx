import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';

/**
 * Layout racine : tout écran ajouté dans app/ hérite de cette Stack.
 */
export default function RootLayout() {
  const { colors, scheme } = useTheme();

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Lisa's Mess" }} />
        <Stack.Screen name="details" options={{ title: 'Détail' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Introuvable' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
