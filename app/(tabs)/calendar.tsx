/**
 * Content Calendar — Visual monthly/weekly view, drag reschedule
 */

import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useCreatorData } from '@/hooks/useCreatorData';
import type { ContentPlatform, ContentStatus } from '@/types';

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

export default function CalendarScreen() {
  const { contentSlots } = useCreatorData();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState('2026-03-22');

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2026, 2, 18 + i);
    return d.toISOString().slice(0, 10);
  });

  const slotsForWeek = contentSlots.filter((s) => weekDates.includes(s.scheduled_date));

  return (
    <View style={styles.container}>
      <AppHeader
        title="Content Calendar"
        subtitle="Plan your content"
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.toolbar}>
          <View style={styles.viewToggle}>
            <View
              style={[
                styles.toggleBtn,
                viewMode === 'week' && styles.toggleBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  viewMode === 'week' && styles.toggleTextActive,
                ]}
                onPress={() => setViewMode('week')}
              >
                Week
              </Text>
            </View>
            <View
              style={[
                styles.toggleBtn,
                viewMode === 'month' && styles.toggleBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  viewMode === 'month' && styles.toggleTextActive,
                ]}
                onPress={() => setViewMode('month')}
              >
                Month
              </Text>
            </View>
          </View>
          <Link href="/add-content" asChild>
            <Button title="Add Slot" onPress={() => {}} variant="primary" />
          </Link>
        </View>

        <View style={styles.weekHeader}>
          {weekDates.map((date) => {
            const d = new Date(date);
            const isSelected = date === selectedDate;
            return (
              <View
                key={date}
                style={[
                  styles.dayHeader,
                  isSelected && styles.dayHeaderSelected,
                ]}
                onTouchEnd={() => setSelectedDate(date)}
              >
                <Text
                  style={[
                    styles.dayHeaderLabel,
                    isSelected && styles.dayHeaderLabelSelected,
                  ]}
                >
                  {d.toLocaleDateString('en', { weekday: 'short' })}
                </Text>
                <Text
                  style={[
                    styles.dayHeaderNum,
                    isSelected && styles.dayHeaderNumSelected,
                  ]}
                >
                  {d.getDate()}
                </Text>
              </View>
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
          {slotsForWeek
            .filter((s) => s.scheduled_date === selectedDate)
            .map((slot) => (
              <Link key={slot.id} href={`/content/${slot.id}`} asChild>
                <View style={styles.slotCard}>
                  <View
                    style={[
                      styles.statusBar,
                      { backgroundColor: STATUS_COLORS[slot.status] },
                    ]}
                  />
                  <View style={styles.slotContent}>
                    <Text style={styles.slotTitle}>{slot.title}</Text>
                    <View style={styles.slotMeta}>
                      <Text style={styles.slotPlatform}>
                        {PLATFORM_LABELS[slot.platform]}
                      </Text>
                      <View
                        style={[
                          styles.statusChip,
                          { backgroundColor: STATUS_COLORS[slot.status] + '30' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusChipText,
                            { color: STATUS_COLORS[slot.status] },
                          ]}
                        >
                          {slot.status}
                        </Text>
                      </View>
                    </View>
                    {slot.deal_id && (
                      <Text style={styles.dealTag}>Linked to deal</Text>
                    )}
                  </View>
                </View>
              </Link>
            ))}
          {slotsForWeek.filter((s) => s.scheduled_date === selectedDate)
            .length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No content scheduled</Text>
              <Link href="/add-content" asChild>
                <Button
                  title="Add content"
                  onPress={() => {}}
                  variant="tertiary"
                />
              </Link>
            </View>
          )}
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
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: colors.surface_container_high,
  },
  toggleText: {
    ...typography.label_md,
    color: colors.on_surface_variant,
  },
  toggleTextActive: {
    color: colors.on_surface,
    fontWeight: '600',
  },
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
  dayHeaderSelected: {
    backgroundColor: colors.surface_container_high,
  },
  dayHeaderLabel: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
    marginBottom: 4,
  },
  dayHeaderLabelSelected: {
    color: colors.primary,
  },
  dayHeaderNum: {
    ...typography.headline_md,
    color: colors.on_surface,
  },
  dayHeaderNumSelected: {
    color: colors.primary,
  },
  slotsSection: {
    gap: 16,
  },
  sectionTitle: {
    ...typography.headline_sm,
    color: colors.on_surface,
    marginBottom: 8,
  },
  slotCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusBar: {
    width: 4,
  },
  slotContent: {
    flex: 1,
    padding: 16,
  },
  slotTitle: {
    ...typography.body_md,
    color: colors.on_surface,
    fontWeight: '600',
  },
  slotMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  slotPlatform: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusChipText: {
    ...typography.label_sm,
    textTransform: 'capitalize',
  },
  dealTag: {
    ...typography.label_sm,
    color: colors.primary,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    ...typography.body_md,
    color: colors.on_surface_variant,
  },
});
