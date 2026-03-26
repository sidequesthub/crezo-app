import { sb } from '@/services/shared/supabase-client';
import type { Invoice } from '@/types';
import type { InvoiceService } from './types';

function mapRow(row: Record<string, unknown>): Invoice {
  return {
    id: String(row.id),
    invoice_number: Number(row.invoice_number) || 0,
    deal_id: String(row.deal_id),
    creator_id: String(row.creator_id),
    brand_id: row.brand_id ? String(row.brand_id) : null,
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

export function createSupabaseInvoices(): InvoiceService {
  return {
    async list(creatorId) {
      const { data, error } = await sb()
        .from('invoices')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      if (error || !data) return [];
      return data.map((r) => mapRow(r as Record<string, unknown>));
    },

    async create(data) {
      const { data: row, error } = await sb().from('invoices').insert(data).select('id').single();
      if (error) throw error;
      return row.id as string;
    },

    async update(id, data) {
      const { error } = await sb().from('invoices').update(data).eq('id', id);
      if (error) throw error;
    },

    async remove(id) {
      const { error } = await sb().from('invoices').delete().eq('id', id);
      if (error) throw error;
    },
  };
}
