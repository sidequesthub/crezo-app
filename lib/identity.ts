import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';

/**
 * The signed-in creator's display name and photo, persisted on the device.
 *
 * Read at launch (before the splash hides) so the header renders the real
 * photo on its first frame instead of an initial, then a Google photo, then
 * the Crezo one. Screens refresh it from their own queries; `setIdentity`
 * ignores no-op writes, so an unchanged photo never re-renders or re-downloads.
 */
export interface Identity {
  name: string;
  avatarUrl: string | null;
}

const KEY = 'crezo.identity.v1';

let current: Identity | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export async function hydrateIdentity(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    current = raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    current = null;
  }
  emit();
}

export function setIdentity(next: Identity): void {
  if (current && current.name === next.name && current.avatarUrl === next.avatarUrl) return;
  current = next;
  if (next.avatarUrl) Image.prefetch(next.avatarUrl, 'memory-disk').catch(() => undefined);
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  emit();
}

/** On sign-out: the next account must not see this one's name or photo. */
export function clearIdentity(): void {
  if (!current) return;
  current = null;
  AsyncStorage.removeItem(KEY).catch(() => undefined);
  emit();
}

export function useIdentity(): Identity | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
