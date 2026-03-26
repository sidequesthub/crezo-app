import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { generateInvoiceHtml, getInvoiceNumber } from '@/utils/invoice-pdf';
import type { InvoiceStatus } from '@/types';

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'paid', label: 'Paid' },
];

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { invoices: invoicesSvc } = useAPI();
  const { invoices, deals, creator, refresh } = useCreatorData();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const invoice = invoices.find((i) => i.id === id);
  const deal = invoice ? deals.find((d) => d.id === invoice.deal_id) : null;

  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(invoice?.amount ?? ''));
  const [gstAmount, setGstAmount] = useState(String(invoice?.gst_amount ?? ''));
  const [gstin, setGstin] = useState(invoice?.gstin ?? '');
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status ?? 'draft');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!invoice) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorMsg}>Invoice not found</Text>
        <Button title="Go back" onPress={() => router.back()} variant="tertiary" />
      </View>
    );
  }

  const invoiceNumber = getInvoiceNumber(invoice);

  async function handleSave() {
    setError(null);
    const amtNum = Number(amount) || 0;
    const gstNum = Number(gstAmount) || 0;
    setSaving(true);
    try {
      await invoicesSvc.update(invoice!.id, {
        amount: amtNum,
        gst_amount: gstNum,
        total: amtNum + gstNum,
        gstin: gstin || null,
        status,
        ...(status === 'sent' && !invoice!.sent_date
          ? { sent_date: new Date().toISOString().slice(0, 10) }
          : {}),
        ...(status === 'paid' && !invoice!.paid_date
          ? { paid_date: new Date().toISOString().slice(0, 10) }
          : {}),
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
      ? window.confirm('Delete this invoice?')
      : await new Promise<boolean>((resolve) =>
          Alert.alert('Delete', 'Delete this invoice?', [
            { text: 'Cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
          ])
        );
    if (!confirmed) return;
    try {
      await invoicesSvc.remove(invoice!.id);
      await refresh();
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async function handleStatusChange(newStatus: InvoiceStatus) {
    try {
      await invoicesSvc.update(invoice!.id, {
        status: newStatus,
        ...(newStatus === 'sent' && !invoice!.sent_date
          ? { sent_date: new Date().toISOString().slice(0, 10) }
          : {}),
        ...(newStatus === 'paid' && !invoice!.paid_date
          ? { paid_date: new Date().toISOString().slice(0, 10) }
          : {}),
      });
      await refresh();
      setStatus(newStatus);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
    }
  }

  function getInvoiceHtml() {
    if (!creator) return '';
    return generateInvoiceHtml({ invoice: invoice!, creator, deal: deal ?? null });
  }

  async function handleDownloadPdf() {
    if (!creator) return;
    setGenerating(true);
    setError(null);
    try {
      const html = getInvoiceHtml();

      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
          setTimeout(() => {
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
          }, 400);
        }
        return;
      }

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Invoice ${invoiceNumber}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  }

  async function handleShareEmail() {
    if (!creator) return;
    const brandEmail = deal?.brand?.email ?? '';
    const brandContact = deal?.brand?.contact_person ?? '';
    const subject = encodeURIComponent(`Invoice ${invoiceNumber} — ${deal?.title ?? 'Services'}`);
    const body = encodeURIComponent(
      `Hi ${brandContact || 'there'},\n\n` +
      `Please find attached the invoice for "${deal?.title ?? 'services rendered'}".\n\n` +
      `Invoice Number: ${invoiceNumber}\n` +
      `Amount: ₹${invoice!.amount.toLocaleString('en-IN')}\n` +
      (invoice!.gst_amount > 0
        ? `GST (18%): ₹${invoice!.gst_amount.toLocaleString('en-IN')}\n`
        : '') +
      `Total: ₹${invoice!.total.toLocaleString('en-IN')}\n\n` +
      (creator.upi_id ? `UPI ID: ${creator.upi_id}\n` : '') +
      (creator.bank_name ? `Bank: ${creator.bank_name}\n` : '') +
      (creator.bank_account_number ? `Account: ${creator.bank_account_number}\n` : '') +
      (creator.bank_ifsc ? `IFSC: ${creator.bank_ifsc}\n` : '') +
      `\nPlease process the payment at your earliest convenience.\n\nThank you!\n${creator.name}`
    );

    if (Platform.OS === 'web') {
      const mailUrl = `mailto:${brandEmail}?subject=${subject}&body=${body}`;
      window.location.href = mailUrl;
      return;
    }

    setGenerating(true);
    try {
      const html = getInvoiceHtml();
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const mailUrl = `mailto:${brandEmail}?subject=${subject}&body=${body}`;
      await Linking.openURL(mailUrl);
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share Invoice ${invoiceNumber}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to share');
    } finally {
      setGenerating(false);
    }
  }

  function buildWhatsAppText() {
    const brandPhone = deal?.brand?.whatsapp || deal?.brand?.phone || '';
    const message =
      `Hi! Here's the invoice for "${deal?.title ?? 'services rendered'}".\n\n` +
      `📄 *Invoice ${invoiceNumber}*\n` +
      `💰 Amount: ₹${invoice!.amount.toLocaleString('en-IN')}\n` +
      (invoice!.gst_amount > 0
        ? `📊 GST (18%): ₹${invoice!.gst_amount.toLocaleString('en-IN')}\n`
        : '') +
      `✅ *Total: ₹${invoice!.total.toLocaleString('en-IN')}*\n\n` +
      `*Payment Details:*\n` +
      (creator!.upi_id ? `UPI: ${creator!.upi_id}\n` : '') +
      (creator!.bank_name ? `Bank: ${creator!.bank_name}\n` : '') +
      (creator!.bank_account_number ? `A/C: ${creator!.bank_account_number}\n` : '') +
      (creator!.bank_ifsc ? `IFSC: ${creator!.bank_ifsc}\n` : '') +
      `\nPlease process the payment. Thank you! 🙏`;

    const cleanPhone = brandPhone.replace(/[^0-9+]/g, '');
    const encodedMsg = encodeURIComponent(message);
    return cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;
  }

  async function handleShareWhatsApp() {
    if (!creator) return;
    setGenerating(true);
    setError(null);

    try {
      if (Platform.OS === 'web') {
        const html = getInvoiceHtml();
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none';
        document.body.appendChild(iframe);
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
          setTimeout(() => {
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
          }, 400);
        }
        setTimeout(() => window.open(buildWhatsAppText(), '_blank'), 800);
      } else {
        const html = getInvoiceHtml();
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share Invoice ${invoiceNumber} via WhatsApp`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not share via WhatsApp');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={StyleSheet.flatten([styles.content, isWide && styles.contentWide])}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.on_surface} />
        </Pressable>
        <Text style={styles.headerInvNum}>{invoiceNumber}</Text>
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
          <FormField
            label="Amount (₹)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
          <FormField
            label="GST Amount (₹)"
            value={gstAmount}
            onChangeText={setGstAmount}
            keyboardType="numeric"
          />
          <FormField
            label="GSTIN"
            value={gstin}
            onChangeText={setGstin}
            placeholder="27AABCU9603R1ZM"
            autoCapitalize="characters"
          />
          <SelectField
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
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
          <Text style={styles.title}>Invoice</Text>
          {deal && <Text style={styles.dealTitle}>{deal.title}</Text>}
          <Text style={styles.brand}>{deal?.brand?.name}</Text>

          <CurrencyDisplay amount={invoice.total} size="lg" variant="primary" />
          {invoice.gst_amount > 0 && (
            <Text style={styles.gst}>
              incl. ₹{invoice.gst_amount.toLocaleString('en-IN')} GST
            </Text>
          )}

          <View style={styles.metaSection}>
            <MetaRow label="Status" value={invoice.status} />
            {invoice.gstin && <MetaRow label="GSTIN" value={invoice.gstin} />}
            <MetaRow
              label="Amount"
              value={`₹${invoice.amount.toLocaleString('en-IN')}`}
            />
            {invoice.sent_date && (
              <MetaRow
                label="Sent"
                value={new Date(invoice.sent_date).toLocaleDateString('en-IN')}
              />
            )}
            {invoice.paid_date && (
              <MetaRow
                label="Paid"
                value={new Date(invoice.paid_date).toLocaleDateString('en-IN')}
              />
            )}
          </View>

          <SelectField
            label="Update Status"
            options={STATUS_OPTIONS}
            value={invoice.status}
            onChange={handleStatusChange}
          />

          {invoice.status === 'draft' && (
            <Button
              title="Mark as Sent"
              onPress={() => handleStatusChange('sent')}
              variant="primary"
            />
          )}

          {invoice.status !== 'paid' && invoice.status !== 'draft' && (
            <Button
              title="Mark as Paid"
              onPress={() => handleStatusChange('paid')}
              variant="primary"
            />
          )}

          {/* Share & Download Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.actionsSectionTitle}>Share Invoice</Text>

            <Pressable
              style={styles.actionRow}
              onPress={handleDownloadPdf}
              disabled={generating}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(173, 198, 255, 0.12)' }]}>
                {generating ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="download-outline" size={20} color={colors.primary} />
                )}
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Download PDF</Text>
                <Text style={styles.actionSub}>Save or print the invoice</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.outline} />
            </Pressable>

            <Pressable
              style={styles.actionRow}
              onPress={handleShareEmail}
              disabled={generating}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(173, 198, 255, 0.12)' }]}>
                <Ionicons name="mail-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Send via Email</Text>
                <Text style={styles.actionSub}>
                  {deal?.brand?.email ? `To ${deal.brand.email}` : 'Open email client'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.outline} />
            </Pressable>

            <Pressable style={styles.actionRow} onPress={handleShareWhatsApp}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(37, 211, 102, 0.12)' }]}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Share via WhatsApp</Text>
                <Text style={styles.actionSub}>
                  {deal?.brand?.whatsapp || deal?.brand?.phone
                    ? `To ${deal.brand?.whatsapp || deal.brand?.phone}`
                    : 'Choose a contact'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.outline} />
            </Pressable>
          </View>

          {/* Payment Details */}
          {(creator?.upi_id || creator?.bank_account_number) && (
            <View style={styles.bankSection}>
              <View style={styles.bankHeader}>
                <Ionicons name="card-outline" size={18} color={colors.primary} />
                <Text style={styles.bankTitle}>Payment Details</Text>
              </View>
              {creator.upi_id && (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>UPI</Text>
                  <Text style={styles.bankValue}>{creator.upi_id}</Text>
                </View>
              )}
              {creator.bank_name && (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Bank</Text>
                  <Text style={styles.bankValue}>{creator.bank_name}</Text>
                </View>
              )}
              {creator.bank_account_number && (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>A/C No.</Text>
                  <Text style={styles.bankValue}>{creator.bank_account_number}</Text>
                </View>
              )}
              {creator.bank_ifsc && (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>IFSC</Text>
                  <Text style={styles.bankValue}>{creator.bank_ifsc}</Text>
                </View>
              )}
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </>
      )}
    </ScrollView>
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
  headerInvNum: {
    ...typography.label_md,
    color: colors.on_surface_variant,
  },
  headerActions: { flexDirection: 'row', gap: 16 },
  title: { ...typography.headline_lg, color: colors.on_surface },
  dealTitle: { ...typography.headline_sm, color: colors.primary },
  brand: { ...typography.body_md, color: colors.on_surface_variant },
  gst: { ...typography.label_sm, color: colors.tertiary_fixed_dim },
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
  actionsSection: {
    gap: 8,
  },
  actionsSectionTitle: {
    ...typography.headline_sm,
    color: colors.on_surface,
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
    gap: 14,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    ...typography.body_md,
    color: colors.on_surface,
    fontWeight: '600',
  },
  actionSub: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
    marginTop: 2,
  },
  bankSection: {
    padding: 16,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
    gap: 10,
  },
  bankHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  bankTitle: { ...typography.label_md, color: colors.primary },
  bankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bankLabel: { ...typography.label_sm, color: colors.on_surface_variant, minWidth: 60 },
  bankValue: { ...typography.body_sm, color: colors.on_surface, fontWeight: '600', textAlign: 'right', flex: 1 },
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
