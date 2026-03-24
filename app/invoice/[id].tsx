import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CurrencyDisplay } from '@/components/ui';
import { Button } from '@/components/ui';
import { colors, typography } from '@/constants/theme';
import { useCreatorData } from '@/hooks/useCreatorData';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { invoices, deals } = useCreatorData();
  const invoice = invoices.find((i) => i.id === id);
  const deal = invoice ? deals.find((d) => d.id === invoice.deal_id) : null;

  if (!invoice) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Invoice not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Invoice</Text>
      <Text style={styles.brand}>{deal?.brand?.name}</Text>
      <CurrencyDisplay amount={invoice.total} size="lg" variant="primary" />
      {invoice.gst_amount > 0 && (
        <Text style={styles.gst}>incl. ₹{invoice.gst_amount.toLocaleString('en-IN')} GST</Text>
      )}
      <View style={styles.statusRow}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{invoice.status}</Text>
      </View>
      {invoice.sent_date && (
        <Text style={styles.date}>Sent {new Date(invoice.sent_date).toLocaleDateString('en-IN')}</Text>
      )}
      <Button title="Export PDF" onPress={() => {}} variant="primary" />
      {invoice.status !== 'paid' && (
        <Button title="Send Reminder" onPress={() => {}} variant="secondary" />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 24, gap: 16 },
  title: { ...typography.headline_lg, color: colors.on_surface },
  brand: { ...typography.body_md, color: colors.on_surface_variant },
  gst: { ...typography.label_sm, color: colors.tertiary_fixed_dim },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...typography.label_md, color: colors.on_surface_variant },
  value: { ...typography.body_md, color: colors.on_surface },
  date: { ...typography.label_sm, color: colors.on_surface_variant },
  error: { ...typography.body_md, color: colors.error },
});
