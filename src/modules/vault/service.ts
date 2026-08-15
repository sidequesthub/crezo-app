import { getSupabase } from '../../config/supabase';

export type DeliverableStatus = 'raw' | 'edited' | 'final' | 'submitted' | 'approved';
export type ContentPlatform = 'ig_reel' | 'yt_video' | 'yt_short' | 'story' | 'post' | 'other';

export interface AssetMeta {
  id: string;
  creator_id: string;
  deal_id: string | null;
  device_asset_id: string;
  device_album_name: string | null;
  platform: ContentPlatform;
  deliverable_status: DeliverableStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface AssetMetaInput {
  creator_id: string;
  deal_id?: string;
  device_asset_id: string;
  device_album_name?: string;
  platform: ContentPlatform;
  deliverable_status?: DeliverableStatus;
  tags?: string[];
}

export async function listAssetsByDeal(creatorId: string, dealId: string): Promise<AssetMeta[]> {
  const { data, error } = await getSupabase()
    .from('assets_metadata')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AssetMeta[];
}

export async function upsertAsset(input: AssetMetaInput): Promise<AssetMeta> {
  const { data, error } = await getSupabase()
    .from('assets_metadata')
    .upsert(input, { onConflict: 'device_asset_id,deal_id' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as AssetMeta;
}

export async function updateAssetStatus(id: string, status: DeliverableStatus): Promise<void> {
  const { error } = await getSupabase()
    .from('assets_metadata')
    .update({ deliverable_status: status })
    .eq('id', id);

  if (error) throw new Error(error.message);
}
