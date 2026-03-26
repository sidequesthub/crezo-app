import { createURL } from 'expo-linking';

import { getSupabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import type { AuthService } from './types';

export function createSupabaseAuth(): AuthService {
  function client() {
    const c = getSupabase();
    if (!c) throw new Error('Backend not configured');
    return c;
  }

  return {
    isConfigured: () => isSupabaseConfigured(),

    async signUp(email, password) {
      const { error } = await client().auth.signUp({ email, password });
      return { error: error ? new Error(error.message) : null };
    },

    async signIn(email, password) {
      const { error } = await client().auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    },

    async signInWithGoogle(redirectTo) {
      const url = redirectTo || createURL('/(tabs)');
      const { error } = await client().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: url },
      });
      return { error: error ? new Error(error.message) : null };
    },

    async sendOtp(phone) {
      const { error } = await client().auth.signInWithOtp({ phone });
      return { error: error ? new Error(error.message) : null };
    },

    async verifyOtp(phone, token) {
      const { error } = await client().auth.verifyOtp({ phone, token, type: 'sms' });
      return { error: error ? new Error(error.message) : null };
    },

    async signOut() {
      await client().auth.signOut();
    },

    async getSession() {
      const { data } = await client().auth.getSession();
      if (!data.session) return null;
      const u = data.session.user;
      return { user: { id: u.id, email: u.email, user_metadata: u.user_metadata } };
    },

    onAuthStateChange(callback) {
      const {
        data: { subscription },
      } = client().auth.onAuthStateChange((event, session) => {
        callback(
          event,
          session
            ? { user: { id: session.user.id, email: session.user.email, user_metadata: session.user.user_metadata } }
            : null
        );
      });
      return { unsubscribe: () => subscription.unsubscribe() };
    },
  };
}
