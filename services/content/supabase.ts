import { sb } from '@/services/shared/supabase-client';
import type { ContentSlot } from '@/types';
import type { ContentService } from './types';

function mapRow(row: Record<string, unknown>): ContentSlot {
  return {
    id: String(row.id),
    creator_id: String(row.creator_id),
    title: String(row.title),
    platform: row.platform as ContentSlot['platform'],
    type: String(row.type),
    status: row.status as ContentSlot['status'],
    scheduled_date: String(row.scheduled_date).slice(0, 10),
    scheduled_time: row.scheduled_time ? String(row.scheduled_time).slice(0, 5) : null,
    deal_id: row.deal_id ? String(row.deal_id) : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function createSupabaseContent(): ContentService {
  return {
    async list(creatorId) {
      const { data, error } = await sb()
        .from('content_slots')
        .select('*')
        .eq('creator_id', creatorId)
        .order('scheduled_date', { ascending: true });
      if (error || !data) return [];
      return data.map((r) => mapRow(r as Record<string, unknown>));
    },

    async create(data) {
      const { data: row, error } = await sb()
        .from('content_slots')
        .insert(data)
        .select('id')
        .single();
      if (error) throw error;
      return row.id as string;
    },

    async update(id, data) {
      const { error } = await sb().from('content_slots').update(data).eq('id', id);
      if (error) throw error;
    },

    async remove(id) {
      const { error } = await sb().from('content_slots').delete().eq('id', id);
      if (error) throw error;
    },
  };
}
