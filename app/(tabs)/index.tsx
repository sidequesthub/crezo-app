import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
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

function getCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + mondayOffset + i);
    return {
      date: d.toISOString().slice(0, 10),
      day: d.getDate(),
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      isToday: d.toDateString() === now.toDateString(),
    };
  });
}

export default function HomeScreen() {
  const { creator, contentSlots, deals, loading } = useCreatorData();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const weekData = useMemo(() => getCurrentWeek(), []);
  const weekDates = weekData.map((d) => d.date);

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const monthlyRevenue = deals
    .filter((d) => {
      if (d.status !== 'paid') return false;
      const paidAt = new Date(d.updated_at);
      return paidAt.getMonth() === curMonth && paidAt.getFullYear() === curYear;
    })
    .reduce((sum, d) => sum + d.value_inr, 0);
  const totalRevenue = deals
    .filter((d) => d.status === 'paid')
    .reduce((sum, d) => sum + d.value_inr, 0);
  const activeDeals = deals.filter(
    (d) => !['delivered', 'paid'].includes(d.status)
  ).length;
  const postsThisWeek = contentSlots.filter((s) => {
    return s.status === 'posted' && weekDates.includes(s.scheduled_date);
  }).length;

  const upcomingSlots = contentSlots
    .filter((s) => s.scheduled_date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    .slice(0, 5);

  const displayName = creator?.name ?? 'Creator';

  if (loading && !creator) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader subtitle="Welcome back," title={`Hey ${displayName}`} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={StyleSheet.flatten([
          styles.scrollContent,
          isWide && styles.scrollContentWide,
        ])}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statsRow, isWide && styles.statsRowWide]}>
          <GlassCard style={isWide ? styles.statCardWide : styles.statCard}>
            <Text style={styles.statLabel}>This Month</Text>
            {monthlyRevenue > 0 ? (
              <CurrencyDisplay
                amount={
                  monthlyRevenue >= 100000
                    ? `${(monthlyRevenue / 100000).toFixed(1)}L`
                    : monthlyRevenue
                }
                size="lg"
                variant="primary"
              />
            ) : (
              <Text style={styles.statZero}>₹0</Text>
            )}
          </GlassCard>
          <GlassCard style={isWide ? styles.statCardWide : styles.statCard}>
            <Text style={styles.statLabel}>Total Revenue</Text>
            {totalRevenue > 0 ? (
              <CurrencyDisplay
                amount={
                  totalRevenue >= 100000
                    ? `${(totalRevenue / 100000).toFixed(1)}L`
                    : totalRevenue
                }
                size="lg"
                variant="primary"
              />
            ) : (
              <Text style={styles.statZero}>₹0</Text>
            )}
          </GlassCard>
          <GlassCard style={isWide ? styles.statCardWide : styles.statCard}>
            <Text style={styles.statLabel}>Active Deals</Text>
            <Text style={[styles.statValue, { color: colors.secondary }]}>
              {activeDeals}
            </Text>
          </GlassCard>
          <GlassCard style={isWide ? styles.statCardWide : styles.statCard}>
            <Text style={styles.statLabel}>Content Velocity</Text>
            <Text style={styles.statValue}>{postsThisWeek}</Text>
            <View style={styles.statFooter}>
              <Text style={styles.statFooterText}>Posts this week</Text>
            </View>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Link href="/(tabs)/calendar" asChild>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>This Week</Text>
              <Text style={styles.sectionLink}>View Calendar</Text>
            </View>
          </Link>
          <View style={styles.weekRow}>
            {weekData.map((d) => {
              const hasContent = contentSlots.some(
                (s) => s.scheduled_date === d.date
              );
              return (
                <View
                  key={d.date}
                  style={[
                    styles.dayCard,
                    d.isToday && styles.dayCardActive,
                  ]}
                >
                  <Text style={styles.dayLabel}>{d.label}</Text>
                  <Text style={styles.dayNumber}>{d.day}</Text>
                  {hasContent && <View style={styles.dayDot} />}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Content</Text>
            <Link href="/add-content" asChild>
              <Text style={styles.sectionLink}>Schedule</Text>
            </Link>
          </View>
          {upcomingSlots.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="calendar-outline"
                size={32}
                color={colors.on_surface_variant}
              />
              <Text style={styles.emptyTitle}>No upcoming content</Text>
              <Text style={styles.emptyText}>
                Schedule content to see it here
              </Text>
            </View>
          ) : (
            upcomingSlots.map((slot) => (
              <Link key={slot.id} href={`/content/${slot.id}`} asChild>
                <View style={styles.contentCard}>
                  <View style={styles.contentCardLeft}>
                    <Text style={styles.contentTitle}>{slot.title}</Text>
                    <Text style={styles.contentMeta}>
                      {slot.platform.replace('_', ' ')} · {slot.status}
                    </Text>
                  </View>
                  <Text style={styles.contentDate}>
                    {new Date(slot.scheduled_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
              </Link>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    gap: 32,
  },
  scrollContentWide: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsRowWide: {
    flexWrap: 'nowrap',
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
  },
  statCardWide: {
    flex: 1,
  },
  statLabel: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
    marginBottom: 4,
  },
  statValue: {
    ...typography.display_sm,
    color: colors.on_surface,
  },
  statZero: {
    ...typography.display_sm,
    color: colors.on_surface_variant,
  },
  statFooter: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statFooterText: {
    ...typography.label_sm,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionTitle: {
    ...typography.headline_lg,
    color: colors.on_surface,
  },
  sectionLink: {
    ...typography.body_md,
    color: colors.primary,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  dayCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.surface_container_high,
    borderWidth: 1,
    borderColor: 'rgba(65, 71, 85, 0.1)',
  },
  dayCardActive: {
    borderColor: colors.primary + '40',
    backgroundColor: colors.surface_container_high,
  },
  dayLabel: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
    marginBottom: 8,
  },
  dayNumber: {
    ...typography.headline_md,
    color: colors.on_surface,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
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
  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface_container_low,
  },
  contentCardLeft: {
    flex: 1,
  },
  contentTitle: {
    ...typography.body_md,
    color: colors.on_surface,
    fontWeight: '600',
  },
  contentMeta: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
    marginTop: 4,
  },
  contentDate: {
    ...typography.label_md,
    color: colors.primary,
    marginLeft: 16,
  },
});
