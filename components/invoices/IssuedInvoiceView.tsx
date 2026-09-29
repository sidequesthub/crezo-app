import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { invoiceStatusMeta } from '@/constants/invoiceStatus';
import { stateName, lineTotal } from '@/constants/gst';
import { INVOICE_STATUS_ORDER, invoiceLabel, type Invoice, type InvoiceStatus } from '@/lib/invoices';
import { formatINRFull } from '@/lib/format';
import { fromISODate } from '@/lib/dates';

interface Props {
  invoice: Invoice;
  onClose: () => void;
  onPreview: () => void;
  onShare: () => void;
  onStatus: (s: InvoiceStatus) => void;
  onCancel: () => void;
  onRevise: () => void;
  sharing?: boolean;
}

/**
 * Read-only view of an issued invoice.
 *
 * Issued invoices are legal records — GST does not permit editing one after the
 * fact. Corrections go through cancel-and-replace instead, which keeps the
 * number series intact and leaves an audit trail.
 */
export function IssuedInvoiceView({
  invoice, onClose, onPreview, onShare, onStatus, onCancel, onRevise, sharing,
}: Props) {
  const meta = invoiceStatusMeta(invoice.status);
  const cancelled = invoice.status === 'cancelled';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.onSurface} />
        </Pressable>
        <View style={styles.headerBody}>
          <Text style={styles.heading}>{invoiceLabel(invoice)}</Text>
          <Text style={styles.subheading}>{invoice.brand?.name ?? 'No brand'}</Text>
        </View>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.lockNotice, cancelled && styles.cancelNotice]}>
          <Ionicons
            name={cancelled ? 'close-circle' : 'lock-closed'}
            size={16}
            color={cancelled ? Colors.error : Colors.onSurfaceVariant}
          />
          <Text style={[styles.lockText, cancelled && { color: Colors.error }]}>
            {cancelled
              ? `Cancelled${invoice.cancellation_reason ? ` — ${invoice.cancellation_reason}` : ''}. Its number stays reserved so the series has no gaps.`
              : 'Issued invoices can’t be edited. To correct one, cancel it and issue a replacement.'}
          </Text>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>TOTAL</Text>
          <Text style={styles.amountValue}>₹{formatINRFull(invoice.total)}</Text>
          <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusChipText, { color: meta.fg }]}>{meta.short}</Text>
          </View>
        </View>

        <Section label="Details">
          <Row label="Invoice date" value={fromISODate(invoice.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
          {invoice.due_date && (
            <Row label="Payment due" value={fromISODate(invoice.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
          )}
          {invoice.place_of_supply && (
            <Row label="Place of supply" value={`${stateName(invoice.place_of_supply)} (${invoice.place_of_supply})`} />
          )}
          {invoice.gst_amount > 0 && <Row label="SAC code" value={invoice.sac_code ?? '—'} />}
        </Section>

        <Section label={`Line items (${invoice.line_items.length})`}>
          {invoice.line_items.map((item, i) => (
            <View key={i} style={styles.lineItem}>
              <View style={styles.lineBody}>
                <Text style={styles.lineDesc}>{item.description}</Text>
                <Text style={styles.lineMeta}>
                  {item.quantity} × ₹{formatINRFull(item.rate)}
                </Text>
              </View>
              <Text style={styles.lineAmount}>₹{formatINRFull(lineTotal(item))}</Text>
            </View>
          ))}
        </Section>

        <Section label="Totals">
          <Row label="Subtotal" value={`₹${formatINRFull(invoice.amount)}`} />
          {invoice.cgst_amount > 0 && <Row label={`CGST @ ${invoice.gst_rate / 2}%`} value={`₹${formatINRFull(invoice.cgst_amount)}`} />}
          {invoice.sgst_amount > 0 && <Row label={`SGST @ ${invoice.gst_rate / 2}%`} value={`₹${formatINRFull(invoice.sgst_amount)}`} />}
          {invoice.igst_amount > 0 && <Row label={`IGST @ ${invoice.gst_rate}%`} value={`₹${formatINRFull(invoice.igst_amount)}`} />}
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>₹{formatINRFull(invoice.total)}</Text>
          </View>
        </Section>

        {!cancelled && (
          <Section label="Status">
            <View style={styles.statusRow}>
              {INVOICE_STATUS_ORDER.map((s) => {
                const m = invoiceStatusMeta(s);
                const active = invoice.status === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => onStatus(s)}
                    style={[styles.stage, active && { backgroundColor: m.bg, borderColor: m.fg }]}
                  >
                    <Text style={[styles.stageText, active && { color: m.fg }]}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {invoice.paid_date && <Text style={styles.note}>Paid on {invoice.paid_date}</Text>}
          </Section>
        )}

        <View style={styles.actions}>
          <Pressable onPress={onPreview} style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.85 }]}>
            <Ionicons name="eye-outline" size={18} color={Colors.primary} />
            <Text style={styles.secondaryText}>Preview</Text>
          </Pressable>
          <Pressable onPress={onShare} disabled={sharing} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
            {sharing ? (
              <ActivityIndicator color={Colors.onPrimaryContainer} />
            ) : (
              <>
                <Ionicons name="share-outline" size={18} color={Colors.onPrimaryContainer} />
                <Text style={styles.primaryText}>Share PDF</Text>
              </>
            )}
          </Pressable>
        </View>

        {!cancelled && (
          <View style={styles.lifecycle}>
            <Pressable onPress={onRevise} style={({ pressed }) => [styles.lifecycleRow, pressed && styles.rowPressed]}>
              <Ionicons name="refresh-outline" size={18} color={Colors.secondary} />
              <View style={styles.lifecycleBody}>
                <Text style={styles.lifecycleLabel}>Cancel and revise</Text>
                <Text style={styles.lifecycleHint}>
                  Cancels this one and opens a copy as a new draft, with its own number.
                </Text>
              </View>
            </Pressable>
            <Pressable onPress={onCancel} style={({ pressed }) => [styles.lifecycleRow, pressed && styles.rowPressed]}>
              <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
              <View style={styles.lifecycleBody}>
                <Text style={[styles.lifecycleLabel, { color: Colors.error }]}>Cancel invoice</Text>
                <Text style={styles.lifecycleHint}>
                  Marks it cancelled. The number stays reserved and can’t be reused.
                </Text>
              </View>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 10 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerBody: { flex: 1, alignItems: 'center' },
  heading: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: Colors.onSurface },
  subheading: { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.onSurfaceVariant },
  body: { padding: 20, paddingBottom: 40, gap: 20 },

  lockNotice: { flexDirection: 'row', gap: 10, padding: 13, borderRadius: 14, backgroundColor: Colors.surfaceContainerLow },
  cancelNotice: { backgroundColor: 'rgba(147, 0, 10, 0.14)' },
  lockText: { flex: 1, fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 17 },

  amountCard: { alignItems: 'center', gap: 6, paddingVertical: 22, borderRadius: 20, backgroundColor: Colors.surfaceContainerLow },
  amountLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 10, color: Colors.onSurfaceVariant, letterSpacing: 1 },
  amountValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 34, color: Colors.primary, letterSpacing: -1 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginTop: 4 },
  statusChipText: { fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 0.6 },

  section: { gap: 10 },
  sectionLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: Colors.onSurfaceVariant, letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionBody: { gap: 8, backgroundColor: Colors.surfaceContainerLow, borderRadius: 16, padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.onSurfaceVariant },
  rowValue: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: Colors.onSurface, flexShrink: 1, textAlign: 'right' },

  lineItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineBody: { flex: 1, gap: 2 },
  lineDesc: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: Colors.onSurface },
  lineMeta: { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.onSurfaceVariant },
  lineAmount: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.onSurface },

  grandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(193, 198, 215, 0.12)' },
  grandLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: Colors.onSurface },
  grandValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: Colors.primary },

  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stage: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: Colors.surfaceContainerHigh, borderWidth: 1, borderColor: 'transparent' },
  stageText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: Colors.onSurfaceVariant },
  note: { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.onSurfaceVariant },

  actions: { flexDirection: 'row', gap: 10 },
  secondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: Colors.surfaceContainerHighest },
  secondaryText: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.primary },
  primary: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: Colors.primary },
  primaryText: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.onPrimaryContainer },

  lifecycle: { gap: 8 },
  lifecycleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 16, backgroundColor: Colors.surfaceContainerLow },
  rowPressed: { backgroundColor: Colors.surfaceContainerHigh },
  lifecycleBody: { flex: 1, gap: 2 },
  lifecycleLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: Colors.onSurface },
  lifecycleHint: { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.onSurfaceVariant, lineHeight: 16 },
});
