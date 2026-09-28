import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { SettingsScreen, Section } from '@/components/settings/SettingsScreen';
import { ToggleRow } from '@/components/settings/Fields';
import { loadPrefs, savePrefs, DEFAULT_PREFS, type NotificationPrefs } from '@/lib/preferences';
import { syncReminders } from '@/lib/reminders';

type Permission = 'granted' | 'denied' | 'undetermined';

export default function NotificationSettingsScreen() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [permission, setPermission] = useState<Permission>('undetermined');

  const readPermission = useCallback(async () => {
    const p = await Notifications.getPermissionsAsync();
    setPermission(p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied');
  }, []);

  useEffect(() => {
    loadPrefs().then(setPrefs);
    readPermission();
    // Coming back from iOS Settings is the moment the answer may have changed.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') readPermission();
    });
    return () => sub.remove();
  }, [readPermission]);

  function set<K extends keyof NotificationPrefs>(key: K, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next)
      .then(() => syncReminders({ askPermission: value }))
      .then(() => setTimeout(readPermission, 1500))
      .catch(() => undefined);
  }

  return (
    <SettingsScreen
      title="Notifications"
      subtitle="Reminders are scheduled on this phone, so they arrive even offline."
    >
      {permission === 'denied' && (
        // iOS will not show the permission prompt a second time; the only way
        // back is the system Settings app, so say so and link straight to it.
        <Pressable style={styles.notice} onPress={() => Linking.openSettings()}>
          <Ionicons name="notifications-off-outline" size={16} color={Colors.secondary} />
          <Text style={styles.noticeText}>
            Notifications are turned off for Crezo. Tap to open Settings and allow them.
          </Text>
        </Pressable>
      )}

      <Section label="Reminders">
        <ToggleRow
          icon="alarm-outline"
          label="Deadline reminders"
          description="9am the day before a deliverable is due."
          value={prefs.deadlineReminders}
          onValueChange={(v) => set('deadlineReminders', v)}
        />
        <ToggleRow
          icon="cash-outline"
          label="Payment reminders"
          description="The day a sent invoice falls due, and again 3 days later if it’s still unpaid."
          value={prefs.paymentReminders}
          onValueChange={(v) => set('paymentReminders', v)}
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
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: Colors.secondaryFixed,
    lineHeight: 18,
  },
});
