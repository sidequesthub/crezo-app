/**
 * Crezo Design System — Obsidian Flux / Digital Atelier
 * Based on: design/stitch_home_dashboard 2/obsidian_flux/DESIGN.md
 */

export const colors = {
  // Surface hierarchy (no-line rule: use tonal shifts, not borders)
  surface: '#131313',
  background: '#131313',
  surface_dim: '#131313',
  surface_container_lowest: '#0e0e0e',
  surface_container_low: '#1c1b1b',
  surface_container: '#201f1f',
  surface_container_high: '#2a2a2a',
  surface_container_highest: '#353534',
  surface_variant: '#353534',
  surface_bright: '#393939',

  // Primary — Electric Blue (brand)
  primary: '#adc6ff',
  primary_container: '#4b8eff',
  primary_fixed: '#d8e2ff',
  primary_fixed_dim: '#adc6ff',

  // Secondary — Warm Orange (urgency, "Look Here")
  secondary: '#ffbc7c',
  secondary_container: '#fe9400',
  secondary_fixed: '#ffdcbf',
  secondary_fixed_dim: '#ffb874',

  // Tertiary / neutral
  tertiary: '#c6c6c7',
  tertiary_fixed: '#e2e2e2',
  tertiary_fixed_dim: '#c6c6c7',
  tertiary_container: '#909191',

  // On-* (text on surfaces)
  on_surface: '#e5e2e1',
  on_background: '#e5e2e1',
  on_surface_variant: '#c1c6d7',
  on_primary: '#002e69',
  on_primary_container: '#00285c',
  on_secondary: '#4b2800',
  on_secondary_container: '#633700',
  on_tertiary: '#2f3131',
  on_tertiary_container: '#282a2a',

  // Outline (ghost border: use at 20% opacity)
  outline: '#8b90a0',
  outline_variant: '#414755',

  // Error
  error: '#ffb4ab',
  error_container: '#93000a',
  on_error: '#690005',
  on_error_container: '#ffdad6',

  // Inverse
  inverse_surface: '#e5e2e1',
  inverse_on_surface: '#313030',
  inverse_primary: '#005bc1',
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 16,
  4: 22.4,
  5: 28,
  6: 33.6,
  8: 44.8,
  10: 56,
  12: 67.2,
  16: 89.6,
  20: 112,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  // Display — Hero moments
  display_lg: {
    fontSize: 36,
    fontWeight: '800' as const,
    letterSpacing: -0.72,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  display_md: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.56,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  display_sm: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.48,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // Headlines
  headline_lg: {
    fontSize: 22,
    fontWeight: '700' as const,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  headline_md: {
    fontSize: 18,
    fontWeight: '600' as const,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  headline_sm: {
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  // Body
  body_lg: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 25.6,
    fontFamily: 'Manrope_400Regular',
  },
  body_md: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 22.4,
    fontFamily: 'Manrope_400Regular',
  },
  body_sm: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 19.2,
    fontFamily: 'Manrope_400Regular',
  },

  // Labels
  label_lg: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.7,
    fontFamily: 'Manrope_600SemiBold',
  },
  label_md: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.6,
    fontFamily: 'Manrope_500Medium',
  },
  label_sm: {
    fontSize: 10,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    fontFamily: 'Manrope_500Medium',
  },
} as const;
