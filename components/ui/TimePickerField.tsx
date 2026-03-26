import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';

interface TimePickerFieldProps {
  label: string;
  value: string;
  onChange: (timeStr: string) => void;
  placeholder?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const QUICK = [
  { label: '9 AM', h: 9, m: 0, p: 'AM' as const, icon: 'sunny-outline' as const },
  { label: '12 PM', h: 12, m: 0, p: 'PM' as const, icon: 'sunny' as const },
  { label: '2 PM', h: 2, m: 0, p: 'PM' as const, icon: 'partly-sunny-outline' as const },
  { label: '5 PM', h: 5, m: 0, p: 'PM' as const, icon: 'cloudy-outline' as const },
  { label: '8 PM', h: 8, m: 0, p: 'PM' as const, icon: 'moon-outline' as const },
];

function fmtTime(v: string) {
  if (!v) return '';
  const [h, m] = v.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function to24(h: number, m: number, p: 'AM' | 'PM') {
  let hr = h;
  if (p === 'AM' && hr === 12) hr = 0;
  else if (p === 'PM' && hr !== 12) hr += 12;
  return `${String(hr).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parse(v: string) {
  if (!v) return { hour: 9, minute: 0, ampm: 'AM' as const };
  const [h, m] = v.split(':').map(Number);
  return { hour: h % 12 || 12, minute: m, ampm: (h >= 12 ? 'PM' : 'AM') as 'AM' | 'PM' };
}

export function TimePickerField({ label, value, onChange, placeholder }: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const init = parse(value);
  const [selH, setSelH] = useState(init.hour);
  const [selM, setSelM] = useState(init.minute);
  const [selP, setSelP] = useState(init.ampm);

  const openModal = useCallback(() => {
    const p = parse(value);
    setSelH(p.hour); setSelM(p.minute); setSelP(p.ampm);
    setOpen(true);
  }, [value]);

  const confirm = useCallback(() => {
    onChange(to24(selH, selM, selP));
    setOpen(false);
  }, [selH, selM, selP, onChange]);

  const quick = useCallback((h: number, m: number, p: 'AM' | 'PM') => {
    onChange(to24(h, m, p));
    setOpen(false);
  }, [onChange]);

  const preview = `${selH}:${String(selM).padStart(2, '0')} ${selP}`;

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <View style={s.row}>
        <Pressable
          style={[s.trigger, open && s.triggerActive, hovered && !open && s.triggerHover]}
          onPress={openModal}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
        >
          <View style={[s.iconWrap, { backgroundColor: colors.secondary + '18' }]}>
            <Ionicons name="time-outline" size={16} color={colors.secondary} />
          </View>
          <Text style={[s.triggerText, !value && s.placeholder]}>
            {value ? fmtTime(value) : placeholder || 'Set time (optional)'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.on_surface_variant} />
        </Pressable>
        {value !== '' && (
          <Pressable style={s.clearBtn} onPress={() => onChange('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.on_surface_variant} />
          </Pressable>
        )}
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)} />
        <View style={s.center}>
          <View style={s.modal}>
            {/* Quick picks */}
            <Text style={s.secLabel}>Quick Select</Text>
            <View style={s.quickRow}>
              {QUICK.map(q => (
                <Pressable key={q.label} style={s.qChip} onPress={() => quick(q.h, q.m, q.p)}>
                  <Ionicons name={q.icon} size={14} color={colors.secondary} style={{ marginRight: 5 }} />
                  <Text style={s.qTxt}>{q.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={s.divider} />
            <Text style={s.secLabel}>Custom Time</Text>

            {/* Columns */}
            <View style={s.cols}>
              <View style={s.col}>
                <Text style={s.colHdr}>Hour</Text>
                <ScrollView style={s.colScroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.colPad}>
                  {HOURS.map(h => (
                    <Pressable key={h} style={[s.colItem, selH === h && s.colItemAct]} onPress={() => setSelH(h)}>
                      <Text style={[s.colTxt, selH === h && s.colTxtAct]}>{h}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <View style={s.col}>
                <Text style={s.colHdr}>Min</Text>
                <ScrollView style={s.colScroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.colPad}>
                  {MINUTES.map(m => (
                    <Pressable key={m} style={[s.colItem, selM === m && s.colItemAct]} onPress={() => setSelM(m)}>
                      <Text style={[s.colTxt, selM === m && s.colTxtAct]}>{String(m).padStart(2, '0')}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <View style={s.amCol}>
                <Text style={s.colHdr}>{'\u00A0'}</Text>
                <View style={s.amWrap}>
                  {(['AM', 'PM'] as const).map(p => (
                    <Pressable key={p} style={[s.amBtn, selP === p && s.amBtnAct]} onPress={() => setSelP(p)}>
                      <Text style={[s.amTxt, selP === p && s.amTxtAct]}>{p}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={s.foot}>
              <View style={s.prevWrap}>
                <Ionicons name="time" size={16} color={colors.secondary} style={{ marginRight: 6 }} />
                <Text style={s.prevTxt}>{preview}</Text>
              </View>
              <Pressable style={s.confirmBtn} onPress={confirm}>
                <Text style={s.confirmTxt}>Set Time</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 8 },
  label: { ...typography.label_md, color: colors.on_surface_variant, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trigger: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface_container_low,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: colors.outline_variant + '40', gap: 12,
  },
  triggerActive: { borderColor: colors.secondary + '80', backgroundColor: colors.surface_container },
  triggerHover: { borderColor: colors.outline_variant + '80', backgroundColor: colors.surface_container },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  triggerText: { ...typography.body_md, color: colors.on_surface, flex: 1, fontWeight: '500' },
  placeholder: { color: colors.on_surface_variant, fontWeight: '400' },
  clearBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface_container_low },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  modal: {
    backgroundColor: colors.surface_container, borderRadius: 24, padding: 24, minWidth: 360, maxWidth: 400,
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.5, shadowRadius: 40, elevation: 20,
    borderWidth: 1, borderColor: colors.outline_variant + '30',
  },

  secLabel: { ...typography.label_sm, color: colors.outline, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  qChip: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 10, backgroundColor: colors.surface_container_high,
  },
  qTxt: { ...typography.label_md, color: colors.on_surface, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.outline_variant + '30', marginBottom: 16 },

  cols: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  amCol: { width: 60 },
  colHdr: { ...typography.label_sm, color: colors.outline, textAlign: 'center', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  colScroll: { maxHeight: 200, borderRadius: 14, backgroundColor: colors.surface_container_low },
  colPad: { padding: 4 },
  colItem: { paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginBottom: 2 },
  colItemAct: { backgroundColor: colors.primary },
  colTxt: { ...typography.body_md, color: colors.on_surface, fontWeight: '500' },
  colTxtAct: { color: colors.on_primary, fontWeight: '700' },
  amWrap: { gap: 8, borderRadius: 14, backgroundColor: colors.surface_container_low, padding: 4 },
  amBtn: { paddingVertical: 18, borderRadius: 10, alignItems: 'center' },
  amBtnAct: { backgroundColor: colors.secondary },
  amTxt: { ...typography.label_lg, color: colors.on_surface_variant },
  amTxtAct: { color: colors.on_secondary, fontWeight: '800' },

  foot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.outline_variant + '20',
  },
  prevWrap: { flexDirection: 'row', alignItems: 'center' },
  prevTxt: { ...typography.headline_md, color: colors.on_surface, fontWeight: '700' },
  confirmBtn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  confirmTxt: { ...typography.label_lg, color: colors.on_primary, fontWeight: '700' },
});
