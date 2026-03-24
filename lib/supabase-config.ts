import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { supabaseUrl?: string; supabaseAnonKey?: string } | undefined;

export const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra?.supabaseUrl ?? '';

export const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra?.supabaseAnonKey ?? '';

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
