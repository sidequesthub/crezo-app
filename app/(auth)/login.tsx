import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Path, Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = 'crezo://auth/callback';

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (oauthError) throw oauthError;
      if (!data?.url) throw new Error('No auth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success') {
        const { params, errorCode } = QueryParams.getQueryParams(result.url);
        if (errorCode) throw new Error(errorCode);
        const { access_token, refresh_token } = params;
        if (!access_token) throw new Error('No access token');
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sign in failed';
      setError(msg);
      Alert.alert('Sign in error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Ambient atelier glow — subtle, mimics light hitting the obsidian surface */}
      <AmbientGlow />

      <View style={styles.header}>
        <Text style={styles.logo}>Crezo</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.heroBlock}>
          <Text style={styles.eyebrow}>YOUR CREATOR HQ</Text>
          <Text style={styles.headline}>
            The studio,{'\n'}
            <Text style={styles.headlineAccent}>unlocked.</Text>
          </Text>
          <Text style={styles.subtitle}>
            Manage deals, deliveries, and invoices in one premium workspace built for the modern Indian creator.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push('/(auth)/otp')}
            disabled={loading}
            style={({ pressed }) => [styles.primaryWrap, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={['#ADC6FF', '#4B8EFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButton}
            >
              <Ionicons name="phone-portrait-outline" size={18} color={Colors.onPrimaryContainer} />
              <Text style={styles.primaryText}>Continue with Phone</Text>
            </LinearGradient>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            onPress={signInWithGoogle}
            disabled={loading}
            style={({ pressed }) => [styles.glassButton, pressed && styles.pressed]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.onSurface} />
            ) : (
              <>
                <GoogleLogo />
                <Text style={styles.glassText}>Continue with Google</Text>
              </>
            )}
          </Pressable>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our{' '}
          <Text style={styles.footerLink}>Terms</Text>
          {' & '}
          <Text style={styles.footerLink}>Privacy</Text>
          {'.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

function AmbientGlow() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg height="100%" width="100%">
        <Defs>
          <RadialGradient id="glow" cx="0.7" cy="0.15" r="0.6">
            <Stop offset="0%" stopColor="#4B8EFF" stopOpacity="0.18" />
            <Stop offset="60%" stopColor="#4B8EFF" stopOpacity="0.04" />
            <Stop offset="100%" stopColor="#4B8EFF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="warm" cx="0.1" cy="0.95" r="0.5">
            <Stop offset="0%" stopColor="#FE9400" stopOpacity="0.10" />
            <Stop offset="100%" stopColor="#FE9400" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="75%" cy="12%" r="60%" fill="url(#glow)" />
        <Circle cx="10%" cy="95%" r="50%" fill="url(#warm)" />
      </Svg>
    </View>
  );
}

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logo: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 24,
  },
  heroBlock: {
    gap: 16,
  },
  eyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.6,
    color: Colors.primary,
  },
  headline: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 44,
    color: Colors.onSurface,
    letterSpacing: -1.2,
    lineHeight: 48,
  },
  headlineAccent: {
    color: Colors.primary,
    fontStyle: 'italic',
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    lineHeight: 24,
    marginTop: 4,
    maxWidth: 340,
  },
  actions: {
    gap: 16,
  },
  primaryWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#4B8EFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: 10,
  },
  primaryText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: Colors.onPrimaryContainer,
    letterSpacing: 0.1,
  },
  glassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    height: 56,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 198, 215, 0.08)',
  },
  glassText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    color: Colors.onSurface,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(193, 198, 215, 0.10)',
  },
  dividerText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.4,
  },
  error: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  footerLink: {
    fontFamily: 'Manrope_600SemiBold',
    color: Colors.onSurface,
    textDecorationLine: 'underline',
  },
});
