/**
 * Mock data for development when API is not available
 */

import type { ContentSlot, Deal, Deliverable, Invoice } from '@/types';

const MOCK_CREATOR_ID = 'creator-1';

export const mockContentSlots: ContentSlot[] = [
  {
    id: '1',
    creator_id: MOCK_CREATOR_ID,
    title: 'Boat Earphones unboxing',
    platform: 'ig_reel',
    type: 'reel',
    status: 'edited',
    scheduled_date: '2026-03-25',
    deal_id: 'deal-1',
    notes: null,
    created_at: '2026-03-20T10:00:00Z',
    updated_at: '2026-03-22T10:00:00Z',
  },
  {
    id: '2',
    creator_id: MOCK_CREATOR_ID,
    title: 'Weekly vlog ep 12',
    platform: 'yt_video',
    type: 'video',
    status: 'scripted',
    scheduled_date: '2026-03-28',
    deal_id: null,
    notes: 'Travel content',
    created_at: '2026-03-18T10:00:00Z',
    updated_at: '2026-03-22T10:00:00Z',
  },
  {
    id: '3',
    creator_id: MOCK_CREATOR_ID,
    title: 'Story takeover for Brand X',
    platform: 'story',
    type: 'story',
    status: 'shot',
    scheduled_date: '2026-03-24',
    deal_id: 'deal-2',
    notes: null,
    created_at: '2026-03-21T10:00:00Z',
    updated_at: '2026-03-22T10:00:00Z',
  },
];

export const mockDeals: Deal[] = [
  {
    id: 'deal-1',
    creator_id: MOCK_CREATOR_ID,
    brand_id: 'brand-1',
    title: 'Boat Earphones Campaign',
    value_inr: 75000,
    status: 'in_progress',
    start_date: '2026-03-01',
    end_date: '2026-03-31',
    usage_rights: 'Instagram, 90 days',
    notes: null,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-22T10:00:00Z',
    brand: {
      id: 'brand-1',
      creator_id: MOCK_CREATOR_ID,
      name: 'Boat',
      contact_person: 'Rahul Sharma',
      email: 'rahul@boat-lifestyle.com',
      phone: '+91 9876543210',
      whatsapp: '+919876543210',
      notes: null,
      created_at: '2026-03-01T10:00:00Z',
      updated_at: '2026-03-01T10:00:00Z',
    },
    deliverables: [
      {
        id: 'd1',
        deal_id: 'deal-1',
        type: 'reel',
        platform: 'ig_reel',
        due_date: '2026-03-25',
        status: 'in_progress',
        content_slot_id: '1',
        title: 'Unboxing Reel',
        created_at: '2026-03-01T10:00:00Z',
        updated_at: '2026-03-22T10:00:00Z',
      },
    ],
  },
  {
    id: 'deal-2',
    creator_id: MOCK_CREATOR_ID,
    brand_id: 'brand-2',
    title: 'Brand X Story Takeover',
    value_inr: 25000,
    status: 'confirmed',
    start_date: '2026-03-20',
    end_date: '2026-03-30',
    usage_rights: 'Stories, 24h',
    notes: null,
    created_at: '2026-03-15T10:00:00Z',
    updated_at: '2026-03-22T10:00:00Z',
    brand: {
      id: 'brand-2',
      creator_id: MOCK_CREATOR_ID,
      name: 'Brand X',
      contact_person: 'Priya',
      email: 'priya@brandx.com',
      phone: null,
      whatsapp: '+919876543211',
      notes: null,
      created_at: '2026-03-15T10:00:00Z',
      updated_at: '2026-03-15T10:00:00Z',
    },
    deliverables: [],
  },
];

export const mockInvoices: Invoice[] = [
  {
    id: 'inv-1',
    deal_id: 'deal-1',
    creator_id: MOCK_CREATOR_ID,
    brand_id: 'brand-1',
    amount: 75000,
    gst_amount: 13500,
    total: 88500,
    status: 'sent',
    sent_date: '2026-03-15',
    paid_date: null,
    pdf_url: null,
    gstin: '27AABCU9603R1ZM',
    created_at: '2026-03-14T10:00:00Z',
    updated_at: '2026-03-15T10:00:00Z',
  },
];

export const mockCreator = {
  id: MOCK_CREATOR_ID,
  name: 'Tarun',
  email: 'tarun@example.com',
  bio: 'Lifestyle & tech creator',
  niche: 'Tech, Lifestyle',
  media_kit_url: 'crezo.studio/tarun',
};
