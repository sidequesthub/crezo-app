/**
 * Creators Domain — Service Interface
 *
 * Microservice boundary: Creator Profile & Identity
 * Owns: creator profiles, avatars, media kit metadata
 */

import type { Creator } from '@/types';

export interface CreatorService {
  fetch(authUserId: string): Promise<Creator | null>;

  update(creatorId: string, data: CreatorUpdate): Promise<void>;

  uploadAvatar(
    creatorId: string,
    uri: string,
    mimeType?: string
  ): Promise<string>;
}

export type CreatorUpdate = {
  name?: string;
  phone?: string | null;
  bio?: string | null;
  niche?: string | null;
  gst_number?: string | null;
  pan_number?: string | null;
  upi_id?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_name?: string | null;
  media_kit_url?: string | null;
};
