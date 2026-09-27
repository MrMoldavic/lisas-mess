import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold';
import { Fredoka_700Bold } from '@expo-google-fonts/fredoka/700Bold';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/theme';

/**
 * Layout racine : tout écran ajouté dans app/ hérite de cette Stack.
 *
 * `GestureHandlerRootView` doit envelopper toute l'application : sans elle, les
 * gestes déclarés plus bas — le glissement et le pincement des vêtements — ne
 * sont jamais reconnus, et ce, sans erreur visible.
 *
 * Les polices de l'atelier (voir `fonts` dans le thème) sont chargées avant le
 * premier écran : sans ça, les textes s'afficheraient un instant en police
 * système puis sauteraient. Seules les graisses utilisées sont embarquées.
 */
export default function RootLayout() {
  const { colors } = useTheme();
  const [loaded, error] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_600SemiBold,
    Nunito_800ExtraBold,
  });

  // Fond de la vue racine native : sans ça, iOS en mode sombre la laisse grise,
  // et elle apparaît derrière les écrans pendant les transitions.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  // Une police qui échoue ne doit pas bloquer l'app : on repart en police système.
  if (!loaded && !error) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.primary,
            headerTitleStyle: { fontFamily: fonts.heading, color: colors.text, fontSize: 19 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="atelier" options={{ headerShown: false, title: 'Atelier' }} />
          <Stack.Screen name="pieces" options={{ title: 'Ma garde-robe' }} />
          <Stack.Screen name="tenue" options={{ title: 'Sur le mannequin' }} />
          <Stack.Screen name="tri" options={{ title: 'Le tri' }} />
          <Stack.Screen name="sortie" options={{ title: 'À sortir' }} />
          <Stack.Screen name="+not-found" options={{ title: 'Introuvable' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
