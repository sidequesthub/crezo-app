import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { InvoiceForm } from '@/components/invoices/InvoiceForm';
import { invoiceStatusMeta } from '@/constants/invoiceStatus';
import {
  getInvoice, updateInvoice, deleteInvoice, setInvoiceStatus, INVOICE_STATUS_ORDER,
  getCreatorId, type Invoice, type InvoiceInput, type InvoiceStatus,
} from '@/lib/invoices';
import { getProfile, type CreatorProfile } from '@/lib/profile';
import { shareInvoicePdf } from '@/lib/invoicePdf';
import { stateCodeFromGstin } from '@/constants/gst';

export default function EditInvoiceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [initial, setInitial] = useState<InvoiceInput | null>(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [cid, profile, inv] = await Promise.all([getCreatorId(), getProfile(), getInvoice(id)]);
      if (!inv) throw new Error('This invoice no longer exists.');
      setCreatorId(cid);
      setCreator(profile);
      setInvoice(inv);
      setInitial({
        deal_id: inv.deal_id,
        brand_id: inv.brand_id,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        line_items: inv.line_items,
        applyGst: inv.gst_amount > 0,
        place_of_supply: inv.place_of_supply,
        sac_code: inv.sac_code,
        notes: inv.notes,
        status: inv.status,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function share() {
    if (!invoice || !creator || sharing) return;
    setSharing(true);
    try {
      await shareInvoicePdf(invoice, creator);
      // Sharing a draft implies it has gone out.
      if (invoice.status === 'draft') {
        await setInvoiceStatus(invoice.id, 'sent');
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate the PDF');
    } finally {
      setSharing(false);
    }
  }

  async function changeStatus(status: InvoiceStatus) {
    try {
      await setInvoiceStatus(id, status);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update status');
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this invoice?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await deleteInvoice(id); router.back(); }
          catch (e) { setError(e instanceof Error ? e.message : 'Could not delete'); }
        },
      },
    ]);
  }

  if (error && !initial) {
    return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>;
  }
  if (!initial || !invoice) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const number = invoice.invoice_number ? `INV-${String(invoice.invoice_number).padStart(4, '0')}` : 'Draft';

  return (
    <InvoiceForm
      heading={number}
      initial={initial}
      creatorId={creatorId}
      creator={creator}
      submitLabel="Save changes"
      onClose={() => router.back()}
      onDelete={confirmDelete}
      onSubmit={async (values) => {
        const supplierState = creator?.state_code ?? stateCodeFromGstin(creator?.gst_number);
        await updateInvoice(id, values, supplierState);
        router.back();
      }}
      extra={
        <View style={styles.actions}>
          <Pressable onPress={share} disabled={sharing} style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.85 }]}>
            {sharing ? (
              <ActivityIndicator color={Colors.onPrimaryContainer} />
            ) : (
              <>
                <Ionicons name="share-outline" size={18} color={Colors.onPrimaryContainer} />
                <Text style={styles.shareText}>Share PDF</Text>
              </>
            )}
          </Pressable>
          <Text style={styles.shareHint}>
            Generates the invoice as a PDF and opens your share sheet — WhatsApp, email, anywhere.
          </Text>

          <Text style={styles.statusLabel}>STATUS</Text>
          <View style={styles.statusRow}>
            {INVOICE_STATUS_ORDER.map((s) => {
              const meta = invoiceStatusMeta(s);
              const active = invoice.status === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => changeStatus(s)}
                  style={[styles.statusChip, active && { backgroundColor: meta.bg, borderColor: meta.fg }]}
                >
                  <Text style={[styles.statusChipText, active && { color: meta.fg }]}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {invoice.paid_date && (
            <Text style={styles.paidNote}>Marked paid on {invoice.paid_date}</Text>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: Colors.surface },
  errorText: { fontFamily: 'Manrope_500Medium', fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center' },
  actions: { gap: 10 },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: Colors.primary },
  shareText: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.onPrimaryContainer },
  shareHint: { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.onSurfaceVariant, lineHeight: 16 },
  statusLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: Colors.onSurfaceVariant, letterSpacing: 0.5, marginTop: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: Colors.surfaceContainerLow, borderWidth: 1, borderColor: 'transparent' },
  statusChipText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: Colors.onSurfaceVariant },
  paidNote: { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.onSurfaceVariant },
});
