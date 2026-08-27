import { Tabs } from 'expo-router';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
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

function TabIcon({ spec, color, size = 22 }: { spec: IconSpec; color: string; size?: number }) {
  if (spec.set === 'ion') return <Ionicons name={spec.name} size={size} color={color} />;
  return <MaterialCommunityIcons name={spec.name} size={size} color={color} />;
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <BlurView
        intensity={Platform.OS === 'ios' ? 50 : 80}
        tint="dark"
        style={styles.bar}
      >
        {state.routes.map((route, i) => {
          const spec = TAB_ICONS[route.name];
          if (!spec) return null;
          const isFocused = state.index === i;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tab,
                isFocused && styles.tabActive,
                pressed && styles.tabPressed,
              ]}
            >
              <TabIcon
                spec={isFocused ? spec.active : spec.inactive}
                color={isFocused ? Colors.primary : Colors.tertiaryFixedDim + 'AA'}
                size={22}
              />
              <Text
                style={[
                  styles.label,
                  { color: isFocused ? Colors.primary : Colors.tertiaryFixedDim + 'AA' },
                ]}
              >
                {spec.label}
              </Text>
            </Pressable>
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
    borderColor: 'rgba(193, 198, 215, 0.08)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    borderRadius: 18,
  },
  tabActive: {
    backgroundColor: 'rgba(75, 142, 255, 0.14)',
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
