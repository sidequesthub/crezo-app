import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Button, FormField } from '@/components/ui';
import { colors, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useAPI } from '@/hooks/useAPI';
import { useCreatorData } from '@/hooks/useCreatorData';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const { creators: creatorsSvc } = useAPI();
  const { creator, refresh } = useCreatorData();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [name, setName] = useState(creator?.name ?? '');
  const [phone, setPhone] = useState(creator?.phone ?? '');
  const [bio, setBio] = useState(creator?.bio ?? '');
  const [niche, setNiche] = useState(creator?.niche ?? '');
  const [gstNumber, setGstNumber] = useState(creator?.gst_number ?? '');
  const [panNumber, setPanNumber] = useState(creator?.pan_number ?? '');
  const [upiId, setUpiId] = useState(creator?.upi_id ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(creator?.bank_account_number ?? '');
  const [bankIfsc, setBankIfsc] = useState(creator?.bank_ifsc ?? '');
  const [bankName, setBankName] = useState(creator?.bank_name ?? '');
  const [mediaKitUrl, setMediaKitUrl] = useState(creator?.media_kit_url ?? '');
  const [avatarUri, setAvatarUri] = useState(creator?.avatar_url ?? null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Photo library permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!user || !creator) return;

    setUploading(true);
    setError(null);
    try {
      const url = await creatorsSvc.uploadAvatar(
        creator.id,
        asset.uri,
        asset.mimeType ?? 'image/jpeg'
      );
      setAvatarUri(url);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setError(null);
    setSuccess(false);
    if (!name.trim()) { setError('Name is required'); return; }
    if (!user || !creator) return;

    setSaving(true);
    try {
      await creatorsSvc.update(creator.id, {
        name: name.trim(),
        phone: phone || null,
        bio: bio || null,
        niche: niche || null,
        gst_number: gstNumber || null,
        pan_number: panNumber || null,
        upi_id: upiId || null,
        bank_account_number: bankAccountNumber || null,
        bank_ifsc: bankIfsc || null,
        bank_name: bankName || null,
        media_kit_url: mediaKitUrl || null,
      });
      await refresh();
      setSuccess(true);
      setTimeout(() => router.back(), 600);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.on_surface} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.avatarSection}>
          <Pressable onPress={pickImage} disabled={uploading}>
            <View style={styles.avatarContainer}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person"
                    size={40}
                    color={colors.on_surface_variant}
                  />
                </View>
              )}
              <View style={styles.avatarBadge}>
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.on_surface} />
                ) : (
                  <Ionicons name="camera" size={16} color={colors.on_surface} />
                )}
              </View>
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        <Text style={styles.sectionLabel}>Basic Info</Text>
        <FormField
          label="Name *"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
        />
        <FormField
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 98765 43210"
          keyboardType="phone-pad"
        />
        <FormField
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="What do you create?"
          multiline
          style={styles.textArea}
        />
        <FormField
          label="Niche"
          value={niche}
          onChangeText={setNiche}
          placeholder="e.g. Tech, Lifestyle, Fashion"
        />
        <FormField
          label="Media Kit Link"
          value={mediaKitUrl}
          onChangeText={setMediaKitUrl}
          placeholder="crezo.studio/yourname"
          autoCapitalize="none"
        />

        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
          Tax Details
        </Text>
        <FormField
          label="GSTIN"
          value={gstNumber}
          onChangeText={setGstNumber}
          placeholder="27AABCU9603R1ZM"
          autoCapitalize="characters"
        />
        <FormField
          label="PAN Number"
          value={panNumber}
          onChangeText={setPanNumber}
          placeholder="ABCDE1234F"
          autoCapitalize="characters"
        />

        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
          Payment Details
        </Text>
        <FormField
          label="UPI ID"
          value={upiId}
          onChangeText={setUpiId}
          placeholder="yourname@upi"
          autoCapitalize="none"
        />
        <FormField
          label="Bank Name"
          value={bankName}
          onChangeText={setBankName}
          placeholder="e.g. HDFC Bank"
        />
        <FormField
          label="Account Number"
          value={bankAccountNumber}
          onChangeText={setBankAccountNumber}
          placeholder="1234567890123"
          keyboardType="numeric"
        />
        <FormField
          label="IFSC Code"
          value={bankIfsc}
          onChangeText={setBankIfsc}
          placeholder="HDFC0001234"
          autoCapitalize="characters"
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {success && <Text style={styles.success}>Profile saved!</Text>}

        <Button
          title={saving ? 'Saving...' : 'Save Profile'}
          onPress={handleSave}
          variant="primary"
          disabled={saving}
        />
        <Button
          title="Cancel"
          onPress={() => router.back()}
          variant="tertiary"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    padding: 24,
    paddingBottom: 80,
    gap: 16,
  },
  scrollWide: {
    maxWidth: 540,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    ...typography.headline_md,
    color: colors.on_surface,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface_container_high,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(65, 71, 85, 0.2)',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
  },
  sectionLabel: {
    ...typography.headline_sm,
    color: colors.on_surface,
    marginTop: 8,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    ...typography.body_sm,
    color: colors.error,
    textAlign: 'center',
    backgroundColor: 'rgba(147, 0, 10, 0.15)',
    padding: 12,
    borderRadius: 8,
  },
  success: {
    ...typography.body_sm,
    color: colors.primary,
    textAlign: 'center',
    backgroundColor: colors.primary + '15',
    padding: 12,
    borderRadius: 8,
  },
});
