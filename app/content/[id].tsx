import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
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
import { useAPI } from '@/hooks/useAPI';
import { useCreatorData } from '@/hooks/useCreatorData';
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

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { content: contentSvc } = useAPI();
  const { contentSlots, deals, refresh } = useCreatorData();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const slot = contentSlots.find((s) => s.id === id);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(slot?.title ?? '');
  const [platform, setPlatform] = useState<ContentPlatform>(slot?.platform ?? 'ig_reel');
  const [status, setStatus] = useState<ContentStatus>(slot?.status ?? 'idea');
  const [scheduledDate, setScheduledDate] = useState(slot?.scheduled_date ?? '');
  const [scheduledTime, setScheduledTime] = useState(slot?.scheduled_time ?? '');
  const [notes, setNotes] = useState(slot?.notes ?? '');
  const [editDealId, setEditDealId] = useState<string | null>(slot?.deal_id ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!slot) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorMsg}>Content not found</Text>
        <Button title="Go back" onPress={() => router.back()} variant="tertiary" />
      </View>
    );
  }

  const linkedDeal = slot.deal_id
    ? deals.find((d) => d.id === slot.deal_id)
    : null;

  async function handleSave() {
    setError(null);
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    try {
      await contentSvc.update(slot!.id, {
        title: title.trim(),
        platform,
        status,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime || null,
        notes: notes || null,
        deal_id: editDealId,
      });
      await refresh();
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Delete this content slot?')
      : await new Promise<boolean>((resolve) =>
          Alert.alert('Delete', 'Delete this content slot?', [
            { text: 'Cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
          ])
        );
    if (!confirmed) return;
    try {
      await contentSvc.remove(slot!.id);
      await refresh();
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async function handleStatusChange(newStatus: ContentStatus) {
    try {
      await contentSvc.update(slot!.id, { status: newStatus });
      await refresh();
      setStatus(newStatus);
    } catch {}
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, isWide && styles.contentWide]}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.on_surface} />
          </Pressable>
          <View style={styles.headerActions}>
            {!editing && (
              <Pressable onPress={() => setEditing(true)} hitSlop={12}>
                <Ionicons name="create-outline" size={22} color={colors.primary} />
              </Pressable>
            )}
            <Pressable onPress={handleDelete} hitSlop={12}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </Pressable>
          </View>
        </View>

        {editing ? (
          <>
            <FormField label="Title" value={title} onChangeText={setTitle} />
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
              label="Scheduled Date"
              value={scheduledDate}
              onChange={setScheduledDate}
            />
            <TimePickerField
              label="Scheduled Time"
              value={scheduledTime}
              onChange={setScheduledTime}
            />
            {deals.length > 0 && (
              <View style={styles.dealLinkSection}>
                <Text style={styles.dealLinkLabel}>Linked Deal</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dealChips}
                >
                  <Pressable
                    style={[styles.dealChip, !editDealId && styles.dealChipActive]}
                    onPress={() => setEditDealId(null)}
                  >
                    <Text
                      style={[styles.chipText, !editDealId && styles.chipTextActive]}
                    >
                      None
                    </Text>
                  </Pressable>
                  {deals.map((d) => (
                    <Pressable
                      key={d.id}
                      style={[styles.dealChip, editDealId === d.id && styles.dealChipActive]}
                      onPress={() => setEditDealId(d.id)}
                    >
                      <Text
                        style={[styles.chipText, editDealId === d.id && styles.chipTextActive]}
                        numberOfLines={1}
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
              value={notes}
              onChangeText={setNotes}
              multiline
              style={styles.textArea}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            <Button
              title={saving ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              variant="primary"
              disabled={saving}
            />
            <Button
              title="Cancel"
              onPress={() => setEditing(false)}
              variant="tertiary"
            />
          </>
        ) : (
          <>
            <Text style={styles.title}>{slot.title}</Text>

            <View style={styles.metaSection}>
              <MetaRow
                label="Platform"
                value={slot.platform.replace('_', ' ')}
              />
              <MetaRow label="Status" value={slot.status} />
              <MetaRow
                label="Scheduled"
                value={
                  new Date(slot.scheduled_date).toLocaleDateString(
                    'en-IN',
                    { day: 'numeric', month: 'long', year: 'numeric' }
                  ) + (slot.scheduled_time ? ` at ${slot.scheduled_time}` : '')
                }
              />
              {linkedDeal && (
                <MetaRow label="Deal" value={linkedDeal.title} />
              )}
            </View>

            <SelectField
              label="Quick Status Update"
              options={STATUS_OPTIONS}
              value={slot.status}
              onChange={handleStatusChange}
            />

            {slot.notes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.notesText}>{slot.notes}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, gap: 20, paddingBottom: 80 },
  contentWide: { maxWidth: 640, alignSelf: 'center', width: '100%' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: { flexDirection: 'row', gap: 16 },
  title: { ...typography.headline_lg, color: colors.on_surface },
  metaSection: { gap: 4 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface_container_low,
    borderRadius: 10,
  },
  metaLabel: { ...typography.label_md, color: colors.on_surface_variant },
  metaValue: {
    ...typography.body_md,
    color: colors.on_surface,
    textTransform: 'capitalize',
  },
  section: { gap: 10 },
  sectionTitle: { ...typography.headline_sm, color: colors.on_surface },
  notesText: {
    ...typography.body_md,
    color: colors.on_surface_variant,
    padding: 16,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
  },
  dealLinkSection: { gap: 6 },
  dealLinkLabel: { ...typography.label_md, color: colors.on_surface_variant },
  dealChips: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  dealChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.surface_container_low,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dealChipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  chipText: { ...typography.label_sm, color: colors.on_surface_variant },
  chipTextActive: { color: colors.primary },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  errorMsg: { ...typography.body_md, color: colors.error },
  errorText: {
    ...typography.body_sm,
    color: colors.error,
    textAlign: 'center',
    backgroundColor: 'rgba(147, 0, 10, 0.15)',
    padding: 12,
    borderRadius: 8,
  },
});
