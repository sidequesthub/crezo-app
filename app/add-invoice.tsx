import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Button, CurrencyDisplay, FormField } from '@/components/ui';
import { colors, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useAPI } from '@/hooks/useAPI';
import { useCreatorData } from '@/hooks/useCreatorData';
const GST_RATE = 0.18;

export default function AddInvoiceScreen() {
  const { user } = useAuth();
  const { invoices: invoicesSvc } = useAPI();
  const { deals, creator, refresh } = useCreatorData();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [includeGst, setIncludeGst] = useState(false);
  const [gstin, setGstin] = useState(creator?.gst_number ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDeal = deals.find((d) => d.id === selectedDealId);

  useEffect(() => {
    if (selectedDeal) {
      setAmount(String(selectedDeal.value_inr));
    }
  }, [selectedDealId]);

  useEffect(() => {
    if (creator?.gst_number) setGstin(creator.gst_number);
  }, [creator?.gst_number]);

  const amtNum = Number(amount) || 0;
  const gstAmount = includeGst ? Math.round(amtNum * GST_RATE) : 0;
  const total = amtNum + gstAmount;

  async function handleSave() {
    setError(null);
    if (!selectedDealId || !selectedDeal) {
      setError('Select a deal');
      return;
    }
    if (amtNum <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!user || !creator) return;

    setSaving(true);
    try {
      await invoicesSvc.create({
        creator_id: creator.id,
        deal_id: selectedDeal.id,
        brand_id: selectedDeal.brand_id,
        amount: amtNum,
        gst_amount: gstAmount,
        total,
        status: 'draft',
        gstin: gstin || null,
      });
      await refresh();
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create invoice');
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
          <Text style={styles.headerTitle}>New Invoice</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select Deal *</Text>
          {deals.length === 0 ? (
            <Text style={styles.hint}>
              Create a deal first, then generate an invoice from it.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dealChips}
            >
              {deals.map((d) => (
                <Pressable
                  key={d.id}
                  style={[
                    styles.dealChip,
                    selectedDealId === d.id && styles.dealChipSelected,
                  ]}
                  onPress={() => setSelectedDealId(d.id)}
                >
                  <Text
                    style={[
                      styles.dealChipText,
                      selectedDealId === d.id && styles.dealChipTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {d.title}
                  </Text>
                  <Text style={styles.dealChipBrand}>
                    {d.brand?.name ?? ''}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {selectedDeal && (
          <View style={styles.prefillCard}>
            <Text style={styles.prefillLabel}>Pre-filled from deal</Text>
            <Text style={styles.prefillValue}>{selectedDeal.title}</Text>
            <Text style={styles.prefillBrand}>
              {selectedDeal.brand?.name} · ₹
              {selectedDeal.value_inr.toLocaleString('en-IN')}
            </Text>
          </View>
        )}

        <FormField
          label="Amount (₹) *"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="75000"
        />

        <View style={styles.gstRow}>
          <View style={styles.gstLeft}>
            <Text style={styles.gstLabel}>Include GST (18%)</Text>
            <Text style={styles.gstHint}>
              Mandatory for creators earning ₹20L+ per year
            </Text>
          </View>
          <Switch
            value={includeGst}
            onValueChange={setIncludeGst}
            trackColor={{
              false: colors.surface_container_highest,
              true: colors.primary + '60',
            }}
            thumbColor={includeGst ? colors.primary : colors.on_surface_variant}
          />
        </View>

        {includeGst && (
          <FormField
            label="GSTIN"
            value={gstin}
            onChangeText={setGstin}
            placeholder="27AABCU9603R1ZM"
            autoCapitalize="characters"
          />
        )}

        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              ₹{amtNum.toLocaleString('en-IN')}
            </Text>
          </View>
          {includeGst && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST (18%)</Text>
              <Text style={styles.totalValue}>
                ₹{gstAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.totalRowFinal]}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <CurrencyDisplay amount={total} size="lg" variant="primary" />
          </View>
        </View>

        {creator?.upi_id || creator?.bank_account_number ? (
          <View style={styles.bankCard}>
            <Ionicons name="card-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bankTitle}>Payment Details (on invoice)</Text>
              {creator.upi_id && (
                <Text style={styles.bankDetail}>UPI: {creator.upi_id}</Text>
              )}
              {creator.bank_name && (
                <Text style={styles.bankDetail}>Bank: {creator.bank_name}</Text>
              )}
              {creator.bank_account_number && (
                <Text style={styles.bankDetail}>A/C: {creator.bank_account_number}</Text>
              )}
              {creator.bank_ifsc && (
                <Text style={styles.bankDetail}>IFSC: {creator.bank_ifsc}</Text>
              )}
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.bankCard}
            onPress={() => router.push('/edit-profile' as never)}
          >
            <Ionicons name="alert-circle-outline" size={18} color={colors.secondary} />
            <Text style={styles.bankMissing}>
              Add UPI ID / bank details in profile for invoices
            </Text>
          </Pressable>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          title={saving ? 'Creating...' : 'Create Invoice'}
          onPress={handleSave}
          variant="primary"
          disabled={saving || !selectedDealId}
        />
        <Button title="Cancel" onPress={() => router.back()} variant="tertiary" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 24, paddingBottom: 80, gap: 20 },
  scrollWide: { maxWidth: 600, alignSelf: 'center', width: '100%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: { ...typography.headline_md, color: colors.on_surface },
  section: { gap: 8 },
  sectionLabel: { ...typography.label_md, color: colors.on_surface_variant },
  hint: { ...typography.body_sm, color: colors.on_surface_variant },
  dealChips: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  dealChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surface_container_low,
    borderWidth: 1,
    borderColor: 'rgba(65, 71, 85, 0.2)',
    maxWidth: 200,
  },
  dealChipSelected: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  dealChipText: { ...typography.label_md, color: colors.on_surface },
  dealChipTextSelected: { color: colors.primary },
  dealChipBrand: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
    marginTop: 2,
  },
  prefillCard: {
    padding: 16,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  prefillLabel: { ...typography.label_sm, color: colors.primary },
  prefillValue: {
    ...typography.body_md,
    color: colors.on_surface,
    fontWeight: '600',
    marginTop: 4,
  },
  prefillBrand: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
    marginTop: 2,
  },
  gstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
  },
  gstLeft: { flex: 1, marginRight: 12 },
  gstLabel: { ...typography.body_md, color: colors.on_surface },
  gstHint: { ...typography.label_sm, color: colors.on_surface_variant, marginTop: 2 },
  totalCard: {
    padding: 20,
    backgroundColor: colors.surface_container_high,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(65, 71, 85, 0.1)',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRowFinal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(65, 71, 85, 0.15)',
    paddingTop: 12,
  },
  totalLabel: { ...typography.body_md, color: colors.on_surface_variant },
  totalValue: { ...typography.body_md, color: colors.on_surface },
  totalFinalLabel: { ...typography.headline_sm, color: colors.on_surface },
  bankCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
  },
  bankTitle: { ...typography.label_md, color: colors.primary },
  bankDetail: { ...typography.body_sm, color: colors.on_surface_variant, marginTop: 2 },
  bankMissing: { ...typography.body_sm, color: colors.secondary, flex: 1 },
  error: {
    ...typography.body_sm,
    color: colors.error,
    textAlign: 'center',
    backgroundColor: 'rgba(147, 0, 10, 0.15)',
    padding: 12,
    borderRadius: 8,
  },
});
