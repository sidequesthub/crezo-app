import { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { invoiceStatusMeta } from '@/constants/invoiceStatus';
import { listInvoices, getCreatorId, type Invoice } from '@/lib/invoices';
import { formatINR, formatINRFull } from '@/lib/format';
import { fromISODate } from '@/lib/dates';

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creatorId = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      if (!creatorId.current) creatorId.current = await getCreatorId();
      if (!creatorId.current) return setInvoices([]);
      setInvoices(await listInvoices(creatorId.current));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load invoices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totals = useMemo(() => {
    let paid = 0;
    let outstanding = 0;
    for (const i of invoices) {
      if (i.status === 'paid') paid += i.total;
      else outstanding += i.total;
    }
    return { paid, outstanding };
  }, [invoices]);

  const bottomInset = Math.max(insets.bottom, 12) + 24;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={Colors.onSurface} />
          </Pressable>
          <View style={styles.headerBody}>
            <Text style={styles.title}>Invoices</Text>
            <Text style={styles.subtitle}>GST-ready, shareable as PDF</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomInset + 80 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />
          }
        >
          {loading ? (
            <View style={styles.loadingBlock}><ActivityIndicator size="large" color={Colors.primary} /></View>
          ) : (
            <>
              <View style={styles.summary}>
                <View style={styles.summaryHalf}>
                  <Text style={styles.summaryValue}>₹{formatINR(totals.paid)}</Text>
                  <Text style={styles.summaryLabel}>RECEIVED</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryHalf}>
                  <Text style={[styles.summaryValue, { color: Colors.secondary }]}>₹{formatINR(totals.outstanding)}</Text>
                  <Text style={styles.summaryLabel}>OUTSTANDING</Text>
                </View>
              </View>

              <View style={styles.list}>
                {error ? (
                  <Empty icon="cloud-offline-outline" title="Couldn't load" body={error} />
                ) : invoices.length === 0 ? (
                  <Empty
                    icon="receipt-outline"
                    title="No invoices yet"
                    body="Create one from a brand deal, and share it as a PDF over WhatsApp or email."
                    ctaLabel="New invoice"
                    onPress={() => router.push('/invoices/new')}
                  />
                ) : (
                  invoices.map((inv) => <InvoiceCard key={inv.id} invoice={inv} onPress={() => router.push(`/invoices/${inv.id}`)} />)
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <FloatingActionButton bottom={bottomInset} accessibilityLabel="New invoice" onPress={() => router.push('/invoices/new')} />
    </View>
  );
}

function InvoiceCard({ invoice, onPress }: { invoice: Invoice; onPress: () => void }) {
  const meta = invoiceStatusMeta(invoice.status);
  const number = invoice.invoice_number ? `INV-${String(invoice.invoice_number).padStart(4, '0')}` : 'Draft';
  const overdue =
    invoice.status !== 'paid' && invoice.due_date && fromISODate(invoice.due_date) < new Date();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardTop}>
        <View style={styles.cardBody}>
          <Text style={styles.cardBrand} numberOfLines={1}>{invoice.brand?.name ?? 'No brand'}</Text>
          <Text style={styles.cardMeta}>
            {number} · {fromISODate(invoice.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardValue}>₹{formatINRFull(invoice.total)}</Text>
          {invoice.gst_amount > 0 && <Text style={styles.cardGst}>incl. GST</Text>}
        </View>
      </View>
      <View style={styles.cardFooter}>
        <View style={[styles.chip, { backgroundColor: meta.bg }]}>
          <Text style={[styles.chipText, { color: meta.fg }]}>{meta.short}</Text>
        </View>
        {overdue && (
          <View style={[styles.chip, { backgroundColor: 'rgba(147, 0, 10, 0.22)' }]}>
            <Text style={[styles.chipText, { color: Colors.error }]}>OVERDUE</Text>
          </View>
        )}
        <Text style={styles.cardItems}>
          {invoice.line_items.length} {invoice.line_items.length === 1 ? 'item' : 'items'}
        </Text>
      </View>
    </Pressable>
  );
}

function Empty({ icon, title, body, ctaLabel, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string; body: string; ctaLabel?: string; onPress?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={26} color={Colors.onSurfaceVariant} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {ctaLabel && onPress && (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.85 }]}>
          <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  safe: { flex: 1 },
  loadingBlock: { paddingVertical: 64, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 12, gap: 4 },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerBody: { flex: 1 },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: Colors.onSurface, letterSpacing: -0.6 },
  subtitle: { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.onSurfaceVariant },

  summary: { marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceContainerLow, borderRadius: 20, paddingVertical: 16 },
  summaryHalf: { flex: 1, alignItems: 'center', gap: 3 },
  summaryDivider: { width: 1, height: 30, backgroundColor: 'rgba(193, 198, 215, 0.10)' },
  summaryValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: Colors.primary, letterSpacing: -0.4 },
  summaryLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 10, color: Colors.onSurfaceVariant, letterSpacing: 1 },

  list: { paddingHorizontal: 20, paddingTop: 18, gap: 10 },
  card: { backgroundColor: Colors.surfaceContainer, borderRadius: 20, padding: 16, gap: 12 },
  cardPressed: { backgroundColor: Colors.surfaceContainerHigh },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardBody: { flex: 1, gap: 2 },
  cardBrand: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: Colors.onSurface, letterSpacing: -0.3 },
  cardMeta: { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.onSurfaceVariant },
  cardRight: { alignItems: 'flex-end', gap: 2 },
  cardValue: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: Colors.primary, letterSpacing: -0.3 },
  cardGst: { fontFamily: 'Manrope_400Regular', fontSize: 10, color: Colors.onSurfaceVariant },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontFamily: 'Manrope_700Bold', fontSize: 9, letterSpacing: 0.6 },
  cardItems: { flex: 1, textAlign: 'right', fontFamily: 'Manrope_500Medium', fontSize: 11, color: Colors.onSurfaceVariant },

  empty: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24, backgroundColor: Colors.surfaceContainerLow, borderRadius: 24 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceContainerHigh, marginBottom: 2 },
  emptyTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: Colors.onSurface },
  emptyBody: { fontFamily: 'Manrope_400Regular', fontSize: 13, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
  emptyCta: { marginTop: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: Colors.surfaceContainerHighest },
  emptyCtaText: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: Colors.primary },
});
