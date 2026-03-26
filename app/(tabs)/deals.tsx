import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { CurrencyDisplay, GlassCard } from '@/components/ui';
import { colors, typography } from '@/constants/theme';
import { useCreatorData } from '@/hooks/useCreatorData';
import type { Deal, DealStatus } from '@/types';

const STATUSES: DealStatus[] = [
  'pitched', 'negotiating', 'confirmed', 'in_progress', 'delivered', 'paid',
];

const STATUS_LABELS: Record<DealStatus, string> = {
  pitched: 'Pitched',
  negotiating: 'Negotiating',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  paid: 'Paid',
};

const STATUS_COLORS: Record<DealStatus, string> = {
  pitched: colors.tertiary_fixed_dim,
  negotiating: colors.primary,
  confirmed: colors.secondary,
  in_progress: colors.secondary_container,
  delivered: colors.primary_container,
  paid: colors.primary,
};

function fmtCurrency(n: number) {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

export default function DealsScreen() {
  const { deals } = useCreatorData();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [activeTab, setActiveTab] = useState<DealStatus | 'all'>('all');

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const monthName = now.toLocaleDateString('en-IN', { month: 'long' });

  const monthEarned = deals
    .filter((d) => {
      if (d.status !== 'paid') return false;
      const at = new Date(d.updated_at);
      return at.getMonth() === curMonth && at.getFullYear() === curYear;
    })
    .reduce((sum, d) => sum + d.value_inr, 0);

  const pendingPayouts = deals
    .filter((d) => ['delivered', 'in_progress', 'confirmed'].includes(d.status))
    .reduce((sum, d) => sum + d.value_inr, 0);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: deals.length };
    STATUSES.forEach((s) => { c[s] = deals.filter((d) => d.status === s).length; });
    return c;
  }, [deals]);

  const filtered = activeTab === 'all' ? deals : deals.filter((d) => d.status === activeTab);

  if (!isWide) return <MobileDeals deals={deals} filtered={filtered} activeTab={activeTab} setActiveTab={setActiveTab} counts={counts} monthEarned={monthEarned} monthName={monthName} />;

  return (
    <View style={s.container}>
      <AppHeader title="Deals" subtitle="Manage your active brand collaborations" />
      <ScrollView style={s.scroll} contentContainerStyle={s.desktopContent} showsVerticalScrollIndicator={false}>
        {/* Top: title row + revenue stats */}
        <View style={s.topRow}>
          <View />
          <View style={s.statsRow}>
            <GlassCard style={s.statCard}>
              <Text style={s.statLabel}>{monthName.toUpperCase()} REVENUE</Text>
              <View style={s.statValueRow}>
                <Text style={s.statCurrency}>₹</Text>
                <Text style={s.statValue}>{fmtCurrency(monthEarned)}</Text>
                <Text style={s.statSuffix}>Earned</Text>
              </View>
            </GlassCard>
            <GlassCard style={s.statCard}>
              <Text style={s.statLabel}>PENDING PAYOUTS</Text>
              <View style={s.statValueRow}>
                <Text style={s.statCurrency}>₹</Text>
                <Text style={s.statValue}>{fmtCurrency(pendingPayouts)}</Text>
              </View>
            </GlassCard>
            <Link href="/add-deal" asChild>
              <Pressable style={s.addBtn}>
                <Ionicons name="add" size={28} color={colors.on_primary} />
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Pipeline tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
          {STATUSES.map((st) => {
            const active = activeTab === st;
            return (
              <Pressable key={st} style={[s.tab, active && s.tabActive]} onPress={() => setActiveTab(activeTab === st ? 'all' : st)}>
                <Text style={[s.tabText, active && s.tabTextActive]}>{STATUS_LABELS[st]}</Text>
                <View style={[s.tabBadge, active && s.tabBadgeActive]}>
                  <Text style={[s.tabBadgeText, active && s.tabBadgeTextActive]}>{counts[st]}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Deal card grid */}
        <View style={s.cardGrid}>
          {filtered.map((deal) => (
            <Link key={deal.id} href={`/deal/${deal.id}`} asChild>
              <Pressable style={s.dealCard}>
                <View style={s.dealCardTop}>
                  <View style={[s.dealIcon, { backgroundColor: STATUS_COLORS[deal.status] + '25' }]}>
                    <Ionicons name="briefcase" size={18} color={STATUS_COLORS[deal.status]} />
                  </View>
                  <View style={s.dealCardInfo}>
                    <Text style={s.dealBrand} numberOfLines={1}>{deal.brand?.name || '—'}</Text>
                    <Text style={s.dealSub} numberOfLines={1}>{deal.title}</Text>
                  </View>
                  <Text style={s.dealAmount}>₹ {deal.value_inr.toLocaleString('en-IN')}</Text>
                </View>
                {deal.deliverables && deal.deliverables.length > 0 && (
                  <View style={s.delRow}>
                    <Text style={s.delLabel}>DELIVERABLES</Text>
                    <View style={s.delBar}>
                      <View style={[s.delFill, { width: `${(deal.deliverables.filter((x) => x.status === 'done').length / deal.deliverables.length) * 100}%` }]} />
                    </View>
                    <Text style={s.delCount}>
                      {deal.deliverables.filter((x) => x.status === 'done').length}/{deal.deliverables.length} COMPLETE
                    </Text>
                  </View>
                )}
                <View style={s.dealFooter}>
                  {deal.end_date ? (
                    <View style={s.deadlineRow}>
                      <Ionicons name="calendar-outline" size={12} color={colors.on_surface_variant} />
                      <Text style={s.deadlineText}>Deadline: {new Date(deal.end_date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</Text>
                    </View>
                  ) : <View />}
                  <Ionicons name="ellipsis-horizontal" size={16} color={colors.outline} />
                </View>
              </Pressable>
            </Link>
          ))}
          {/* New deal placeholder */}
          <Link href="/add-deal" asChild>
            <Pressable style={s.newDealCard}>
              <View style={s.newDealIcon}>
                <Ionicons name="add-circle" size={32} color={colors.outline} />
              </View>
              <Text style={s.newDealTitle}>New Brand Opportunity</Text>
              <Text style={s.newDealSub}>Start a new pitch or log a{'\n'}direct deal to track progress.</Text>
            </Pressable>
          </Link>
        </View>

        {/* Pipeline Activity table */}
        <Text style={s.activityTitle}>Pipeline Activity</Text>
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.th, { flex: 2 }]}>EVENT</Text>
            <Text style={[s.th, { flex: 2 }]}>BRAND</Text>
            <Text style={[s.th, { flex: 1 }]}>STATUS</Text>
            <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>VALUE</Text>
          </View>
          {deals.slice(0, 10).map((deal) => (
            <Link key={deal.id} href={`/deal/${deal.id}`} asChild>
              <Pressable style={s.tableRow}>
                <View style={[s.td, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <View style={[s.actDot, { backgroundColor: STATUS_COLORS[deal.status] }]} />
                  <Text style={s.tdText} numberOfLines={1}>{deal.title}</Text>
                </View>
                <Text style={[s.tdText, { flex: 2 }]} numberOfLines={1}>{deal.brand?.name || '—'}</Text>
                <View style={{ flex: 1 }}>
                  <View style={[s.statusChip, { backgroundColor: STATUS_COLORS[deal.status] + '25' }]}>
                    <Text style={[s.statusChipText, { color: STATUS_COLORS[deal.status] }]}>{STATUS_LABELS[deal.status]}</Text>
                  </View>
                </View>
                <Text style={[s.tdValue, { flex: 1, textAlign: 'right' }]}>₹ {deal.value_inr.toLocaleString('en-IN')}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function MobileDeals({ deals, filtered, activeTab, setActiveTab, counts, monthEarned, monthName }: {
  deals: Deal[];
  filtered: Deal[];
  activeTab: DealStatus | 'all';
  setActiveTab: (s: DealStatus | 'all') => void;
  counts: Record<string, number>;
  monthEarned: number;
  monthName: string;
}) {
  return (
    <View style={s.container}>
      <AppHeader title="My Deals" subtitle="Brand pipeline" />
      <ScrollView style={s.scroll} contentContainerStyle={s.mobileContent} showsVerticalScrollIndicator={false}>
        <GlassCard style={s.mobileRevenue}>
          <Text style={s.mobileRevLabel}>{monthName}</Text>
          {monthEarned > 0 ? (
            <CurrencyDisplay amount={monthEarned >= 100000 ? `${(monthEarned / 100000).toFixed(1)}L` : monthEarned} size="md" variant="primary" />
          ) : (
            <Text style={s.mobileRevZero}>₹0</Text>
          )}
        </GlassCard>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
          {STATUSES.map((st) => {
            const active = activeTab === st;
            return (
              <Pressable key={st} style={[s.tab, active && s.tabActive]} onPress={() => setActiveTab(activeTab === st ? 'all' : st)}>
                <Text style={[s.tabText, active && s.tabTextActive]}>{STATUS_LABELS[st]}</Text>
                <View style={[s.tabBadge, active && s.tabBadgeActive]}>
                  <Text style={[s.tabBadgeText, active && s.tabBadgeTextActive]}>{counts[st]}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="briefcase-outline" size={36} color={colors.on_surface_variant} />
            <Text style={s.emptyTitle}>No deals yet</Text>
            <Text style={s.emptyText}>Add your first brand deal to start tracking</Text>
          </View>
        ) : (
          filtered.map((deal) => (
            <Link key={deal.id} href={`/deal/${deal.id}`} asChild>
              <Pressable style={s.mobileDealCard}>
                <View style={s.mobileDealTop}>
                  <View style={s.mobileDealLeft}>
                    <Text style={s.mobileDealTitle} numberOfLines={1}>{deal.title}</Text>
                    <Text style={s.mobileDealBrand}>{deal.brand?.name || '—'}</Text>
                  </View>
                  <View style={s.mobileDealRight}>
                    <CurrencyDisplay amount={deal.value_inr} size="sm" />
                    <View style={[s.statusChip, { backgroundColor: STATUS_COLORS[deal.status] + '25' }]}>
                      <Text style={[s.statusChipText, { color: STATUS_COLORS[deal.status] }]}>{STATUS_LABELS[deal.status]}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            </Link>
          ))
        )}
      </ScrollView>
      <Link href="/add-deal" asChild>
        <Pressable style={s.fab}>
          <Ionicons name="add" size={28} color={colors.on_primary} />
        </Pressable>
      </Link>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  desktopContent: { paddingHorizontal: 40, paddingBottom: 80 },
  mobileContent: { paddingHorizontal: 20, paddingBottom: 120, gap: 16 },

  // Desktop top row
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: colors.on_surface, fontFamily: 'PlusJakartaSans_700Bold' },
  pageSubtitle: { ...typography.body_md, color: colors.on_surface_variant, marginTop: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statCard: { paddingHorizontal: 24, paddingVertical: 16 },
  statLabel: { ...typography.label_sm, color: colors.on_surface_variant, letterSpacing: 1, marginBottom: 6 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statCurrency: { fontSize: 18, color: colors.on_surface_variant, fontWeight: '500' },
  statValue: { fontSize: 28, fontWeight: '800', color: colors.on_surface, fontFamily: 'PlusJakartaSans_700Bold' },
  statSuffix: { ...typography.label_sm, color: colors.tertiary_fixed_dim, marginLeft: 4 },
  addBtn: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },

  // Pipeline tabs
  tabsRow: { flexDirection: 'row', gap: 6, marginBottom: 24, paddingBottom: 4 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10,
    borderWidth: 1, borderColor: colors.outline_variant + '30',
  },
  tabActive: { backgroundColor: colors.surface_container_high, borderColor: colors.on_surface_variant + '40' },
  tabText: { ...typography.label_md, color: colors.on_surface_variant },
  tabTextActive: { color: colors.on_surface, fontWeight: '700' },
  tabBadge: { backgroundColor: colors.surface_container_high, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  tabBadgeActive: { backgroundColor: colors.primary + '30' },
  tabBadgeText: { ...typography.label_sm, color: colors.on_surface_variant, fontWeight: '600' },
  tabBadgeTextActive: { color: colors.primary },

  // Deal card grid (desktop)
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 40 },
  dealCard: {
    backgroundColor: colors.surface_container_low, borderRadius: 16, padding: 20,
    width: 320, gap: 16,
    borderWidth: 1, borderColor: colors.outline_variant + '20',
  },
  dealCardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dealIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dealCardInfo: { flex: 1 },
  dealBrand: { ...typography.body_md, color: colors.on_surface, fontWeight: '700', fontSize: 15 },
  dealSub: { ...typography.label_sm, color: colors.on_surface_variant, marginTop: 2 },
  dealAmount: { ...typography.body_md, color: colors.on_surface, fontWeight: '700' },
  delRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  delLabel: { ...typography.label_sm, color: colors.on_surface_variant, letterSpacing: 0.8, fontSize: 10 },
  delBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surface_container_high },
  delFill: { height: 4, borderRadius: 2, backgroundColor: colors.primary },
  delCount: { ...typography.label_sm, color: colors.on_surface_variant, fontSize: 10 },
  dealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deadlineText: { ...typography.label_sm, color: colors.on_surface_variant },

  newDealCard: {
    width: 320, borderRadius: 16, padding: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface_container_low + '60', borderWidth: 1, borderColor: colors.outline_variant + '30',
    borderStyle: 'dashed', gap: 10, minHeight: 180,
  },
  newDealIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.surface_container_high, alignItems: 'center', justifyContent: 'center' },
  newDealTitle: { ...typography.body_md, color: colors.on_surface, fontWeight: '700' },
  newDealSub: { ...typography.label_sm, color: colors.on_surface_variant, textAlign: 'center', lineHeight: 18 },

  // Activity table
  activityTitle: { fontSize: 20, fontWeight: '800', color: colors.on_surface, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 16 },
  table: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.outline_variant + '20', marginBottom: 40 },
  tableHead: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 20, backgroundColor: colors.surface_container_low, borderBottomWidth: 1, borderBottomColor: colors.outline_variant + '20' },
  th: { ...typography.label_sm, color: colors.on_surface_variant, letterSpacing: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.outline_variant + '10' },
  td: {},
  tdText: { ...typography.body_sm, color: colors.on_surface },
  tdValue: { ...typography.body_sm, color: colors.on_surface, fontWeight: '600' },
  actDot: { width: 8, height: 8, borderRadius: 4 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  statusChipText: { ...typography.label_sm, textTransform: 'capitalize', fontWeight: '600' },

  // Mobile
  mobileRevenue: { marginBottom: 4 },
  mobileRevLabel: { ...typography.label_sm, color: colors.on_surface_variant, marginBottom: 4 },
  mobileRevZero: { ...typography.headline_md, color: colors.on_surface_variant },
  emptyState: { alignItems: 'center', padding: 48, gap: 12, backgroundColor: colors.surface_container_low, borderRadius: 16 },
  emptyTitle: { ...typography.headline_sm, color: colors.on_surface },
  emptyText: { ...typography.body_sm, color: colors.on_surface_variant, textAlign: 'center' },
  mobileDealCard: { backgroundColor: colors.surface_container_low, borderRadius: 14, padding: 16 },
  mobileDealTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mobileDealLeft: { flex: 1 },
  mobileDealTitle: { ...typography.body_md, color: colors.on_surface, fontWeight: '600' },
  mobileDealBrand: { ...typography.label_sm, color: colors.on_surface_variant, marginTop: 4 },
  mobileDealRight: { alignItems: 'flex-end', gap: 6 },
  fab: {
    position: 'absolute', bottom: 28, right: 28, width: 52, height: 52, borderRadius: 16,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
});
