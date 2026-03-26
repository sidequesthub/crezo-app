import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

import { Button, DatePickerField, FormField, SelectField } from '@/components/ui';
import { colors, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useAPI } from '@/hooks/useAPI';
import { useCreatorData } from '@/hooks/useCreatorData';
import type { DealStatus } from '@/types';

const DEAL_STATUS_OPTIONS: { value: DealStatus; label: string }[] = [
  { value: 'pitched', label: 'Pitched' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'paid', label: 'Paid' },
];

export default function AddDealScreen() {
  const { user } = useAuth();
  const { deals: dealsSvc } = useAPI();
  const { creator, refresh } = useCreatorData();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [title, setTitle] = useState('');
  const [valueInr, setValueInr] = useState('');
  const [status, setStatus] = useState<DealStatus>('pitched');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usageRights, setUsageRights] = useState('');
  const [notes, setNotes] = useState('');

  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandContact, setNewBrandContact] = useState('');
  const [newBrandEmail, setNewBrandEmail] = useState('');
  const [newBrandWhatsapp, setNewBrandWhatsapp] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBrands = useCallback(async () => {
    if (!creator) return;
    try {
      const b = await dealsSvc.listBrands(creator.id);
      setBrands(b);
    } catch {}
  }, [creator, dealsSvc]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  async function handleSave() {
    setError(null);
    if (!title.trim()) { setError('Deal title is required'); return; }
    if (!valueInr || isNaN(Number(valueInr))) { setError('Enter a valid amount'); return; }
    if (!selectedBrandId && !newBrandName.trim()) {
      setError('Select or create a brand');
      return;
    }
    if (!user || !creator) return;

    setSaving(true);
    try {
      let brandId = selectedBrandId;
      if (!brandId) {
        brandId = await dealsSvc.createBrand({
          creator_id: creator.id,
          name: newBrandName.trim(),
          contact_person: newBrandContact || null,
          email: newBrandEmail || null,
          whatsapp: newBrandWhatsapp || null,
        });
      }

      await dealsSvc.create({
        creator_id: creator.id,
        brand_id: brandId,
        title: title.trim(),
        value_inr: Number(valueInr),
        status,
        start_date: startDate || null,
        end_date: endDate || null,
        usage_rights: usageRights || null,
        notes: notes || null,
      });

      await refresh();
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create deal');
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
          <Text style={styles.headerTitle}>New Deal</Text>
          <View style={{ width: 24 }} />
        </View>

        <FormField label="Deal Title *" value={title} onChangeText={setTitle} placeholder="e.g. Boat Earphones Campaign" />
        <FormField label="Deal Value (₹) *" value={valueInr} onChangeText={setValueInr} keyboardType="numeric" placeholder="50000" />
        <SelectField label="Status" options={DEAL_STATUS_OPTIONS} value={status} onChange={setStatus} />
        <DatePickerField label="Start Date" value={startDate} onChange={setStartDate} />
        <DatePickerField label="End Date" value={endDate} onChange={setEndDate} />
        <FormField label="Usage Rights" value={usageRights} onChangeText={setUsageRights} placeholder="e.g. 6 months, Instagram only" />
        <FormField label="Notes" value={notes} onChangeText={setNotes} multiline style={styles.textArea} />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Brand *</Text>
          {brands.length > 0 && !showNewBrand && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandChips}>
              {brands.map((b) => (
                <Pressable
                  key={b.id}
                  style={[styles.brandChip, selectedBrandId === b.id && styles.brandChipActive]}
                  onPress={() => { setSelectedBrandId(b.id); setShowNewBrand(false); }}
                >
                  <Text style={[styles.chipText, selectedBrandId === b.id && styles.chipTextActive]}>{b.name}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.brandChip} onPress={() => { setSelectedBrandId(null); setShowNewBrand(true); }}>
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={[styles.chipText, styles.chipTextActive]}>New</Text>
              </Pressable>
            </ScrollView>
          )}
          {(showNewBrand || brands.length === 0) && (
            <View style={styles.newBrandForm}>
              <FormField label="Brand Name *" value={newBrandName} onChangeText={setNewBrandName} placeholder="e.g. Boat" />
              <FormField label="Contact Person" value={newBrandContact} onChangeText={setNewBrandContact} />
              <FormField label="Email" value={newBrandEmail} onChangeText={setNewBrandEmail} keyboardType="email-address" />
              <FormField label="WhatsApp" value={newBrandWhatsapp} onChangeText={setNewBrandWhatsapp} keyboardType="phone-pad" />
              {brands.length > 0 && (
                <Pressable onPress={() => setShowNewBrand(false)}>
                  <Text style={styles.cancelNew}>Select existing brand instead</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        <Button title={saving ? 'Creating...' : 'Create Deal'} onPress={handleSave} variant="primary" disabled={saving} />
        <Button title="Cancel" onPress={() => router.back()} variant="tertiary" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 24, paddingBottom: 80, gap: 20 },
  scrollWide: { maxWidth: 600, alignSelf: 'center', width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerTitle: { ...typography.headline_md, color: colors.on_surface },
  section: { gap: 8 },
  sectionLabel: { ...typography.label_md, color: colors.on_surface_variant },
  brandChips: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  brandChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.surface_container_low, borderWidth: 1, borderColor: 'transparent' },
  brandChipActive: { backgroundColor: colors.primary + '25', borderColor: colors.primary },
  chipText: { ...typography.label_sm, color: colors.on_surface_variant },
  chipTextActive: { color: colors.primary },
  newBrandForm: { gap: 12, padding: 16, backgroundColor: colors.surface_container_low, borderRadius: 12 },
  cancelNew: { ...typography.label_sm, color: colors.primary, textAlign: 'center', marginTop: 4 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  error: { ...typography.body_sm, color: colors.error, textAlign: 'center', backgroundColor: 'rgba(147, 0, 10, 0.15)', padding: 12, borderRadius: 8 },
});
