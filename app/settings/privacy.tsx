import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { SettingsScreen, Section } from '@/components/settings/SettingsScreen';
import { InfoRow, ActionRow } from '@/components/settings/Fields';
import { getProfile, getProfileStats, type CreatorProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { clearSession } from '@/lib/phoneAuth';
import { clearCreatorCache } from '@/lib/contentSlots';
import { fromISODate } from '@/lib/dates';

export default function PrivacyScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [stats, setStats] = useState({ deals: 0, content: 0, folders: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile().then(setProfile).catch(() => undefined);
    getProfileStats().then(setStats).catch(() => undefined);
  }, []);

  async function signOutEverywhere() {
    Alert.alert('Sign out?', 'You’ll need your phone number and an OTP to get back in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          clearCreatorCache();
          await clearSession();
          await supabase.auth.signOut({ scope: 'global' });
        },
      },
    ]);
  }

  /**
   * Deletes the creator row. Every table cascades from it, so this removes all
   * deals, content, invoices, and vault references. The login itself survives —
   * signing in again creates a fresh, empty profile.
   */
  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      `This permanently removes your account and every record — ${stats.deals} deals, ${stats.content} content items, ${stats.folders} vault folders. Photos on your phone are untouched. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you certain?', 'There is no way to recover this.', [
              { text: 'Keep my data', style: 'cancel' },
              {
                text: 'Delete everything',
                style: 'destructive',
                onPress: async () => {
                  try {
                    // Removes the creator row (cascading to every record) and
                    // the auth login itself — App Store 5.1.1(v) requires the
                    // account to go, not just its data.
                    const { error } = await supabase.rpc('delete_own_account');
                    if (error) throw new Error(error.message);
                    clearCreatorCache();
                    await clearSession();
                    await supabase.auth.signOut();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Could not delete');
                  }
                },
              },
            ]),
        },
      ],
    );
  }

  const memberSince = profile?.created_at
    ? fromISODate(profile.created_at.slice(0, 10)).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <SettingsScreen
      title="Privacy & security"
      subtitle="What Crezo stores, and how to get rid of it."
    >
      <Section label="Account">
        <InfoRow icon="call-outline" label="Signed in as" value={profile?.phone ?? '—'} />
        <InfoRow icon="time-outline" label="Member since" value={memberSince} />
        <InfoRow
          icon="server-outline"
          label="Stored records"
          value={`${stats.deals + stats.content + stats.folders}`}
        />
      </Section>

      <Section label="What we store">
        <View style={styles.explainer}>
          <Explain
            icon="images-outline"
            title="Your photos never leave your phone"
            body="The vault stores only a reference to each item — an id — never the file. Crezo has no copy of your media."
          />
          <Explain
            icon="lock-closed-outline"
            title="Your data is scoped to you"
            body="Every record is tied to your account and enforced at the database level, so no other account can read it."
          />
          <Explain
            icon="card-outline"
            title="Bank details are stored for invoicing"
            body="Your UPI, account number, and IFSC are saved so invoices can be generated. They're never shared with anyone but the brands you invoice."
          />
        </View>
      </Section>

      <Section label="Danger zone">
        <ActionRow
          icon="log-out-outline"
          label="Sign out of all devices"
          description="Ends every active session, not just this one."
          onPress={signOutEverywhere}
          tint={Colors.onSurface}
        />
        <ActionRow
          icon="trash-outline"
          label="Delete my account"
          description="Removes your account and every record. Permanent."
          onPress={confirmDelete}
          tint={Colors.error}
        />
      </Section>

      {error && <Text style={styles.error}>{error}</Text>}
    </SettingsScreen>
  );
}

function Explain({
  icon,
  title,
  body,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
}) {
  return (
    <View style={styles.explainRow}>
      <Ionicons name={icon} size={17} color={Colors.primary} />
      <View style={styles.explainBody}>
        <Text style={styles.explainTitle}>{title}</Text>
        <Text style={styles.explainText}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  explainer: {
    gap: 16,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
  },
  explainRow: { flexDirection: 'row', gap: 12 },
  explainBody: { flex: 1, gap: 3 },
  explainTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: Colors.onSurface,
  },
  explainText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  error: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
});
