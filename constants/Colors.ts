/**
 * Crezo color palette — Obsidian Flux design system
 * Re-exports from theme for backward compatibility
 */

import { colors } from './theme';

// Legacy export for existing components
export default {
  light: {
    text: colors.on_surface,
    background: colors.surface,
    tint: colors.primary,
    tabIconDefault: colors.tertiary_fixed_dim,
    tabIconSelected: colors.primary,
  },
  dark: {
    text: colors.on_surface,
    background: colors.surface,
    tint: colors.primary,
    tabIconDefault: colors.tertiary_fixed_dim,
    tabIconSelected: colors.primary,
  },
};

export { colors };
