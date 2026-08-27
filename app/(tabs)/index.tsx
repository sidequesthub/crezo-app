import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors } from '@/constants/Colors';
import { TAB_BAR_HEIGHT, FLOATING_GAP, MIN_BOTTOM_INSET } from '@/constants/Layout';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { toISODate, startOfDay, addDays, isSameDay } from '@/lib/dates';
import { formatINR } from '@/lib/format';
import { platformMeta } from '@/constants/content';

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Keep in sync with styles.dayPill — used to snap the week strip. */
const DAY_PILL_WIDTH = 62;

interface WeekDay {
  label: string;
  date: number;
  isToday: boolean;
  /** Platforms scheduled that day — one dot each, capped when rendered. */
  platforms: string[];
}

interface Deadline {
  id: string;
  brand: string;
  detail: string;
  timeLabel: string;
  urgency: 'error' | 'primary' | 'secondary';
  kind: 'reel' | 'video' | 'story' | 'post' | 'other';
}

/**
 * Monday-first week, with a dot per scheduled item on each day.
 * `slotsByDate` maps `YYYY-MM-DD` to the platforms planned that day.
 */
function buildWeek(slotsByDate: Map<string, string[]>): WeekDay[] {
  const today = startOfDay(new Date());
  const monday = addDays(today, -((today.getDay() + 6) % 7));

  return Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(monday, i);
    return {
      label: DAY_LABELS[d.getDay()],
      date: d.getDate(),
      isToday: isSameDay(d, today),
      platforms: slotsByDate.get(toISODate(d)) ?? [],
    };
  });
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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [userName, setUserName] = useState('Creator');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [lastMonthRevenue, setLastMonthRevenue] = useState(0);
  const [activeDeals, setActiveDeals] = useState(0);
  const [weekPosts, setWeekPosts] = useState(0);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [weekDays, setWeekDays] = useState<WeekDay[]>(() => buildWeek(new Map()));

  const fetchDashboard = useCallback(async () => {
    try {
      // getSession() reads the persisted session locally; getUser() costs a
      // network round trip to re-validate a token we already trust.
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
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

      // toISODate formats from local components. `toISOString()` converts to
      // UTC first, which in IST rolls the date back a day at local midnight.
      const now = startOfDay(new Date());
      const thisMonthStart = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
      const lastMonthStart = toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const lastMonthEnd = toISODate(new Date(now.getFullYear(), now.getMonth(), 0));
      const weekStart = addDays(now, -((now.getDay() + 6) % 7));
      const weekEnd = addDays(weekStart, 6);

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
          .select('id, scheduled_date, platform')
          .eq('creator_id', creator.id)
          .gte('scheduled_date', toISODate(weekStart))
          .lte('scheduled_date', toISODate(weekEnd)),
        // Overdue items matter more than upcoming ones, so no lower bound on
        // due_date — anything still pending shows, oldest first.
        supabase
          .from('deliverables')
          .select('id, title, type, platform, due_date, status, deal:deals(id, title, status, brand:brands(name))')
          .neq('status', 'done')
          .not('due_date', 'is', null)
          .order('due_date', { ascending: true })
          .limit(5),
      ]);

      const sumTotal = (rows: { total: number | string }[] | null) =>
        (rows ?? []).reduce((s, r) => s + Number(r.total), 0);

      setMonthlyRevenue(sumTotal(thisM.data as never));
      setLastMonthRevenue(sumTotal(lastM.data as never));
      setActiveDeals(deals.data?.length ?? 0);

      const weekRows = (week.data ?? []) as { scheduled_date: string; platform: string }[];
      setWeekPosts(weekRows.length);
      const byDate = new Map<string, string[]>();
      for (const r of weekRows) {
        const list = byDate.get(r.scheduled_date);
        if (list) list.push(r.platform);
        else byDate.set(r.scheduled_date, [r.platform]);
      }
      setWeekDays(buildWeek(byDate));

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

  // Clear the tab bar only. The action button is a corner FAB and floats over
  // content by design — reserving its height leaves dead space at the end.
  const scrollBottomInset =
    Math.max(insets.bottom, MIN_BOTTOM_INSET) + TAB_BAR_HEIGHT + FLOATING_GAP;

  return (
    <View style={styles.container}>
      {/* Blurred top app bar — its backdrop fades in as the content scrolls under it */}
      <TopAppBar userName={userName} avatarUrl={avatarUrl} scrollY={scrollY} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.ScrollView
          contentContainerStyle={{ paddingBottom: scrollBottomInset }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
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
                decelerationRate="fast"
                snapToInterval={DAY_PILL_WIDTH + 10}
                snapToAlignment="start"
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
        </Animated.ScrollView>
      </SafeAreaView>

      <FloatingActionButton
        bottom={scrollBottomInset}
        accessibilityLabel="Plan content"
        onPress={() => router.push(`/content/new?date=${toISODate(new Date())}`)}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                      */
/* -------------------------------------------------------------------------- */

function TopAppBar({
  userName,
  avatarUrl,
  scrollY,
}: {
  userName: string;
  avatarUrl: string | null;
  scrollY: Animated.Value;
}) {
  // Transparent at rest so the content reads as one surface; the blur fades in
  // only once something has scrolled underneath it.
  const backdropOpacity = scrollY.interpolate({
    inputRange: [0, 48],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.appBar}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}
      >
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      </Animated.View>
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
    </View>
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
        {day.platforms.slice(0, 3).map((p, i) => (
          <View
            key={i}
            style={[styles.dayPillDot, { backgroundColor: platformMeta(p).tint }]}
          />
        ))}
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

/* The floating action lives in components/ui/FloatingActionButton. */

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  safe: { flex: 1 },
  loadingBlock: { paddingVertical: 64, alignItems: 'center' },

  /* Top app bar */
  appBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    // No background or border here — the backdrop is an animated layer inside
    // TopAppBar. A permanent hairline would also break the design system's
    // "no-line" rule.
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
    width: DAY_PILL_WIDTH,
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

});
