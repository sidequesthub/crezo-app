import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, BACKEND_URL } from './supabase';

const STORAGE_KEY = 'crezo.phoneSession.v1';

export interface PhoneSession {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  expires_at: number;
  user: { id: string; phone: string };
}

async function api<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || `Request failed (${res.status})`);
  }
  return json as T;
}

export async function sendOtp(phone: string): Promise<void> {
  await api('/api/auth/otp/send', { phone });
}

export async function resendOtp(phone: string, via: 'text' | 'voice' = 'text'): Promise<void> {
  await api('/api/auth/otp/resend', { phone, via });
}

export async function verifyOtp(phone: string, otp: string): Promise<PhoneSession> {
  const session = await api<PhoneSession>('/api/auth/otp/verify', { phone, otp });
  await persistSession(session);
  return session;
}

export async function persistSession(session: PhoneSession): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  // Hydrate Supabase client so direct Supabase calls (Storage, Realtime) work too.
  await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}

export async function loadSession(): Promise<PhoneSession | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as PhoneSession;
    if (session.expires_at * 1000 < Date.now()) {
      const refreshed = await refresh(session.refresh_token).catch(() => null);
      if (!refreshed) {
        await clearSession();
        return null;
      }
      return refreshed;
    }
    return session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

async function refresh(refresh_token: string): Promise<PhoneSession> {
  const session = await api<PhoneSession>('/api/auth/refresh', { refresh_token });
  await persistSession(session);
  return session;
}
