import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { clearSession } from '@/lib/phoneAuth';

export default function ProfileScreen() {
  async function signOut() {
    await clearSession();
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>ACCOUNT</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          Your studio settings, brand kit, and billing details live here.
        </Text>

        <View style={styles.list}>
          <Row icon="person-outline" label="Edit profile" />
          <Row icon="card-outline" label="Payment & GST" />
          <Row icon="notifications-outline" label="Notifications" />
          <Row icon="shield-checkmark-outline" label="Privacy & security" />
          <Row icon="help-circle-outline" label="Help & support" />
        </View>

        <Pressable style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.7 }]} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={Colors.onSurface} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.onSurfaceVariant} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 120,
  },
  eyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.6,
    color: Colors.primary,
  },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 36,
    color: Colors.onSurface,
    letterSpacing: -1,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
    marginTop: 12,
  },
  list: {
    marginTop: 28,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(193, 198, 215, 0.08)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    color: Colors.onSurface,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 180, 171, 0.08)',
  },
  signOutText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: Colors.error,
    letterSpacing: 0.3,
  },
});
