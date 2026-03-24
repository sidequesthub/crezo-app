/**
 * Creator Profile / Media Kit — Shareable public page
 */

import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui';
import { colors, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatorData } from '@/hooks/useCreatorData';

export default function ProfileScreen() {
  const { signOut, supabaseConfigured } = useAuth();
  const { creator } = useCreatorData();
  const display = creator;
  const mediaKitUrl = display?.media_kit_url
    ? `https://${display.media_kit_url}`
    : null;

  return (
    <View style={styles.container}>
      <AppHeader
        title="Media Kit"
        subtitle="Your creator profile"
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar} />
          <Text style={styles.creatorName}>{display?.name ?? 'Creator'}</Text>
          {display?.niche && <Text style={styles.niche}>{display.niche}</Text>}
          {display?.bio && <Text style={styles.bio}>{display.bio}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shareable Link</Text>
          <View style={styles.linkCard}>
            <Text style={styles.linkText}>
              {mediaKitUrl || 'crezo.studio/yourname'}
            </Text>
            <Button
              title="Copy"
              onPress={() => {}}
              variant="secondary"
            />
          </View>
          <Text style={styles.sectionHint}>
            Add to your Instagram bio or send to brands
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{display?.email ?? ''}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Contact</Text>
            <Text style={styles.detailValue}>{display?.phone || 'Not set'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoicing Details</Text>
          <Text style={styles.sectionHint}>
            GSTIN, UPI ID, bank details — used for invoice generation
          </Text>
          <Button
            title="Edit Profile"
            onPress={() => {}}
            variant="secondary"
          />
        </View>

        <View style={styles.exportSection}>
          <Text style={styles.exportTitle}>Export Media Kit PDF</Text>
          <Text style={styles.exportText}>
            Download a clean PDF to send in email pitches
          </Text>
          <Button title="Generate PDF" onPress={() => {}} variant="primary" />
        </View>

        {supabaseConfigured && (
          <Button
            title="Sign out"
            onPress={async () => {
              await signOut();
              router.replace('/(auth)/login' as never);
            }}
            variant="secondary"
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.surface_container_high,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(65, 71, 85, 0.1)',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface_container_low,
    marginBottom: 16,
  },
  creatorName: {
    ...typography.headline_lg,
    color: colors.on_surface,
  },
  niche: {
    ...typography.body_md,
    color: colors.primary,
    marginTop: 4,
  },
  bio: {
    ...typography.body_md,
    color: colors.on_surface_variant,
    marginTop: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...typography.headline_sm,
    color: colors.on_surface,
    marginBottom: 12,
  },
  sectionHint: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
    marginTop: 8,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
  },
  linkText: {
    flex: 1,
    ...typography.body_md,
    color: colors.primary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
    marginBottom: 8,
  },
  detailLabel: {
    ...typography.label_md,
    color: colors.on_surface_variant,
  },
  detailValue: {
    ...typography.body_md,
    color: colors.on_surface,
  },
  exportSection: {
    padding: 24,
    backgroundColor: colors.surface_container_high,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(65, 71, 85, 0.1)',
  },
  exportTitle: {
    ...typography.headline_md,
    color: colors.on_surface,
  },
  exportText: {
    ...typography.body_md,
    color: colors.on_surface_variant,
  },
});
