import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { InvoiceForm } from '@/components/invoices/InvoiceForm';
import { InvoicePreview } from '@/components/invoices/InvoicePreview';
import { IssuedInvoiceView } from '@/components/invoices/IssuedInvoiceView';
import {
  getInvoice, updateInvoice, deleteInvoice, setInvoiceStatus,
  issueInvoice, cancelInvoice, reviseInvoice, isEditable, invoiceLabel,
  getCreatorId, type Invoice, type InvoiceInput, type InvoiceStatus,
} from '@/lib/invoices';
import { getProfile, type CreatorProfile } from '@/lib/profile';
import { shareInvoicePdf } from '@/lib/invoicePdf';
import { stateCodeFromGstin } from '@/constants/gst';

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [initial, setInitial] = useState<InvoiceInput | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate the PDF');
    } finally {
      setSharing(false);
    }
  }

  /** Issuing assigns the number and locks the invoice. */
  function confirmIssue() {
    Alert.alert(
      'Issue this invoice?',
      'It gets the next number in your series and can no longer be edited. To correct it later you would cancel and reissue.',
      [
        { text: 'Keep as draft', style: 'cancel' },
        {
          text: 'Issue',
          onPress: async () => {
            try {
              await issueInvoice(id);
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not issue');
            }
          },
        },
      ],
    );
  }

  /** Asks for a reason where the platform supports it, else just confirms. */
  function promptForReason(
    title: string,
    message: string,
    confirmLabel: string,
    destructive: boolean,
    onConfirm: (reason: string) => void,
  ) {
    if (Platform.OS === 'ios' && Alert.prompt) {
      Alert.prompt(
        title,
        message,
        [
          { text: 'Back', style: 'cancel' },
          {
            text: confirmLabel,
            style: destructive ? 'destructive' : 'default',
            onPress: (reason?: string) => onConfirm(reason ?? ''),
          },
        ],
        'plain-text',
      );
      return;
    }
    Alert.alert(title, message, [
      { text: 'Back', style: 'cancel' },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => onConfirm(''),
      },
    ]);
  }

  function confirmCancel() {
    promptForReason(
      'Cancel this invoice?',
      'Add a reason for your records. The number stays reserved and cannot be reused.',
      'Cancel invoice',
      true,
      async (reason) => {
        try {
          await cancelInvoice(id, reason);
          await load();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not cancel');
        }
      },
    );
  }

  function confirmRevise() {
    promptForReason(
      'Cancel and revise?',
      'This invoice is cancelled and a copy opens as a new draft. The replacement gets its own number when you issue it.',
      'Revise',
      false,
      async (reason) => {
        try {
          const cid = creatorId ?? (await getCreatorId());
          if (!cid || !invoice) throw new Error('Could not load your profile.');
          const replacement = await reviseInvoice(cid, invoice, reason || 'Revised');
          router.replace(`/invoices/${replacement.id}`);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not revise');
        }
      },
    );
  }

  function confirmDeleteDraft() {
    Alert.alert('Delete this draft?', 'It has no invoice number yet, so nothing is left behind.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try { await deleteInvoice(id); router.back(); }
          catch (e) { setError(e instanceof Error ? e.message : 'Could not delete'); }
        },
      },
    ]);
  }

  async function changeStatus(status: InvoiceStatus) {
    try { await setInvoiceStatus(id, status); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update status'); }
  }

  if (error && !invoice) {
    return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>;
  }
  if (!invoice || !initial) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const preview = (
    <InvoicePreview
      visible={previewOpen}
      invoice={invoice}
      creator={creator}
      sharing={sharing}
      onClose={() => setPreviewOpen(false)}
      onShare={async () => { await share(); setPreviewOpen(false); }}
    />
  );

  // Issued invoices are immutable — show the record, not the form.
  if (!isEditable(invoice)) {
    return (
      <>
        <IssuedInvoiceView
          invoice={invoice}
          sharing={sharing}
          onClose={() => router.back()}
          onPreview={() => setPreviewOpen(true)}
          onShare={share}
          onStatus={changeStatus}
          onCancel={confirmCancel}
          onRevise={confirmRevise}
        />
        {preview}
      </>
    );
  }

  return (
    <InvoiceForm
      heading={invoiceLabel(invoice)}
      initial={initial}
      creatorId={creatorId}
      creator={creator}
      submitLabel="Save draft"
      onClose={() => router.back()}
      onDelete={confirmDeleteDraft}
      onSubmit={async (values) => {
        const supplierState = creator?.state_code ?? stateCodeFromGstin(creator?.gst_number);
        await updateInvoice(id, values, supplierState);
        await load();
      }}
      extra={
        <View style={styles.actions}>
          <View style={styles.buttonRow}>
            <Pressable onPress={() => setPreviewOpen(true)} style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.85 }]}>
              <Ionicons name="eye-outline" size={18} color={Colors.primary} />
              <Text style={styles.secondaryText}>Preview</Text>
            </Pressable>
            <Pressable onPress={confirmIssue} style={({ pressed }) => [styles.issue, pressed && { opacity: 0.85 }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color={Colors.onPrimaryContainer} />
              <Text style={styles.issueText}>Issue invoice</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            Drafts carry no invoice number and can be edited freely. Issuing assigns the next
            number in your {new Date().getMonth() >= 3 ? 'current' : ''} financial-year series and locks the invoice.
          </Text>
        </View>
      }
      after={preview}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: Colors.surface },
  errorText: { fontFamily: 'Manrope_500Medium', fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center' },
  actions: { gap: 10 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  secondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: Colors.surfaceContainerHighest },
  secondaryText: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.primary },
  issue: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: Colors.primary },
  issueText: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.onPrimaryContainer },
  hint: { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.onSurfaceVariant, lineHeight: 16 },
});
