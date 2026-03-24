import { getSupabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import type { ContentSlot, Creator, Deal, Deliverable, Invoice } from '@/types';

function mapContentSlot(row: Record<string, unknown>): ContentSlot {
  return {
    id: String(row.id),
    creator_id: String(row.creator_id),
    title: String(row.title),
    platform: row.platform as ContentSlot['platform'],
    type: String(row.type),
    status: row.status as ContentSlot['status'],
    scheduled_date: String(row.scheduled_date).slice(0, 10),
    deal_id: row.deal_id ? String(row.deal_id) : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapBrand(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    creator_id: String(row.creator_id),
    name: String(row.name),
    contact_person: row.contact_person ? String(row.contact_person) : null,
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    whatsapp: row.whatsapp ? String(row.whatsapp) : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapDeliverable(row: Record<string, unknown>): Deliverable {
  return {
    id: String(row.id),
    deal_id: String(row.deal_id),
    type: String(row.type),
    platform: row.platform as Deliverable['platform'],
    due_date: row.due_date ? String(row.due_date).slice(0, 10) : null,
    status: String(row.status),
    content_slot_id: row.content_slot_id ? String(row.content_slot_id) : null,
    title: row.title ? String(row.title) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapDeal(
  row: Record<string, unknown>,
  brand?: Record<string, unknown>,
  deliverables?: Record<string, unknown>[]
): Deal {
  return {
    id: String(row.id),
    creator_id: String(row.creator_id),
    brand_id: String(row.brand_id),
    title: String(row.title),
    value_inr: Number(row.value_inr),
    status: row.status as Deal['status'],
    start_date: row.start_date ? String(row.start_date).slice(0, 10) : null,
    end_date: row.end_date ? String(row.end_date).slice(0, 10) : null,
    usage_rights: row.usage_rights ? String(row.usage_rights) : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    brand: brand ? mapBrand(brand) : undefined,
    deliverables: deliverables?.map((d) => mapDeliverable(d)),
  };
}

function mapInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: String(row.id),
    deal_id: String(row.deal_id),
    creator_id: String(row.creator_id),
    brand_id: String(row.brand_id),
    amount: Number(row.amount),
    gst_amount: Number(row.gst_amount),
    total: Number(row.total),
    status: row.status as Invoice['status'],
    sent_date: row.sent_date ? String(row.sent_date).slice(0, 10) : null,
    paid_date: row.paid_date ? String(row.paid_date).slice(0, 10) : null,
    pdf_url: row.pdf_url ? String(row.pdf_url) : null,
    gstin: row.gstin ? String(row.gstin) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function fetchCreatorProfile(creatorId: string): Promise<Creator | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.from('creators').select('*').eq('id', creatorId).maybeSingle();
  if (error || !data) return null;

  return {
    id: String(data.id),
    name: String(data.name),
    email: String(data.email),
    phone: data.phone ? String(data.phone) : null,
    gst_number: data.gst_number ? String(data.gst_number) : null,
    upi_id: data.upi_id ? String(data.upi_id) : null,
    bank_details: data.bank_details ? String(data.bank_details) : null,
    media_kit_url: data.media_kit_url ? String(data.media_kit_url) : null,
    bio: data.bio ? String(data.bio) : null,
    niche: data.niche ? String(data.niche) : null,
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
  };
}

export async function fetchContentSlots(creatorId: string): Promise<ContentSlot[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('content_slots')
    .select('*')
    .eq('creator_id', creatorId)
    .order('scheduled_date', { ascending: true });

  if (error || !data) return [];
  return data.map((row) => mapContentSlot(row as Record<string, unknown>));
}

export async function fetchDeals(creatorId: string): Promise<Deal[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: dealRows, error: dealsError } = await supabase
    .from('deals')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (dealsError || !dealRows?.length) return [];

  const brandIds = [...new Set(dealRows.map((d) => d.brand_id as string))];
  const dealIds = dealRows.map((d) => d.id as string);

  const [{ data: brandRows }, { data: deliverableRows }] = await Promise.all([
    supabase.from('brands').select('*').in('id', brandIds),
    supabase.from('deliverables').select('*').in('deal_id', dealIds),
  ]);

  const brandById = new Map((brandRows ?? []).map((b) => [String(b.id), b as Record<string, unknown>]));
  const deliverablesByDeal = new Map<string, Record<string, unknown>[]>();
  for (const del of deliverableRows ?? []) {
    const did = String((del as Record<string, unknown>).deal_id);
    if (!deliverablesByDeal.has(did)) deliverablesByDeal.set(did, []);
    deliverablesByDeal.get(did)!.push(del as Record<string, unknown>);
  }

  return dealRows.map((row) => {
    const r = row as Record<string, unknown>;
    const brand = brandById.get(String(r.brand_id));
    const dels = deliverablesByDeal.get(String(r.id));
    return mapDeal(r, brand, dels);
  });
}

export async function fetchInvoices(creatorId: string): Promise<Invoice[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((row) => mapInvoice(row as Record<string, unknown>));
}
