import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { TAB_BAR_HEIGHT, FLOATING_GAP, MIN_BOTTOM_INSET } from '@/constants/Layout';
import { platformMeta, statusMeta, formatTime } from '@/constants/content';
import { listSlotsInRange, getCreatorId, type ContentSlot } from '@/lib/contentSlots';
import {
  WEEKDAY_INITIALS,
  toISODate,
  isSameDay,
  startOfDay,
  addDays,
  addMonths,
  weekDays,
  monthGrid,
  monthLabel,
  longDayLabel,
} from '@/lib/dates';

type ViewMode = 'month' | 'week';

/** Dots shown under a day cell, capped so the cell stays legible. */
const MAX_DOTS = 3;

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [mode, setMode] = useState<ViewMode>('month');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [slots, setSlots] = useState<ContentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creatorId = useRef<string | null>(null);

  const grid = useMemo(() => monthGrid(anchor), [anchor]);
  const week = useMemo(() => weekDays(anchor), [anchor]);

  // Fetch the whole visible span in one query so day cells can show dots
  // without a request per day.
  const range = useMemo(() => {
    const days = mode === 'month' ? grid.flat() : week;
    return { from: toISODate(days[0]), to: toISODate(days[days.length - 1]) };
  }, [mode, grid, week]);

  const load = useCallback(async () => {
    try {
      setError(null);
      if (!creatorId.current) creatorId.current = await getCreatorId();
      if (!creatorId.current) {
        setSlots([]);
        return;
      }
      setSlots(await listSlotsInRange(creatorId.current, range.from, range.to));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your calendar');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range.from, range.to]);

  // Also refetches when returning from the add screen.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /** Slots bucketed by `YYYY-MM-DD` for O(1) day lookups while rendering. */
  const byDate = useMemo(() => {
    const map = new Map<string, ContentSlot[]>();
    for (const s of slots) {
      const list = map.get(s.scheduled_date);
      if (list) list.push(s);
      else map.set(s.scheduled_date, [s]);
    }
    return map;
  }, [slots]);

  const daySlots = byDate.get(toISODate(selected)) ?? [];

  function step(direction: -1 | 1) {
    setAnchor((prev) =>
      mode === 'month' ? addMonths(prev, direction) : addDays(prev, direction * 7),
    );
  }

  function goToday() {
    const today = startOfDay(new Date());
    setAnchor(today);
    setSelected(today);
  }

  const bottomInset =
    Math.max(insets.bottom, MIN_BOTTOM_INSET) + TAB_BAR_HEIGHT + FLOATING_GAP;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomInset }}
          showsVerticalScrollIndicator={false}
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
          <Header
            title={mode === 'month' ? monthLabel(anchor) : rangeLabel(week)}
            mode={mode}
            onMode={setMode}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            onToday={goToday}
          />

          {loading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : error ? (
            <ErrorBlock message={error} onRetry={load} />
          ) : (
            <>
              <View style={styles.calendarCard}>
                <View style={styles.weekHeader}>
                  {WEEKDAY_INITIALS.map((w, i) => (
                    <Text key={i} style={styles.weekHeaderText}>
                      {w}
                    </Text>
                  ))}
                </View>

                {(mode === 'month' ? grid : [week]).map((row, ri) => (
                  <View key={ri} style={styles.gridRow}>
                    {row.map((day) => (
                      <DayCell
                        key={day.getTime()}
                        day={day}
                        inMonth={mode === 'week' || day.getMonth() === anchor.getMonth()}
                        isToday={isSameDay(day, new Date())}
                        isSelected={isSameDay(day, selected)}
                        slots={byDate.get(toISODate(day)) ?? []}
                        onPress={() => setSelected(day)}
                      />
                    ))}
                  </View>
                ))}
              </View>

              <View style={styles.dayHeader}>
                <Text style={styles.dayHeaderTitle}>{longDayLabel(selected)}</Text>
                <Text style={styles.dayHeaderCount}>
                  {daySlots.length === 0
                    ? 'Nothing planned'
                    : `${daySlots.length} ${daySlots.length === 1 ? 'task' : 'tasks'}`}
                </Text>
              </View>

              <View style={styles.list}>
                {daySlots.length > 0 ? (
                  daySlots.map((s) => (
                    <SlotCard
                      key={s.id}
                      slot={s}
                      onPress={() => router.push(`/content/${s.id}`)}
                    />
                  ))
                ) : (
                  <EmptyDay
                    onAdd={() => router.push(`/content/new?date=${toISODate(selected)}`)}
                  />
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <FloatingActionButton
        bottom={bottomInset}
        accessibilityLabel="Plan content"
        onPress={() => router.push(`/content/new?date=${toISODate(selected)}`)}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function rangeLabel(days: Date[]): string {
  const a = days[0];
  const b = days[days.length - 1];
  const sameMonth = a.getMonth() === b.getMonth();
  const left = a.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const right = b.toLocaleDateString('en-IN', {
    day: 'numeric',
    ...(sameMonth ? {} : { month: 'short' }),
  });
  return `${left} – ${right}`;
}

function Header({
  title,
  mode,
  onMode,
  onPrev,
  onNext,
  onToday,
}: {
  title: string;
  mode: ViewMode;
  onMode: (m: ViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.monthTitle}>{title}</Text>
        <Pressable onPress={onToday} hitSlop={8} style={styles.todayButton}>
          <Text style={styles.todayText}>Today</Text>
        </Pressable>
      </View>

      <View style={styles.headerControls}>
        <View style={styles.stepper}>
          <Pressable onPress={onPrev} hitSlop={10} style={styles.stepButton}>
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </Pressable>
          <Pressable onPress={onNext} hitSlop={10} style={styles.stepButton}>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </Pressable>
        </View>

        <View style={styles.segment}>
          {(['month', 'week'] as ViewMode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => onMode(m)}
              style={[styles.segmentItem, mode === m && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
                {m === 'month' ? 'Month' : 'Week'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function DayCell({
  day,
  inMonth,
  isToday,
  isSelected,
  slots,
  onPress,
}: {
  day: Date;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  slots: ContentSlot[];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.dayCell,
        isSelected && styles.dayCellSelected,
        pressed && !isSelected && styles.dayCellPressed,
      ]}
    >
      <Text
        style={[
          styles.dayNumber,
          !inMonth && styles.dayNumberMuted,
          isToday && styles.dayNumberToday,
          isSelected && styles.dayNumberSelected,
        ]}
      >
        {day.getDate()}
      </Text>

      <View style={styles.dots}>
        {slots.slice(0, MAX_DOTS).map((s) => (
          <View
            key={s.id}
            style={[styles.dot, { backgroundColor: platformMeta(s.platform).tint }]}
          />
        ))}
      </View>
    </Pressable>
  );
}

function SlotCard({ slot, onPress }: { slot: ContentSlot; onPress: () => void }) {
  const p = platformMeta(slot.platform);
  const s = statusMeta(slot.status);
  const time = formatTime(slot.scheduled_time);
  const brand = slot.deal?.brand?.name ?? slot.deal?.title ?? null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.slotCard, pressed && styles.slotCardPressed]}
    >
      <View style={styles.slotTop}>
        <View style={[styles.slotIcon, { backgroundColor: `${p.tint}22` }]}>
          <Ionicons name={p.icon} size={20} color={p.tint} />
        </View>

        <View style={styles.slotBody}>
          <Text style={styles.slotTitle} numberOfLines={2}>
            {slot.title}
          </Text>
          <Text style={styles.slotMeta}>
            {p.label}
            {time ? ` • ${time}` : ''}
          </Text>
        </View>

        <View style={[styles.statusChip, { backgroundColor: s.bg }]}>
          <Text style={[styles.statusText, { color: s.fg }]}>{s.label}</Text>
        </View>
      </View>

      {(brand || slot.notes) && (
        <View style={styles.slotFooter}>
          {brand && (
            <View style={styles.dealChip}>
              <Ionicons name="pricetag" size={12} color={Colors.secondaryFixed} />
              <Text style={styles.dealChipText} numberOfLines={1}>
                {brand.toUpperCase()}
              </Text>
            </View>
          )}
          {slot.notes && (
            <Text style={styles.slotNotes} numberOfLines={1}>
              {slot.notes}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

function EmptyDay({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="calendar-outline" size={26} color={Colors.onSurfaceVariant} />
      </View>
      <Text style={styles.emptyTitle}>Nothing planned</Text>
      <Text style={styles.emptyBody}>
        Add a reel, video, or post to this day and track it from idea to posted.
      </Text>
      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.emptyCtaText}>Plan something</Text>
      </Pressable>
    </View>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="cloud-offline-outline" size={26} color={Colors.error} />
      </View>
      <Text style={styles.emptyTitle}>Couldn&apos;t load</Text>
      <Text style={styles.emptyBody}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.emptyCtaText}>Try again</Text>
      </Pressable>
    </View>
  );
}

/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  safe: { flex: 1 },
  loadingBlock: { paddingVertical: 64, alignItems: 'center' },

  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, gap: 14 },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  monthTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 28,
    color: Colors.onSurface,
    letterSpacing: -0.6,
    flexShrink: 1,
  },
  todayButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.surfaceContainerLow,
  },
  todayText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepper: { flexDirection: 'row', gap: 4 },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 999,
    padding: 3,
  },
  segmentItem: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 999 },
  segmentItemActive: { backgroundColor: Colors.surfaceContainerHighest },
  segmentText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  segmentTextActive: { color: Colors.primary, fontFamily: 'Manrope_700Bold' },

  calendarCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  weekHeader: { flexDirection: 'row', paddingBottom: 8 },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  gridRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    gap: 4,
  },
  dayCellSelected: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'rgba(173, 198, 255, 0.35)',
  },
  dayCellPressed: { backgroundColor: 'rgba(193, 198, 215, 0.06)' },
  dayNumber: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    color: Colors.onSurface,
  },
  dayNumberMuted: { color: 'rgba(193, 198, 215, 0.28)' },
  dayNumberToday: { color: Colors.primary, fontFamily: 'Manrope_700Bold' },
  dayNumberSelected: { fontFamily: 'Manrope_700Bold' },
  dots: { flexDirection: 'row', gap: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  dayHeader: {
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  dayHeaderTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: Colors.onSurface,
    letterSpacing: 0.8,
    flexShrink: 1,
  },
  dayHeaderCount: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
  },

  list: { paddingHorizontal: 20, gap: 10 },
  slotCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },
  slotCardPressed: { backgroundColor: Colors.surfaceContainerHigh },
  slotTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  slotIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBody: { flex: 1, gap: 3 },
  slotTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: Colors.onSurface,
    letterSpacing: -0.2,
  },
  slotMeta: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 0.6 },

  slotFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(254, 148, 0, 0.14)',
    maxWidth: '60%',
  },
  dealChipText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: Colors.secondaryFixed,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  slotNotes: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
  },

  empty: {
    marginHorizontal: 20,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 34,
    paddingHorizontal: 24,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 24,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    marginBottom: 2,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: Colors.onSurface,
  },
  emptyBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  emptyCtaText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: Colors.primary,
  },

});
