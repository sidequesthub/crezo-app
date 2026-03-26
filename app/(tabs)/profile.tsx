import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui';
import { colors, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatorData } from '@/hooks/useCreatorData';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { creator } = useCreatorData();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const display = creator;
  const mediaKitUrl = display?.media_kit_url
    ? `https://${display.media_kit_url}`
    : null;

  async function copyLink() {
    if (!mediaKitUrl) return;
    try {
      await Clipboard.setStringAsync(mediaKitUrl);
    } catch {}
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Media Kit" subtitle="Your creator profile" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={StyleSheet.flatten([
          styles.scrollContent,
          isWide && styles.scrollContentWide,
        ])}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <Pressable onPress={() => router.push('/edit-profile' as never)}>
            {display?.avatar_url ? (
              <Image
                source={{ uri: display.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Ionicons
                  name="person"
                  size={36}
                  color={colors.on_surface_variant}
                />
              </View>
            )}
          </Pressable>
          <Text style={styles.creatorName}>
            {display?.name ?? 'Creator'}
          </Text>
          {display?.niche && (
            <Text style={styles.niche}>{display.niche}</Text>
          )}
          {display?.bio && <Text style={styles.bio}>{display.bio}</Text>}
          <Pressable
            style={styles.editProfileBtn}
            onPress={() => router.push('/edit-profile' as never)}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shareable Link</Text>
          <View style={styles.linkCard}>
            <Text style={styles.linkText}>
              {mediaKitUrl || 'Set up your media kit link'}
            </Text>
            {mediaKitUrl && (
              <Button title="Copy" onPress={copyLink} variant="secondary" />
            )}
          </View>
          <Text style={styles.sectionHint}>
            Add to your Instagram bio or send to brands
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Details</Text>
          <DetailRow label="Email" value={display?.email ?? '—'} />
          <DetailRow label="Contact" value={display?.phone || 'Not set'} />
          {display?.gst_number && (
            <DetailRow label="GSTIN" value={display.gst_number} />
          )}
          {display?.upi_id && (
            <DetailRow label="UPI ID" value={display.upi_id} />
          )}
          {display?.bank_name && (
            <DetailRow label="Bank" value={display.bank_name} />
          )}
          {display?.bank_account_number && (
            <DetailRow label="A/C No." value={display.bank_account_number} />
          )}
          {display?.bank_ifsc && (
            <DetailRow label="IFSC" value={display.bank_ifsc} />
          )}
          {display?.pan_number && (
            <DetailRow label="PAN" value={display.pan_number} />
          )}
        </View>

        <View style={styles.exportSection}>
          <Text style={styles.exportTitle}>Export Media Kit PDF</Text>
          <Text style={styles.exportText}>
            Download a clean PDF to send in email pitches
          </Text>
          <Button
            title="Generate PDF"
            onPress={() => {}}
            variant="primary"
          />
        </View>

        <Button
          title="Sign out"
          onPress={async () => {
            await signOut();
            router.replace('/(auth)/login' as never);
          }}
          variant="secondary"
        />
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  scrollContentWide: {
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  editProfileText: {
    ...typography.label_md,
    color: colors.primary,
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
    marginBottom: 24,
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
