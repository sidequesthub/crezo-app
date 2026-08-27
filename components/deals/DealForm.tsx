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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { DEAL_STATUS_ORDER, DEAL_STATUSES, type DealStatus } from '@/constants/deals';
import { listBrands, type Brand, type DealInput } from '@/lib/deals';
import { fromISODate, addDays, toISODate } from '@/lib/dates';

export interface DealFormValues extends DealInput {
  /** Free-typed brand name; resolved to a brand row on save. */
  brandName: string;
}

interface Props {
  heading: string;
  initial: DealFormValues;
  creatorId: string | null;
  submitLabel: string;
  onSubmit: (values: DealFormValues) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}

export function DealForm({
  heading,
  initial,
  creatorId,
  submitLabel,
  onSubmit,
  onDelete,
  onClose,
  children,
}: Props) {
  const [brandName, setBrandName] = useState(initial.brandName);
  const [title, setTitle] = useState(initial.title);
  const [value, setValue] = useState(initial.value_inr ? String(initial.value_inr) : '');
  const [status, setStatus] = useState<DealStatus>(initial.status);
  const [endDate, setEndDate] = useState<string | null>(initial.end_date ?? null);
  const [usageRights, setUsageRights] = useState(initial.usage_rights ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');

  const [brands, setBrands] = useState<Brand[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!creatorId) return;
    listBrands(creatorId)
      .then(setBrands)
      .catch(() => setBrands([]));
  }, [creatorId]);

  async function handleSubmit() {
    if (!brandName.trim()) {
      setError('Which brand is this deal with?');
      return;
    }
    if (!title.trim()) {
      setError('Give the campaign a name, e.g. “Summer launch reel”.');
      return;
    }
    const numeric = Number(value.replace(/[^0-9.]/g, ''));
    if (value.trim() && Number.isNaN(numeric)) {
      setError('Deal value should be a number.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        brandName: brandName.trim(),
        title: title.trim(),
        value_inr: numeric || 0,
        status,
        end_date: endDate,
        usage_rights: usageRights.trim() || null,
        notes: notes.trim() || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
      setSaving(false);
    }
  }

  const suggestions = brands
    .filter((b) => b.name.toLowerCase() !== brandName.trim().toLowerCase())
    .slice(0, 6);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.iconButton}>
          <Ionicons name="close" size={22} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.heading}>{heading}</Text>
        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={10} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
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
          <Field label="Brand">
            <TextInput
              value={brandName}
              onChangeText={setBrandName}
              placeholder="e.g. Boat"
              placeholderTextColor="rgba(193, 198, 215, 0.4)"
              style={styles.input}
              autoCapitalize="words"
            />
            {suggestions.length > 0 && (
              <View style={styles.chipWrap}>
                {suggestions.map((b) => (
                  <Pressable key={b.id} onPress={() => setBrandName(b.name)} style={styles.chip}>
                    <Text style={styles.chipText}>{b.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Field>

          <Field label="Campaign">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. X-Airdopes launch"
              placeholderTextColor="rgba(193, 198, 215, 0.4)"
              style={styles.input}
            />
          </Field>

          <Field label="Deal value (₹)">
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder="45000"
              placeholderTextColor="rgba(193, 198, 215, 0.4)"
              style={styles.input}
              keyboardType="number-pad"
            />
          </Field>

          <Field label="Stage">
            <View style={styles.chipWrap}>
              {DEAL_STATUS_ORDER.map((s) => {
                const meta = DEAL_STATUSES[s];
                const active = status === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[
                      styles.chip,
                      active && { backgroundColor: meta.bg, borderColor: meta.fg },
                    ]}
                  >
                    <Text style={[styles.chipText, active && { color: meta.fg }]}>
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="Due date — optional">
            {endDate ? (
              <View style={styles.dateRow}>
                <Pressable
                  onPress={() => setEndDate(toISODate(addDays(fromISODate(endDate), -1)))}
                  hitSlop={8}
                  style={styles.dateStep}
                >
                  <Ionicons name="chevron-back" size={18} color={Colors.primary} />
                </Pressable>
                <Text style={styles.dateText}>
                  {fromISODate(endDate).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                <Pressable
                  onPress={() => setEndDate(toISODate(addDays(fromISODate(endDate), 1)))}
                  hitSlop={8}
                  style={styles.dateStep}
                >
                  <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setEndDate(toISODate(addDays(new Date(), 14)))}
                style={styles.addDate}
              >
                <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                <Text style={styles.addDateText}>Set a due date</Text>
              </Pressable>
            )}
            {endDate && (
              <Pressable onPress={() => setEndDate(null)} style={styles.clearDate}>
                <Text style={styles.clearDateText}>Clear date</Text>
              </Pressable>
            )}
          </Field>

          {children}

          <Field label="Usage rights — optional">
            <TextInput
              value={usageRights}
              onChangeText={setUsageRights}
              placeholder="e.g. Organic only, 30 days, no whitelisting"
              placeholderTextColor="rgba(193, 198, 215, 0.4)"
              style={styles.input}
            />
          </Field>

          <Field label="Notes — optional">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Rate discussions, contact person, brief…"
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
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
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
  },
  chipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
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
  dateText: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: Colors.onSurface },
  addDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addDateText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: Colors.primary },
  clearDate: { alignSelf: 'flex-start', paddingVertical: 4 },
  clearDateText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
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
