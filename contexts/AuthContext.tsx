import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createURL } from 'expo-linking';

import { auth } from '@/services';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  supabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  sendOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = auth.isConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    auth.getSession().then((s) => {
      setSession(s as Session | null);
      setLoading(false);
    });

    const { unsubscribe } = auth.onAuthStateChange((_event, s) => {
      setSession(s as Session | null);
    });

    return unsubscribe;
  }, [configured]);

  const signIn = useCallback(
    (email: string, password: string) => auth.signIn(email, password),
    []
  );
  const signUp = useCallback(
    (email: string, password: string) => auth.signUp(email, password),
    []
  );
  const signInWithGoogle = useCallback(async () => {
    return auth.signInWithGoogle(createURL('/(tabs)'));
  }, []);
  const sendOtp = useCallback((phone: string) => auth.sendOtp(phone), []);
  const verifyOtp = useCallback(
    (phone: string, token: string) => auth.verifyOtp(phone, token),
    []
  );
  const signOut = useCallback(() => auth.signOut(), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      supabaseConfigured: configured,
      signIn,
      signUp,
      signInWithGoogle,
      sendOtp,
      verifyOtp,
      signOut,
    }),
    [session, loading, configured, signIn, signUp, signInWithGoogle, sendOtp, verifyOtp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
