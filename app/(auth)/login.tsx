import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { colors, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

type AuthMode = 'choose' | 'phone' | 'phone_otp' | 'email';

export default function LoginScreen() {
  const {
    signIn,
    signUp,
    signInWithGoogle,
    sendOtp,
    verifyOtp,
    supabaseConfigured,
  } = useAuth();

  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [mode, setMode] = useState<AuthMode>('choose');
  const [phone, setPhone] = useState('+91 ');
  const [otpCode, setOtpCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const otpInputRef = useRef<TextInput>(null);

  if (!supabaseConfigured) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.logo}>Crezo</Text>
        <Text style={styles.tagline}>
          The creator business OS{'\n'}built for India
        </Text>
        <View style={styles.configCard}>
          <Ionicons name="warning-outline" size={24} color={colors.secondary} />
          <Text style={styles.configHint}>
            Connect Supabase to get started. Add EXPO_PUBLIC_SUPABASE_URL and
            EXPO_PUBLIC_SUPABASE_ANON_KEY to your environment.
          </Text>
        </View>
      </View>
    );
  }

  async function handleGoogleSignIn() {
    setMessage(null);
    setSubmitting(true);
    const { error } = await signInWithGoogle();
    setSubmitting(false);
    if (error) setMessage(error.message);
  }

  async function handleSendOtp() {
    setMessage(null);
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length < 12) {
      setMessage('Enter a valid phone number with country code');
      return;
    }
    setSubmitting(true);
    const { error } = await sendOtp(cleaned);
    setSubmitting(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMode('phone_otp');
    setTimeout(() => otpInputRef.current?.focus(), 300);
  }

  async function handleVerifyOtp() {
    setMessage(null);
    if (otpCode.length < 6) {
      setMessage('Enter the 6-digit code');
      return;
    }
    setSubmitting(true);
    const cleaned = phone.replace(/\s/g, '');
    const { error } = await verifyOtp(cleaned, otpCode);
    setSubmitting(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.replace('/(tabs)');
  }

  async function handleEmailSubmit() {
    setMessage(null);
    if (!email.trim() || !password) {
      setMessage('Enter email and password');
      return;
    }
    setSubmitting(true);
    const fn = emailMode === 'signin' ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isWide && styles.scrollWide,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, isWide && styles.cardWide]}>
          <View style={styles.header}>
            <Text style={styles.logo}>Crezo</Text>
            <Text style={styles.tagline}>
              The creator business OS{'\n'}built for India
            </Text>
          </View>

          {mode === 'choose' && (
            <View style={styles.methodsContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  pressed && styles.pressed,
                ]}
                onPress={handleGoogleSignIn}
                disabled={submitting}
              >
                <Ionicons name="logo-google" size={20} color={colors.on_surface} />
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => { setMode('phone'); setMessage(null); }}
              >
                <Ionicons name="call-outline" size={20} color={colors.on_surface} />
                <Text style={styles.socialButtonText}>
                  Continue with phone number
                </Text>
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.emailLink,
                  pressed && styles.pressed,
                ]}
                onPress={() => { setMode('email'); setMessage(null); }}
              >
                <Text style={styles.emailLinkText}>Sign in with email</Text>
              </Pressable>
            </View>
          )}

          {mode === 'phone' && (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Enter your mobile number</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.on_surface_variant}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                autoFocus
              />
              <GradientButton
                title="Send OTP"
                onPress={handleSendOtp}
                disabled={submitting}
              />
              <BackLink onPress={() => { setMode('choose'); setMessage(null); }} />
            </View>
          )}

          {mode === 'phone_otp' && (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Enter verification code</Text>
              <Text style={styles.formHint}>Sent to {phone}</Text>
              <TextInput
                ref={otpInputRef}
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor={colors.on_surface_variant}
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={setOtpCode}
              />
              <GradientButton
                title="Verify"
                onPress={handleVerifyOtp}
                disabled={submitting}
              />
              <Pressable onPress={handleSendOtp}>
                <Text style={styles.resendText}>Resend code</Text>
              </Pressable>
              <BackLink onPress={() => { setMode('phone'); setMessage(null); setOtpCode(''); }} />
            </View>
          )}

          {mode === 'email' && (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>
                {emailMode === 'signin' ? 'Sign in' : 'Create account'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.on_surface_variant}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.on_surface_variant}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <GradientButton
                title={emailMode === 'signin' ? 'Sign in' : 'Create account'}
                onPress={handleEmailSubmit}
                disabled={submitting}
              />
              <Pressable
                onPress={() =>
                  setEmailMode(emailMode === 'signin' ? 'signup' : 'signin')
                }
                style={styles.toggleEmail}
              >
                <Text style={styles.toggleEmailText}>
                  {emailMode === 'signin'
                    ? 'Need an account? Sign up'
                    : 'Already have an account? Sign in'}
                </Text>
              </Pressable>
              <BackLink onPress={() => { setMode('choose'); setMessage(null); }} />
            </View>
          )}

          {message && <Text style={styles.error}>{message}</Text>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function GradientButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.gradientWrapper,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <LinearGradient
        colors={[colors.primary, colors.primary_container]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientButton}
      >
        <Text style={styles.gradientButtonText}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function BackLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.backLink}>
      <Ionicons name="arrow-back" size={16} color={colors.on_surface_variant} />
      <Text style={styles.backLinkText}>Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  scrollWide: {
    alignItems: 'center',
  },
  card: {
    width: '100%',
    gap: 24,
  },
  cardWide: {
    maxWidth: 440,
  },
  fallback: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
  },
  configCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 20,
    backgroundColor: colors.surface_container_high,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(65, 71, 85, 0.15)',
    marginTop: 24,
    maxWidth: 400,
  },
  configHint: {
    ...typography.body_sm,
    color: colors.on_surface_variant,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 40,
    letterSpacing: -1.5,
    color: colors.on_surface,
    marginBottom: 12,
  },
  tagline: {
    ...typography.body_lg,
    color: colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: 28,
  },
  methodsContainer: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.surface_container_high,
    borderWidth: 1,
    borderColor: 'rgba(65, 71, 85, 0.15)',
  },
  socialButtonText: {
    ...typography.label_lg,
    color: colors.on_surface,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surface_container_highest,
  },
  dividerText: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
    textTransform: 'uppercase',
  },
  emailLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emailLinkText: {
    ...typography.body_md,
    color: colors.primary,
    fontWeight: '600',
  },
  formContainer: {
    gap: 16,
  },
  formTitle: {
    ...typography.headline_md,
    color: colors.on_surface,
  },
  formHint: {
    ...typography.body_sm,
    color: colors.on_surface_variant,
    marginTop: -8,
  },
  input: {
    ...typography.body_md,
    color: colors.on_surface,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(65, 71, 85, 0.2)',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  gradientWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientButtonText: {
    ...typography.label_lg,
    color: colors.on_primary_container,
  },
  resendText: {
    ...typography.body_sm,
    color: colors.primary,
    textAlign: 'center',
  },
  toggleEmail: {
    alignItems: 'center',
  },
  toggleEmailText: {
    ...typography.body_md,
    color: colors.primary,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  backLinkText: {
    ...typography.body_sm,
    color: colors.on_surface_variant,
  },
  error: {
    ...typography.body_sm,
    color: colors.error,
    textAlign: 'center',
    backgroundColor: 'rgba(147, 0, 10, 0.15)',
    padding: 12,
    borderRadius: 8,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
