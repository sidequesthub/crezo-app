import { supabase } from '@/lib/supabase';
import { getCreatorId } from '@/lib/contentSlots';
import { FREE_LIMITS, type BoolFeature, type LimitFeature, type Feature } from '@/constants/features';

/**
 * Subscription access.
 *
 * Two separate concerns, deliberately kept apart:
 *
 *  - **Who has access** comes from our own database (`my_entitlement()`),
 *    which counts a manually granted entitlement exactly like a paid one.
 *    This works everywhere, including Expo Go.
 *  - **Buying** goes through RevenueCat, which is a native module. It is
 *    loaded lazily so the app still runs in Expo Go, just without purchasing.
 */

/**
 * A plan code, not a boolean. There will be more tiers than one, and a
 * `isPro` flag would have to be unpicked from every screen the day a second
 * paid plan exists. `features` is the resolved capability set: the plan's
 * defaults with any per-creator override applied on top.
 */
export interface Entitlement {
  plan: string;                       // 'free', 'pro', … — a row in `plans`
  source: 'subscription' | 'grant' | 'none';
  expiresAt: string | null;
  /** Every registered feature's effective value. Limit: number, null = unlimited. */
  features: Record<string, unknown>;
  /** Current usage of each limit feature. */
  usage: Record<string, number>;
}

export const FREE: Entitlement = {
  plan: 'free', source: 'none', expiresAt: null, features: {}, usage: {},
};

export async function getEntitlement(): Promise<Entitlement> {
  const { data, error } = await supabase.rpc('my_entitlement');
  if (error || !data?.length) return FREE;
  const row = data[0];
  return {
    plan: row.plan ?? 'free',
    source: (row.source ?? 'none') as Entitlement['source'],
    expiresAt: row.expires_at ?? null,
    features: (row.features ?? {}) as Record<string, unknown>,
    usage: (row.usage ?? {}) as Record<string, number>,
  };
}

/** Is a bool feature on? Unknown or unloaded counts as off. */
export function has(e: Entitlement, feature: BoolFeature): boolean {
  return e.features[feature] === true;
}

/** A limit feature's cap. null = unlimited. */
export function limit(e: Entitlement, feature: LimitFeature): number | null {
  if (!(feature in e.features)) return FREE_LIMITS[feature];
  const v = e.features[feature];
  return typeof v === 'number' ? v : null;
}

/** How many more are allowed. null = unlimited. */
export function remaining(e: Entitlement, feature: LimitFeature): number | null {
  const cap = limit(e, feature);
  return cap === null ? null : Math.max(0, cap - (e.usage[feature] ?? 0));
}

/**
 * Turns the database's gate errors into something the paywall can use.
 * The server raises `plan_required` / `plan_limit` with a JSON hint
 * (see require_feature / require_capacity in migration 015).
 */
export interface PlanError {
  kind: 'required' | 'limit';
  feature: Feature;
  limit?: number;
  used?: number;
}

export function planError(err: unknown): PlanError | null {
  const e = err as { message?: string; hint?: string } | null;
  if (!e || (e.message !== 'plan_required' && e.message !== 'plan_limit')) return null;
  try {
    const h = JSON.parse(e.hint ?? '{}');
    return {
      kind: e.message === 'plan_limit' ? 'limit' : 'required',
      feature: h.feature, limit: h.limit, used: h.used,
    };
  } catch {
    return null;
  }
}

export interface CatalogPlan {
  code: string;
  name: string;
  rank: number;
  tagline: string | null;
  features: Record<string, unknown>;
  prices: { period: 'monthly' | 'annual'; price_inr: number; store: string; product_id: string }[];
}

/** Public plans, cheapest first — the pricing screen and paywall read this. */
export async function getCatalog(): Promise<CatalogPlan[]> {
  const { data, error } = await supabase.rpc('plan_catalog');
  if (error || !Array.isArray(data)) return [];
  return data as CatalogPlan[];
}

/**
 * The lowest-ranked plan that unlocks a feature, or allows at least `need`
 * of a limit. This is what "Available on Creator" names — derived, never
 * hard-coded, so it stays right as tiers are added.
 */
export function cheapestPlanFor(catalog: CatalogPlan[], feature: Feature, need = 1): CatalogPlan | null {
  return catalog.find((p) => {
    const v = p.features[feature];
    if (typeof v === 'boolean') return v;
    return v === null || (typeof v === 'number' && v >= need);
  }) ?? null;
}

// ---------------------------------------------------------------- purchases

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

type PurchasesModule = typeof import('react-native-purchases').default;

let purchases: PurchasesModule | null = null;
let configured = false;

/**
 * Resolves null when purchasing is unavailable — Expo Go, or no API key set.
 * Callers must handle that rather than assuming a store is present.
 */
async function load(): Promise<PurchasesModule | null> {
  if (!API_KEY) return null;
  if (purchases) return purchases;
  try {
    const mod = await import('react-native-purchases');
    purchases = mod.default;
    return purchases;
  } catch {
    return null; // native module missing (Expo Go)
  }
}

/**
 * Must run before any purchase. The creator id becomes RevenueCat's
 * `appUserID`, which is what the webhook uses to attribute an event to a
 * person — without it, a purchase arrives with nobody attached to it.
 */
export async function configurePurchases(): Promise<boolean> {
  if (configured) return true;
  const p = await load();
  if (!p) return false;

  const creatorId = await getCreatorId();
  if (!creatorId) return false;

  await p.configure({ apiKey: API_KEY, appUserID: creatorId });
  configured = true;
  return true;
}

export interface Package {
  id: string;
  title: string;
  priceString: string;
  period: string | null;
}

export async function listPackages(): Promise<Package[]> {
  const p = await load();
  if (!p || !(await configurePurchases())) return [];

  const offerings = await p.getOfferings();
  const current = offerings.current;
  if (!current) return [];

  return current.availablePackages.map((pkg) => ({
    id: pkg.identifier,
    title: pkg.product.title,
    priceString: pkg.product.priceString,
    period: pkg.product.subscriptionPeriod ?? null,
  }));
}

export type PurchaseResult = 'purchased' | 'cancelled' | 'unavailable';

export async function purchase(packageId: string): Promise<PurchaseResult> {
  const p = await load();
  if (!p || !(await configurePurchases())) return 'unavailable';

  const offerings = await p.getOfferings();
  const pkg = offerings.current?.availablePackages.find((x) => x.identifier === packageId);
  if (!pkg) return 'unavailable';

  try {
    await p.purchasePackage(pkg);
    return 'purchased';
  } catch (e) {
    const err = e as { userCancelled?: boolean };
    if (err?.userCancelled) return 'cancelled';
    throw e;
  }
}

/** Apple requires this to be reachable from the UI. */
export async function restore(): Promise<boolean> {
  const p = await load();
  if (!p || !(await configurePurchases())) return false;
  await p.restorePurchases();
  return true;
}

export async function purchasesAvailable(): Promise<boolean> {
  return (await load()) !== null;
}
