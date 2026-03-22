/**
 * ₹ symbol in tertiary_fixed_dim — focus on numerical value
 */

import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';

interface CurrencyDisplayProps {
  amount: string | number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'secondary';
}

export function CurrencyDisplay({ amount, size = 'md', variant = 'default' }: CurrencyDisplayProps) {
  const value = typeof amount === 'number' ? amount.toLocaleString('en-IN') : amount;

  const valueColor =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
        ? colors.secondary
        : colors.on_surface;

  const fontSize = size === 'sm' ? 16 : size === 'md' ? 24 : 32;

  return (
    <View style={styles.container}>
      <Text style={[styles.rupee, { fontSize: fontSize * 0.7 }]}>₹</Text>
      <Text style={[styles.value, { fontSize, color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  rupee: {
    ...typography.body_md,
    fontWeight: '600',
    color: colors.tertiary_fixed_dim,
  },
  value: {
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.5,
  },
});
