/**
 * Content Domain — Service Interface
 *
 * Microservice boundary: Content Calendar & Planning
 * Owns: content slots, scheduling
 */

import type { ContentPlatform, ContentSlot, ContentStatus } from '@/types';

export interface ContentService {
  list(creatorId: string): Promise<ContentSlot[]>;
  create(data: ContentSlotInput): Promise<string>;
  update(
    id: string,
    data: Partial<Omit<ContentSlotInput, 'creator_id'>>
  ): Promise<void>;
  remove(id: string): Promise<void>;
}

export type ContentSlotInput = {
  creator_id: string;
  title: string;
  platform: ContentPlatform;
  type: string;
  status: ContentStatus;
  scheduled_date: string;
  scheduled_time?: string | null;
  deal_id?: string | null;
  notes?: string | null;
};
