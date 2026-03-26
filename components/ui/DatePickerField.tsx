import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (dateStr: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function fmt(dateStr: string): string {
  if (!dateStr) return 'Select a date';
  const d = new Date(dateStr + 'T00:00:00');
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function daysIn(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function startDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function ds(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function DatePickerField({ label, value, onChange }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const today = new Date();
  const todayStr = ds(today.getFullYear(), today.getMonth(), today.getDate());
  const initial = value ? new Date(value + 'T00:00:00') : today;

  const [vY, setVY] = useState(initial.getFullYear());
  const [vM, setVM] = useState(initial.getMonth());

  const prev = useCallback(() => {
    setVM(m => { if (m === 0) { setVY(y => y - 1); return 11; } return m - 1; });
  }, []);
  const next = useCallback(() => {
    setVM(m => { if (m === 11) { setVY(y => y + 1); return 0; } return m + 1; });
  }, []);

  const cells = useMemo(() => {
    const total = daysIn(vY, vM);
    const first = startDay(vY, vM);
    const prevTotal = daysIn(vM === 0 ? vY - 1 : vY, vM === 0 ? 11 : vM - 1);
    const arr: { day: number; cur: boolean }[] = [];
    for (let i = first - 1; i >= 0; i--) arr.push({ day: prevTotal - i, cur: false });
    for (let d = 1; d <= total; d++) arr.push({ day: d, cur: true });
    while (arr.length < 42) arr.push({ day: arr.length - first - total + 1, cur: false });
    return arr;
  }, [vY, vM]);

  function pick(d: string) { onChange(d); setOpen(false); }

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        style={[s.trigger, open && s.triggerActive, hovered && !open && s.triggerHover]}
        onPress={() => { setVY(initial.getFullYear()); setVM(initial.getMonth()); setOpen(true); }}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
      >
        <View style={s.iconWrap}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
        </View>
        <Text style={[s.triggerText, !value && s.placeholder]}>{fmt(value)}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.on_surface_variant} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)} />
        <View style={s.center}>
          <View style={s.modal}>
            {/* Header */}
            <View style={s.hdr}>
              <Pressable onPress={prev} style={s.nav}><Ionicons name="chevron-back" size={18} color={colors.on_surface} /></Pressable>
              <View style={s.hdrCenter}>
                <Text style={s.monthTxt}>{MONTHS[vM]}</Text>
                <Text style={s.yearTxt}>{vY}</Text>
              </View>
              <Pressable onPress={next} style={s.nav}><Ionicons name="chevron-forward" size={18} color={colors.on_surface} /></Pressable>
            </View>

            {/* Week labels */}
            <View style={s.weekRow}>
              {WEEKDAYS.map(w => <View key={w} style={s.wCell}><Text style={s.wTxt}>{w}</Text></View>)}
            </View>

            {/* Grid */}
            <View style={s.grid}>
              {cells.map((c, i) => {
                const d = c.cur ? ds(vY, vM, c.day) : '';
                const sel = c.cur && d === value;
                const isToday = c.cur && d === todayStr;
                return (
                  <Pressable
                    key={i}
                    style={[s.cell, sel && s.cellSel, isToday && !sel && s.cellToday]}
                    onPress={c.cur ? () => pick(d) : undefined}
                    disabled={!c.cur}
                  >
                    <Text style={[s.dayTxt, !c.cur && s.dayDim, sel && s.daySel, isToday && !sel && s.dayTod]}>
                      {c.day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Footer */}
            <View style={s.foot}>
              <Pressable style={s.todayBtn} onPress={() => { setVY(today.getFullYear()); setVM(today.getMonth()); pick(todayStr); }}>
                <Ionicons name="today-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={s.todayTxt}>Today</Text>
              </Pressable>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={s.cancelTxt}>Close</Text>
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
  trigger: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface_container_low,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: colors.outline_variant + '40', gap: 12,
  },
  triggerActive: { borderColor: colors.primary + '80', backgroundColor: colors.surface_container },
  triggerHover: { borderColor: colors.outline_variant + '80', backgroundColor: colors.surface_container },
  iconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  triggerText: { ...typography.body_md, color: colors.on_surface, flex: 1, fontWeight: '500' },
  placeholder: { color: colors.on_surface_variant, fontWeight: '400' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  modal: {
    backgroundColor: colors.surface_container, borderRadius: 24, padding: 24, minWidth: 340, maxWidth: 380,
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.5, shadowRadius: 40, elevation: 20,
    borderWidth: 1, borderColor: colors.outline_variant + '30',
  },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  hdrCenter: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  monthTxt: { ...typography.headline_md, color: colors.on_surface },
  yearTxt: { ...typography.body_md, color: colors.on_surface_variant },
  nav: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface_container_high },
  weekRow: { flexDirection: 'row', marginBottom: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.outline_variant + '20' },
  wCell: { flex: 1, alignItems: 'center' },
  wTxt: { ...typography.label_sm, color: colors.outline, textTransform: 'uppercase', letterSpacing: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  cellSel: { backgroundColor: colors.primary },
  cellToday: { borderWidth: 1.5, borderColor: colors.primary + '60' },
  dayTxt: { ...typography.body_sm, color: colors.on_surface, fontWeight: '500' },
  dayDim: { color: colors.outline_variant, fontWeight: '400' },
  daySel: { color: colors.on_primary, fontWeight: '700' },
  dayTod: { color: colors.primary, fontWeight: '700' },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.outline_variant + '20' },
  todayBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.primary + '15' },
  todayTxt: { ...typography.label_md, color: colors.primary, fontWeight: '600' },
  cancelTxt: { ...typography.label_md, color: colors.on_surface_variant, paddingVertical: 8, paddingHorizontal: 16 },
});
