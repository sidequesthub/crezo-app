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
import { colors, typography } from '@/constants/theme';
import { useCreatorData } from '@/hooks/useCreatorData';
import type { ContentPlatform, ContentSlot, ContentStatus } from '@/types';

const PLATFORM_LABELS: Record<ContentPlatform, string> = {
  ig_reel: 'IG Reel',
  yt_video: 'YT Video',
  yt_short: 'YT Short',
  story: 'Story',
  post: 'Post',
  other: 'Other',
};

const STATUS_COLORS: Record<ContentStatus, string> = {
  idea: colors.tertiary_fixed_dim,
  scripted: colors.primary,
  shot: colors.secondary,
  edited: colors.secondary_container,
  posted: colors.primary_container,
};

type ViewMode = 'day' | 'week' | 'month';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getWeekDates(baseDate: Date) {
  const day = baseDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + mondayOffset + i);
    return d.toISOString().slice(0, 10);
  });
}

function getMonthDates(year: number, month: number) {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startDow = first.getDay() === 0 ? 6 : first.getDay() - 1;

  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) {
    const dt = new Date(year, month, d);
    cells.push(dt.toISOString().slice(0, 10));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function SlotCard({ slot, getDealName, compact }: { slot: ContentSlot; getDealName: (id: string | null) => string | null; compact?: boolean }) {
  const statusColor = STATUS_COLORS[slot.status];
  return (
    <Link href={`/content/${slot.id}`} asChild>
      <Pressable style={StyleSheet.flatten([styles.slotCard, compact && styles.slotCardCompact])}>
        <View style={{ width: 4, backgroundColor: statusColor }} />
        <View style={compact ? styles.slotContentCompact : styles.slotContent}>
          <View style={styles.slotTopRow}>
            <Text style={compact ? styles.slotTitleCompact : styles.slotTitle} numberOfLines={1}>
              {slot.title}
            </Text>
            {slot.scheduled_time && (
              <Text style={styles.slotTime}>{formatTime(slot.scheduled_time)}</Text>
            )}
          </View>
          <View style={styles.slotMeta}>
            <Text style={styles.slotPlatform}>
              {PLATFORM_LABELS[slot.platform]}
            </Text>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: statusColor + '30' }}>
              <Text style={{ ...typography.label_sm, textTransform: 'capitalize', color: statusColor }}>
                {slot.status}
              </Text>
            </View>
          </View>
          {slot.deal_id && (
            <Text style={styles.dealTag} numberOfLines={1}>
              {getDealName(slot.deal_id)
                ? `🔗 ${getDealName(slot.deal_id)}`
                : 'Linked to deal'}
            </Text>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

export default function CalendarScreen() {
  const { contentSlots, deals } = useCreatorData();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const today = useMemo(() => new Date(), []);
  const todayStr = today.toISOString().slice(0, 10);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayOffset, setDayOffset] = useState(0);
  const [monthYear, setMonthYear] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const currentDayDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [today, dayOffset]);
  const currentDayStr = currentDayDate.toISOString().slice(0, 10);

  const currentBase = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [today, weekOffset]);

  const weekDates = useMemo(() => getWeekDates(currentBase), [currentBase]);
  const monthDates = useMemo(
    () => getMonthDates(monthYear.year, monthYear.month),
    [monthYear.year, monthYear.month]
  );

  const slotsForDay = contentSlots.filter(
    (s) => s.scheduled_date === (viewMode === 'day' ? currentDayStr : selectedDate)
  );

  const slotsMap = useMemo(() => {
    const m = new Map<string, number>();
    contentSlots.forEach((s) => {
      m.set(s.scheduled_date, (m.get(s.scheduled_date) || 0) + 1);
    });
    return m;
  }, [contentSlots]);

  const weekLabel = useMemo(() => {
    const start = new Date(weekDates[0]);
    const end = new Date(weekDates[6]);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', opts)}`;
  }, [weekDates]);

  const monthLabel = new Date(monthYear.year, monthYear.month).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const dayLabel = currentDayDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  function prevMonth() {
    setMonthYear((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  }
  function nextMonth() {
    setMonthYear((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  }

  function getDealName(dealId: string | null): string | null {
    if (!dealId) return null;
    const deal = deals.find((d) => d.id === dealId);
    return deal?.brand?.name ?? deal?.title ?? null;
  }

  const slotsWithTime = slotsForDay.filter((s) => s.scheduled_time).sort(
    (a, b) => (a.scheduled_time ?? '').localeCompare(b.scheduled_time ?? '')
  );
  const slotsWithoutTime = slotsForDay.filter((s) => !s.scheduled_time);

  function slotsForHour(hour: number) {
    return slotsWithTime.filter((s) => {
      const h = parseInt(s.scheduled_time!.split(':')[0], 10);
      return h === hour;
    });
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Content Calendar" subtitle="Plan your content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={StyleSheet.flatten([styles.scrollContent, isWide && styles.scrollContentWide])}
        showsVerticalScrollIndicator={false}
      >
        {/* Toolbar: title + nav arrows on left, view toggle on right */}
        <View style={styles.toolbarRow}>
          <View style={styles.navTitleRow}>
            <Text style={styles.navTitle}>
              {viewMode === 'day' ? dayLabel
                : viewMode === 'week' ? weekLabel
                : monthLabel}
            </Text>
            <Pressable
              onPress={() => {
                if (viewMode === 'day') setDayOffset((o) => o - 1);
                else if (viewMode === 'week') setWeekOffset((o) => o - 1);
                else prevMonth();
              }}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={18} color={colors.on_surface_variant} />
            </Pressable>
            <Pressable
              onPress={() => {
                if (viewMode === 'day') setDayOffset((o) => o + 1);
                else if (viewMode === 'week') setWeekOffset((o) => o + 1);
                else nextMonth();
              }}
              hitSlop={8}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.on_surface_variant} />
            </Pressable>
          </View>
          <View style={styles.toolbarRight}>
            <View style={styles.viewToggle}>
              {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  style={StyleSheet.flatten([styles.toggleBtn, viewMode === mode && styles.toggleBtnActive])}
                  onPress={() => setViewMode(mode)}
                >
                  <Text style={StyleSheet.flatten([styles.toggleText, viewMode === mode && styles.toggleTextActive])}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {isWide && (
              <Link href="/add-content" asChild>
                <Pressable style={styles.scheduleBtn}>
                  <Ionicons name="add" size={18} color={colors.on_primary} />
                  <Text style={styles.scheduleBtnText}>Schedule Content</Text>
                </Pressable>
              </Link>
            )}
          </View>
        </View>

        {/* DAY VIEW */}
        {viewMode === 'day' && (
          <>

            {/* All-day / unscheduled slots */}
            {slotsWithoutTime.length > 0 && (
              <View style={styles.allDaySection}>
                <Text style={styles.allDayLabel}>All Day / No Time</Text>
                {slotsWithoutTime.map((slot) => (
                  <SlotCard key={slot.id} slot={slot} getDealName={getDealName} compact />
                ))}
              </View>
            )}

            {/* Hourly timeline */}
            <View style={styles.timeline}>
              {HOURS.map((hour) => {
                const hourSlots = slotsForHour(hour);
                return (
                  <View key={hour} style={styles.hourRow}>
                    <Text style={styles.hourLabel}>{formatHour(hour)}</Text>
                    <View style={styles.hourContent}>
                      <View style={styles.hourLine} />
                      {hourSlots.map((slot) => (
                        <SlotCard key={slot.id} slot={slot} getDealName={getDealName} compact />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>

            {slotsForDay.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={28} color={colors.on_surface_variant} />
                <Text style={styles.emptyText}>No content scheduled</Text>
                <Text style={styles.emptyHint}>Tap + to schedule</Text>
              </View>
            )}
          </>
        )}

        {/* WEEK VIEW */}
        {viewMode === 'week' && (
          <>
            <View style={styles.weekHeader}>
              {weekDates.map((date) => {
                const d = new Date(date);
                const isSelected = date === selectedDate;
                const isToday = date === todayStr;
                const hasSlots = slotsMap.has(date);
                return (
                  <Pressable
                    key={date}
                    style={StyleSheet.flatten([styles.dayHeader, isSelected && styles.dayHeaderSelected])}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text
                      style={[
                        styles.dayHeaderLabel,
                        (isSelected || isToday) && styles.dayHeaderLabelHighlight,
                      ]}
                    >
                      {d.toLocaleDateString('en', { weekday: 'short' })}
                    </Text>
                    <Text
                      style={[
                        styles.dayHeaderNum,
                        isToday && styles.dayHeaderToday,
                        isSelected && styles.dayHeaderNumSelected,
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                    {hasSlots && <View style={styles.dayDot} />}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.slotsSection}>
              <Text style={styles.sectionTitle}>
                {new Date(selectedDate).toLocaleDateString('en', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              {slotsForDay.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={28} color={colors.on_surface_variant} />
                  <Text style={styles.emptyText}>No content scheduled</Text>
                  <Text style={styles.emptyHint}>Tap + to schedule</Text>
                </View>
              ) : (
                [...slotsForDay]
                  .sort((a, b) => (a.scheduled_time ?? 'zz').localeCompare(b.scheduled_time ?? 'zz'))
                  .map((slot) => (
                    <SlotCard key={slot.id} slot={slot} getDealName={getDealName} />
                  ))
              )}
            </View>
          </>
        )}

        {/* MONTH VIEW */}
        {viewMode === 'month' && (
          <>
            <View style={styles.monthDayLabels}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <Text key={d} style={styles.monthDayLabel}>{d}</Text>
              ))}
            </View>
            <View style={styles.monthGrid}>
              {monthDates.map((date, i) => {
                if (!date) {
                  return <View key={`e${i}`} style={styles.monthCell} />;
                }
                const isSelected = date === selectedDate;
                const isToday = date === todayStr;
                const count = slotsMap.get(date) || 0;
                return (
                  <Pressable
                    key={date}
                    style={StyleSheet.flatten([styles.monthCell, isSelected && styles.monthCellSelected])}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text
                      style={[
                        styles.monthCellNum,
                        isToday && styles.monthCellToday,
                        isSelected && styles.monthCellNumSelected,
                      ]}
                    >
                      {new Date(date).getDate()}
                    </Text>
                    {count > 0 && (
                      <View style={styles.monthDotRow}>
                        {count <= 3 ? (
                          Array.from({ length: count }).map((_, di) => (
                            <View key={di} style={styles.monthDot} />
                          ))
                        ) : (
                          <>
                            <View style={styles.monthDot} />
                            <Text style={styles.monthDotCount}>{count}</Text>
                          </>
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.slotsSection}>
              <Text style={styles.sectionTitle}>
                {new Date(selectedDate).toLocaleDateString('en', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              {slotsForDay.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={28} color={colors.on_surface_variant} />
                  <Text style={styles.emptyText}>No content scheduled</Text>
                  <Text style={styles.emptyHint}>Tap + to schedule</Text>
                </View>
              ) : (
                [...slotsForDay]
                  .sort((a, b) => (a.scheduled_time ?? 'zz').localeCompare(b.scheduled_time ?? 'zz'))
                  .map((slot) => (
                    <SlotCard key={slot.id} slot={slot} getDealName={getDealName} />
                  ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {!isWide && (
        <Link href="/add-content" asChild>
          <Pressable style={styles.fab}>
            <Ionicons name="add" size={28} color={colors.on_primary} />
          </Pressable>
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 120 },
  scrollContentWide: { maxWidth: 1200, alignSelf: 'center', width: '100%', paddingHorizontal: 40 },

  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.on_surface,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginRight: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 28,
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  scheduleBtnText: {
    ...typography.label_md,
    color: colors.on_primary,
    fontWeight: '700',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface_container_low,
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: colors.surface_container_high,
  },
  toggleText: { ...typography.label_md, color: colors.on_surface_variant },
  toggleTextActive: { color: colors.on_surface, fontWeight: '700' },

  // Week view
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    minWidth: 42,
  },
  dayHeaderSelected: { backgroundColor: colors.surface_container_high },
  dayHeaderLabel: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
    marginBottom: 4,
  },
  dayHeaderLabelHighlight: { color: colors.primary },
  dayHeaderNum: { ...typography.headline_md, color: colors.on_surface },
  dayHeaderToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  dayHeaderNumSelected: { color: colors.primary },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 6,
  },

  // Month view
  monthDayLabels: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  monthDayLabel: {
    flex: 1,
    textAlign: 'center',
    ...typography.label_sm,
    color: colors.on_surface_variant,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  monthCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  monthCellSelected: {
    backgroundColor: colors.surface_container_high,
    borderRadius: 12,
  },
  monthCellNum: {
    ...typography.body_md,
    color: colors.on_surface,
  },
  monthCellToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  monthCellNumSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  monthDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  monthDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  monthDotCount: {
    ...typography.label_sm,
    color: colors.primary,
    fontSize: 9,
  },

  // Day view timeline
  allDaySection: {
    marginBottom: 16,
    gap: 8,
  },
  allDayLabel: {
    ...typography.label_md,
    color: colors.on_surface_variant,
    marginBottom: 4,
  },
  timeline: {
    gap: 0,
  },
  hourRow: {
    flexDirection: 'row',
    minHeight: 60,
  },
  hourLabel: {
    width: 56,
    ...typography.label_sm,
    color: colors.on_surface_variant,
    paddingTop: 2,
    textAlign: 'right',
    paddingRight: 12,
  },
  hourContent: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: 'rgba(65, 71, 85, 0.12)',
    paddingVertical: 4,
    gap: 4,
  },
  hourLine: {},

  // Slots list section
  slotsSection: { gap: 12 },
  sectionTitle: {
    ...typography.headline_sm,
    color: colors.on_surface,
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
    backgroundColor: colors.surface_container_low,
    borderRadius: 16,
  },
  emptyText: { ...typography.body_md, color: colors.on_surface_variant },
  emptyHint: { ...typography.label_sm, color: colors.outline, marginTop: 4 },

  // Slot card
  slotCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
    overflow: 'hidden',
  },
  slotCardCompact: {
    borderRadius: 8,
  },
  slotContent: { flex: 1, padding: 14 },
  slotContentCompact: { flex: 1, padding: 10 },
  slotTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotTitle: {
    ...typography.body_md,
    color: colors.on_surface,
    fontWeight: '600',
    flex: 1,
  },
  slotTitleCompact: {
    ...typography.body_md,
    color: colors.on_surface,
    fontWeight: '600',
    flex: 1,
    fontSize: 13,
  },
  slotTime: {
    ...typography.label_sm,
    color: colors.secondary,
    marginLeft: 8,
    fontWeight: '600',
  },
  slotMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  slotPlatform: { ...typography.label_sm, color: colors.on_surface_variant },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusChipText: { ...typography.label_sm, textTransform: 'capitalize' },
  dealTag: {
    ...typography.label_sm,
    color: colors.primary,
    marginTop: 6,
  },
});
