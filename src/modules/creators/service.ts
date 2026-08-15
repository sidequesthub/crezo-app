import { getSupabase } from '../../config/supabase';

export interface Creator {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  niche: string | null;
  gst_number: string | null;
  upi_id: string | null;
  pan_number: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  avatar_url: string | null;
  media_kit_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCreatorByUserId(userId: string): Promise<Creator | null> {
  const { data, error } = await getSupabase()
    .from('creators')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data as Creator;
}

export async function updateCreator(
  creatorId: string,
  updates: Partial<Omit<Creator, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<Creator> {
  const { data, error } = await getSupabase()
    .from('creators')
    .update(updates)
    .eq('id', creatorId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Creator;
}
