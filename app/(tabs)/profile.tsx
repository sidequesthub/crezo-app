import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { TAB_BAR_HEIGHT, FLOATING_GAP, MIN_BOTTOM_INSET } from '@/constants/Layout';
import { supabase } from '@/lib/supabase';
import { clearSession } from '@/lib/phoneAuth';
import { clearCreatorCache } from '@/lib/contentSlots';
import { getProfile, getProfileStats, type CreatorProfile } from '@/lib/profile';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [stats, setStats] = useState({ deals: 0, content: 0, folders: 0 });

  useFocusEffect(
    useCallback(() => {
      getProfile().then(setProfile).catch(() => undefined);
      getProfileStats().then(setStats).catch(() => undefined);
    }, []),
  );

  function signOut() {
    Alert.alert('Sign out?', 'You’ll need an OTP to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          // Otherwise the next account inherits this one's cached creator id.
          clearCreatorCache();
          await clearSession();
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  const bottomInset =
    Math.max(insets.bottom, MIN_BOTTOM_INSET) + TAB_BAR_HEIGHT + FLOATING_GAP;

  const displayName = profile?.name ?? 'Creator';
  const initial = displayName.charAt(0).toUpperCase();
  const hasPaymentDetails = Boolean(profile?.upi_id || profile?.bank_account_number);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <View style={styles.avatarRing}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.handle}>
            {profile?.niche || profile?.phone || 'Set up your profile'}
          </Text>
        </View>

        <View style={styles.stats}>
          <Stat value={stats.deals} label="DEALS" />
          <View style={styles.statDivider} />
          <Stat value={stats.content} label="PLANNED" />
          <View style={styles.statDivider} />
          <Stat value={stats.folders} label="FOLDERS" />
        </View>

        <View style={styles.list}>
          <Row
            icon="person-outline"
            label="Edit profile"
            detail={profile?.bio ? undefined : 'Add a bio and niche'}
            onPress={() => router.push('/settings/profile')}
          />
          <Row
            icon="card-outline"
            label="Payment & GST"
            detail={hasPaymentDetails ? undefined : 'Not set up'}
            warn={!hasPaymentDetails}
            onPress={() => router.push('/settings/payment')}
          />
          <Row
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push('/settings/notifications')}
          />
          <Row
            icon="shield-checkmark-outline"
            label="Privacy & security"
            onPress={() => router.push('/settings/privacy')}
          />
          <Row
            icon="help-circle-outline"
            label="Help & support"
            onPress={() => router.push('/settings/support')}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.7 }]}
          onPress={signOut}
        >
          <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({
  icon,
  label,
  detail,
  warn,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  detail?: string;
  warn?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={Colors.onSurface} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {detail && (
        <Text style={[styles.rowDetail, warn && { color: Colors.secondary }]}>{detail}</Text>
      )}
      <Ionicons name="chevron-forward" size={18} color={Colors.onSurfaceVariant} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 22 },

  identity: { alignItems: 'center', gap: 6 },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 2,
    backgroundColor: Colors.surfaceContainerHigh,
    marginBottom: 6,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 44 },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHighest,
  },
  avatarInitial: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 32,
    color: Colors.primary,
  },
  name: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 24,
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  handle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 20,
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: 1, height: 26, backgroundColor: 'rgba(193, 198, 215, 0.10)' },
  statValue: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 20,
    color: Colors.onSurface,
  },
  statLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
  },

  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowPressed: { backgroundColor: Colors.surfaceContainerHigh },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  rowLabel: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    color: Colors.onSurface,
  },
  rowDetail: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },

  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: 'rgba(147, 0, 10, 0.16)',
  },
  signOutText: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.error },
});
