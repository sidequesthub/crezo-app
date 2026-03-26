/**
 * Deals Domain — Service Interface
 *
 * Microservice boundary: Brand Deal CRM
 * Owns: brands, deals, deliverables
 */

import type { ContentPlatform, Deal, DealStatus } from '@/types';

export interface DealService {
  list(creatorId: string): Promise<Deal[]>;
  create(data: DealInput): Promise<string>;
  update(id: string, data: Partial<Omit<DealInput, 'creator_id'>>): Promise<void>;
  remove(id: string): Promise<void>;

  // Brands (sub-entity of deals)
  listBrands(creatorId: string): Promise<BrandSummary[]>;
  createBrand(data: BrandInput): Promise<string>;

  // Deliverables (sub-entity of deals)
  createDeliverable(data: DeliverableInput): Promise<string>;
  updateDeliverable(
    id: string,
    data: Partial<Omit<DeliverableInput, 'deal_id'>>
  ): Promise<void>;
  removeDeliverable(id: string): Promise<void>;
}

export type BrandSummary = {
  id: string;
  name: string;
};

export type BrandInput = {
  creator_id: string;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
};

export type DealInput = {
  creator_id: string;
  brand_id: string;
  title: string;
  value_inr: number;
  status: DealStatus;
  start_date?: string | null;
  end_date?: string | null;
  usage_rights?: string | null;
  notes?: string | null;
};

export type DeliverableInput = {
  deal_id: string;
  type: string;
  platform: ContentPlatform;
  title?: string | null;
  due_date?: string | null;
  status?: string;
  content_slot_id?: string | null;
};
