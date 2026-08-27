import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { sendOtp, resendOtp, verifyOtp } from '@/lib/phoneAuth';

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  const otpInputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  function startResendTimer(seconds = 30) {
    setResendSeconds(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function formatPhoneDisplay(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(-10);
    if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    return raw;
  }

  async function handleSendOtp() {
    const cleaned = phone.replace(/\D/g, '').slice(-10);
    if (cleaned.length !== 10) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendOtp(cleaned);
      setStep('otp');
      startResendTimer(30);
      setTimeout(() => otpInputRef.current?.focus(), 120);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(value: string = otp) {
    if (value.length !== OTP_LENGTH) return;
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(phone.replace(/\D/g, '').slice(-10), value);
      // Root layout's auth listener will redirect to /(tabs).
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed');
      setOtp('');
      setLoading(false);
    }
  }

  function handleOtpChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digits);
    setError(null);
    if (digits.length === OTP_LENGTH) handleVerify(digits);
  }

  async function handleResend() {
    if (resendSeconds > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      await resendOtp(phone.replace(/\D/g, '').slice(-10));
      setOtp('');
      startResendTimer(30);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Resend failed');
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (step === 'otp') {
      setStep('phone');
      setOtp('');
      setError(null);
      if (timerRef.current) clearInterval(timerRef.current);
      setResendSeconds(0);
    } else {
      router.back();
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} style={styles.iconButton} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
          </Pressable>
          <Text style={styles.logo}>Crezo</Text>
          <View style={styles.iconButton} />
        </View>

        {step === 'phone' ? (
          <View style={styles.content}>
            <Text style={styles.eyebrow}>STEP 1 OF 2</Text>
            <Text style={styles.headline}>What's your{'\n'}phone number?</Text>
            <Text style={styles.subtitle}>
              We'll text you a 6-digit code to verify it's you. Standard rates may apply.
            </Text>

            <View style={styles.phoneCard}>
              <View style={styles.countryChip}>
                <Text style={styles.countryFlag}>🇮🇳</Text>
                <Text style={styles.countryCode}>+91</Text>
              </View>
              <View style={styles.divider} />
              <TextInput
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  setError(null);
                }}
                placeholder="98765 43210"
                placeholderTextColor={Colors.outline}
                keyboardType="phone-pad"
                style={styles.phoneInput}
                autoFocus
                maxLength={13}
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
              />
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.spacer} />

            <PrimaryButton
              label="Send code"
              onPress={handleSendOtp}
              loading={loading}
              disabled={phone.replace(/\D/g, '').length < 10}
            />
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.eyebrow}>STEP 2 OF 2</Text>
            <Text style={styles.headline}>Enter the{'\n'}6-digit code</Text>
            <Text style={styles.subtitle}>
              Sent to <Text style={styles.subtitleStrong}>{formatPhoneDisplay(phone)}</Text>
              {'  '}
              <Text style={styles.changeLink} onPress={handleBack}>Change</Text>
            </Text>

            <Pressable
              style={styles.otpRow}
              onPress={() => otpInputRef.current?.focus()}
            >
              {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                const isActive = i === otp.length;
                const isFilled = !!otp[i];
                return (
                  <View
                    key={i}
                    style={[
                      styles.otpCell,
                      isActive && styles.otpCellActive,
                      isFilled && styles.otpCellFilled,
                    ]}
                  >
                    <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
                    {isActive && !isFilled && <View style={styles.caret} />}
                  </View>
                );
              })}
            </Pressable>

            <TextInput
              ref={otpInputRef}
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              style={styles.hiddenInput}
              autoFocus
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
            />

            <View style={styles.resendRow}>
              <Pressable onPress={handleResend} disabled={resendSeconds > 0 || loading}>
                <Text
                  style={[
                    styles.resendLink,
                    (resendSeconds > 0 || loading) && styles.resendDisabled,
                  ]}
                >
                  {resendSeconds > 0
                    ? `Resend in 0:${String(resendSeconds).padStart(2, '0')}`
                    : 'Resend code'}
                </Text>
              </Pressable>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.spacer} />

            <PrimaryButton
              label="Verify"
              onPress={() => handleVerify()}
              loading={loading}
              disabled={otp.length !== OTP_LENGTH}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        styles.ctaWrap,
        (disabled || loading) && styles.ctaDisabled,
        pressed && styles.ctaPressed,
      ]}
    >
      <LinearGradient
        colors={disabled ? ['#3A4250', '#2A2F3A'] : ['#ADC6FF', '#4B8EFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cta}
      >
        {loading ? (
          <ActivityIndicator color={Colors.onPrimaryContainer} />
        ) : (
          <Text
            style={[
              styles.ctaText,
              disabled && { color: Colors.onSurfaceVariant },
            ]}
          >
            {label}
          </Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  logo: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 20,
    color: Colors.onSurface,
    letterSpacing: -0.4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 28,
    paddingTop: 24,
  },
  eyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.6,
    color: Colors.primary,
  },
  headline: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 36,
    color: Colors.onSurface,
    letterSpacing: -1,
    lineHeight: 40,
    marginTop: 12,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
    marginTop: 12,
  },
  subtitleStrong: {
    fontFamily: 'Manrope_600SemiBold',
    color: Colors.onSurface,
  },
  changeLink: {
    fontFamily: 'Manrope_600SemiBold',
    color: Colors.primary,
  },
  phoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 36,
    borderWidth: 1,
    borderColor: 'rgba(193, 198, 215, 0.08)',
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingRight: 12,
  },
  countryFlag: { fontSize: 18 },
  countryCode: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: Colors.onSurface,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(193, 198, 215, 0.15)',
  },
  phoneInput: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 18,
    color: Colors.onSurface,
    paddingVertical: 14,
    paddingHorizontal: 14,
    letterSpacing: 0.5,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 36,
    gap: 8,
  },
  otpCell: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 56,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(193, 198, 215, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  otpCellFilled: {
    backgroundColor: Colors.surfaceContainerHighest,
  },
  otpDigit: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 24,
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  caret: {
    position: 'absolute',
    width: 2,
    height: 22,
    backgroundColor: Colors.primary,
    borderRadius: 1,
    opacity: 0.7,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 28,
  },
  resendLink: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  resendDisabled: {
    color: Colors.onSurfaceVariant,
  },
  error: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
    marginTop: 16,
  },
  spacer: { flex: 1 },
  ctaWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#4B8EFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  cta: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: Colors.onPrimaryContainer,
    letterSpacing: 0.2,
  },
  ctaDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
