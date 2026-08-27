import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import {
  calculateTax, stateCodeFromGstin, stateName, STATE_OPTIONS,
  lineTotal, type LineItem,
} from '@/constants/gst';
import { listBrandOptions, type InvoiceInput } from '@/lib/invoices';
import { formatINRFull } from '@/lib/format';
import { fromISODate, addDays, toISODate } from '@/lib/dates';
import type { CreatorProfile } from '@/lib/profile';

type Brand = Awaited<ReturnType<typeof listBrandOptions>>[number];

interface Props {
  heading: string;
  initial: InvoiceInput;
  creatorId: string | null;
  creator: CreatorProfile | null;
  submitLabel: string;
  onSubmit: (values: InvoiceInput) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
  extra?: React.ReactNode;
}

export function InvoiceForm({
  heading, initial, creatorId, creator, submitLabel, onSubmit, onDelete, onClose, extra,
}: Props) {
  const [brandId, setBrandId] = useState<string | null>(initial.brand_id ?? null);
  const [invoiceDate, setInvoiceDate] = useState(initial.invoice_date);
  const [dueDate, setDueDate] = useState<string | null>(initial.due_date ?? null);
  const [items, setItems] = useState<LineItem[]>(
    initial.line_items.length > 0 ? initial.line_items : [{ description: '', quantity: 1, rate: 0 }],
  );
  const [applyGst, setApplyGst] = useState(initial.applyGst);
  const [placeOfSupply, setPlaceOfSupply] = useState<string | null>(initial.place_of_supply ?? null);
  const [sacCode, setSacCode] = useState(initial.sac_code ?? '998363');
  const [notes, setNotes] = useState(initial.notes ?? '');

  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandPickerOpen, setBrandPickerOpen] = useState(false);
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!creatorId) return;
    listBrandOptions(creatorId).then(setBrands).catch(() => setBrands([]));
  }, [creatorId]);

  const selectedBrand = brands.find((b) => b.id === brandId) ?? null;
  const supplierState = creator?.state_code ?? stateCodeFromGstin(creator?.gst_number);

  // Default the place of supply to the brand's state when we can infer it.
  useEffect(() => {
    if (placeOfSupply || !selectedBrand) return;
    const inferred = selectedBrand.state_code ?? stateCodeFromGstin(selectedBrand.gstin);
    if (inferred) setPlaceOfSupply(inferred);
  }, [selectedBrand, placeOfSupply]);

  const totals = useMemo(
    () => calculateTax(items, { applyGst, supplierStateCode: supplierState, placeOfSupplyCode: placeOfSupply }),
    [items, applyGst, supplierState, placeOfSupply],
  );

  function setItem(i: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function handleSubmit() {
    const valid = items.filter((i) => i.description.trim() && i.rate > 0);
    if (!brandId) return setError('Choose which brand this invoice is for.');
    if (valid.length === 0) return setError('Add at least one line item with a description and amount.');
    if (applyGst && !creator?.gst_number) {
      return setError('Add your GSTIN under Profile → Payment & GST before charging GST.');
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        brand_id: brandId,
        deal_id: initial.deal_id ?? null,
        invoice_date: invoiceDate,
        due_date: dueDate,
        line_items: valid,
        applyGst,
        place_of_supply: placeOfSupply,
        sac_code: sacCode.trim() || '998363',
        notes: notes.trim() || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.iconButton}>
          <Ionicons name="close" size={22} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.heading}>{heading}</Text>
        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={10} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </Pressable>
        ) : <View style={styles.iconButton} />}
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Field label="Bill to">
            <Pressable onPress={() => setBrandPickerOpen(true)} style={({ pressed }) => [styles.picker, pressed && styles.pickerPressed]}>
              <Ionicons name="business-outline" size={16} color={selectedBrand ? Colors.primary : Colors.onSurfaceVariant} />
              <View style={styles.pickerBody}>
                {selectedBrand ? (
                  <>
                    <Text style={styles.pickerValue}>{selectedBrand.name}</Text>
                    <Text style={styles.pickerSub}>
                      {selectedBrand.gstin ? `GSTIN ${selectedBrand.gstin}` : 'No GSTIN on file'}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.pickerPlaceholder}>
                    {brands.length === 0 ? 'No brands yet — add a deal first' : 'Choose a brand'}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={16} color={Colors.onSurfaceVariant} />
            </Pressable>
          </Field>

          <Field label="Line items">
            {items.map((item, i) => (
              <View key={i} style={styles.itemCard}>
                <View style={styles.itemHead}>
                  <Text style={styles.itemIndex}>{i + 1}</Text>
                  {items.length > 1 && (
                    <Pressable onPress={() => setItems((p) => p.filter((_, idx) => idx !== i))} hitSlop={8}>
                      <Ionicons name="close" size={16} color={Colors.onSurfaceVariant} />
                    </Pressable>
                  )}
                </View>
                <TextInput
                  value={item.description}
                  onChangeText={(v) => setItem(i, { description: v })}
                  placeholder="e.g. Instagram Reel — product launch"
                  placeholderTextColor="rgba(193, 198, 215, 0.4)"
                  style={styles.itemInput}
                />
                <View style={styles.itemRow}>
                  <View style={styles.qtyBox}>
                    <Text style={styles.miniLabel}>QTY</Text>
                    <TextInput
                      value={String(item.quantity)}
                      onChangeText={(v) => setItem(i, { quantity: Math.max(1, Number(v.replace(/\D/g, '')) || 1) })}
                      keyboardType="number-pad"
                      style={styles.miniInput}
                    />
                  </View>
                  <View style={styles.rateBox}>
                    <Text style={styles.miniLabel}>RATE (₹)</Text>
                    <TextInput
                      value={item.rate ? String(item.rate) : ''}
                      onChangeText={(v) => setItem(i, { rate: Number(v.replace(/[^0-9.]/g, '')) || 0 })}
                      placeholder="0"
                      placeholderTextColor="rgba(193, 198, 215, 0.4)"
                      keyboardType="decimal-pad"
                      style={styles.miniInput}
                    />
                  </View>
                  <View style={styles.amountBox}>
                    <Text style={styles.miniLabel}>AMOUNT</Text>
                    <Text style={styles.amountValue}>₹{formatINRFull(lineTotal(item))}</Text>
                  </View>
                </View>
              </View>
            ))}
            <Pressable
              onPress={() => setItems((p) => [...p, { description: '', quantity: 1, rate: 0 }])}
              style={styles.addItem}
            >
              <Ionicons name="add" size={16} color={Colors.primary} />
              <Text style={styles.addItemText}>Add line item</Text>
            </Pressable>
          </Field>

          <Field label="Tax">
            <View style={styles.gstRow}>
              <View style={styles.gstBody}>
                <Text style={styles.gstLabel}>Charge GST at 18%</Text>
                <Text style={styles.gstHint}>
                  {creator?.gst_number
                    ? `Your GSTIN ${creator.gst_number}`
                    : 'Add your GSTIN in Payment & GST to enable this'}
                </Text>
              </View>
              <Switch
                value={applyGst}
                onValueChange={setApplyGst}
                disabled={!creator?.gst_number}
                trackColor={{ false: Colors.surfaceContainerHighest, true: Colors.primaryContainer }}
                thumbColor={Colors.onSurface}
              />
            </View>

            {applyGst && (
              <>
                <Pressable onPress={() => setStatePickerOpen(true)} style={({ pressed }) => [styles.picker, pressed && styles.pickerPressed]}>
                  <Ionicons name="location-outline" size={16} color={Colors.onSurfaceVariant} />
                  <View style={styles.pickerBody}>
                    <Text style={placeOfSupply ? styles.pickerValue : styles.pickerPlaceholder}>
                      {placeOfSupply ? `${stateName(placeOfSupply)} (${placeOfSupply})` : 'Place of supply'}
                    </Text>
                    <Text style={styles.pickerSub}>
                      {totals.intraState ? 'CGST + SGST — same state' : 'IGST — different state'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={Colors.onSurfaceVariant} />
                </Pressable>

                <View style={styles.sacRow}>
                  <Text style={styles.miniLabel}>SAC CODE</Text>
                  <TextInput
                    value={sacCode}
                    onChangeText={setSacCode}
                    placeholder="998363"
                    placeholderTextColor="rgba(193, 198, 215, 0.4)"
                    keyboardType="number-pad"
                    style={styles.sacInput}
                  />
                </View>
              </>
            )}
          </Field>

          <Field label="Dates">
            <DateStepper label="Invoice date" value={invoiceDate} onChange={setInvoiceDate} />
            {dueDate ? (
              <>
                <DateStepper label="Payment due" value={dueDate} onChange={setDueDate} />
                <Pressable onPress={() => setDueDate(null)} style={styles.clearRow}>
                  <Text style={styles.clearText}>Remove due date</Text>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={() => setDueDate(toISODate(addDays(fromISODate(invoiceDate), 30)))} style={styles.addItem}>
                <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                <Text style={styles.addItemText}>Add payment due date</Text>
              </Pressable>
            )}
          </Field>

          <Field label="Notes — optional">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Payment terms, PO number, anything the brand needs"
              placeholderTextColor="rgba(193, 198, 215, 0.4)"
              style={[styles.itemInput, styles.textarea]}
              multiline
              textAlignVertical="top"
            />
          </Field>

          <View style={styles.totals}>
            <TotalRow label="Subtotal" value={totals.subtotal} />
            {totals.cgst > 0 && <TotalRow label="CGST @ 9%" value={totals.cgst} />}
            {totals.sgst > 0 && <TotalRow label="SGST @ 9%" value={totals.sgst} />}
            {totals.igst > 0 && <TotalRow label="IGST @ 18%" value={totals.igst} />}
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>₹{formatINRFull(totals.total)}</Text>
            </View>
          </View>

          {extra}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={handleSubmit} disabled={saving} style={styles.submit}>
            <LinearGradient colors={['#ADC6FF', '#4B8EFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitBg}>
              {saving ? <ActivityIndicator color={Colors.onPrimaryContainer} /> : <Text style={styles.submitText}>{submitLabel}</Text>}
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <PickerSheet
        visible={brandPickerOpen}
        title="Bill to"
        onClose={() => setBrandPickerOpen(false)}
        options={brands.map((b) => ({ key: b.id, label: b.name, sub: b.gstin ?? undefined }))}
        selected={brandId}
        onPick={(k) => { setBrandId(k); setPlaceOfSupply(null); setBrandPickerOpen(false); }}
      />
      <PickerSheet
        visible={statePickerOpen}
        title="Place of supply"
        onClose={() => setStatePickerOpen(false)}
        options={STATE_OPTIONS.map((s) => ({ key: s.code, label: s.name, sub: s.code }))}
        selected={placeOfSupply}
        onPick={(k) => { setPlaceOfSupply(k); setStatePickerOpen(false); }}
      />
    </SafeAreaView>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>₹{formatINRFull(value)}</Text>
    </View>
  );
}

function DateStepper({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.dateRow}>
      <Pressable onPress={() => onChange(toISODate(addDays(fromISODate(value), -1)))} hitSlop={8} style={styles.dateStep}>
        <Ionicons name="chevron-back" size={16} color={Colors.primary} />
      </Pressable>
      <View style={styles.dateBody}>
        <Text style={styles.miniLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.dateText}>
          {fromISODate(value).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <Pressable onPress={() => onChange(toISODate(addDays(fromISODate(value), 1)))} hitSlop={8} style={styles.dateStep}>
        <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
      </Pressable>
    </View>
  );
}

function PickerSheet({ visible, title, options, selected, onPick, onClose }: {
  visible: boolean; title: string;
  options: { key: string; label: string; sub?: string }[];
  selected: string | null; onPick: (key: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {options.length === 0 && <Text style={styles.sheetEmpty}>Nothing to choose from yet.</Text>}
            {options.map((o) => {
              const active = o.key === selected;
              return (
                <Pressable key={o.key} onPress={() => onPick(o.key)} style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && !active && styles.optionPressed]}>
                  <View style={styles.optionBody}>
                    <Text style={styles.optionText} numberOfLines={1}>{o.label}</Text>
                    {o.sub && <Text style={styles.optionSub}>{o.sub}</Text>}
                  </View>
                  {active && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heading: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: Colors.onSurface },
  body: { padding: 20, paddingBottom: 32, gap: 22 },
  field: { gap: 10 },
  fieldLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: Colors.onSurfaceVariant, letterSpacing: 0.5, textTransform: 'uppercase' },

  picker: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceContainerLow, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  pickerPressed: { backgroundColor: Colors.surfaceContainerHigh },
  pickerBody: { flex: 1, gap: 2 },
  pickerValue: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: Colors.onSurface },
  pickerSub: { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.onSurfaceVariant },
  pickerPlaceholder: { fontFamily: 'Manrope_400Regular', fontSize: 14, color: 'rgba(193, 198, 215, 0.4)' },

  itemCard: { backgroundColor: Colors.surfaceContainerLow, borderRadius: 14, padding: 12, gap: 10 },
  itemHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemIndex: { fontFamily: 'Manrope_700Bold', fontSize: 11, color: Colors.onSurfaceVariant },
  itemInput: { backgroundColor: Colors.surfaceContainerHigh, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontFamily: 'Manrope_500Medium', fontSize: 14, color: Colors.onSurface },
  textarea: { minHeight: 80, paddingTop: 12 },
  itemRow: { flexDirection: 'row', gap: 8 },
  qtyBox: { width: 62, gap: 4 },
  rateBox: { flex: 1, gap: 4 },
  amountBox: { flex: 1, gap: 4, alignItems: 'flex-end' },
  miniLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 9, color: Colors.onSurfaceVariant, letterSpacing: 0.6 },
  miniInput: { backgroundColor: Colors.surfaceContainerHigh, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: Colors.onSurface },
  amountValue: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: Colors.primary, paddingVertical: 9 },
  addItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.surfaceContainerLow },
  addItemText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: Colors.primary },

  gstRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surfaceContainerLow, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  gstBody: { flex: 1, gap: 2 },
  gstLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: Colors.onSurface },
  gstHint: { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.onSurfaceVariant },
  sacRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: Colors.surfaceContainerLow, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  sacInput: { minWidth: 110, textAlign: 'right', fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: Colors.onSurface, paddingVertical: 4 },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceContainerLow, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 10 },
  dateStep: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceContainerHigh },
  dateBody: { flex: 1, alignItems: 'center', gap: 2 },
  dateText: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.onSurface },
  clearRow: { alignSelf: 'flex-start', paddingVertical: 4 },
  clearText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: Colors.onSurfaceVariant },

  totals: { backgroundColor: Colors.surfaceContainerLow, borderRadius: 16, padding: 16, gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.onSurfaceVariant },
  totalValue: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: Colors.onSurface },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(193, 198, 215, 0.12)' },
  grandLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: Colors.onSurface },
  grandValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 20, color: Colors.primary, letterSpacing: -0.4 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: 'rgba(147, 0, 10, 0.22)' },
  errorText: { flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.onErrorContainer },

  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  submit: { borderRadius: 16, overflow: 'hidden' },
  submitBg: { paddingVertical: 16, alignItems: 'center' },
  submitText: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: Colors.onPrimaryContainer },

  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surfaceContainer, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 34 },
  sheetHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 999, backgroundColor: 'rgba(193, 198, 215, 0.25)', marginBottom: 12 },
  sheetTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: Colors.onSurface, paddingHorizontal: 10, paddingBottom: 8 },
  sheetEmpty: { fontFamily: 'Manrope_400Regular', fontSize: 13, color: Colors.onSurfaceVariant, textAlign: 'center', padding: 24 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 16 },
  optionActive: { backgroundColor: Colors.surfaceContainerHigh },
  optionPressed: { backgroundColor: 'rgba(193, 198, 215, 0.06)' },
  optionBody: { flex: 1, gap: 2 },
  optionText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: Colors.onSurface },
  optionSub: { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.onSurfaceVariant },
});
