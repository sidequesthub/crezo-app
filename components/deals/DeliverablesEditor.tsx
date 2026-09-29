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
import { fromISODate } from '@/lib/dates';
import { DateField } from '@/components/ui/DateField';

const SHORT_LABEL: Record<ContentPlatform, string> = {
  ig_reel: 'Reel',
  yt_video: 'YT Video',
  yt_short: 'YT Short',
  story: 'Story',
  post: 'Post',
  other: 'Other',
};

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

  async function setRowDue(d: Deliverable, next: string | null) {
    onChanged(items.map((x) => (x.id === d.id ? { ...x, due_date: next } : x)));
    try {
      await updateDeliverable(d.id, { due_date: next });
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
              <View style={styles.rowEditor}>
                <DateField
                  compact
                  value={d.due_date}
                  onChange={(next) => setRowDue(d, next)}
                />
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
          placeholder="e.g. 1 Reel — product unboxing"
          placeholderTextColor="rgba(193, 198, 215, 0.4)"
          style={styles.addInput}
          onSubmitEditing={add}
          returnKeyType="done"
        />

        {/* Labelled, because icons alone could not tell a YouTube video from a
            Short, or a Story from a Post. */}
        <View style={styles.typeWrap}>
          {PLATFORM_ORDER.map((p) => {
            const m = PLATFORMS[p];
            const active = platform === p;
            return (
              <Pressable
                key={p}
                onPress={() => setPlatform(p)}
                style={[
                  styles.typeChip,
                  active && { backgroundColor: `${m.tint}22`, borderColor: `${m.tint}66` },
                ]}
              >
                <Ionicons name={m.icon} size={14} color={active ? m.tint : Colors.onSurfaceVariant} />
                <Text style={[styles.typeText, active && { color: Colors.onSurface }]}>
                  {SHORT_LABEL[p]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <DateField compact value={due} onChange={setDue} />

        <Pressable
          onPress={add}
          disabled={!draft.trim() || busy}
          style={[styles.addButton, (!draft.trim() || busy) && { opacity: 0.4 }]}
        >
          <Ionicons name="add" size={18} color={Colors.onPrimaryContainer} />
          <Text style={styles.addButtonText}>Add deliverable</Text>
        </Pressable>
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


  rowEditor: { paddingHorizontal: 12, paddingBottom: 12, paddingLeft: 46 },
  addBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },
  typeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1, borderColor: 'transparent',
  },
  typeText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: Colors.onSurfaceVariant },
  addInput: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    color: Colors.onSurface,
    paddingVertical: 4,
  },
  // Full width on its own row: sharing a row with the date control is what
  // pushed it off the right edge.
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  addButtonText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: Colors.onPrimaryContainer,
  },
});
