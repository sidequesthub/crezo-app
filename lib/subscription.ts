import { supabase } from '@/lib/supabase';
import { getCreatorId } from '@/lib/contentSlots';

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

export interface Entitlement {
  isPro: boolean;
  source: 'subscription' | 'grant' | 'none';
  expiresAt: string | null;
}

export const FREE: Entitlement = { isPro: false, source: 'none', expiresAt: null };

export async function getEntitlement(): Promise<Entitlement> {
  const { data, error } = await supabase.rpc('my_entitlement');
  if (error || !data?.length) return FREE;
  const row = data[0];
  return {
    isPro: !!row.is_pro,
    source: (row.source ?? 'none') as Entitlement['source'],
    expiresAt: row.expires_at ?? null,
  };
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
