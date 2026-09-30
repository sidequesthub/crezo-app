import type { TextStyle } from 'react-native';

/**
 * The type scale. Pick a role, never a raw fontSize — see docs/ui-consistency.md.
 * Spread it and add only colour: `{ ...Type.body, color: Colors.onSurface }`.
 *
 * Fonts must be registered in app/_layout.tsx; an unregistered weight silently
 * falls back to the system font.
 */
export const Type = {
  /** Hero headline — login, onboarding. One per screen. */
  display: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 44, lineHeight: 48, letterSpacing: -1.2 },
  /** Screen title ("My Deals"). */
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  /** Section heading inside a screen. */
  heading: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, lineHeight: 26 },
  /** Card / list-item title. */
  subheading: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, lineHeight: 22 },
  /** Default reading text. */
  body: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 22 },
  /** Secondary text, metadata. */
  bodySmall: { fontFamily: 'Manrope_500Medium', fontSize: 13, lineHeight: 18 },
  /** Uppercase eyebrow / field label. */
  label: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' },
  /** Label of a full-width primary button (sign-in, form submit). */
  button: { fontFamily: 'Manrope_700Bold', fontSize: 16 },
  /** Inline text button / small CTA. */
  buttonSmall: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
} satisfies Record<string, TextStyle>;

/** Shared metrics for full-width primary buttons. */
export const ButtonSize = {
  height: 58,
  radius: 14,
  iconSize: 20,
  gap: 12,
} as const;
