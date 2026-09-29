import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { TAB_BAR_HEIGHT, FLOATING_GAP, MIN_BOTTOM_INSET } from '@/constants/Layout';
import {
  DEAL_STATUS_ORDER,
  dealStatusMeta,
  CLOSED_DEAL_STATUSES,
  type DealStatus,
} from '@/constants/deals';
import { listDeals, dealTotals, progressOf, type Deal } from '@/lib/deals';
import { getCreatorId } from '@/lib/contentSlots';
import { PAGE_SIZE, type Cursor } from '@/lib/pagination';
import {
  financialYearOf, recentFinancialYears, periodLabel, ALL_TIME, type Period,
} from '@/lib/financialYear';
import { formatINR, formatINRFull } from '@/lib/format';
import { fromISODate } from '@/lib/dates';

type Filter = 'all' | DealStatus;

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [period, setPeriod] = useState<Period>(() => ({
    kind: 'fy', year: financialYearOf(),
  }));
  const [periodOpen, setPeriodOpen] = useState(false);
  const [totals, setTotals] = useState({ earned: 0, pending: 0, count: 0 });
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creatorId = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      if (!creatorId.current) creatorId.current = await getCreatorId();
      if (!creatorId.current) {
        setDeals([]);
        return;
      }
      const [page, sums] = await Promise.all([
        listDeals(creatorId.current, { period }),
        dealTotals(creatorId.current, period),
      ]);
      setDeals(page.items);
      setCursor(page.next);
      setTotals(sums);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your deals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  /** Appends the next page. Guarded so a fast scroll cannot fire it twice. */
  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || !creatorId.current) return;
    setLoadingMore(true);
    try {
      const page = await listDeals(creatorId.current, { cursor, period });
      setDeals((prev) => [...prev, ...page.items]);
      setCursor(page.next);
    } catch {
      // A failed page is not worth an error banner; pulling to refresh retries.
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Counts describe the pages loaded so far, which is what the dropdown is
  // filtering over. The headline totals above come from the server.
  const counts = useMemo(() => {
    const map = new Map<DealStatus, number>();
    for (const d of deals) map.set(d.status, (map.get(d.status) ?? 0) + 1);
    return map;
  }, [deals]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deals.filter((d) => {
      if (filter !== 'all' && d.status !== filter) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) || (d.brand?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [deals, filter, query]);

  const bottomInset =
    Math.max(insets.bottom, MIN_BOTTOM_INSET) + TAB_BAR_HEIGHT + FLOATING_GAP;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomInset }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={64}
          onScroll={({ nativeEvent: e }) => {
            const remaining =
              e.contentSize.height - e.layoutMeasurement.height - e.contentOffset.y;
            if (remaining < 600) loadMore();
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={Colors.primary}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>My Deals</Text>
            <Text style={styles.subtitle}>Manage your active brand pipeline</Text>
            <Pressable onPress={() => setPeriodOpen(true)} style={styles.period}>
              <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
              <Text style={styles.periodText}>{periodLabel(period)}</Text>
              <Ionicons name="chevron-down" size={14} color={Colors.primary} />
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={Colors.onSurfaceVariant} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search brands or campaigns…"
              placeholderTextColor="rgba(193, 198, 215, 0.4)"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={Colors.onSurfaceVariant} />
              </Pressable>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.list}>
              <Message
                icon="cloud-offline-outline"
                tint={Colors.error}
                title="Couldn't load"
                body={error}
                ctaLabel="Try again"
                onPress={load}
              />
            </View>
          ) : (
            <>
              <View style={styles.summary}>
                <View style={styles.summaryHalf}>
                  <Text style={styles.summaryValue}>₹{formatINR(totals.earned)}</Text>
                  <Text style={styles.summaryLabel}>EARNED</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryHalf}>
                  <Text style={[styles.summaryValue, { color: Colors.secondary }]}>
                    ₹{formatINR(totals.pending)}
                  </Text>
                  <Text style={styles.summaryLabel}>PENDING</Text>
                </View>
              </View>

              <View style={styles.filterRow}>
                <StatusFilter
                  value={filter}
                  counts={counts}
                  total={deals.length}
                  onChange={setFilter}
                />
                <Text style={styles.resultCount}>
                  {visible.length} of {totals.count}
                </Text>
              </View>

              <View style={styles.list}>
                {visible.length > 0 ? (
                  <>
                    {visible.map((d) => (
                      <DealCard
                        key={d.id}
                        deal={d}
                        onPress={() => router.push(`/deal/${d.id}`)}
                      />
                    ))}
                    {loadingMore && (
                      <ActivityIndicator
                        color={Colors.primary}
                        style={styles.moreSpinner}
                      />
                    )}
                    {!cursor && totals.count > PAGE_SIZE && (
                      <Text style={styles.endOfList}>That's everything for {periodLabel(period)}.</Text>
                    )}
                  </>
                ) : deals.length === 0 ? (
                  <Message
                    icon="briefcase-outline"
                    tint={Colors.primary}
                    title="No deals yet"
                    body="Add your first brand deal and track it from pitch through to payment."
                    ctaLabel="Add a deal"
                    onPress={() => router.push('/deal/new')}
                  />
                ) : (
                  <Message
                    icon="search"
                    tint={Colors.onSurfaceVariant}
                    title="Nothing here"
                    body={
                      query
                        ? `No deals match “${query.trim()}”.`
                        : 'No deals in this stage yet.'
                    }
                  />
                )}
              </View>
            </>
          )}
        </ScrollView>

        <Modal
          visible={periodOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPeriodOpen(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setPeriodOpen(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Period</Text>
              {[
                ...recentFinancialYears(4).map((year) => ({
                  key: year.code,
                  label: year.label,
                  value: { kind: 'fy', year } as Period,
                })),
                { key: 'all', label: 'All time', value: ALL_TIME },
              ].map((o) => {
                const active = periodLabel(o.value) === periodLabel(period);
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => {
                      setPeriod(o.value);
                      setPeriodOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      active && styles.optionActive,
                      pressed && !active && styles.optionPressed,
                    ]}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {o.label}
                    </Text>
                    {active && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                  </Pressable>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>

      <FloatingActionButton
        bottom={bottomInset}
        accessibilityLabel="New deal"
        onPress={() => router.push('/deal/new')}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Stage filter as a dropdown. A horizontal tab strip hid stages off-screen —
 * with six pipeline stages the list has to be seen all at once to be useful.
 */
function StatusFilter({
  value,
  counts,
  total,
  onChange,
}: {
  value: Filter;
  counts: Map<DealStatus, number>;
  total: number;
  onChange: (f: Filter) => void;
}) {
  const [open, setOpen] = useState(false);

  const label = value === 'all' ? 'All stages' : dealStatusMeta(value).label;
  const activeCount = value === 'all' ? total : (counts.get(value) ?? 0);

  const options: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All stages', count: total },
    ...DEAL_STATUS_ORDER.map((s) => ({
      key: s as Filter,
      label: dealStatusMeta(s).label,
      count: counts.get(s) ?? 0,
    })),
  ];

  function pick(f: Filter) {
    onChange(f);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Filter by stage, currently ${label}`}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
      >
        <Ionicons name="funnel-outline" size={15} color={Colors.primary} />
        <Text style={styles.triggerText}>{label}</Text>
        <View style={styles.triggerCount}>
          <Text style={styles.triggerCountText}>{activeCount}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={Colors.onSurfaceVariant} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Filter by stage</Text>

            {options.map((o) => {
              const active = o.key === value;
              const meta = o.key === 'all' ? null : dealStatusMeta(o.key as DealStatus);
              return (
                <Pressable
                  key={o.key}
                  onPress={() => pick(o.key)}
                  style={({ pressed }) => [
                    styles.option,
                    active && styles.optionActive,
                    pressed && !active && styles.optionPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.optionDot,
                      { backgroundColor: meta ? meta.fg : Colors.onSurfaceVariant },
                    ]}
                  />
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {o.label}
                  </Text>
                  <Text style={styles.optionCount}>{o.count}</Text>
                  {active && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function DealCard({ deal, onPress }: { deal: Deal; onPress: () => void }) {
  const meta = dealStatusMeta(deal.status);
  const { done, total, ratio } = progressOf(deal);
  const brandName = deal.brand?.name ?? 'No brand';
  const initial = brandName.charAt(0).toUpperCase();

  const due = deal.end_date
    ? fromISODate(deal.end_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      })
    : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardTop}>
        <View style={styles.brandTile}>
          <Text style={styles.brandInitial}>{initial}</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.brandName} numberOfLines={1}>
            {brandName}
          </Text>
          <Text style={styles.campaign} numberOfLines={1}>
            {deal.title}
          </Text>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.value}>₹{formatINRFull(deal.value_inr)}</Text>
          {due && (
            <View style={styles.dueRow}>
              <Ionicons name="calendar-outline" size={12} color={Colors.onSurfaceVariant} />
              <Text style={styles.dueText}>{due}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardMeta}>
        <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusText, { color: meta.fg }]}>{meta.short}</Text>
        </View>
        <Text style={styles.progressLabel}>
          {total === 0 ? 'No deliverables' : `${done}/${total} deliverables`}
        </Text>
        {total > 0 && <Text style={styles.progressPct}>{Math.round(ratio * 100)}%</Text>}
      </View>

      {total > 0 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(ratio * 100, 3)}%` }]} />
        </View>
      )}
    </Pressable>
  );
}

function Message({
  icon,
  tint,
  title,
  body,
  ctaLabel,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
  title: string;
  body: string;
  ctaLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.message}>
      <View style={styles.messageIcon}>
        <Ionicons name={icon} size={26} color={tint} />
      </View>
      <Text style={styles.messageTitle}>{title}</Text>
      <Text style={styles.messageBody}>{body}</Text>
      {ctaLabel && onPress && (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.messageCta, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.messageCtaText}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  safe: { flex: 1 },
  loadingBlock: { paddingVertical: 64, alignItems: 'center' },

  moreSpinner: { marginVertical: 18 },
  endOfList: {
    fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.onSurfaceVariant,
    textAlign: 'center', marginTop: 18,
  },
  period: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    marginTop: 12, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  periodText: { fontFamily: 'Manrope_700Bold', fontSize: 12, color: Colors.primary },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, gap: 4 },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 32,
    color: Colors.onSurface,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },

  searchRow: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: Colors.onSurface,
    padding: 0,
  },

  summary: {
    marginHorizontal: 20,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 20,
    paddingVertical: 16,
  },
  summaryHalf: { flex: 1, alignItems: 'center', gap: 3 },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(193, 198, 215, 0.10)',
  },
  summaryValue: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    color: Colors.primary,
    letterSpacing: -0.4,
  },
  summaryLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
  },

  filterRow: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  resultCount: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },

  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.surfaceContainerLow,
  },
  triggerPressed: { backgroundColor: Colors.surfaceContainerHigh },
  triggerText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: Colors.onSurface,
  },
  triggerCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(173, 198, 255, 0.18)',
    alignItems: 'center',
  },
  triggerCountText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: Colors.primary,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surfaceContainer,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 34,
    gap: 2,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(193, 198, 215, 0.25)',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: Colors.onSurface,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 16,
  },
  optionActive: { backgroundColor: Colors.surfaceContainerHigh },
  optionPressed: { backgroundColor: 'rgba(193, 198, 215, 0.06)' },
  optionDot: { width: 8, height: 8, borderRadius: 4 },
  optionText: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    color: Colors.onSurface,
  },
  optionTextActive: { color: Colors.primary, fontFamily: 'Manrope_700Bold' },
  optionCount: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },

  list: { paddingHorizontal: 20, gap: 10 },
  card: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  cardPressed: { backgroundColor: Colors.surfaceContainerHigh },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandTile: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandInitial: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 18,
    color: Colors.primary,
  },
  cardBody: { flex: 1, gap: 2 },
  brandName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  campaign: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  value: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },

  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontFamily: 'Manrope_700Bold', fontSize: 9, letterSpacing: 0.6 },
  progressLabel: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  progressPct: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: Colors.onSurface,
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(193, 198, 215, 0.10)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: Colors.primary },

  message: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 34,
    paddingHorizontal: 24,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 24,
  },
  messageIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    marginBottom: 2,
  },
  messageTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: Colors.onSurface,
  },
  messageBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageCta: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  messageCtaText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: Colors.primary,
  },
});
