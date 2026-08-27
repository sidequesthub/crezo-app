import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Notification preferences.
 *
 * Stored on the device rather than the database: they're per-device settings,
 * and there's no push infrastructure yet to consume them server-side. When
 * delivery is built these move to the creator record so they follow the account.
 */

const KEY = 'crezo.notificationPrefs.v1';

export interface NotificationPrefs {
  deadlineReminders: boolean;
  paymentReminders: boolean;
  dealUpdates: boolean;
  weeklyDigest: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  deadlineReminders: true,
  paymentReminders: true,
  dealUpdates: false,
  weeklyDigest: false,
};

export async function loadPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotificationPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function savePrefs(prefs: NotificationPrefs): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
}
