import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

interface WeekDay {
  label: string;
  date: number;
  isToday: boolean;
  accent: 'primary' | 'secondary' | null;
}

interface Deadline {
  id: string;
  brand: string;
  detail: string;
  timeLabel: string;
  urgency: 'error' | 'primary' | 'secondary';
  kind: 'reel' | 'video' | 'story' | 'post' | 'other';
}

function getWeekDays(active: Set<number> = new Set([1, 3])): WeekDay[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));

  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label: DAY_LABELS[d.getDay()],
      date: d.getDate(),
      isToday: d.toDateString() === today.toDateString(),
      accent: active.has(i) ? (i === 1 ? 'secondary' : 'primary') : null,
    };
  });
}

function formatINR(amount: number): string {
  if (amount >= 1e7) return `${(amount / 1e7).toFixed(1)}Cr`;
  if (amount >= 1e5) return `${(amount / 1e5).toFixed(1)}L`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}K`;
  return amount.toLocaleString('en-IN');
}

function relativeTimeLabel(dueDate: string): { label: string; urgency: Deadline['urgency'] } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - now.getTime()) / 86400000);

  if (days < 0) return { label: `${Math.abs(days)}D OVERDUE`, urgency: 'error' };
  if (days === 0) return { label: 'TODAY', urgency: 'error' };
  if (days === 1) return { label: 'TOMORROW', urgency: 'error' };
  if (days <= 3) return { label: `IN ${days} DAYS`, urgency: 'secondary' };
  return {
    label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
    urgency: 'primary',
  };
}

function kindFor(platform?: string | null, type?: string | null): Deadline['kind'] {
  const v = (platform ?? type ?? '').toLowerCase();
  if (v.includes('reel')) return 'reel';
  if (v.includes('video') || v.includes('yt')) return 'video';
  if (v.includes('story')) return 'story';
  if (v.includes('post')) return 'post';
  return 'other';
}

export default function HomeScreen() {
  const [userName, setUserName] = useState('Creator');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [lastMonthRevenue, setLastMonthRevenue] = useState(0);
  const [activeDeals, setActiveDeals] = useState(0);
  const [weekPosts, setWeekPosts] = useState(0);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  const weekDays = getWeekDays();

  const fetchDashboard = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const meta = user.user_metadata ?? {};
      const name =
        (meta.full_name as string | undefined) ??
        (meta.name as string | undefined) ??
        user.email?.split('@')[0] ??
        'Creator';
      setUserName(name.split(' ')[0]);
      setAvatarUrl((meta.avatar_url as string | undefined) ?? null);

      const { data: creator } = await supabase
        .from('creators')
        .select('id, name, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (!creator) {
        setLoading(false);
        return;
      }
      if (creator.name) setUserName(String(creator.name).split(' ')[0]);
      if (creator.avatar_url) setAvatarUrl(creator.avatar_url);

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const [thisM, lastM, deals, week, upcoming] = await Promise.all([
        supabase
          .from('invoices')
          .select('total')
          .eq('creator_id', creator.id)
          .eq('status', 'paid')
          .gte('paid_date', thisMonthStart),
        supabase
          .from('invoices')
          .select('total')
          .eq('creator_id', creator.id)
          .eq('status', 'paid')
          .gte('paid_date', lastMonthStart)
          .lte('paid_date', lastMonthEnd),
        supabase
          .from('deals')
          .select('id')
          .eq('creator_id', creator.id)
          .in('status', ['in_progress', 'confirmed', 'negotiating']),
        supabase
          .from('content_slots')
          .select('id')
          .eq('creator_id', creator.id)
          .gte('scheduled_date', weekStart.toISOString().slice(0, 10))
          .lte('scheduled_date', weekEnd.toISOString().slice(0, 10)),
        supabase
          .from('deliverables')
          .select('id, title, type, platform, due_date, status, deal:deals(id, title, status, brand:brands(name))')
          .eq('status', 'pending')
          .not('due_date', 'is', null)
          .gte('due_date', now.toISOString().slice(0, 10))
          .order('due_date', { ascending: true })
          .limit(5),
      ]);

      const sumTotal = (rows: { total: number | string }[] | null) =>
        (rows ?? []).reduce((s, r) => s + Number(r.total), 0);

      setMonthlyRevenue(sumTotal(thisM.data as never));
      setLastMonthRevenue(sumTotal(lastM.data as never));
      setActiveDeals(deals.data?.length ?? 0);
      setWeekPosts(week.data?.length ?? 0);

      type DeliverableRow = {
        id: string;
        title: string | null;
        type: string | null;
        platform: string | null;
        due_date: string;
        deal:
          | { brand: { name?: string | null } | { name?: string | null }[] | null }
          | { brand: { name?: string | null } | { name?: string | null }[] | null }[]
          | null;
      };
      const rows = (upcoming.data ?? []) as unknown as DeliverableRow[];
      const items: Deadline[] = rows.map((d) => {
        const t = relativeTimeLabel(d.due_date);
        const deal = Array.isArray(d.deal) ? d.deal[0] : d.deal;
        const brandObj = deal ? (Array.isArray(deal.brand) ? deal.brand[0] : deal.brand) : null;
        const brand = brandObj?.name ?? 'Brand';
        const kind = kindFor(d.platform, d.type);
        const kindLabel =
          kind === 'reel' ? 'Reel' :
          kind === 'video' ? 'Video' :
          kind === 'story' ? 'Story' :
          kind === 'post' ? 'Post' : 'Task';
        return {
          id: d.id,
          brand: `${brand} (${kindLabel})`,
          detail: d.title ?? 'Deliverable',
          timeLabel: t.label,
          urgency: t.urgency,
          kind,
        };
      });
      setDeadlines(items);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  function onRefresh() {
    setRefreshing(true);
    fetchDashboard();
  }

  const revenueDelta =
    lastMonthRevenue > 0
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0;

  return (
    <View style={styles.container}>
      {/* Fixed blurred top app bar, matching the design */}
      <TopAppBar userName={userName} avatarUrl={avatarUrl} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          <View style={{ height: 72 }} />

          {loading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <>
              <View style={styles.stats}>
                <StatCard
                  label="Monthly Revenue"
                  value={<CurrencyValue rupees={monthlyRevenue} color={Colors.primary} />}
                  footerIcon="trending-up"
                  footerText={
                    lastMonthRevenue === 0
                      ? 'First month of earnings'
                      : revenueDelta >= 0
                        ? `+${revenueDelta}% FROM LAST MONTH`
                        : `${revenueDelta}% FROM LAST MONTH`
                  }
                  accent="primary"
                />
                <StatCard
                  label="Active Deals"
                  value={
                    <Text style={[styles.valueBig, { color: Colors.secondary }]}>
                      {activeDeals}
                    </Text>
                  }
                  footerIcon="handshake"
                  footerText="HIGH PRIORITY PIPELINE"
                  accent="secondary"
                  footerMci
                />
                <StatCard
                  label="Content Velocity"
                  value={
                    <Text style={[styles.valueBig, { color: Colors.onSurface }]}>
                      {weekPosts}
                    </Text>
                  }
                  footerIcon="document-text"
                  footerText="POSTS THIS WEEK"
                  accent="neutral"
                />
              </View>

              <SectionHeader title="This Week" linkLabel="View Calendar" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.weekStrip}
              >
                {weekDays.map((d, i) => (
                  <DayPill key={i} day={d} />
                ))}
              </ScrollView>

              <SectionHeader title="Upcoming Deadlines" />
              <View style={styles.deadlineList}>
                {deadlines.length > 0 ? (
                  deadlines.map((d) => <DeadlineRow key={d.id} item={d} />)
                ) : (
                  <EmptyDeadlines />
                )}
              </View>
            </>
          )}

          <View style={{ height: 180 }} />
        </ScrollView>
      </SafeAreaView>

      <FloatingActionBar />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                      */
/* -------------------------------------------------------------------------- */

function TopAppBar({ userName, avatarUrl }: { userName: string; avatarUrl: string | null }) {
  return (
    <BlurView intensity={50} tint="dark" style={styles.appBar}>
      <SafeAreaView edges={['top']}>
        <View style={styles.appBarContent}>
          <View style={styles.appBarLeft}>
            <View style={styles.avatarRing}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{userName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
            <View>
              <Text style={styles.welcomeLine}>Welcome back,</Text>
              <Text style={styles.nameLine}>Hey {userName} <Text style={{ fontSize: 16 }}>👋</Text></Text>
            </View>
          </View>
          <View style={styles.appBarRight}>
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
            </Pressable>
            <Text style={styles.brandMark}>Crezo</Text>
          </View>
        </View>
      </SafeAreaView>
    </BlurView>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat cards                                                                  */
/* -------------------------------------------------------------------------- */

function StatCard({
  label,
  value,
  footerText,
  footerIcon,
  footerMci,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  footerText: string;
  footerIcon: string;
  footerMci?: boolean;
  accent: 'primary' | 'secondary' | 'neutral';
}) {
  const color =
    accent === 'primary' ? Colors.primary :
    accent === 'secondary' ? Colors.secondary :
    Colors.onSurfaceVariant;

  return (
    <GlassCard glow={accent} padding={20}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.valueRow}>{value}</View>
      <View style={styles.statFooter}>
        {footerMci ? (
          <MaterialCommunityIcons name={footerIcon as never} size={13} color={color} />
        ) : (
          <Ionicons name={footerIcon as never} size={13} color={color} />
        )}
        <Text style={[styles.statFooterText, { color }]}>{footerText}</Text>
      </View>
    </GlassCard>
  );
}

function CurrencyValue({ rupees, color }: { rupees: number; color: string }) {
  return (
    <View style={styles.currencyRow}>
      <Text style={styles.rupee}>₹</Text>
      <Text style={[styles.valueBig, { color }]}>{formatINR(rupees)}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* This Week                                                                   */
/* -------------------------------------------------------------------------- */

function DayPill({ day }: { day: WeekDay }) {
  return (
    <View style={[styles.dayPill, day.isToday && styles.dayPillToday]}>
      <Text style={[styles.dayPillLabel, day.isToday && styles.dayPillLabelToday]}>
        {day.label}
      </Text>
      <Text style={[styles.dayPillDate, day.isToday && styles.dayPillDateToday]}>
        {day.date}
      </Text>
      <View style={styles.dayPillDotRow}>
        {day.accent && (
          <View
            style={[
              styles.dayPillDot,
              {
                backgroundColor:
                  day.accent === 'primary' ? Colors.primary : Colors.secondaryContainer,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Deadlines                                                                   */
/* -------------------------------------------------------------------------- */

const DEADLINE_ICON: Record<Deadline['kind'], string> = {
  reel: 'film-outline',
  video: 'videocam-outline',
  story: 'camera-outline',
  post: 'image-outline',
  other: 'document-outline',
};

function DeadlineRow({ item }: { item: Deadline }) {
  const accentColor =
    item.urgency === 'error' ? Colors.error :
    item.urgency === 'secondary' ? Colors.secondary :
    Colors.primary;

  const urgencyText =
    item.urgency === 'error' ? 'Urgent' :
    item.urgency === 'secondary' ? 'Near due' :
    'On track';

  return (
    <View style={styles.deadlineRow}>
      <View style={[styles.deadlineAccent, { backgroundColor: accentColor }]} />
      <View style={styles.deadlineIcon}>
        <Ionicons
          name={DEADLINE_ICON[item.kind] as never}
          size={20}
          color={Colors.onSurfaceVariant}
        />
      </View>
      <View style={styles.deadlineBody}>
        <Text style={styles.deadlineBrand} numberOfLines={1}>{item.brand}</Text>
        <Text style={styles.deadlineDetail} numberOfLines={1}>{item.detail}</Text>
      </View>
      <View style={styles.deadlineRight}>
        <View
          style={[
            styles.deadlineBadge,
            { backgroundColor: accentColor + '1A' },
          ]}
        >
          <Text style={[styles.deadlineBadgeText, { color: accentColor }]}>
            {item.timeLabel}
          </Text>
        </View>
        <Text style={[styles.deadlineStatus, { color: accentColor }]}>
          {urgencyText}
        </Text>
      </View>
    </View>
  );
}

function EmptyDeadlines() {
  return (
    <GlassCard padding={24}>
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>All clear</Text>
        <Text style={styles.emptySub}>
          No deadlines in the next few days. Good time to create something ambitious.
        </Text>
      </View>
    </GlassCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Section header                                                              */
/* -------------------------------------------------------------------------- */

function SectionHeader({ title, linkLabel }: { title: string; linkLabel?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {linkLabel && (
        <Pressable>
          <Text style={styles.sectionLink}>{linkLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Floating Quick Action Bar                                                   */
/* -------------------------------------------------------------------------- */

function FloatingActionBar() {
  return (
    <View pointerEvents="box-none" style={styles.fabHost}>
      <BlurView intensity={40} tint="dark" style={styles.fabBar}>
        <Pressable style={({ pressed }) => [styles.fabPrimary, pressed && { opacity: 0.9 }]}>
          <LinearGradient
            colors={['#ADC6FF', '#4B8EFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabPrimaryBg}
          >
            <Ionicons name="add-circle" size={16} color={Colors.onPrimaryContainer} />
            <Text style={styles.fabPrimaryText}>New Deal</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.fabSecondary,
            { backgroundColor: Colors.secondaryContainer },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="receipt" size={16} color={Colors.onSecondaryContainer} />
          <Text style={[styles.fabSecondaryText, { color: Colors.onSecondaryContainer }]}>
            Invoice
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.fabSecondary,
            { backgroundColor: Colors.surfaceContainerHighest },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="images" size={16} color={Colors.onSurface} />
          <Text style={[styles.fabSecondaryText, { color: Colors.onSurface }]}>Media</Text>
        </Pressable>
      </BlurView>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  safe: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  loadingBlock: { paddingVertical: 64, alignItems: 'center' },

  /* Top app bar */
  appBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(19, 19, 19, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 198, 215, 0.06)',
  },
  appBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  appBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    padding: 2,
    borderWidth: 1.5,
    borderColor: Colors.primary + '44',
  },
  avatar: { width: '100%', height: '100%', borderRadius: 20 },
  avatarFallback: {
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: Colors.primary,
    fontSize: 16,
  },
  welcomeLine: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  nameLine: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: Colors.onSurface,
    letterSpacing: -0.3,
    marginTop: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(75, 142, 255, 0.08)',
  },
  brandMark: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 20,
    color: Colors.primary,
    fontStyle: 'italic',
    letterSpacing: -0.8,
  },

  /* Stats */
  stats: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  rupee: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: Colors.tertiaryFixedDim,
  },
  valueBig: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 34,
    letterSpacing: -1,
    lineHeight: 40,
  },
  statFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  statFooterText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: Colors.onSurface,
    letterSpacing: -0.4,
  },
  sectionLink: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
  },

  /* Week strip */
  weekStrip: {
    paddingHorizontal: 20,
    gap: 10,
    paddingVertical: 2,
  },
  dayPill: {
    width: 62,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(193, 198, 215, 0.05)',
  },
  dayPillToday: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderColor: 'rgba(193, 198, 215, 0.12)',
  },
  dayPillLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  dayPillLabelToday: { color: Colors.primary },
  dayPillDate: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  dayPillDateToday: { color: Colors.onSurface },
  dayPillDotRow: {
    height: 6,
    marginTop: 8,
  },
  dayPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  /* Deadlines */
  deadlineList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingLeft: 18,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(193, 198, 215, 0.05)',
    overflow: 'hidden',
  },
  deadlineAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  deadlineIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deadlineBody: { flex: 1, gap: 2 },
  deadlineBrand: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: Colors.onSurface,
    letterSpacing: -0.1,
  },
  deadlineDetail: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  deadlineRight: { alignItems: 'flex-end', gap: 3 },
  deadlineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  deadlineBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  deadlineStatus: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },

  /* Empty */
  emptyWrap: { alignItems: 'center', gap: 6, paddingVertical: 4 },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(75, 142, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: Colors.onSurface,
  },
  emptySub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },

  /* Floating action bar */
  fabHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 98,
    alignItems: 'center',
    zIndex: 20,
  },
  fabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 20, 20, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(193, 198, 215, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  fabPrimary: { borderRadius: 999, overflow: 'hidden' },
  fabPrimaryBg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  fabPrimaryText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: Colors.onPrimaryContainer,
    letterSpacing: 0.1,
  },
  fabSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  fabSecondaryText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    letterSpacing: 0.1,
  },
});
