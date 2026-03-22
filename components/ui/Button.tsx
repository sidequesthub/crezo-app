/**
 * Primary CTA: Gradient (primary → primary_container)
 * Secondary: Glass with Ghost Border
 */

import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { borderRadius, colors, spacing, typography } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  style?: ViewStyle;
  disabled?: boolean;
}

export function Button({ title, onPress, variant = 'primary', style, disabled }: ButtonProps) {
  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.primaryPressable,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <LinearGradient
          colors={[colors.primary, colors.primary_container]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.primary, style]}
        >
          <Text style={styles.primaryText}>{title}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.secondary,
          pressed && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        <Text style={styles.secondaryText}>{title}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.tertiary, pressed && styles.pressed, style]}
    >
      <Text style={styles.tertiaryText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryPressable: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  primary: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    ...typography.label_lg,
    color: colors.on_primary_container,
  },
  secondary: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(53, 53, 52, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(65, 71, 85, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    ...typography.label_lg,
    color: colors.on_surface,
  },
  tertiary: {
    paddingVertical: spacing.2,
    paddingHorizontal: spacing.3,
    alignItems: 'center',
  },
  tertiaryText: {
    ...typography.label_md,
    color: colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
