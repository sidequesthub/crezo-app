import { Colors } from './Colors';
import type { InvoiceStatus } from '@/lib/invoices';

interface StatusMeta {
  label: string;
  short: string;
  fg: string;
  bg: string;
}

export const INVOICE_STATUSES: Record<InvoiceStatus, StatusMeta> = {
  draft: {
    label: 'Draft',
    short: 'DRAFT',
    fg: Colors.onSurfaceVariant,
    bg: 'rgba(193, 198, 215, 0.10)',
  },
  sent: {
    label: 'Sent',
    short: 'SENT',
    fg: Colors.primary,
    bg: 'rgba(173, 198, 255, 0.14)',
  },
  acknowledged: {
    label: 'Acknowledged',
    short: 'ACKNOWLEDGED',
    fg: Colors.secondary,
    bg: 'rgba(255, 188, 124, 0.14)',
  },
  paid: {
    label: 'Paid',
    short: 'PAID',
    fg: Colors.onPrimary,
    bg: Colors.primary,
  },
};

export function invoiceStatusMeta(s: string | null | undefined): StatusMeta {
  return INVOICE_STATUSES[(s as InvoiceStatus) ?? 'draft'] ?? INVOICE_STATUSES.draft;
}
