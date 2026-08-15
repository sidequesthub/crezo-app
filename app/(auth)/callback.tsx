import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '@/lib/supabase';
import { View, Text } from 'react-native';

export default function CallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    const handleDeepLink = async () => {
      console.log('=== Callback route mounted ===');

      const processAuthCallback = async (url: string) => {
        try {
          console.log('Processing URL:', url);
          const { params, errorCode } = QueryParams.getQueryParams(url);

          console.log('Query params:', params);
          console.log('Error code:', errorCode);

          if (errorCode) throw new Error(`OAuth error: ${errorCode}`);

          const { access_token, refresh_token } = params;

          if (access_token && refresh_token) {
            console.log('Setting session with tokens...');
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (error) throw error;

            console.log('Session set successfully!');
            router.replace('/(tabs)');
          } else {
            throw new Error('Missing access_token or refresh_token');
          }
        } catch (error) {
          console.error('OAuth callback error:', error);
          router.replace('/(auth)/login');
        }
      };

      // Method 1: Check initial URL
      const url = await Linking.getInitialURL();
      console.log('Initial deep link URL:', url);

      if (url) {
        await processAuthCallback(url);
      }

      // Method 2: Listen for future deep links
      const subscription = Linking.addEventListener('url', ({ url: newUrl }) => {
        console.log('Deep link event received:', newUrl);
        processAuthCallback(newUrl);
      });

      return () => subscription.remove();
    };

    handleDeepLink();
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Processing authentication...</Text>
    </View>
  );
}
