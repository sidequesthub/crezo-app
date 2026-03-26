/**
 * Shared Supabase client accessor.
 * Only service implementations import this — never screens or hooks.
 */

import { getSupabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase-config';

export function sb() {
  if (!isSupabaseConfigured()) throw new Error('Backend not configured');
  const c = getSupabase();
  if (!c) throw new Error('Backend client unavailable');
  return c;
}

export { isSupabaseConfigured };
