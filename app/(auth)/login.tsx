import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '@/lib/supabase';
import { canUseNativeGoogleSignIn, getGoogleIdToken } from '@/lib/googleSignIn';
import { appleSignInAvailable, signInWithApple } from '@/lib/appleSignIn';
import { SignInButton } from '@/components/auth/SignInButton';
import { Colors } from '@/constants/Colors';
import { Wordmark } from '@/components/brand/Wordmark';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = 'crezo://auth/callback';

const TERMS_URL = 'https://www.crezo.studio/terms';
const PRIVACY_URL = 'https://www.crezo.studio/privacy';

function openLegal(url: string) {
  WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    controlsColor: Colors.primary,
    toolbarColor: Colors.surface,
  }).catch(() => {});
}

export default function LoginScreen() {
  const [pending, setPending] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    appleSignInAvailable().then(setAppleAvailable);
  }, []);

  async function handleApple() {
    setPending('apple');
    setError(null);
    try {
      await signInWithApple();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sign in failed';
      setError(msg);
      Alert.alert('Sign in error', msg);
    } finally {
      setPending(null);
    }
  }

  async function signInWithGoogle() {
    setPending('google');
    setError(null);
    try {
      // Native sheet names Crezo; the web flow below shows the Supabase domain.
      if (canUseNativeGoogleSignIn()) {
        const idToken = await getGoogleIdToken();
        if (!idToken) return; // user cancelled
        const { error: idError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });
        if (idError) throw idError;
        return;
      }

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
      setPending(null);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Ambient atelier glow — subtle, mimics light hitting the obsidian surface */}
      <AmbientGlow />

      <View style={styles.content}>
        <View style={styles.heroBlock}>
          {/* The brand leads the hero rather than hiding in the corner. */}
          <View style={styles.brand}>
            <Wordmark size={40} />
          </View>
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
          {appleAvailable && (
            <SignInButton
              provider="apple"
              onPress={handleApple}
              loading={pending === 'apple'}
              disabled={pending !== null}
            />
          )}
          <SignInButton
            provider="google"
            onPress={signInWithGoogle}
            loading={pending === 'google'}
            disabled={pending !== null}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our{' '}
          <Text
            accessibilityRole="link"
            onPress={() => openLegal(TERMS_URL)}
            style={styles.footerLink}
            suppressHighlighting={false}
          >
            Terms
          </Text>
          {' & '}
          <Text
            accessibilityRole="link"
            onPress={() => openLegal(PRIVACY_URL)}
            style={styles.footerLink}
            suppressHighlighting={false}
          >
            Privacy
          </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  heroBlock: {
    // Centred in the space above the button, so the screen has no dead middle.
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  brand: {
    marginBottom: 20,
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
