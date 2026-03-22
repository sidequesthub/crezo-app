/**
 * Home Dashboard — Daily-use hook, Creator Glass Widgets
 */

import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { CurrencyDisplay, GlassCard } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { mockContentSlots, mockCreator, mockDeals } from '@/lib/mock-data';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const mockWeekData = [
  { day: 18, label: 'Mon', active: false },
  { day: 19, label: 'Tue', active: false },
  { day: 20, label: 'Wed', active: false },
  { day: 21, label: 'Thu', active: false },
  { day: 22, label: 'Fri', active: true },
  { day: 23, label: 'Sat', active: false },
  { day: 24, label: 'Sun', active: false },
];

export default function HomeScreen() {
  const monthlyRevenue = mockDeals
    .filter((d) => d.status === 'paid')
    .reduce((sum, d) => sum + d.value_inr, 0) || 240000;
  const activeDeals = mockDeals.filter(
    (d) => !['delivered', 'paid'].includes(d.status)
  ).length;
  const postsThisWeek = mockContentSlots.filter((s) => s.status === 'posted')
    .length || 5;

  return (
    <View style={styles.container}>
      <AppHeader
        subtitle="Welcome back,"
        title={`Hey ${mockCreator.name} 👋`}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>Monthly Revenue</Text>
            <CurrencyDisplay
              amount={monthlyRevenue >= 100000 ? `${monthlyRevenue / 100000}L` : monthlyRevenue}
              size="lg"
              variant="primary"
            />
            <View style={styles.statFooter}>
              <Text style={styles.statFooterText}>12% from last month</Text>
            </View>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>Active Deals</Text>
            <Text style={[styles.statValue, { color: colors.secondary }]}>
              {activeDeals}
            </Text>
            <View style={styles.statFooter}>
              <Text style={[styles.statFooterText, { color: colors.secondary }]}>
                High priority pipeline
              </Text>
            </View>
          </GlassCard>
          <GlassCard style={styles.statCard}>
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekScroll}
          >
            {mockWeekData.map((d) => (
              <View
                key={d.day}
                style={[
                  styles.dayCard,
                  d.active && styles.dayCardActive,
                ]}
              >
                <Text style={styles.dayLabel}>{d.label}</Text>
                <Text style={styles.dayNumber}>{d.day}</Text>
                {d.active && <View style={styles.dayDot} />}
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Content</Text>
            <Link href="/add-content" asChild>
              <Text style={styles.sectionLink}>Add</Text>
            </Link>
          </View>
          {mockContentSlots.slice(0, 3).map((slot) => (
            <Link key={slot.id} href={`/content/${slot.id}`} asChild>
              <View style={styles.contentCard}>
                <View style={styles.contentCardLeft}>
                  <Text style={styles.contentTitle}>{slot.title}</Text>
                  <Text style={styles.contentMeta}>
                    {slot.platform.replace('_', ' ')} • {slot.status}
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
          ))}
        </View>
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
    gap: 32,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
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
  weekScroll: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  dayCard: {
    minWidth: 70,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
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
