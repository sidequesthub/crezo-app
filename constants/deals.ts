import { Colors } from './Colors';

/** Mirrors the `status` check constraint on deals. */
export type DealStatus =
  | 'pitched'
  | 'negotiating'
  | 'confirmed'
  | 'in_progress'
  | 'delivered'
  | 'paid';

/** The pipeline order from the MVP spec. */
export const DEAL_STATUS_ORDER: DealStatus[] = [
  'pitched',
  'negotiating',
  'confirmed',
  'in_progress',
  'delivered',
  'paid',
];

/**
 * A deal is "closed" once the money has landed — everything earlier is still
 * live work. Used to decide what can be tagged from the content form and what
 * counts towards pending revenue.
 */
export const CLOSED_DEAL_STATUSES: DealStatus[] = ['paid'];

export const OPEN_DEAL_STATUSES: DealStatus[] = DEAL_STATUS_ORDER.filter(
  (s) => !CLOSED_DEAL_STATUSES.includes(s),
);

interface DealStatusMeta {
  label: string;
  short: string;
  fg: string;
  bg: string;
}

export const DEAL_STATUSES: Record<DealStatus, DealStatusMeta> = {
  pitched: {
    label: 'Pitched',
    short: 'PITCHED',
    fg: Colors.onSurfaceVariant,
    bg: 'rgba(193, 198, 215, 0.10)',
  },
  negotiating: {
    label: 'Negotiating',
    short: 'NEGOTIATING',
    fg: Colors.secondary,
    bg: 'rgba(255, 188, 124, 0.14)',
  },
  confirmed: {
    label: 'Confirmed',
    short: 'CONFIRMED',
    fg: Colors.primary,
    bg: 'rgba(173, 198, 255, 0.14)',
  },
  in_progress: {
    label: 'In Progress',
    short: 'IN PROGRESS',
    fg: Colors.primary,
    bg: 'rgba(75, 142, 255, 0.20)',
  },
  delivered: {
    label: 'Delivered',
    short: 'DELIVERED',
    fg: Colors.primaryFixed,
    bg: 'rgba(216, 226, 255, 0.14)',
  },
  paid: {
    label: 'Paid',
    short: 'PAID',
    fg: Colors.onPrimary,
    bg: Colors.primary,
  },
};

export function dealStatusMeta(s: string | null | undefined): DealStatusMeta {
  return DEAL_STATUSES[(s as DealStatus) ?? 'pitched'] ?? DEAL_STATUSES.pitched;
}
