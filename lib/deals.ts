import { supabase } from './supabase';
import { CLOSED_DEAL_STATUSES, OPEN_DEAL_STATUSES, type DealStatus } from '@/constants/deals';

/** Direct-Supabase access, isolated by RLS — see the note in lib/contentSlots.ts. */

export interface Brand {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
}

export interface Deliverable {
  id: string;
  deal_id: string;
  title: string | null;
  platform: string;
  due_date: string | null;
  status: string;
}

export interface Deal {
  id: string;
  creator_id: string;
  brand_id: string | null;
  title: string;
  value_inr: number;
  status: DealStatus;
  start_date: string | null;
  end_date: string | null;
  usage_rights: string | null;
  notes: string | null;
  brand: { id: string; name: string } | null;
  deliverables: Deliverable[];
}

export interface DealInput {
  title: string;
  brand_id?: string | null;
  value_inr: number;
  status: DealStatus;
  start_date?: string | null;
  end_date?: string | null;
  usage_rights?: string | null;
  notes?: string | null;
}

const SELECT = `
  id, creator_id, brand_id, title, value_inr, status, start_date, end_date,
  usage_rights, notes,
  brand:brands(id, name),
  deliverables(id, deal_id, title, platform, due_date, status)
`;

export async function listDeals(creatorId: string): Promise<Deal[]> {
  const { data, error } = await supabase
    .from('deals')
    .select(SELECT)
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return normalise(data);
}

export async function getDeal(id: string): Promise<Deal | null> {
  const { data, error } = await supabase.from('deals').select(SELECT).eq('id', id).single();
  if (error) throw new Error(error.message);
  return data ? normalise([data])[0] : null;
}

export async function createDeal(creatorId: string, input: DealInput): Promise<Deal> {
  const { data, error } = await supabase
    .from('deals')
    .insert({ ...input, creator_id: creatorId })
    .select(SELECT)
    .single();

  if (error) throw new Error(error.message);
  return normalise([data])[0];
}

export async function updateDeal(id: string, patch: Partial<DealInput>): Promise<void> {
  const { error } = await supabase.from('deals').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await supabase.from('deals').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* Brands ------------------------------------------------------------------ */

export async function listBrands(creatorId: string): Promise<Brand[]> {
  const { data, error } = await supabase
    .from('brands')
    .select('id, name, contact_person, email, phone, whatsapp')
    .eq('creator_id', creatorId)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Brand[];
}

/** Finds a brand by name for this creator, creating it if absent. */
export async function findOrCreateBrand(creatorId: string, name: string): Promise<string> {
  const trimmed = name.trim();

  const { data: existing } = await supabase
    .from('brands')
    .select('id')
    .eq('creator_id', creatorId)
    .ilike('name', trimmed)
    .maybeSingle();

  if (existing?.id) return String(existing.id);

  const { data, error } = await supabase
    .from('brands')
    .insert({ creator_id: creatorId, name: trimmed })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return String(data.id);
}

/* Deliverables ------------------------------------------------------------ */

export async function addDeliverable(
  dealId: string,
  title: string,
  platform = 'ig_reel',
  dueDate: string | null = null,
): Promise<Deliverable> {
  const { data, error } = await supabase
    .from('deliverables')
    .insert({ deal_id: dealId, title, platform, due_date: dueDate, status: 'pending' })
    .select('id, deal_id, title, platform, due_date, status')
    .single();

  if (error) throw new Error(error.message);
  return data as Deliverable;
}

export async function setDeliverableStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from('deliverables').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateDeliverable(
  id: string,
  patch: Partial<Pick<Deliverable, 'title' | 'platform' | 'due_date' | 'status'>> & {
    content_slot_id?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('deliverables').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Deliverables on open deals, for mapping a calendar slot to the specific piece
 * of work it satisfies. Closed (paid) deals are excluded.
 */
export async function listDeliverableOptions(creatorId: string): Promise<
  {
    id: string;
    title: string;
    platform: string;
    dueDate: string | null;
    dealId: string;
    dealLabel: string;
  }[]
> {
  const { data, error } = await supabase
    .from('deliverables')
    .select('id, title, platform, due_date, deal:deals!inner(id, title, status, creator_id, brand:brands(name))')
    .eq('deal.creator_id', creatorId)
    .in('deal.status', OPEN_DEAL_STATUSES)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((raw) => {
    const r = raw as Record<string, unknown>;
    const deal = firstOf(r.deal) as Record<string, unknown>;
    const brand = firstOf(deal?.brand) as { name?: string } | null;
    return {
      id: String(r.id),
      title: String(r.title ?? 'Untitled'),
      platform: String(r.platform ?? 'other'),
      dueDate: (r.due_date as string) ?? null,
      dealId: String(deal?.id),
      dealLabel: brand?.name ?? String(deal?.title ?? 'Deal'),
    };
  });
}

export async function deleteDeliverable(id: string): Promise<void> {
  const { error } = await supabase.from('deliverables').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* Helpers ----------------------------------------------------------------- */

/** Done vs total deliverables for a deal. */
export function progressOf(deal: Deal): { done: number; total: number; ratio: number } {
  const total = deal.deliverables?.length ?? 0;
  const done = (deal.deliverables ?? []).filter((d) => d.status === 'done').length;
  return { done, total, ratio: total === 0 ? 0 : done / total };
}

export function isClosed(deal: Deal): boolean {
  return CLOSED_DEAL_STATUSES.includes(deal.status);
}

function firstOf(value: unknown): unknown {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function normalise(rows: unknown[] | null): Deal[] {
  return (rows ?? []).map((raw) => {
    const r = raw as Record<string, unknown>;
    const brand = firstOf(r.brand) as { id?: string; name?: string } | null;
    return {
      ...(r as unknown as Deal),
      value_inr: Number(r.value_inr ?? 0),
      brand: brand?.name ? { id: String(brand.id), name: brand.name } : null,
      deliverables: (r.deliverables as Deliverable[]) ?? [],
    };
  });
}
