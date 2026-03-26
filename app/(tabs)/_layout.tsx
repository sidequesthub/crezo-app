import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { colors } from '@/constants/theme';

const TAB_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  index: { icon: 'home-outline', label: 'Home' },
  calendar: { icon: 'calendar-outline', label: 'Calendar' },
  deals: { icon: 'briefcase-outline', label: 'Deals' },
  invoices: { icon: 'receipt-outline', label: 'Invoices' },
  vault: { icon: 'folder-open-outline', label: 'Vault' },
  profile: { icon: 'person-outline', label: 'Profile' },
};

const SIDEBAR_W = 220;

function SidebarTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={sidebarStyles.container}>
      <View style={sidebarStyles.logoWrap}>
        <Text style={sidebarStyles.logo}>Crezo</Text>
      </View>

      <View style={sidebarStyles.navItems}>
        {state.routes.map((route, idx) => {
          const focused = state.index === idx;
          const meta = TAB_META[route.name];
          if (!meta) return null;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={[sidebarStyles.navItem, focused && sidebarStyles.navItemActive]}
            >
              <Ionicons
                name={focused ? (meta.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap) : meta.icon}
                size={20}
                color={focused ? colors.primary : colors.tertiary_fixed_dim}
              />
              <Text style={[sidebarStyles.navLabel, focused && sidebarStyles.navLabelActive]}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={sidebarStyles.footer}>
        <Text style={sidebarStyles.footerText}>Crezo v1.0</Text>
      </View>
    </View>
  );
}

const sidebarStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_W,
    backgroundColor: colors.surface_container_low,
    borderRightWidth: 1,
    borderRightColor: 'rgba(65, 71, 85, 0.15)',
    paddingTop: 24,
    paddingBottom: 24,
    justifyContent: 'flex-start',
  },
  logoWrap: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(65, 71, 85, 0.12)',
    marginBottom: 12,
  },
  logo: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  navItems: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  navItemActive: {
    backgroundColor: 'rgba(173, 198, 255, 0.08)',
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
    color: colors.tertiary_fixed_dim,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(65, 71, 85, 0.12)',
  },
  footerText: {
    fontSize: 11,
    color: colors.outline,
    fontFamily: 'Manrope_400Regular',
  },
});

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= 768;

  return (
    <Tabs
      tabBar={isWideWeb ? (props) => <SidebarTabBar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tertiary_fixed_dim,
        tabBarStyle: isWideWeb
          ? { display: 'none' }
          : {
              backgroundColor: colors.surface_container_low,
              borderTopColor: 'rgba(65, 71, 85, 0.2)',
            },
        tabBarLabelStyle: {
          fontFamily: 'Manrope_500Medium',
          fontSize: 10,
        },
        sceneStyle: isWideWeb ? { marginLeft: SIDEBAR_W } : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          title: 'Deals',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder-open-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
