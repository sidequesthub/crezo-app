import { createTamagui, createTokens } from '@tamagui/core';
import { config as defaultConfig } from '@tamagui/config/v3';

const tokens = createTokens({
  ...defaultConfig.tokens,
  color: {
    ...defaultConfig.tokens.color,

    surface: '#131313',
    surfaceDim: '#131313',
    surfaceContainerLowest: '#0e0e0e',
    surfaceContainerLow: '#1c1b1b',
    surfaceContainer: '#201f1f',
    surfaceContainerHigh: '#2a2a2a',
    surfaceContainerHighest: '#353534',
    surfaceVariant: '#353534',
    surfaceBright: '#393939',

    primary: '#adc6ff',
    primaryContainer: '#4b8eff',
    primaryFixed: '#d8e2ff',

    secondary: '#ffbc7c',
    secondaryContainer: '#fe9400',

    tertiary: '#c6c6c7',
    tertiaryContainer: '#909191',

    onSurface: '#e5e2e1',
    onSurfaceVariant: '#c1c6d7',
    onPrimary: '#002e69',
    onSecondary: '#4b2800',

    outline: '#8b90a0',
    outlineVariant: '#414755',

    error: '#ffb4ab',
    errorContainer: '#93000a',

    inverseSurface: '#e5e2e1',
    inverseOnSurface: '#313030',
  },
});

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  tokens,
  themes: {
    dark: {
      background: tokens.color.surface,
      backgroundHover: tokens.color.surfaceContainerHigh,
      backgroundPress: tokens.color.surfaceContainerHighest,
      backgroundFocus: tokens.color.surfaceContainer,
      color: tokens.color.onSurface,
      colorHover: tokens.color.onSurface,
      colorPress: tokens.color.onSurfaceVariant,
      borderColor: tokens.color.outlineVariant,
      borderColorHover: tokens.color.outline,
      shadowColor: '#000000',
      placeholderColor: tokens.color.onSurfaceVariant,
    },
  },
  defaultTheme: 'dark',
});

export type AppConfig = typeof tamaguiConfig;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}
