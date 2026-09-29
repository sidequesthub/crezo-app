import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import {
  toISODate, fromISODate, addDays, addMonths, isSameDay, startOfDay,
  monthGrid, monthLabel, WEEKDAY_INITIALS,
} from '@/lib/dates';

/**
 * A date field that opens a month calendar in a bottom sheet.
 *
 * Replaces the day-by-day stepper, where reaching a date three weeks out took
 * twenty-one taps. Quick picks cover the common cases in one tap; the grid
 * covers the rest in two.
 */
export function DateField({
  value,
  onChange,
  placeholder = 'Add due date',
  compact = false,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  placeholder?: string;
  /** Pill styling for use inside another card. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = value
    ? fromISODate(value).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : placeholder;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          compact ? styles.pill : styles.field,
          pressed && { opacity: 0.8 },
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={compact ? 14 : 16}
          color={value ? Colors.primary : Colors.onSurfaceVariant}
        />
        <Text
          style={[
            compact ? styles.pillText : styles.fieldText,
            !value && { color: Colors.onSurfaceVariant },
          ]}
        >
          {label}
        </Text>
        {!compact && <View style={{ flex: 1 }} />}
        {!compact && (
          <Ionicons name="chevron-down" size={16} color={Colors.onSurfaceVariant} />
        )}
      </Pressable>

      <DatePickerSheet
        visible={open}
        value={value}
        onClose={() => setOpen(false)}
        onPick={(next) => {
          onChange(next);
          setOpen(false);
        }}
      />
    </>
  );
}

function DatePickerSheet({
  visible,
  value,
  onClose,
  onPick,
}: {
  visible: boolean;
  value: string | null;
  onClose: () => void;
  onPick: (next: string | null) => void;
}) {
  const today = startOfDay(new Date());
  const selected = value ? fromISODate(value) : null;
  const [month, setMonth] = useState(() => selected ?? today);

  const quick = [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: addDays(today, 1) },
    { label: 'In a week', date: addDays(today, 7) },
    { label: 'In 2 weeks', date: addDays(today, 14) },
  ];

  const weeks = monthGrid(month);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.quickRow}>
            {quick.map((q) => {
              const active = selected && isSameDay(selected, q.date);
              return (
                <Pressable
                  key={q.label}
                  onPress={() => onPick(toISODate(q.date))}
                  style={[styles.quick, active && styles.quickActive]}
                >
                  <Text style={[styles.quickText, active && styles.quickTextActive]}>
                    {q.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.monthHead}>
            <Pressable onPress={() => setMonth(addMonths(month, -1))} hitSlop={10} style={styles.monthNav}>
              <Ionicons name="chevron-back" size={18} color={Colors.onSurface} />
            </Pressable>
            <Text style={styles.monthTitle}>{monthLabel(month)}</Text>
            <Pressable onPress={() => setMonth(addMonths(month, 1))} hitSlop={10} style={styles.monthNav}>
              <Ionicons name="chevron-forward" size={18} color={Colors.onSurface} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAY_INITIALS.map((d, i) => (
              <Text key={i} style={styles.weekday}>{d}</Text>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day) => {
                const inMonth = day.getMonth() === month.getMonth();
                const isSel = selected && isSameDay(day, selected);
                const isToday = isSameDay(day, today);
                return (
                  <Pressable
                    key={toISODate(day)}
                    onPress={() => onPick(toISODate(day))}
                    style={[styles.day, isSel && styles.daySelected]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !inMonth && styles.dayOut,
                        isToday && !isSel && styles.dayToday,
                        isSel && styles.dayTextSelected,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          {value && (
            <Pressable onPress={() => onPick(null)} style={styles.clear}>
              <Text style={styles.clearText}>Remove date</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 15,
  },
  fieldText: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: Colors.onSurface },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceContainerHigh, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  pillText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: Colors.onSurface },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surfaceContainer,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: 36,
  },
  handle: {
    alignSelf: 'center', width: 38, height: 4, borderRadius: 999,
    backgroundColor: 'rgba(200, 196, 188, 0.25)', marginBottom: 16,
  },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  quick: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  quickActive: { backgroundColor: 'rgba(233, 228, 218, 0.2)' },
  quickText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: Colors.onSurface },
  quickTextActive: { color: Colors.primary },

  monthHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthNav: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  monthTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: Colors.onSurface },

  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1, textAlign: 'center', paddingVertical: 6,
    fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: Colors.onSurfaceVariant,
  },
  // 44pt tall: the minimum comfortable touch target.
  day: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  daySelected: { backgroundColor: Colors.primaryContainer },
  dayText: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: Colors.onSurface },
  dayOut: { color: 'rgba(200, 196, 188, 0.3)' },
  dayToday: { color: Colors.primary },
  dayTextSelected: { color: Colors.onPrimaryContainer, fontFamily: 'Manrope_700Bold' },

  clear: { alignSelf: 'center', marginTop: 14, padding: 8 },
  clearText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: Colors.error },
});
