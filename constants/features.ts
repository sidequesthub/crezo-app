/**
 * The typed mirror of the `features` table (supabase/migrations/015).
 * Design: docs/lld-entitlements.md.
 *
 * Code asks "can they do X / how many X", never "which plan are they on" —
 * so adding a tier never touches the app. Adding a *feature* means: a
 * migration row, a key here, a server check, and a <Gate> in the UI.
 */

export type BoolFeature =
  | 'invoices.branding'
  | 'invoices.bill_on_behalf'
  | 'mediakit.remove_branding';

export type LimitFeature =
  | 'deals.active_max'
  | 'invoices.issued_per_month'
  | 'vault.folders_max';

export type Feature = BoolFeature | LimitFeature;

/**
 * Free's values, used only before the entitlement has loaded. They must match
 * the table's `default_value`s — the most restrictive — so a missing value
 * never shows more than the server will allow.
 */
export const FREE_LIMITS: Record<LimitFeature, number> = {
  'deals.active_max': 3,
  'invoices.issued_per_month': 3,
  'vault.folders_max': 3,
};
