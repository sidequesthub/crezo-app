import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import {
  PLATFORM_ORDER,
  STATUS_ORDER,
  PLATFORMS,
  STATUSES,
  platformMeta,
  type ContentPlatform,
  type ContentStatus,
} from '@/constants/content';
import { type ContentSlotInput } from '@/lib/contentSlots';
import { listDeliverableOptions } from '@/lib/deals';
import { fromISODate, addDays, toISODate } from '@/lib/dates';

interface Props {
  heading: string;
  initial: ContentSlotInput;
  creatorId: string | null;
  submitLabel: string;
  onSubmit: (values: ContentSlotInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

type DeliverableOption = Awaited<ReturnType<typeof listDeliverableOptions>>[number];

/** Accepts `9:30`, `09:30`, `21:05` — returns `HH:MM:00` or null if unparseable. */
function parseTime(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
}

export function SlotForm({
  heading,
  initial,
  creatorId,
  submitLabel,
  onSubmit,
  onDelete,
  onClose,
}: Props) {
  const [title, setTitle] = useState(initial.title);
  const [platform, setPlatform] = useState<ContentPlatform>(initial.platform);
  const [status, setStatus] = useState<ContentStatus>(initial.status);
  const [date, setDate] = useState(initial.scheduled_date);
  const [time, setTime] = useState(initial.scheduled_time?.slice(0, 5) ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [deliverableId, setDeliverableId] = useState<string | null>(
    initial.deliverable_id ?? null,
  );

  const [deliverables, setDeliverables] = useState<DeliverableOption[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!creatorId) return;
    listDeliverableOptions(creatorId)
      .then(setDeliverables)
      .catch(() => setDeliverables([]));
  }, [creatorId]);

  const selectedDeliverable = deliverables.find((d) => d.id === deliverableId) ?? null;

  /** Deliverables grouped under their deal, for the picker. */
  const grouped = deliverables.reduce<Record<string, DeliverableOption[]>>((acc, d) => {
    (acc[d.dealLabel] ??= []).push(d);
    return acc;
  }, {});

  async function handleSubmit() {
    if (!title.trim()) {
      setError('Give this a title so you can recognise it later.');
      return;
    }
    if (time.trim() && !parseTime(time)) {
      setError('Time needs to look like 18:30.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        platform,
        status,
        scheduled_date: date,
        scheduled_time: parseTime(time),
        // The deal follows from the deliverable, so the two can't disagree.
        deal_id: selectedDeliverable?.dealId ?? null,
        deliverable_id: deliverableId,
        notes: notes.trim() || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
      setSaving(false);
    }
  }

  const displayDate = fromISODate(date).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton}>
          <Ionicons name="close" size={22} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.heading}>{heading}</Text>
        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={10} style={styles.closeButton}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </Pressable>
        ) : (
          <View style={styles.closeButton} />
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Field label="What are you making?">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Monsoon skincare routine"
              placeholderTextColor="rgba(193, 198, 215, 0.4)"
              style={styles.input}
              returnKeyType="done"
            />
          </Field>

          <Field label="Platform">
            <View style={styles.chipWrap}>
              {PLATFORM_ORDER.map((p) => {
                const meta = PLATFORMS[p];
                const active = platform === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setPlatform(p)}
                    style={[
                      styles.chip,
                      active && { backgroundColor: `${meta.tint}26`, borderColor: meta.tint },
                    ]}
                  >
                    <Ionicons
                      name={meta.icon}
                      size={14}
                      color={active ? meta.tint : Colors.onSurfaceVariant}
                    />
                    <Text style={[styles.chipText, active && { color: meta.tint }]}>
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="Status">
            <View style={styles.chipWrap}>
              {STATUS_ORDER.map((s) => {
                const meta = STATUSES[s];
                const active = status === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[styles.chip, active && { backgroundColor: meta.bg, borderColor: meta.fg }]}
                  >
                    <Text style={[styles.chipText, active && { color: meta.fg }]}>
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="When">
            <View style={styles.dateRow}>
              <Pressable
                onPress={() => setDate(toISODate(addDays(fromISODate(date), -1)))}
                hitSlop={8}
                style={styles.dateStep}
              >
                <Ionicons name="chevron-back" size={18} color={Colors.primary} />
              </Pressable>
              <Text style={styles.dateText}>{displayDate}</Text>
              <Pressable
                onPress={() => setDate(toISODate(addDays(fromISODate(date), 1)))}
                hitSlop={8}
                style={styles.dateStep}
              >
                <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
              </Pressable>
            </View>

            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="Time — optional, e.g. 18:30"
              placeholderTextColor="rgba(193, 198, 215, 0.4)"
              style={[styles.input, styles.inputSpaced]}
              keyboardType="numbers-and-punctuation"
            />
          </Field>

          <Field label="Fulfils a deliverable — optional">
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => [styles.picker, pressed && styles.pickerPressed]}
            >
              <Ionicons
                name={selectedDeliverable ? 'link' : 'link-outline'}
                size={16}
                color={selectedDeliverable ? Colors.secondaryFixed : Colors.onSurfaceVariant}
              />
              <View style={styles.pickerBody}>
                {selectedDeliverable ? (
                  <>
                    <Text style={styles.pickerValue} numberOfLines={1}>
                      {selectedDeliverable.title}
                    </Text>
                    <Text style={styles.pickerSub}>{selectedDeliverable.dealLabel}</Text>
                  </>
                ) : (
                  <Text style={styles.pickerPlaceholder}>
                    {deliverables.length === 0
                      ? 'No open deliverables — add some on a deal'
                      : 'Not linked to a deal'}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={16} color={Colors.onSurfaceVariant} />
            </Pressable>
          </Field>

          <Field label="Notes — optional">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Hook, script beats, references…"
              placeholderTextColor="rgba(193, 198, 215, 0.4)"
              style={[styles.input, styles.textarea]}
              multiline
              textAlignVertical="top"
            />
          </Field>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={handleSubmit} disabled={saving} style={styles.submit}>
            <LinearGradient
              colors={['#ADC6FF', '#4B8EFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBg}
            >
              {saving ? (
                <ActivityIndicator color={Colors.onPrimaryContainer} />
              ) : (
                <Text style={styles.submitText}>{submitLabel}</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Link to a deliverable</Text>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Pressable
                onPress={() => {
                  setDeliverableId(null);
                  setPickerOpen(false);
                }}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <Ionicons name="close-circle-outline" size={18} color={Colors.onSurfaceVariant} />
                <Text style={styles.optionText}>Not linked</Text>
                {!deliverableId && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} />
                )}
              </Pressable>

              {Object.entries(grouped).map(([dealLabel, items]) => (
                <View key={dealLabel}>
                  <Text style={styles.groupLabel}>{dealLabel.toUpperCase()}</Text>
                  {items.map((d) => {
                    const meta = platformMeta(d.platform);
                    const active = d.id === deliverableId;
                    return (
                      <Pressable
                        key={d.id}
                        onPress={() => {
                          setDeliverableId(d.id);
                          setPickerOpen(false);
                        }}
                        style={({ pressed }) => [
                          styles.option,
                          active && styles.optionActive,
                          pressed && !active && styles.optionPressed,
                        ]}
                      >
                        <Ionicons name={meta.icon} size={16} color={meta.tint} />
                        <View style={styles.optionBody}>
                          <Text style={styles.optionText} numberOfLines={1}>
                            {d.title}
                          </Text>
                          {d.dueDate && (
                            <Text style={styles.optionSub}>
                              due{' '}
                              {fromISODate(d.dueDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </Text>
                          )}
                        </View>
                        {active && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                      </Pressable>
                    );
                  })}
                </View>
              ))}

              {deliverables.length === 0 && (
                <Text style={styles.emptyHint}>
                  Deliverables come from your deals. Open a deal and add some first.
                </Text>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heading: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: Colors.onSurface,
  },

  body: { padding: 20, paddingBottom: 32, gap: 24 },
  field: { gap: 10 },
  fieldLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    color: Colors.onSurface,
  },
  inputSpaced: { marginTop: 10 },
  textarea: { minHeight: 96, paddingTop: 14 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'transparent',
    maxWidth: '100%',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerPressed: { backgroundColor: Colors.surfaceContainerHigh },
  pickerBody: { flex: 1, gap: 2 },
  pickerValue: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: Colors.onSurface,
  },
  pickerSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: Colors.secondaryFixed,
  },
  pickerPlaceholder: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: 'rgba(193, 198, 215, 0.4)',
  },

  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surfaceContainer,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 34,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(193, 198, 215, 0.25)',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: Colors.onSurface,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  groupLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 16,
  },
  optionActive: { backgroundColor: Colors.surfaceContainerHigh },
  optionPressed: { backgroundColor: 'rgba(193, 198, 215, 0.06)' },
  optionBody: { flex: 1, gap: 2 },
  optionText: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: Colors.onSurface,
  },
  optionSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: Colors.primary,
  },
  emptyHint: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    padding: 24,
  },
  chipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    flexShrink: 1,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  dateStep: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  dateText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    color: Colors.onSurface,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(147, 0, 10, 0.22)',
  },
  errorText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: Colors.onErrorContainer,
  },

  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  submit: { borderRadius: 16, overflow: 'hidden' },
  submitBg: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  submitText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    color: Colors.onPrimaryContainer,
    letterSpacing: 0.2,
  },
});
