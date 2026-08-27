import { supabase } from './supabase';
import { getCreatorId } from './contentSlots';
import { calculateTax, type LineItem } from '@/constants/gst';

export type InvoiceStatus = 'draft' | 'sent' | 'acknowledged' | 'paid';

export const INVOICE_STATUS_ORDER: InvoiceStatus[] = ['draft', 'sent', 'acknowledged', 'paid'];

export interface Invoice {
  id: string;
  creator_id: string;
  deal_id: string | null;
  brand_id: string | null;
  invoice_number: number | null;
  invoice_date: string;
  due_date: string | null;
  line_items: LineItem[];
  amount: number;
  gst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  gst_rate: number;
  total: number;
  status: InvoiceStatus;
  gstin: string | null;
  place_of_supply: string | null;
  sac_code: string | null;
  notes: string | null;
  sent_date: string | null;
  paid_date: string | null;
  brand: {
    id: string;
    name: string;
    gstin: string | null;
    address: string | null;
    state_code: string | null;
    email: string | null;
  } | null;
  deal: { id: string; title: string } | null;
}

export interface InvoiceInput {
  deal_id?: string | null;
  brand_id?: string | null;
  invoice_date: string;
  due_date?: string | null;
  line_items: LineItem[];
  applyGst: boolean;
  place_of_supply?: string | null;
  sac_code?: string | null;
  notes?: string | null;
  status?: InvoiceStatus;
}

const SELECT = `
  id, creator_id, deal_id, brand_id, invoice_number, invoice_date, due_date,
  line_items, amount, gst_amount, cgst_amount, sgst_amount, igst_amount,
  gst_rate, total, status, gstin, place_of_supply, sac_code, notes,
  sent_date, paid_date,
  brand:brands(id, name, gstin, address, state_code, email),
  deal:deals(id, title)
`;

export async function listInvoices(creatorId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select(SELECT)
    .eq('creator_id', creatorId)
    .order('invoice_date', { ascending: false })
    .order('invoice_number', { ascending: false });

  if (error) throw new Error(error.message);
  return normalise(data);
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase.from('invoices').select(SELECT).eq('id', id).single();
  if (error) throw new Error(error.message);
  return data ? normalise([data])[0] : null;
}

/**
 * Totals are computed here and stored, rather than derived on render — an
 * issued invoice must not change if a tax rate or a party's state is edited
 * later.
 */
function totalsFor(input: InvoiceInput, supplierStateCode: string | null) {
  return calculateTax(input.line_items, {
    applyGst: input.applyGst,
    supplierStateCode,
    placeOfSupplyCode: input.place_of_supply ?? null,
  });
}

export async function createInvoice(
  creatorId: string,
  input: InvoiceInput,
  supplierStateCode: string | null,
  supplierGstin: string | null,
): Promise<Invoice> {
  const t = totalsFor(input, supplierStateCode);

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      creator_id: creatorId,
      deal_id: input.deal_id ?? null,
      brand_id: input.brand_id ?? null,
      invoice_date: input.invoice_date,
      due_date: input.due_date ?? null,
      line_items: input.line_items,
      amount: t.subtotal,
      gst_amount: t.totalTax,
      cgst_amount: t.cgst,
      sgst_amount: t.sgst,
      igst_amount: t.igst,
      gst_rate: input.applyGst ? 18 : 0,
      total: t.total,
      status: input.status ?? 'draft',
      gstin: supplierGstin,
      place_of_supply: input.place_of_supply ?? null,
      sac_code: input.sac_code ?? '998363',
      notes: input.notes ?? null,
    })
    .select(SELECT)
    .single();

  if (error) throw new Error(error.message);
  return normalise([data])[0];
}

export async function updateInvoice(
  id: string,
  input: InvoiceInput,
  supplierStateCode: string | null,
): Promise<void> {
  const t = totalsFor(input, supplierStateCode);

  const { error } = await supabase
    .from('invoices')
    .update({
      deal_id: input.deal_id ?? null,
      brand_id: input.brand_id ?? null,
      invoice_date: input.invoice_date,
      due_date: input.due_date ?? null,
      line_items: input.line_items,
      amount: t.subtotal,
      gst_amount: t.totalTax,
      cgst_amount: t.cgst,
      sgst_amount: t.sgst,
      igst_amount: t.igst,
      gst_rate: input.applyGst ? 18 : 0,
      total: t.total,
      place_of_supply: input.place_of_supply ?? null,
      sac_code: input.sac_code ?? '998363',
      notes: input.notes ?? null,
      ...(input.status ? { status: input.status } : {}),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/** Status changes also stamp the matching date, which Home's revenue reads. */
export async function setInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`;

  const patch: Record<string, unknown> = { status };
  if (status === 'sent') patch.sent_date = iso;
  if (status === 'paid') patch.paid_date = iso;

  const { error } = await supabase.from('invoices').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Brands available as invoice recipients, with the fields the invoice needs. */
export async function listBrandOptions(creatorId: string) {
  const { data, error } = await supabase
    .from('brands')
    .select('id, name, gstin, address, state_code, email')
    .eq('creator_id', creatorId)
    .order('name');

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateBrand(
  id: string,
  patch: { gstin?: string | null; address?: string | null; state_code?: string | null },
): Promise<void> {
  const { error } = await supabase.from('brands').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Seeds line items from a deal's deliverables, so invoicing a deal is one tap. */
export async function lineItemsFromDeal(dealId: string): Promise<LineItem[]> {
  const { data: deal } = await supabase
    .from('deals')
    .select('title, value_inr, deliverables(title, platform)')
    .eq('id', dealId)
    .single();

  if (!deal) return [];

  const deliverables = (deal.deliverables ?? []) as { title: string | null }[];
  const value = Number(deal.value_inr ?? 0);

  if (deliverables.length === 0) {
    return [{ description: String(deal.title), quantity: 1, rate: value }];
  }

  // Split the deal value evenly, absorbing the remainder in the first line so
  // the items always sum to the agreed figure.
  const each = Math.floor(value / deliverables.length);
  const remainder = value - each * deliverables.length;

  return deliverables.map((d, i) => ({
    description: d.title ?? 'Deliverable',
    quantity: 1,
    rate: i === 0 ? each + remainder : each,
  }));
}

function firstOf(value: unknown): unknown {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function normalise(rows: unknown[] | null): Invoice[] {
  return (rows ?? []).map((raw) => {
    const r = raw as Record<string, unknown>;
    const brand = firstOf(r.brand) as Record<string, unknown> | null;
    const deal = firstOf(r.deal) as Record<string, unknown> | null;

    return {
      ...(r as unknown as Invoice),
      amount: Number(r.amount ?? 0),
      gst_amount: Number(r.gst_amount ?? 0),
      cgst_amount: Number(r.cgst_amount ?? 0),
      sgst_amount: Number(r.sgst_amount ?? 0),
      igst_amount: Number(r.igst_amount ?? 0),
      gst_rate: Number(r.gst_rate ?? 0),
      total: Number(r.total ?? 0),
      line_items: (r.line_items as LineItem[]) ?? [],
      brand: brand
        ? {
            id: String(brand.id),
            name: String(brand.name),
            gstin: (brand.gstin as string) ?? null,
            address: (brand.address as string) ?? null,
            state_code: (brand.state_code as string) ?? null,
            email: (brand.email as string) ?? null,
          }
        : null,
      deal: deal ? { id: String(deal.id), title: String(deal.title) } : null,
    };
  });
}

export { getCreatorId };
