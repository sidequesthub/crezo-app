import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';

/**
 * The Crezo wordmark, from the Stitch logo (assets/brand/wordmark.svg):
 * "Crezo" in Plus Jakarta Sans 800 with tight tracking, followed by a small
 * electric-blue dot sitting on the baseline. Proportions are taken from the
 * SVG (94px type, 14px dot, -2.5 tracking) and scaled by `size`.
 */
export function Wordmark({ size = 22 }: { size?: number }) {
  const dot = Math.round(size * 0.15);
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Crezo">
      <Text
        style={[
          styles.text,
          { fontSize: size, lineHeight: Math.round(size * 1.15), letterSpacing: -size * 0.027 },
        ]}
      >
        Crezo
      </Text>
      <LinearGradient
        colors={['#4B8EFF', '#0062FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          marginLeft: size * 0.05,
          // Lift from the line box's bottom edge up onto the text baseline.
          marginBottom: Math.round(size * 0.24),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  text: { fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.onSurface },
});
