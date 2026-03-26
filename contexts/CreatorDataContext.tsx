import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';

import { useAuth } from '@/contexts/AuthContext';
import { creators, deals, content, invoices } from '@/services';
import type { ContentSlot, Creator, Deal, Invoice } from '@/types';

interface CreatorDataState {
  creator: Creator | null;
  contentSlots: ContentSlot[];
  deals: Deal[];
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CreatorDataCtx = createContext<CreatorDataState | null>(null);

function creatorFromUser(user: User): Creator {
  const now = new Date().toISOString();
  return {
    id: user.id,
    name:
      (user.user_metadata?.full_name as string) ??
      user.email?.split('@')[0] ??
      'Creator',
    email: user.email ?? '',
    phone: null,
    gst_number: null,
    pan_number: null,
    upi_id: null,
    bank_account_number: null,
    bank_ifsc: null,
    bank_name: null,
    media_kit_url: null,
    avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
    bio: null,
    niche: null,
    created_at: now,
    updated_at: now,
  };
}

export function CreatorDataProvider({ children }: { children: ReactNode }) {
  const { user, supabaseConfigured } = useAuth();
  const authUserId = user?.id ?? null;

  const [creator, setCreator] = useState<Creator | null>(null);
  const [contentSlots, setContentSlots] = useState<ContentSlot[]>([]);
  const [dealList, setDealList] = useState<Deal[]>([]);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabaseConfigured || !authUserId) {
      setCreator(null);
      setContentSlots([]);
      setDealList([]);
      setInvoiceList([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const profile = await creators.fetch(authUserId);
      const creatorRow = profile ?? creatorFromUser(user!);
      setCreator(creatorRow);

      const cid = creatorRow.id;
      const [slots, d, inv] = await Promise.all([
        content.list(cid),
        deals.list(cid),
        invoices.list(cid),
      ]);

      setContentSlots(slots);
      setDealList(d);
      setInvoiceList(inv);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
      setCreator(creatorFromUser(user!));
    } finally {
      setLoading(false);
    }
  }, [authUserId, supabaseConfigured, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const displayCreator = useMemo(() => {
    if (creator) return creator;
    if (user && supabaseConfigured) return creatorFromUser(user);
    return null;
  }, [creator, user, supabaseConfigured]);

  const value = useMemo<CreatorDataState>(
    () => ({
      creator: displayCreator,
      contentSlots,
      deals: dealList,
      invoices: invoiceList,
      loading,
      error,
      refresh,
    }),
    [displayCreator, contentSlots, dealList, invoiceList, loading, error, refresh]
  );

  return (
    <CreatorDataCtx.Provider value={value}>
      {children}
    </CreatorDataCtx.Provider>
  );
}

export function useCreatorData(): CreatorDataState {
  const ctx = useContext(CreatorDataCtx);
  if (!ctx) throw new Error('useCreatorData must be used within CreatorDataProvider');
  return ctx;
}
