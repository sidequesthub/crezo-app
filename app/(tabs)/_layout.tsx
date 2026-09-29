import { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Pressable, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';

type IconSpec =
  | { set: 'ion'; name: React.ComponentProps<typeof Ionicons>['name'] }
  | { set: 'mci'; name: React.ComponentProps<typeof MaterialCommunityIcons>['name'] };

const TAB_ICONS: Record<string, { label: string; active: IconSpec; inactive: IconSpec }> = {
  index: {
    label: 'Home',
    active: { set: 'ion', name: 'home' },
    inactive: { set: 'ion', name: 'home-outline' },
  },
  calendar: {
    label: 'Calendar',
    active: { set: 'ion', name: 'calendar' },
    inactive: { set: 'ion', name: 'calendar-outline' },
  },
  deals: {
    label: 'Deals',
    active: { set: 'mci', name: 'handshake' },
    inactive: { set: 'mci', name: 'handshake-outline' },
  },
  vault: {
    label: 'Vault',
    active: { set: 'ion', name: 'cube' },
    inactive: { set: 'ion', name: 'cube-outline' },
  },
  profile: {
    label: 'Profile',
    active: { set: 'ion', name: 'person' },
    inactive: { set: 'ion', name: 'person-outline' },
  },
};

const INACTIVE = Colors.tertiaryFixedDim + 'AA';

function TabIcon({ spec, color, size = 22 }: { spec: IconSpec; color: string; size?: number }) {
  if (spec.set === 'ion') return <Ionicons name={spec.name} size={size} color={color} />;
  return <MaterialCommunityIcons name={spec.name} size={size} color={color} />;
}

/**
 * One tab. The selected pill fades in and the icon lifts slightly rather than
 * snapping, so the bar moves with the screen transition instead of jumping
 * ahead of it. Opacity and transform only — both run on the native driver.
 */
function TabItem({
  spec,
  isFocused,
  onPress,
}: {
  spec: { label: string; active: IconSpec; inactive: IconSpec };
  isFocused: boolean;
  onPress: () => void;
}) {
  const focus = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(focus, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      speed: 12,
      bounciness: 8,
    }).start();
  }, [isFocused, focus]);

  const lift = focus.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
    >
      <Animated.View style={[styles.pill, { opacity: focus }]} pointerEvents="none" />
      <Animated.View style={[styles.tabInner, { transform: [{ scale: lift }] }]}>
        <TabIcon
          spec={isFocused ? spec.active : spec.inactive}
          color={isFocused ? Colors.primary : INACTIVE}
          size={22}
        />
        <Text style={[styles.label, { color: isFocused ? Colors.primary : INACTIVE }]}>
          {spec.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <BlurView intensity={Platform.OS === 'ios' ? 50 : 80} tint="dark" style={styles.bar}>
        {state.routes.map((route, i) => {
          const spec = TAB_ICONS[route.name];
          if (!spec) return null;
          const isFocused = state.index === i;

          return (
            <TabItem
              key={route.key}
              spec={spec}
              isFocused={isFocused}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name as never);
                }
              }}
            />
          );
        })}
      </BlurView>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.surface },
        // Without this the navigator's default is 'none', which is why switching
        // tabs was instantaneous. 'shift' slides the outgoing/incoming screens a
        // little in the direction of travel, so the move reads as a direction.
        // 220ms turned out to be too quick to register as motion at all; 320
        // is still snappy but unmistakably a transition.
        animation: 'shift',
        transitionSpec: {
          animation: 'timing',
          config: { duration: 320, easing: Easing.out(Easing.cubic) },
        },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="deals" />
      <Tabs.Screen name="vault" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'stretch',
    paddingHorizontal: 12,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 20, 20, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(200, 196, 188, 0.08)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 18,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  // Sits behind the icon so its opacity can animate on the native driver —
  // animating backgroundColor directly would force a JS-driven animation.
  pill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 18,
    backgroundColor: 'rgba(233, 228, 218, 0.14)',
  },
  tabPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  label: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.3,
    marginTop: 1,
  },
});
