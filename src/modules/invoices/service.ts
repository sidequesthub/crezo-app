import { getSupabase } from '../../config/supabase';

export type InvoiceStatus = 'draft' | 'sent' | 'acknowledged' | 'paid';

export interface Invoice {
  id: string;
  creator_id: string;
  deal_id: string | null;
  brand_id: string | null;
  invoice_number: number | null;
  amount: number;
  gst_amount: number;
  total: number;
  status: InvoiceStatus;
  gstin: string | null;
  sent_date: string | null;
  paid_date: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceInput {
  creator_id: string;
  deal_id?: string;
  brand_id?: string;
  amount: number;
  gst_amount?: number;
  total: number;
  status?: InvoiceStatus;
  gstin?: string;
}

export async function listInvoices(creatorId: string): Promise<Invoice[]> {
  const { data, error } = await getSupabase()
    .from('invoices')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Invoice[];
}

export async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  const { data, error } = await getSupabase()
    .from('invoices')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Invoice;
}

export async function updateInvoice(
  id: string,
  creatorId: string,
  updates: Partial<InvoiceInput>,
): Promise<Invoice> {
  const { data, error } = await getSupabase()
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .eq('creator_id', creatorId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Invoice;
}

export async function deleteInvoice(id: string, creatorId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('creator_id', creatorId);

  if (error) throw new Error(error.message);
}
