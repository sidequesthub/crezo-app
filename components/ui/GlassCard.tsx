/**
 * Creator Glass Widget — high-level metrics card
 * surface_container_high with outline_variant (10% opacity) and primary glow
 */

import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { borderRadius, colors } from '@/constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GlassCard({ children, style }: GlassCardProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.glow} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(53, 53, 52, 0.4)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(65, 71, 85, 0.1)',
    overflow: 'hidden',
    padding: 24,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}0D`,
    opacity: 0.5,
  },
});
