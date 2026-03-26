/**
 * Invoices Domain — Service Interface
 *
 * Microservice boundary: Invoicing & Payments
 * Owns: invoices, GST calculations, payment tracking
 */

import type { Invoice, InvoiceStatus } from '@/types';

export interface InvoiceService {
  list(creatorId: string): Promise<Invoice[]>;
  create(data: InvoiceInput): Promise<string>;
  update(
    id: string,
    data: Partial<Omit<InvoiceInput, 'creator_id'>>
  ): Promise<void>;
  remove(id: string): Promise<void>;
}

export type InvoiceInput = {
  creator_id: string;
  deal_id: string;
  brand_id: string;
  amount: number;
  gst_amount: number;
  total: number;
  status: InvoiceStatus;
  gstin?: string | null;
  sent_date?: string | null;
  paid_date?: string | null;
};
