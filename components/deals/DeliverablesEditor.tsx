import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { PLATFORM_ORDER, PLATFORMS, platformMeta, type ContentPlatform } from '@/constants/content';
import {
  addDeliverable,
  setDeliverableStatus,
  deleteDeliverable,
  updateDeliverable,
  type Deliverable,
} from '@/lib/deals';
import { toISODate, fromISODate, addDays } from '@/lib/dates';

interface Props {
  dealId: string;
  items: Deliverable[];
  onChanged: (next: Deliverable[]) => void;
}

/**
 * A deal's deliverables. Each one carries a platform and an optional due date —
 * the due date is what surfaces the item in Home's Upcoming Deadlines, so a
 * deliverable without one is invisible on the dashboard.
 */
export function DeliverablesEditor({ dealId, items, onChanged }: Props) {
  const [draft, setDraft] = useState('');
  const [platform, setPlatform] = useState<ContentPlatform>('ig_reel');
  const [due, setDue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const done = items.filter((d) => d.status === 'done').length;

  async function add() {
    const title = draft.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      const created = await addDeliverable(dealId, title, platform, due);
      onChanged([...items, created]);
      setDraft('');
      setDue(null);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(d: Deliverable) {
    const next = d.status === 'done' ? 'pending' : 'done';
    const optimistic = items.map((x) => (x.id === d.id ? { ...x, status: next } : x));
    onChanged(optimistic);
    try {
      await setDeliverableStatus(d.id, next);
    } catch {
      onChanged(items);
    }
  }

  async function remove(d: Deliverable) {
    onChanged(items.filter((x) => x.id !== d.id));
    try {
      await deleteDeliverable(d.id);
    } catch {
      onChanged(items);
    }
  }

  async function shiftDue(d: Deliverable, days: number) {
    const base = d.due_date ? fromISODate(d.due_date) : new Date();
    const next = toISODate(addDays(base, days));
    onChanged(items.map((x) => (x.id === d.id ? { ...x, due_date: next } : x)));
    try {
      await updateDeliverable(d.id, { due_date: next });
    } catch {
      onChanged(items);
    }
  }

  async function clearDue(d: Deliverable) {
    onChanged(items.map((x) => (x.id === d.id ? { ...x, due_date: null } : x)));
    try {
      await updateDeliverable(d.id, { due_date: null });
    } catch {
      onChanged(items);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>
        Deliverables{items.length > 0 ? ` — ${done}/${items.length} done` : ''}
      </Text>

      {items.map((d) => {
        const meta = platformMeta(d.platform);
        const isOpen = expanded === d.id;
        return (
          <View key={d.id} style={styles.row}>
            <View style={styles.rowMain}>
              <Pressable onPress={() => toggle(d)} hitSlop={6} style={styles.checkbox}>
                <Ionicons
                  name={d.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={d.status === 'done' ? Colors.primary : Colors.onSurfaceVariant}
                />
              </Pressable>

              <Pressable
                style={styles.rowBody}
                onPress={() => setExpanded(isOpen ? null : d.id)}
              >
                <Text style={[styles.rowTitle, d.status === 'done' && styles.rowDone]}>
                  {d.title ?? 'Untitled'}
                </Text>
                <View style={styles.rowMeta}>
                  <Ionicons name={meta.icon} size={11} color={meta.tint} />
                  <Text style={styles.rowMetaText}>{meta.label}</Text>
                  {d.due_date ? (
                    <Text style={styles.rowDue}>
                      · due{' '}
                      {fromISODate(d.due_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  ) : (
                    <Text style={styles.rowNoDue}>· no due date</Text>
                  )}
                </View>
              </Pressable>

              <Pressable onPress={() => remove(d)} hitSlop={8}>
                <Ionicons name="close" size={18} color={Colors.onSurfaceVariant} />
              </Pressable>
            </View>

            {isOpen && (
              <View style={styles.dueEditor}>
                <Pressable onPress={() => shiftDue(d, -1)} hitSlop={6} style={styles.dueStep}>
                  <Ionicons name="chevron-back" size={16} color={Colors.primary} />
                </Pressable>
                <Text style={styles.dueValue}>
                  {d.due_date
                    ? fromISODate(d.due_date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'Tap ▸ to set a date'}
                </Text>
                <Pressable onPress={() => shiftDue(d, 1)} hitSlop={6} style={styles.dueStep}>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </Pressable>
                {d.due_date && (
                  <Pressable onPress={() => clearDue(d)} hitSlop={6}>
                    <Text style={styles.clearDue}>Clear</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* Add form */}
      <View style={styles.addBox}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a deliverable…"
          placeholderTextColor="rgba(193, 198, 215, 0.4)"
          style={styles.addInput}
          onSubmitEditing={add}
          returnKeyType="done"
        />

        <View style={styles.platformRow}>
          {PLATFORM_ORDER.map((p) => {
            const m = PLATFORMS[p];
            const active = platform === p;
            return (
              <Pressable
                key={p}
                onPress={() => setPlatform(p)}
                style={[styles.pChip, active && { backgroundColor: `${m.tint}26` }]}
              >
                <Ionicons
                  name={m.icon}
                  size={13}
                  color={active ? m.tint : Colors.onSurfaceVariant}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.addFooter}>
          {due ? (
            <View style={styles.dueEditor}>
              <Pressable
                onPress={() => setDue(toISODate(addDays(fromISODate(due), -1)))}
                hitSlop={6}
                style={styles.dueStep}
              >
                <Ionicons name="chevron-back" size={16} color={Colors.primary} />
              </Pressable>
              <Text style={styles.dueValue}>
                {fromISODate(due).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
              <Pressable
                onPress={() => setDue(toISODate(addDays(fromISODate(due), 1)))}
                hitSlop={6}
                style={styles.dueStep}
              >
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </Pressable>
              <Pressable onPress={() => setDue(null)} hitSlop={6}>
                <Text style={styles.clearDue}>Clear</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setDue(toISODate(addDays(new Date(), 7)))}
              style={styles.setDue}
            >
              <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
              <Text style={styles.setDueText}>Add due date</Text>
            </Pressable>
          )}

          <Pressable
            onPress={add}
            disabled={!draft.trim() || busy}
            style={[styles.addButton, !draft.trim() && { opacity: 0.4 }]}
          >
            <Ionicons name="add" size={18} color={Colors.onPrimaryContainer} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  row: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    overflow: 'hidden',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  checkbox: { width: 24, alignItems: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: Colors.onSurface,
  },
  rowDone: { color: Colors.onSurfaceVariant, textDecorationLine: 'line-through' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowMetaText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  rowDue: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: Colors.primary },
  rowNoDue: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: 'rgba(193, 198, 215, 0.45)',
  },

  dueEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 11,
  },
  dueStep: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  dueValue: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: Colors.onSurface,
  },
  clearDue: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },

  addBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  addInput: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: Colors.onSurface,
    padding: 0,
  },
  platformRow: { flexDirection: 'row', gap: 6 },
  pChip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  addFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  setDue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  setDueText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: Colors.primary },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  addButtonText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: Colors.onPrimaryContainer,
  },
});
