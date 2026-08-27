import { supabase } from './supabase';
import type { ContentPlatform, ContentStatus } from '@/constants/content';
import { OPEN_DEAL_STATUSES } from '@/constants/deals';

/**
 * Content slots are read and written directly against Supabase with the anon
 * key, isolated by RLS — the same path the Home dashboard uses. The Express API
 * has an equivalent `content` module, but going direct keeps the app working
 * when the backend isn't running; only phone-OTP auth depends on it.
 */

export interface ContentSlot {
  id: string;
  creator_id: string;
  title: string;
  platform: ContentPlatform;
  type: string;
  status: ContentStatus;
  scheduled_date: string;
  scheduled_time: string | null;
  deal_id: string | null;
  notes: string | null;
  /** Joined for display; absent when the slot isn't tied to a deal. */
  deal?: { id: string; title: string; brand: { name: string } | null } | null;
}

export interface ContentSlotInput {
  title: string;
  platform: ContentPlatform;
  status: ContentStatus;
  scheduled_date: string;
  scheduled_time?: string | null;
  deal_id?: string | null;
  notes?: string | null;
  /**
   * The deliverable this slot fulfils. Not a column on content_slots — it's
   * stored on the other side, as deliverables.content_slot_id, and drives
   * `deal_id` so a slot can't be tagged to a deal its deliverable doesn't
   * belong to.
   */
  deliverable_id?: string | null;
}

const SELECT = `
  id, creator_id, title, platform, type, status, scheduled_date, scheduled_time,
  deal_id, notes,
  deal:deals(id, title, brand:brands(name))
`;

/**
 * The creator row can't change while a session is open, so resolve it once and
 * reuse it. Every screen calls this on mount and it previously cost two network
 * round trips each time.
 */
let cachedCreatorId: string | null = null;
let inFlight: Promise<string | null> | null = null;

/** Resolves the creator row for the signed-in user. Null when not signed in. */
export async function getCreatorId(): Promise<string | null> {
  if (cachedCreatorId) return cachedCreatorId;
  // Collapse concurrent callers (several screens mount at once) into one query.
  if (inFlight) return inFlight;

  inFlight = (async () => {
    // getSession() reads the persisted session locally; getUser() would make a
    // network call to re-validate a token we already trust.
    const { data: auth } = await supabase.auth.getSession();
    const userId = auth.session?.user?.id;
    if (!userId) return null;

    const { data } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', userId)
      .single();

    cachedCreatorId = data?.id ?? null;
    return cachedCreatorId;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** Must be called on sign-out so the next account doesn't inherit this one. */
export function clearCreatorCache(): void {
  cachedCreatorId = null;
  inFlight = null;
}

/**
 * Slots overlapping an inclusive date range, ordered for display.
 * Dates are `YYYY-MM-DD`.
 */
export async function listSlotsInRange(
  creatorId: string,
  fromDate: string,
  toDate: string,
): Promise<ContentSlot[]> {
  const { data, error } = await supabase
    .from('content_slots')
    .select(SELECT)
    .eq('creator_id', creatorId)
    .gte('scheduled_date', fromDate)
    .lte('scheduled_date', toDate)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true, nullsFirst: true });

  if (error) throw new Error(error.message);
  return normalise(data);
}

export async function createSlot(
  creatorId: string,
  input: ContentSlotInput,
): Promise<ContentSlot> {
  const { deliverable_id, ...columns } = input;

  const { data, error } = await supabase
    .from('content_slots')
    .insert({ ...columns, creator_id: creatorId, type: input.platform })
    .select(SELECT)
    .single();

  if (error) throw new Error(error.message);

  const slot = normalise([data])[0];
  if (deliverable_id) await linkDeliverable(deliverable_id, slot.id);
  return slot;
}

export async function updateSlot(
  id: string,
  patch: Partial<ContentSlotInput>,
): Promise<void> {
  const { deliverable_id, ...columns } = patch;

  const { error } = await supabase.from('content_slots').update(columns).eq('id', id);
  if (error) throw new Error(error.message);

  if (deliverable_id !== undefined) {
    // Clear any previous mapping before establishing the new one, so a slot
    // never ends up claimed by two deliverables.
    await supabase.from('deliverables').update({ content_slot_id: null }).eq('content_slot_id', id);
    if (deliverable_id) await linkDeliverable(deliverable_id, id);
  }
}

async function linkDeliverable(deliverableId: string, slotId: string): Promise<void> {
  const { error } = await supabase
    .from('deliverables')
    .update({ content_slot_id: slotId })
    .eq('id', deliverableId);

  if (error) throw new Error(error.message);
}

/** The deliverable currently mapped to a slot, if any. */
export async function getLinkedDeliverable(slotId: string): Promise<string | null> {
  const { data } = await supabase
    .from('deliverables')
    .select('id')
    .eq('content_slot_id', slotId)
    .maybeSingle();

  return data?.id ? String(data.id) : null;
}

export async function deleteSlot(id: string): Promise<void> {
  const { error } = await supabase.from('content_slots').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Deals available to tag a slot against, newest first.
 * Closed (paid) deals are excluded — you don't plan new content against work
 * that's already been delivered and settled.
 */
export async function listDealOptions(
  creatorId: string,
): Promise<{ id: string; title: string; brandName: string | null }[]> {
  const { data, error } = await supabase
    .from('deals')
    .select('id, title, brand:brands(name)')
    .eq('creator_id', creatorId)
    .in('status', OPEN_DEAL_STATUSES)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((d: Record<string, unknown>) => {
    const brand = firstOf(d.brand) as { name?: string } | null;
    return {
      id: String(d.id),
      title: String(d.title),
      brandName: brand?.name ?? null,
    };
  });
}

/**
 * PostgREST returns embedded relations as either an object or a single-element
 * array depending on how it infers cardinality, so collapse both to an object.
 */
function firstOf(value: unknown): unknown {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function normalise(rows: unknown[] | null): ContentSlot[] {
  return (rows ?? []).map((raw) => {
    const r = raw as Record<string, unknown>;
    const deal = firstOf(r.deal) as Record<string, unknown> | null;
    const brand = deal ? (firstOf(deal.brand) as { name?: string } | null) : null;

    return {
      ...(r as unknown as ContentSlot),
      deal: deal
        ? {
            id: String(deal.id),
            title: String(deal.title),
            brand: brand?.name ? { name: brand.name } : null,
          }
        : null,
    };
  });
}
