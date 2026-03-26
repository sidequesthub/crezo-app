/**
 * Vault Domain — Service Interface
 *
 * Microservice boundary: Asset Management
 * Owns: asset metadata, device album mappings, deliverable status per file
 * Note: actual media stays on device — only metadata in DB.
 */

import type { ContentPlatform, DeliverableStatus } from '@/types';

export interface VaultService {
  listByDeal(creatorId: string, dealId: string): Promise<AssetMetaRow[]>;
  upsert(data: AssetMetaInput): Promise<void>;
  updateStatus(id: string, status: DeliverableStatus): Promise<void>;
}

export type AssetMetaInput = {
  creator_id: string;
  deal_id?: string | null;
  device_asset_id: string;
  device_album_name?: string | null;
  platform: ContentPlatform;
  deliverable_status: DeliverableStatus;
  tags?: string[];
};

export type AssetMetaRow = {
  id: string;
  creator_id: string;
  deal_id: string | null;
  device_asset_id: string;
  device_album_name: string | null;
  deliverable_status: DeliverableStatus;
};
