import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabase-config';

const storage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export function createSupabaseClient() {
  if (!isSupabaseConfigured() || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: typeof window !== 'undefined',
      flowType: 'pkce',
    },
  });
}

let client: ReturnType<typeof createSupabaseClient> | null = null;

export function getSupabase() {
  if (!client && isSupabaseConfigured()) {
    client = createSupabaseClient();
  }
  return client;
}
