import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  useFonts,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/Colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    if (!loading && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [loading, fontsLoaded]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      {/* A Stack (not a Slot) so pushed routes get native transitions and the
          iOS back-swipe; content routes present as sheets over the tabs. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.surface },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="content/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="content/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="deal/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="deal/[id]" options={{ presentation: 'modal' }} />
        {/* Vault browsing pushes rather than presenting — it's navigation, not a form. */}
        <Stack.Screen name="vault/[id]" />
        <Stack.Screen name="vault/album/[albumId]" />
        <Stack.Screen name="settings/profile" />
        <Stack.Screen name="settings/payment" />
        <Stack.Screen name="settings/notifications" />
        <Stack.Screen name="settings/privacy" />
        <Stack.Screen name="settings/support" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
});
