import { supabase } from './supabase';

/**
 * Vault folders and the metadata that links device assets to them.
 *
 * We only ever store an asset's device id — roughly 100 bytes a row. The media
 * itself never leaves the phone, so "moving" an asset into a folder is just an
 * insert, and one asset can belong to any number of folders.
 */

export type DeliverableStatus = 'raw' | 'edited' | 'final' | 'submitted' | 'approved';

export const DELIVERABLE_STATUS_ORDER: DeliverableStatus[] = [
  'raw',
  'edited',
  'final',
  'submitted',
  'approved',
];

export interface VaultFolder {
  id: string;
  creator_id: string;
  name: string;
  deal_id: string | null;
  color: string | null;
  created_at: string;
  /** Populated by listFolders; not a column. */
  assetCount: number;
  deal?: { id: string; title: string; brand: { name: string } | null } | null;
}

export interface AssetMeta {
  id: string;
  creator_id: string;
  folder_id: string | null;
  deal_id: string | null;
  device_asset_id: string;
  deliverable_status: DeliverableStatus;
  tags: string[];
}

const FOLDER_SELECT = `
  id, creator_id, name, deal_id, color, created_at,
  deal:deals(id, title, brand:brands(name)),
  assets_metadata(count)
`;

export async function listFolders(creatorId: string): Promise<VaultFolder[]> {
  const { data, error } = await supabase
    .from('vault_folders')
    .select(FOLDER_SELECT)
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((raw) => {
    const r = raw as Record<string, unknown>;
    const deal = firstOf(r.deal) as Record<string, unknown> | null;
    const brand = deal ? (firstOf(deal.brand) as { name?: string } | null) : null;
    const countRow = firstOf(r.assets_metadata) as { count?: number } | null;

    return {
      ...(r as unknown as VaultFolder),
      assetCount: countRow?.count ?? 0,
      deal: deal
        ? {
            id: String(deal.id),
            title: String(deal.title),
            brand: brand?.name ? { name: brand.name } : null,
          }
        : null,
    };
  });
}

export async function createFolder(
  creatorId: string,
  name: string,
  dealId: string | null = null,
): Promise<VaultFolder> {
  const { data, error } = await supabase
    .from('vault_folders')
    .insert({ creator_id: creatorId, name: name.trim(), deal_id: dealId })
    .select('id, creator_id, name, deal_id, color, created_at')
    .single();

  if (error) throw new Error(error.message);
  return { ...(data as unknown as VaultFolder), assetCount: 0, deal: null };
}

export async function updateFolder(
  id: string,
  patch: { name?: string; deal_id?: string | null },
): Promise<void> {
  const { error } = await supabase.from('vault_folders').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Deletes the folder and its references. The photos themselves are untouched. */
export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase.from('vault_folders').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Asset metadata rows for a folder, newest first. */
export async function listFolderAssets(folderId: string): Promise<AssetMeta[]> {
  const { data, error } = await supabase
    .from('assets_metadata')
    .select('id, creator_id, folder_id, deal_id, device_asset_id, deliverable_status, tags')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AssetMeta[];
}

/**
 * Adds device assets to a folder. Re-adding an asset already in the folder is a
 * no-op rather than an error, so multi-select doesn't need to diff first.
 */
/** Rows per request — keeps payloads small enough to survive a flaky mobile link. */
const INSERT_CHUNK = 40;

export async function addAssetsToFolder(
  creatorId: string,
  folderId: string,
  deviceAssetIds: string[],
  dealId: string | null = null,
): Promise<number> {
  if (deviceAssetIds.length === 0) return 0;

  const rows = deviceAssetIds.map((deviceId) => ({
    creator_id: creatorId,
    folder_id: folderId,
    deal_id: dealId,
    device_asset_id: deviceId,
    platform: 'other',
    deliverable_status: 'raw' as DeliverableStatus,
  }));

  let added = 0;
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK);
    const data = await withRetry(async () => {
      const { data, error } = await supabase
        .from('assets_metadata')
        .upsert(chunk, { onConflict: 'device_asset_id,folder_id', ignoreDuplicates: true })
        .select('id');
      if (error) throw new Error(error.message);
      return data;
    });
    added += data?.length ?? 0;
  }

  return added;
}

/**
 * Retries transient failures. `Network request failed` is React Native's fetch
 * error and shows up on mobile whenever the radio blips — retrying once or
 * twice is far better UX than surfacing it to the user immediately.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const message = e instanceof Error ? e.message : '';
      const transient = /network|fetch|timeout|socket/i.test(message);
      if (!transient || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

/** Removes the reference only — the photo stays on the device. */
export async function removeAssetsFromFolder(metaIds: string[]): Promise<void> {
  if (metaIds.length === 0) return;
  const { error } = await supabase.from('assets_metadata').delete().in('id', metaIds);
  if (error) throw new Error(error.message);
}

export async function setAssetStatus(
  metaId: string,
  status: DeliverableStatus,
): Promise<void> {
  const { error } = await supabase
    .from('assets_metadata')
    .update({ deliverable_status: status })
    .eq('id', metaId);

  if (error) throw new Error(error.message);
}

function firstOf(value: unknown): unknown {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}
