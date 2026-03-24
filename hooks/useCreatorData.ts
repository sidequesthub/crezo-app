import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import {
  fetchContentSlots,
  fetchCreatorProfile,
  fetchDeals,
  fetchInvoices,
} from '@/lib/queries';
import {
  mockContentSlots,
  mockCreator,
  mockDeals,
  mockInvoices,
} from '@/lib/mock-data';
import type { ContentSlot, Creator, Deal, Invoice } from '@/types';

function creatorFromUser(user: User): Creator {
  const now = new Date().toISOString();
  return {
    id: user.id,
    name: (user.user_metadata?.full_name as string) ?? user.email?.split('@')[0] ?? 'Creator',
    email: user.email ?? '',
    phone: null,
    gst_number: null,
    upi_id: null,
    bank_details: null,
    media_kit_url: null,
    bio: null,
    niche: null,
    created_at: now,
    updated_at: now,
  };
}

export function useCreatorData() {
  const { user, supabaseConfigured } = useAuth();
  const creatorId = user?.id ?? null;

  const [creator, setCreator] = useState<Creator | null>(null);
  const [contentSlots, setContentSlots] = useState<ContentSlot[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabaseConfigured || !creatorId) {
      setCreator({
        id: mockCreator.id,
        name: mockCreator.name,
        email: mockCreator.email,
        phone: null,
        gst_number: null,
        upi_id: null,
        bank_details: null,
        media_kit_url: mockCreator.media_kit_url,
        bio: mockCreator.bio ?? null,
        niche: mockCreator.niche ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setContentSlots(mockContentSlots);
      setDeals(mockDeals);
      setInvoices(mockInvoices);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [profile, slots, d, inv] = await Promise.all([
        fetchCreatorProfile(creatorId),
        fetchContentSlots(creatorId),
        fetchDeals(creatorId),
        fetchInvoices(creatorId),
      ]);

      setCreator(profile ?? creatorFromUser(user!));
      setContentSlots(slots);
      setDeals(d);
      setInvoices(inv);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
      setCreator(creatorFromUser(user!));
    } finally {
      setLoading(false);
    }
  }, [creatorId, supabaseConfigured, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const displayCreator = useMemo(() => {
    if (creator) return creator;
    if (user && supabaseConfigured) return creatorFromUser(user);
    return null;
  }, [creator, user, supabaseConfigured]);

  return {
    creator: displayCreator,
    contentSlots,
    deals,
    invoices,
    loading,
    error,
    refresh,
    usingMockData: !supabaseConfigured || !creatorId,
  };
}
