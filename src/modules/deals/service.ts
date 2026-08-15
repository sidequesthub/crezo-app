import { getSupabase } from '../../config/supabase';

export type DealStatus = 'pitched' | 'negotiating' | 'confirmed' | 'in_progress' | 'delivered' | 'paid';

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
  created_at: string;
  updated_at: string;
}

export interface DealInput {
  creator_id: string;
  brand_id?: string | null;
  title: string;
  value_inr: number;
  status?: DealStatus;
  start_date?: string;
  end_date?: string;
  usage_rights?: string;
  notes?: string;
}

export async function listDeals(creatorId: string): Promise<Deal[]> {
  const { data, error } = await getSupabase()
    .from('deals')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Deal[];
}

export async function createDeal(input: DealInput): Promise<Deal> {
  const { data, error } = await getSupabase()
    .from('deals')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Deal;
}

export async function updateDeal(id: string, creatorId: string, updates: Partial<DealInput>): Promise<Deal> {
  const { data, error } = await getSupabase()
    .from('deals')
    .update(updates)
    .eq('id', id)
    .eq('creator_id', creatorId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Deal;
}

export async function deleteDeal(id: string, creatorId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('deals')
    .delete()
    .eq('id', id)
    .eq('creator_id', creatorId);

  if (error) throw new Error(error.message);
}

export interface Brand {
  id: string;
  creator_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  notes: string | null;
}

export async function listBrands(creatorId: string): Promise<Brand[]> {
  const { data, error } = await getSupabase()
    .from('brands')
    .select('*')
    .eq('creator_id', creatorId)
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as Brand[];
}

export async function createBrand(input: Omit<Brand, 'id'>): Promise<Brand> {
  const { data, error } = await getSupabase()
    .from('brands')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Brand;
}
