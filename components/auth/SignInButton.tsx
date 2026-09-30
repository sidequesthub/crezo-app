import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Svg, Path } from 'react-native-svg';
import { Colors } from '@/constants/Colors';
import { Type, ButtonSize } from '@/constants/Typography';

type Provider = 'apple' | 'google';

/**
 * One component for every sign-in provider, so the buttons can't drift apart:
 * same height, radius, gap, icon size and label typography. Only the surface
 * differs — Apple's white (its guidelines for a custom button on a dark
 * background), Google's tonal glass.
 *
 * Not `AppleAuthenticationButton`: that native button sizes its own label from
 * its height and ignores our fonts, so it rendered visibly larger than Google's.
 * Apple permits custom buttons that use its logo and "Continue with Apple".
 */
export function SignInButton({
  provider,
  onPress,
  loading = false,
  disabled = false,
}: {
  provider: Provider;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const apple = provider === 'apple';
  const fg = apple ? '#000000' : Colors.onSurface;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={apple ? 'Continue with Apple' : 'Continue with Google'}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.base, apple ? styles.apple : styles.google, pressed && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          <View style={styles.icon}>
            {apple ? <Ionicons name="logo-apple" size={ICON} color={fg} /> : <GoogleLogo />}
          </View>
          <Text style={[styles.label, { color: fg }]}>
            {apple ? 'Continue with Apple' : 'Continue with Google'}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const ICON = ButtonSize.iconSize;

function GoogleLogo() {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24">
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
  base: {
    height: ButtonSize.height,
    borderRadius: ButtonSize.radius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ButtonSize.gap,
  },
  apple: {
    backgroundColor: '#FFFFFF',
  },
  google: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'rgba(193, 198, 215, 0.08)',
  },
  icon: {
    width: ICON,
    height: ICON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: Type.button,
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
