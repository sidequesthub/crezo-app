import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { loadSession } from '@/lib/phoneAuth';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Cold start: try to hydrate the phone session from AsyncStorage.
        // persistSession() inside loadSession will call supabase.auth.setSession,
        // which fires onAuthStateChange below.
        await loadSession().catch(() => null);
      }
      const { data: after } = await supabase.auth.getSession();
      if (mounted) {
        setSession(after.session);
        setLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, loading, user: session?.user ?? null };
}
