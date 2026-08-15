import { View, StyleSheet, ViewProps } from 'react-native';
import { Svg, Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { Colors } from '@/constants/Colors';

type GlowColor = 'primary' | 'secondary' | 'neutral' | 'none';

interface GlassCardProps extends ViewProps {
  glow?: GlowColor;
  padding?: number;
}

const GLOW_COLORS: Record<Exclude<GlowColor, 'none'>, string> = {
  primary: '#4B8EFF',
  secondary: '#FE9400',
  neutral: '#E5E2E1',
};

/**
 * "Creator Glass" widget from the Digital Atelier system:
 * surface-container-high base + outline-variant ghost border at 10% +
 * an ambient tonal glow in the top-right corner.
 */
export function GlassCard({
  glow = 'none',
  padding = 20,
  style,
  children,
  ...rest
}: GlassCardProps) {
  return (
    <View style={[styles.card, { padding }, style]} {...rest}>
      {glow !== 'none' && (
        <View pointerEvents="none" style={styles.glowWrap}>
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id={`g-${glow}`} cx="0.85" cy="0.15" r="0.6">
                <Stop offset="0%" stopColor={GLOW_COLORS[glow]} stopOpacity="0.22" />
                <Stop offset="60%" stopColor={GLOW_COLORS[glow]} stopOpacity="0.05" />
                <Stop offset="100%" stopColor={GLOW_COLORS[glow]} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="85%" cy="15%" r="70%" fill={`url(#g-${glow})`} />
          </Svg>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(193, 198, 215, 0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  glowWrap: {
    ...StyleSheet.absoluteFillObject,
  },
});
