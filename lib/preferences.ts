import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Notification preferences.
 *
 * Stored on the device: the reminders they control are scheduled locally on
 * this phone, so the preference belongs with the phone too.
 */

const KEY = 'crezo.notificationPrefs.v1';

export interface NotificationPrefs {
  deadlineReminders: boolean;
  paymentReminders: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  deadlineReminders: true,
  paymentReminders: true,
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
