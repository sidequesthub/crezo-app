import { useRef } from 'react';
import { View, Pressable, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { FAB_SIZE, FAB_EDGE_INSET } from '@/constants/Layout';

interface Props {
  /** Distance from the bottom of the screen, normally the tab-bar clearance. */
  bottom: number;
  onPress: () => void;
  accessibilityLabel: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

/**
 * The single floating action per screen. Positioned by the caller, which owns
 * the safe-area maths — a hardcoded offset overlaps the tab bar on devices
 * with a home indicator.
 */
export function FloatingActionButton({
  bottom,
  onPress,
  accessibilityLabel,
  icon = 'add',
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40 }).start();

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onPressIn={() => spring(0.94)}
        onPressOut={() => spring(1)}
      >
        <Animated.View style={[styles.fab, { transform: [{ scale }] }]}>
          <LinearGradient
            colors={['#ADC6FF', '#4B8EFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bg}
          >
            <Ionicons name={icon} size={28} color={Colors.onPrimaryContainer} />
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', right: FAB_EDGE_INSET, zIndex: 20 },
  fab: {
    borderRadius: 20,
    // Tinted ambient glow rather than a hard drop shadow, per the design system.
    shadowColor: '#4B8EFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  bg: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
