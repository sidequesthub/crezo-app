/**
 * Shared types for Crezo app
 */

// Content Calendar
export type ContentStatus = 'idea' | 'scripted' | 'shot' | 'edited' | 'posted';
export type ContentPlatform = 'ig_reel' | 'yt_video' | 'yt_short' | 'story' | 'post' | 'other';

export interface ContentSlot {
  id: string;
  creator_id: string;
  title: string;
  platform: ContentPlatform;
  type: string;
  status: ContentStatus;
  scheduled_date: string;
  scheduled_time: string | null;
  deal_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Brand Deals
export type DealStatus =
  | 'pitched'
  | 'negotiating'
  | 'confirmed'
  | 'in_progress'
  | 'delivered'
  | 'paid';

export interface Brand {
  id: string;
  creator_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  creator_id: string;
  brand_id: string | null;
  title: string;
  value_inr: number;
  status: DealStatus;
  start_date: string | null;
  end_date: string | null;
  usage_rights: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  brand?: Brand;
  deliverables?: Deliverable[];
}

export interface Deliverable {
  id: string;
  deal_id: string;
  type: string;
  platform: ContentPlatform;
  due_date: string | null;
  status: string;
  content_slot_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

// Invoicing
export type InvoiceStatus = 'draft' | 'sent' | 'acknowledged' | 'paid';

export interface Invoice {
  id: string;
  invoice_number: number;
  deal_id: string;
  creator_id: string;
  brand_id: string | null;
  amount: number;
  gst_amount: number;
  total: number;
  status: InvoiceStatus;
  sent_date: string | null;
  paid_date: string | null;
  pdf_url: string | null;
  gstin: string | null;
  created_at: string;
  updated_at: string;
  deal?: Deal;
}

// Asset Vault (metadata only)
export type DeliverableStatus = 'raw' | 'edited' | 'final' | 'submitted' | 'approved';

export interface AssetMetadata {
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

// Creator
export interface Creator {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  gst_number: string | null;
  pan_number: string | null;
  upi_id: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  media_kit_url: string | null;
  avatar_url: string | null;
  bio: string | null;
  niche: string | null;
  created_at: string;
  updated_at: string;
}
