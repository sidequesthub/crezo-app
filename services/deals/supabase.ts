import { sb } from '@/services/shared/supabase-client';
import type { Deal, Deliverable } from '@/types';
import type { DealService } from './types';

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
    brand_id: row.brand_id ? String(row.brand_id) : null,
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

export function createSupabaseDeals(): DealService {
  return {
    async list(creatorId) {
      const supabase = sb();
      const { data: rows, error } = await supabase
        .from('deals')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error || !rows?.length) return [];

      const brandIds = [...new Set(rows.map((d) => d.brand_id as string).filter(Boolean))];
      const dealIds = rows.map((d) => d.id as string);

      const [{ data: brandRows }, { data: delRows }] = await Promise.all([
        supabase.from('brands').select('*').in('id', brandIds),
        supabase.from('deliverables').select('*').in('deal_id', dealIds),
      ]);

      const brandById = new Map(
        (brandRows ?? []).map((b) => [String(b.id), b as Record<string, unknown>])
      );
      const delsByDeal = new Map<string, Record<string, unknown>[]>();
      for (const del of delRows ?? []) {
        const did = String((del as Record<string, unknown>).deal_id);
        if (!delsByDeal.has(did)) delsByDeal.set(did, []);
        delsByDeal.get(did)!.push(del as Record<string, unknown>);
      }

      return rows.map((row) => {
        const r = row as Record<string, unknown>;
        const bid = r.brand_id ? String(r.brand_id) : undefined;
        return mapDeal(r, bid ? brandById.get(bid) : undefined, delsByDeal.get(String(r.id)));
      });
    },

    async create(data) {
      const { data: row, error } = await sb().from('deals').insert(data).select('id').single();
      if (error) throw error;
      return row.id as string;
    },

    async update(id, data) {
      const { error } = await sb().from('deals').update(data).eq('id', id);
      if (error) throw error;
    },

    async remove(id) {
      const { error } = await sb().from('deals').delete().eq('id', id);
      if (error) throw error;
    },

    async listBrands(creatorId) {
      const { data, error } = await sb()
        .from('brands')
        .select('id, name')
        .eq('creator_id', creatorId)
        .order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },

    async createBrand(data) {
      const { data: row, error } = await sb().from('brands').insert(data).select('id').single();
      if (error) throw error;
      return row.id as string;
    },

    async createDeliverable(data) {
      const { data: row, error } = await sb()
        .from('deliverables')
        .insert({ status: 'pending', ...data })
        .select('id')
        .single();
      if (error) throw error;
      return row.id as string;
    },

    async updateDeliverable(id, data) {
      const { error } = await sb().from('deliverables').update(data).eq('id', id);
      if (error) throw error;
    },

    async removeDeliverable(id) {
      const { error } = await sb().from('deliverables').delete().eq('id', id);
      if (error) throw error;
    },
  };
}
