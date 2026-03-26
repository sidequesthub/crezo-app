import { Platform } from 'react-native';

import { sb } from '@/services/shared/supabase-client';
import type { Creator } from '@/types';
import type { CreatorService } from './types';

function mapRow(d: Record<string, unknown>): Creator {
  return {
    id: String(d.id),
    name: String(d.name),
    email: String(d.email),
    phone: d.phone ? String(d.phone) : null,
    gst_number: d.gst_number ? String(d.gst_number) : null,
    pan_number: d.pan_number ? String(d.pan_number) : null,
    upi_id: d.upi_id ? String(d.upi_id) : null,
    bank_account_number: d.bank_account_number ? String(d.bank_account_number) : null,
    bank_ifsc: d.bank_ifsc ? String(d.bank_ifsc) : null,
    bank_name: d.bank_name ? String(d.bank_name) : null,
    media_kit_url: d.media_kit_url ? String(d.media_kit_url) : null,
    avatar_url: d.avatar_url ? String(d.avatar_url) : null,
    bio: d.bio ? String(d.bio) : null,
    niche: d.niche ? String(d.niche) : null,
    created_at: String(d.created_at),
    updated_at: String(d.updated_at),
  };
}

export function createSupabaseCreators(): CreatorService {
  return {
    async fetch(authUserId) {
      const { data, error } = await sb()
        .from('creators')
        .select('*')
        .eq('user_id', authUserId)
        .maybeSingle();
      if (error || !data) return null;
      return mapRow(data as Record<string, unknown>);
    },

    async update(creatorId, payload) {
      const { error } = await sb().from('creators').update(payload).eq('id', creatorId);
      if (error) throw error;
    },

    async uploadAvatar(creatorId, uri, mimeType = 'image/jpeg') {
      const supabase = sb();
      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const path = `avatars/${creatorId}.${ext}`;

      const body =
        Platform.OS === 'web'
          ? await (await fetch(uri)).blob()
          : await (await fetch(uri)).arrayBuffer();

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, body, { contentType: mimeType, upsert: true });
      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase
        .from('creators')
        .update({ avatar_url: publicUrl })
        .eq('id', creatorId);
      if (updateErr) throw updateErr;

      return publicUrl;
    },
  };
}
