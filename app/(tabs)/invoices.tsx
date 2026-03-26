import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { Button, CurrencyDisplay } from '@/components/ui';
import { colors, typography } from '@/constants/theme';
import { useCreatorData } from '@/hooks/useCreatorData';
import type { InvoiceStatus } from '@/types';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  acknowledged: 'Acknowledged',
  paid: 'Paid',
};

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: colors.tertiary_fixed_dim,
  sent: colors.primary,
  acknowledged: colors.secondary,
  paid: colors.primary_container,
};

export default function InvoicesScreen() {
  const { invoices, deals } = useCreatorData();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const totalEarned = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.total, 0);
  const pendingAmount = invoices
    .filter((i) => !['paid', 'draft'].includes(i.status))
    .reduce((sum, i) => sum + i.total, 0);

  return (
    <View style={styles.container}>
      <AppHeader title="Invoices" subtitle="India-first invoicing" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={StyleSheet.flatten([
          styles.scrollContent,
          isWide && styles.scrollContentWide,
        ])}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Earned</Text>
            {totalEarned > 0 ? (
              <CurrencyDisplay
                amount={
                  totalEarned >= 100000
                    ? `${(totalEarned / 100000).toFixed(1)}L`
                    : totalEarned
                }
                size="lg"
                variant="primary"
              />
            ) : (
              <Text style={styles.summaryZero}>₹0</Text>
            )}
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pending</Text>
            {pendingAmount > 0 ? (
              <CurrencyDisplay
                amount={
                  pendingAmount >= 100000
                    ? `${(pendingAmount / 100000).toFixed(1)}L`
                    : pendingAmount
                }
                size="lg"
                variant="secondary"
              />
            ) : (
              <Text style={styles.summaryZero}>₹0</Text>
            )}
          </View>
        </View>

        <View style={styles.toolbar}>
          <Text style={styles.sectionTitle}>All Invoices</Text>
          <Link href={'/add-invoice' as never} asChild>
            <Button title="New Invoice" onPress={() => {}} variant="primary" />
          </Link>
        </View>

        {invoices.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="receipt-outline"
              size={36}
              color={colors.on_surface_variant}
            />
            <Text style={styles.emptyTitle}>No invoices yet</Text>
            <Text style={styles.emptyText}>
              Create an invoice from a deal to start tracking payments
            </Text>
          </View>
        ) : (
          invoices.map((inv) => {
            const deal = deals.find((d) => d.id === inv.deal_id);
            return (
              <Link key={inv.id} href={`/invoice/${inv.id}`} asChild>
                <View style={styles.invoiceCard}>
                  <View style={styles.invoiceHeader}>
                    <Text style={styles.invoiceTitle}>
                      {deal?.title || 'Invoice'}
                    </Text>
                    <View
                      style={[
                        styles.statusChip,
                        {
                          backgroundColor:
                            STATUS_COLORS[inv.status] + '30',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          { color: STATUS_COLORS[inv.status] },
                        ]}
                      >
                        {STATUS_LABELS[inv.status]}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.invoiceBrand}>
                    {deal?.brand?.name}
                  </Text>
                  <View style={styles.invoiceAmount}>
                    <CurrencyDisplay
                      amount={inv.total}
                      size="md"
                      variant="primary"
                    />
                    {inv.gst_amount > 0 && (
                      <Text style={styles.gstNote}>
                        incl. ₹{inv.gst_amount.toLocaleString('en-IN')} GST
                      </Text>
                    )}
                  </View>
                  {inv.sent_date && (
                    <Text style={styles.sentDate}>
                      Sent{' '}
                      {new Date(inv.sent_date).toLocaleDateString('en-IN')}
                    </Text>
                  )}
                </View>
              </Link>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  scrollContentWide: {
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface_container_high,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(65, 71, 85, 0.1)',
  },
  summaryLabel: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
    marginBottom: 8,
  },
  summaryZero: {
    ...typography.display_sm,
    color: colors.on_surface_variant,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...typography.headline_md,
    color: colors.on_surface,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    gap: 12,
    backgroundColor: colors.surface_container_low,
    borderRadius: 16,
  },
  emptyTitle: {
    ...typography.headline_sm,
    color: colors.on_surface,
  },
  emptyText: {
    ...typography.body_sm,
    color: colors.on_surface_variant,
    textAlign: 'center',
  },
  invoiceCard: {
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceTitle: {
    ...typography.body_md,
    color: colors.on_surface,
    fontWeight: '600',
  },
  invoiceBrand: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
    marginTop: 4,
  },
  invoiceAmount: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  gstNote: {
    ...typography.label_sm,
    color: colors.tertiary_fixed_dim,
  },
  sentDate: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
    marginTop: 8,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusChipText: {
    ...typography.label_sm,
  },
});
