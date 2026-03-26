import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Button, DatePickerField, FormField, SelectField, TimePickerField } from '@/components/ui';
import { colors, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useAPI } from '@/hooks/useAPI';
import { useCreatorData } from '@/hooks/useCreatorData';
import type { ContentSlotInput } from '@/services/content/types';
import type { ContentPlatform, ContentStatus } from '@/types';

const PLATFORM_OPTIONS: { value: ContentPlatform; label: string }[] = [
  { value: 'ig_reel', label: 'IG Reel' },
  { value: 'yt_video', label: 'YT Video' },
  { value: 'yt_short', label: 'YT Short' },
  { value: 'story', label: 'Story' },
  { value: 'post', label: 'Post' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'scripted', label: 'Scripted' },
  { value: 'shot', label: 'Shot' },
  { value: 'edited', label: 'Edited' },
  { value: 'posted', label: 'Posted' },
];

export default function AddContentScreen() {
  const { user } = useAuth();
  const { content: contentSvc } = useAPI();
  const { creator, deals, refresh } = useCreatorData();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState<ContentPlatform>('ig_reel');
  const [status, setStatus] = useState<ContentStatus>('idea');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [scheduledTime, setScheduledTime] = useState('');
  const [dealId, setDealId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!title.trim()) { setError('Title is required'); return; }
    if (!scheduledDate) { setError('Scheduled date is required'); return; }
    if (!user || !creator) return;

    setSaving(true);
    try {
      await contentSvc.create({
        creator_id: creator.id,
        title: title.trim(),
        platform,
        type: platform.includes('video') ? 'video' : platform === 'story' ? 'story' : 'reel',
        status,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime || null,
        deal_id: dealId,
        notes: notes || null,
      });
      await refresh();
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create content slot');
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
          <Text style={styles.headerTitle}>Schedule Content</Text>
          <View style={{ width: 24 }} />
        </View>

        <FormField
          label="Title *"
          placeholder="e.g. Weekly vlog ep 13"
          value={title}
          onChangeText={setTitle}
        />

        <SelectField
          label="Platform"
          options={PLATFORM_OPTIONS}
          value={platform}
          onChange={setPlatform}
        />

        <SelectField
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
        />

        <DatePickerField
          label="Scheduled Date *"
          value={scheduledDate}
          onChange={setScheduledDate}
        />

        <TimePickerField
          label="Scheduled Time"
          value={scheduledTime}
          onChange={setScheduledTime}
        />

        {deals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Link to Deal (optional)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dealChips}
            >
              <Pressable
                style={[
                  styles.dealChip,
                  !dealId && styles.dealChipSelected,
                ]}
                onPress={() => setDealId(null)}
              >
                <Text
                  style={[
                    styles.dealChipText,
                    !dealId && styles.dealChipTextSelected,
                  ]}
                >
                  None
                </Text>
              </Pressable>
              {deals.map((d) => (
                <Pressable
                  key={d.id}
                  style={[
                    styles.dealChip,
                    dealId === d.id && styles.dealChipSelected,
                  ]}
                  onPress={() => setDealId(d.id)}
                >
                  <Text
                    style={[
                      styles.dealChipText,
                      dealId === d.id && styles.dealChipTextSelected,
                    ]}
                  >
                    {d.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <FormField
          label="Notes"
          placeholder="Any notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={styles.textArea}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          title={saving ? 'Saving...' : 'Create Content Slot'}
          onPress={handleSave}
          variant="primary"
          disabled={saving}
        />

        <Button title="Cancel" onPress={() => router.back()} variant="tertiary" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    padding: 24,
    paddingBottom: 80,
    gap: 20,
  },
  scrollWide: {
    maxWidth: 600,
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
  section: {
    gap: 6,
  },
  sectionLabel: {
    ...typography.label_md,
    color: colors.on_surface_variant,
  },
  dealChips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  dealChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface_container_low,
    borderWidth: 1,
    borderColor: 'rgba(65, 71, 85, 0.2)',
  },
  dealChipSelected: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  dealChipText: {
    ...typography.label_md,
    color: colors.on_surface_variant,
  },
  dealChipTextSelected: {
    color: colors.primary,
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
});
