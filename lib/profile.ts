import { supabase } from './supabase';
import { getCreatorId } from './contentSlots';

/**
 * The creator's own record. Read and written directly against Supabase under
 * RLS, like the rest of the app.
 */

export interface CreatorProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  niche: string | null;
  avatar_url: string | null;
  media_kit_url: string | null;
  gst_number: string | null;
  pan_number: string | null;
  upi_id: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  created_at: string;
}

const SELECT =
  'id, name, email, phone, bio, niche, avatar_url, media_kit_url, gst_number, pan_number, upi_id, bank_account_number, bank_ifsc, bank_name, created_at';

export async function getProfile(): Promise<CreatorProfile | null> {
  const creatorId = await getCreatorId();
  if (!creatorId) return null;

  const { data, error } = await supabase
    .from('creators')
    .select(SELECT)
    .eq('id', creatorId)
    .single();

  if (error) throw new Error(error.message);
  return data as CreatorProfile;
}

export async function updateProfile(patch: Partial<CreatorProfile>): Promise<void> {
  const creatorId = await getCreatorId();
  if (!creatorId) throw new Error('No creator profile found for this account.');

  const { error } = await supabase.from('creators').update(patch).eq('id', creatorId);
  if (error) throw new Error(error.message);
}

/** Counts shown on the profile summary. */
export async function getProfileStats(): Promise<{
  deals: number;
  content: number;
  folders: number;
}> {
  const creatorId = await getCreatorId();
  if (!creatorId) return { deals: 0, content: 0, folders: 0 };

  const count = async (table: string) => {
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', creatorId);
    return count ?? 0;
  };

  const [deals, content, folders] = await Promise.all([
    count('deals'),
    count('content_slots'),
    count('vault_folders'),
  ]);

  return { deals, content, folders };
}

/**
 * Indian bank/tax identifiers, validated to their documented shapes so a typo
 * doesn't end up on an invoice.
 */
export const validators = {
  gstin(v: string): string | null {
    if (!v.trim()) return null;
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.trim().toUpperCase())
      ? null
      : 'GSTIN should look like 27ABCDE1234F1Z5.';
  },
  pan(v: string): string | null {
    if (!v.trim()) return null;
    return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.trim().toUpperCase())
      ? null
      : 'PAN should look like ABCDE1234F.';
  },
  ifsc(v: string): string | null {
    if (!v.trim()) return null;
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.trim().toUpperCase())
      ? null
      : 'IFSC should look like HDFC0001234.';
  },
  upi(v: string): string | null {
    if (!v.trim()) return null;
    return /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(v.trim()) ? null : 'UPI ID should look like name@bank.';
  },
};
