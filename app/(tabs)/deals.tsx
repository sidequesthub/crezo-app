import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { Button, CurrencyDisplay, GlassCard } from '@/components/ui';
import { colors, typography } from '@/constants/theme';
import { useCreatorData } from '@/hooks/useCreatorData';
import type { DealStatus } from '@/types';

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

export default function DealsScreen() {
  const { deals } = useCreatorData();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const currentMonth = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();

  const monthEarned = deals
    .filter((d) => {
      if (d.status !== 'paid') return false;
      if (!d.end_date) return true;
      const paid = new Date(d.end_date);
      return paid.getMonth() === currentMonthIdx && paid.getFullYear() === currentYear;
    })
    .reduce((sum, d) => sum + d.value_inr, 0);
  const pendingDeals = deals.filter(
    (d) => !['delivered', 'paid'].includes(d.status)
  );

  return (
    <View style={styles.container}>
      <AppHeader title="My Deals" subtitle="Manage your brand pipeline" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={StyleSheet.flatten([
          styles.scrollContent,
          isWide && styles.scrollContentWide,
        ])}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.revenueBar}>
          <View style={styles.revenueRow}>
            <Text style={styles.revenueLabel}>{currentMonth}:</Text>
            {monthEarned > 0 ? (
              <CurrencyDisplay
                amount={
                  monthEarned >= 100000
                    ? `${(monthEarned / 100000).toFixed(1)}L`
                    : monthEarned
                }
                size="md"
                variant="primary"
              />
            ) : (
              <Text style={styles.revenueZero}>₹0</Text>
            )}
            <Text style={styles.revenueSuffix}>earned</Text>
          </View>
        </GlassCard>

        <View style={styles.toolbar}>
          <Text style={styles.sectionTitle}>Pipeline</Text>
          <Link href="/add-deal" asChild>
            <Button title="Add Deal" onPress={() => {}} variant="primary" />
          </Link>
        </View>

        {deals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="briefcase-outline"
              size={36}
              color={colors.on_surface_variant}
            />
            <Text style={styles.emptyTitle}>No deals yet</Text>
            <Text style={styles.emptyText}>
              Add your first brand deal to start tracking your pipeline
            </Text>
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.kanbanScroll}
            >
              {(
                [
                  'pitched',
                  'negotiating',
                  'confirmed',
                  'in_progress',
                  'delivered',
                  'paid',
                ] as const
              ).map((status) => {
                const columnDeals = deals.filter(
                  (d) => d.status === status
                );
                return (
                  <View key={status} style={styles.column}>
                    <View style={styles.columnHeader}>
                      <View
                        style={[
                          styles.columnDot,
                          { backgroundColor: STATUS_COLORS[status] },
                        ]}
                      />
                      <Text style={styles.columnTitle}>
                        {STATUS_LABELS[status]}
                      </Text>
                      <Text style={styles.columnCount}>
                        {columnDeals.length}
                      </Text>
                    </View>
                    {columnDeals.map((deal) => (
                      <Link
                        key={deal.id}
                        href={`/deal/${deal.id}`}
                        asChild
                      >
                        <View style={styles.dealCard}>
                          <Text style={styles.dealTitle}>{deal.title}</Text>
                          <Text style={styles.dealBrand}>
                            {deal.brand?.name || '—'}
                          </Text>
                          <CurrencyDisplay
                            amount={deal.value_inr}
                            size="sm"
                            variant="primary"
                          />
                        </View>
                      </Link>
                    ))}
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>All Deals</Text>
              {deals.map((deal) => (
                <Link key={deal.id} href={`/deal/${deal.id}`} asChild>
                  <View style={styles.dealRow}>
                    <View style={styles.dealRowLeft}>
                      <Text style={styles.dealRowTitle}>{deal.title}</Text>
                      <Text style={styles.dealRowBrand}>
                        {deal.brand?.name}
                      </Text>
                    </View>
                    <View style={styles.dealRowRight}>
                      <CurrencyDisplay amount={deal.value_inr} size="sm" />
                      <View
                        style={[
                          styles.statusChip,
                          {
                            backgroundColor:
                              STATUS_COLORS[deal.status] + '30',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusChipText,
                            { color: STATUS_COLORS[deal.status] },
                          ]}
                        >
                          {STATUS_LABELS[deal.status]}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Link>
              ))}
            </View>
          </>
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
  revenueBar: {
    marginBottom: 24,
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  revenueLabel: {
    ...typography.body_md,
    color: colors.on_surface_variant,
  },
  revenueZero: {
    ...typography.headline_md,
    color: colors.on_surface_variant,
  },
  revenueSuffix: {
    ...typography.label_sm,
    color: colors.tertiary_fixed_dim,
    textTransform: 'uppercase',
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
  kanbanScroll: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 24,
  },
  column: {
    width: 160,
    gap: 8,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  columnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  columnTitle: {
    ...typography.label_md,
    color: colors.on_surface,
    flex: 1,
  },
  columnCount: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
  },
  dealCard: {
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  dealTitle: {
    ...typography.body_sm,
    color: colors.on_surface,
    fontWeight: '600',
  },
  dealBrand: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
  },
  listSection: {
    marginTop: 24,
    gap: 8,
  },
  dealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
  },
  dealRowLeft: {
    flex: 1,
  },
  dealRowTitle: {
    ...typography.body_md,
    color: colors.on_surface,
    fontWeight: '600',
  },
  dealRowBrand: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
    marginTop: 4,
  },
  dealRowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-end',
  },
  statusChipText: {
    ...typography.label_sm,
    textTransform: 'capitalize',
  },
});
