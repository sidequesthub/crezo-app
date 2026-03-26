import { sb } from '@/services/shared/supabase-client';
import type { AssetMetaRow, VaultService } from './types';

export function createSupabaseVault(): VaultService {
  return {
    async listByDeal(creatorId, dealId) {
      const { data, error } = await sb()
        .from('assets_metadata')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AssetMetaRow[];
    },

    async upsert(data) {
      const { error } = await sb()
        .from('assets_metadata')
        .upsert(data, { onConflict: 'device_asset_id,deal_id' });
      if (error) throw error;
    },

    async updateStatus(id, status) {
      const { error } = await sb()
        .from('assets_metadata')
        .update({ deliverable_status: status })
        .eq('id', id);
      if (error) throw error;
    },
  };
}
