import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { SettingsScreen, Section } from '@/components/settings/SettingsScreen';
import { ToggleRow } from '@/components/settings/Fields';
import { loadPrefs, savePrefs, DEFAULT_PREFS, type NotificationPrefs } from '@/lib/preferences';

export default function NotificationSettingsScreen() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    loadPrefs().then(setPrefs);
  }, []);

  function set<K extends keyof NotificationPrefs>(key: K, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next).catch(() => undefined);
  }

  return (
    <SettingsScreen
      title="Notifications"
      subtitle="Choose what Crezo should nudge you about."
    >
      <View style={styles.notice}>
        <Ionicons name="information-circle" size={16} color={Colors.secondary} />
        <Text style={styles.noticeText}>
          Your choices are saved, but Crezo can’t deliver push notifications yet — that
          needs a standalone build rather than Expo Go. These settings will apply the
          moment it ships.
        </Text>
      </View>

      <Section label="Work">
        <ToggleRow
          icon="alarm-outline"
          label="Deadline reminders"
          description="The day before a deliverable is due."
          value={prefs.deadlineReminders}
          onValueChange={(v) => set('deadlineReminders', v)}
        />
        <ToggleRow
          icon="cash-outline"
          label="Payment reminders"
          description="When an invoice goes unpaid past its due date."
          value={prefs.paymentReminders}
          onValueChange={(v) => set('paymentReminders', v)}
        />
        <ToggleRow
          icon="briefcase-outline"
          label="Deal updates"
          description="When a deal changes stage."
          value={prefs.dealUpdates}
          onValueChange={(v) => set('dealUpdates', v)}
        />
      </Section>

      <Section label="Summaries">
        <ToggleRow
          icon="calendar-outline"
          label="Weekly digest"
          description="Monday morning: what’s planned, what’s owed."
          value={prefs.weeklyDigest}
          onValueChange={(v) => set('weeklyDigest', v)}
        />
      </Section>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(254, 148, 0, 0.12)',
  },
  noticeText: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: Colors.secondaryFixed,
    lineHeight: 18,
  },
});
