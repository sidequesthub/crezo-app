import { getSupabase } from '../../config/supabase';

export type ContentPlatform = 'ig_reel' | 'yt_video' | 'yt_short' | 'story' | 'post' | 'other';
export type ContentStatus = 'idea' | 'scripted' | 'shot' | 'edited' | 'posted';

export interface ContentSlot {
  id: string;
  creator_id: string;
  title: string;
  platform: ContentPlatform;
  type: string | null;
  status: ContentStatus;
  scheduled_date: string;
  scheduled_time: string | null;
  deal_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentSlotInput {
  creator_id: string;
  title: string;
  platform: ContentPlatform;
  type?: string;
  status?: ContentStatus;
  scheduled_date: string;
  scheduled_time?: string;
  deal_id?: string;
  notes?: string;
}

export async function listContent(creatorId: string): Promise<ContentSlot[]> {
  const { data, error } = await getSupabase()
    .from('content_slots')
    .select('*')
    .eq('creator_id', creatorId)
    .order('scheduled_date', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ContentSlot[];
}

export async function createContent(input: ContentSlotInput): Promise<ContentSlot> {
  const { data, error } = await getSupabase()
    .from('content_slots')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ContentSlot;
}

export async function updateContent(
  id: string,
  creatorId: string,
  updates: Partial<ContentSlotInput>,
): Promise<ContentSlot> {
  const { data, error } = await getSupabase()
    .from('content_slots')
    .update(updates)
    .eq('id', id)
    .eq('creator_id', creatorId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ContentSlot;
}

export async function deleteContent(id: string, creatorId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('content_slots')
    .delete()
    .eq('id', id)
    .eq('creator_id', creatorId);

  if (error) throw new Error(error.message);
}
