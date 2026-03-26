import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Button, CurrencyDisplay, FormField, SelectField } from '@/components/ui';
import { colors, typography } from '@/constants/theme';
import { useAPI } from '@/hooks/useAPI';
import { useCreatorData } from '@/hooks/useCreatorData';
import type { ContentPlatform, DealStatus } from '@/types';

const STATUS_OPTIONS: { value: DealStatus; label: string }[] = [
  { value: 'pitched', label: 'Pitched' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'paid', label: 'Paid' },
];

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deals: dealsSvc } = useAPI();
  const { deals, refresh } = useCreatorData();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const deal = deals.find((d) => d.id === id);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(deal?.title ?? '');
  const [valueInr, setValueInr] = useState(String(deal?.value_inr ?? ''));
  const [status, setStatus] = useState<DealStatus>(deal?.status ?? 'pitched');
  const [usageRights, setUsageRights] = useState(deal?.usage_rights ?? '');
  const [notes, setNotes] = useState(deal?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!deal) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorMsg}>Deal not found</Text>
        <Button title="Go back" onPress={() => router.back()} variant="tertiary" />
      </View>
    );
  }

  async function handleSave() {
    setError(null);
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    try {
      await dealsSvc.update(deal!.id, {
        title: title.trim(),
        value_inr: Number(valueInr) || deal!.value_inr,
        status,
        usage_rights: usageRights || null,
        notes: notes || null,
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
      ? window.confirm('Delete this deal? This cannot be undone.')
      : await new Promise<boolean>((resolve) =>
          Alert.alert('Delete Deal', 'This cannot be undone.', [
            { text: 'Cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
          ])
        );
    if (!confirmed) return;
    try {
      await dealsSvc.remove(deal!.id);
      await refresh();
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async function handleStatusChange(newStatus: DealStatus) {
    try {
      await dealsSvc.update(deal!.id, { status: newStatus });
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
            <FormField
              label="Value (₹)"
              value={valueInr}
              onChangeText={setValueInr}
              keyboardType="numeric"
            />
            <SelectField
              label="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
            />
            <FormField
              label="Usage Rights"
              value={usageRights}
              onChangeText={setUsageRights}
            />
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
            <Text style={styles.title}>{deal.title}</Text>
            <Text style={styles.brand}>{deal.brand?.name}</Text>
            <CurrencyDisplay amount={deal.value_inr} size="lg" variant="primary" />

            <View style={styles.metaSection}>
              <MetaRow label="Status" value={deal.status.replace('_', ' ')} />
              {deal.start_date && (
                <MetaRow
                  label="Start"
                  value={new Date(deal.start_date).toLocaleDateString('en-IN')}
                />
              )}
              {deal.end_date && (
                <MetaRow
                  label="End"
                  value={new Date(deal.end_date).toLocaleDateString('en-IN')}
                />
              )}
              {deal.usage_rights && (
                <MetaRow label="Usage Rights" value={deal.usage_rights} />
              )}
            </View>

            <SelectField
              label="Quick Status Update"
              options={STATUS_OPTIONS}
              value={deal.status}
              onChange={handleStatusChange}
            />

            {deal.brand?.whatsapp && (
              <Pressable
                style={styles.whatsappBtn}
                onPress={() =>
                  Linking.openURL(
                    `https://wa.me/${deal.brand!.whatsapp!.replace(/\D/g, '')}`
                  )
                }
              >
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                <Text style={styles.whatsappText}>Open WhatsApp</Text>
              </Pressable>
            )}

            <DeliverablesSection
              deliverables={deal.deliverables ?? []}
              dealId={deal.id}
              onRefresh={refresh}
            />

            <View style={styles.actionRow}>
              <Pressable
                style={styles.actionCard}
                onPress={() => router.push('/add-invoice' as never)}
              >
                <Ionicons name="receipt-outline" size={22} color={colors.primary} />
                <Text style={styles.actionLabel}>Create Invoice</Text>
              </Pressable>
              <Pressable
                style={styles.actionCard}
                onPress={() => router.push('/(tabs)/vault' as never)}
              >
                <Ionicons name="folder-open-outline" size={22} color={colors.primary} />
                <Text style={styles.actionLabel}>Asset Vault</Text>
              </Pressable>
            </View>

            {deal.notes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.notesText}>{deal.notes}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DeliverablesSection({
  deliverables,
  dealId,
  onRefresh,
}: {
  deliverables: { id: string; title: string | null; type: string; status: string; platform: ContentPlatform }[];
  dealId: string;
  onRefresh: () => Promise<void>;
}) {
  const { deals: svc } = useAPI();
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('reel');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      await svc.createDeliverable({
        deal_id: dealId,
        type: newType,
        platform: 'ig_reel' as ContentPlatform,
        title: newTitle.trim(),
      });
      await onRefresh();
      setNewTitle('');
      setAdding(false);
    } catch {} finally {
      setSaving(false);
    }
  }

  async function toggleStatus(id: string, current: string) {
    const next = current === 'done' ? 'pending' : 'done';
    try {
      await svc.updateDeliverable(id, { status: next });
      await onRefresh();
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      await svc.removeDeliverable(id);
      await onRefresh();
    } catch {}
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Deliverables</Text>
        <Pressable onPress={() => setAdding(!adding)} hitSlop={8}>
          <Ionicons
            name={adding ? 'close' : 'add-circle-outline'}
            size={22}
            color={colors.primary}
          />
        </Pressable>
      </View>
      {adding && (
        <View style={styles.addDeliverableRow}>
          <FormField
            label=""
            placeholder="e.g. Instagram Reel"
            value={newTitle}
            onChangeText={setNewTitle}
          />
          <Button
            title={saving ? '...' : 'Add'}
            onPress={handleAdd}
            variant="primary"
            disabled={saving}
          />
        </View>
      )}
      {deliverables.length === 0 && !adding && (
        <Text style={styles.emptyDeliverables}>
          No deliverables yet. Tap + to add.
        </Text>
      )}
      {deliverables.map((d) => (
        <View key={d.id} style={styles.deliverableRow}>
          <Pressable onPress={() => toggleStatus(d.id, d.status)} hitSlop={8}>
            <Ionicons
              name={d.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={d.status === 'done' ? colors.primary : colors.on_surface_variant}
            />
          </Pressable>
          <Text
            style={[
              styles.deliverableTitle,
              d.status === 'done' && styles.deliverableDone,
            ]}
          >
            {d.title || d.type}
          </Text>
          <Pressable onPress={() => handleDelete(d.id)} hitSlop={8}>
            <Ionicons name="close-circle-outline" size={18} color={colors.error + '80'} />
          </Pressable>
        </View>
      ))}
    </View>
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
  brand: { ...typography.body_md, color: colors.on_surface_variant },
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
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface_container_high,
  },
  whatsappText: { ...typography.label_lg, color: colors.on_surface },
  section: { gap: 10 },
  sectionTitle: { ...typography.headline_sm, color: colors.on_surface },
  deliverableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.surface_container_low,
    borderRadius: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addDeliverableRow: { gap: 8 },
  emptyDeliverables: {
    ...typography.body_sm,
    color: colors.on_surface_variant,
    textAlign: 'center',
    padding: 16,
  },
  deliverableTitle: { ...typography.body_md, color: colors.on_surface, flex: 1, marginHorizontal: 10 },
  deliverableDone: { textDecorationLine: 'line-through', color: colors.on_surface_variant },
  deliverableStatus: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
    textTransform: 'capitalize',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    padding: 20,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
  },
  actionLabel: { ...typography.label_md, color: colors.primary },
  notesText: {
    ...typography.body_md,
    color: colors.on_surface_variant,
    padding: 16,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
  },
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
