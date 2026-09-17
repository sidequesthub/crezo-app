import { supabase } from '@/lib/supabase';
import { getCreatorId } from '@/lib/contentSlots';
import { listDeals } from '@/lib/deals';

/**
 * The media kit is a published snapshot, not a live view.
 *
 * `draft` is what the creator edits. `published` is what the public page
 * serves, and only changes when they press Update. That is what makes the
 * page stable while someone is halfway through editing it — and it is also
 * the privacy boundary: nothing lands in the snapshot unless it is put there,
 * so bank details, PAN, GSTIN and phone can never reach the public page.
 */

export interface Platform {
  id: string;
  network: string;      // 'Instagram', 'YouTube', …
  handle: string;
  followers: string;    // free text: creators think in "128K", not 128000
  avgViews: string;
}

export interface MediaKitData {
  displayName: string;
  tagline: string;
  bio: string;
  niche: string;
  contactEmail: string;
  platforms: Platform[];
  /** Brand ids the creator chose to show. Some deals are under NDA. */
  brandIds: string[];
  /**
   * Resolved at publish time. The public page has no access to the brands
   * table — it only ever reads this snapshot — so the names must be baked in.
   */
  brandNames?: string[];
  rates: { label: string; price: string }[];
  show: {
    platforms: boolean;
    brands: boolean;
    rates: boolean;
    contact: boolean;
  };
}

export interface MediaKit {
  id: string;
  slug: string;
  draft: MediaKitData;
  published: MediaKitData | null;
  publishedAt: string | null;
  isLive: boolean;
  /** Draft differs from what the public currently sees. */
  hasUnpublishedChanges: boolean;
}

export const EMPTY: MediaKitData = {
  displayName: '', tagline: '', bio: '', niche: '', contactEmail: '',
  platforms: [], brandIds: [], rates: [],
  show: { platforms: true, brands: true, rates: false, contact: true },
};

export const PUBLIC_BASE = 'https://crezo.studio';

export function publicUrl(slug: string) {
  return `${PUBLIC_BASE}/${slug}`;
}

/** 'Ananya Rao' -> 'ananya-rao'; falls back to a short random suffix. */
export function slugify(name: string): string {
  const base = name.toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 38);
  if (base.length >= 3) return base;
  return `creator-${Math.random().toString(36).slice(2, 8)}`;
}

function shape(row: {
  id: string; slug: string; draft: unknown; published: unknown;
  published_at: string | null; is_live: boolean;
}): MediaKit {
  const draft = { ...EMPTY, ...(row.draft as object) } as MediaKitData;
  const published = row.published
    ? ({ ...EMPTY, ...(row.published as object) } as MediaKitData)
    : null;
  return {
    id: row.id,
    slug: row.slug,
    draft,
    published,
    publishedAt: row.published_at,
    isLive: row.is_live,
    hasUnpublishedChanges:
      !!published && JSON.stringify(draft) !== JSON.stringify(published),
  };
}

export async function getMyMediaKit(): Promise<MediaKit | null> {
  const creatorId = await getCreatorId();
  if (!creatorId) return null;
  const { data, error } = await supabase
    .from('media_kits')
    .select('id, slug, draft, published, published_at, is_live')
    .eq('creator_id', creatorId)
    .maybeSingle();
  if (error || !data) return null;
  return shape(data);
}

/**
 * First-run. Seeds the draft from the profile the creator already filled in,
 * so the editor opens with something in it rather than empty fields.
 */
export async function createMediaKit(): Promise<MediaKit> {
  const creatorId = await getCreatorId();
  if (!creatorId) throw new Error('No creator profile for this account.');

  const { data: profile } = await supabase
    .from('creators').select('name, bio, niche, email').eq('id', creatorId).single();

  const draft: MediaKitData = {
    ...EMPTY,
    displayName: profile?.name ?? '',
    bio: profile?.bio ?? '',
    niche: profile?.niche ?? '',
    contactEmail: profile?.email ?? '',
  };

  // Slugs are globally unique; retry with a suffix on collision.
  let slug = slugify(draft.displayName || 'creator');
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('media_kits')
      .insert({ creator_id: creatorId, slug, draft })
      .select('id, slug, draft, published, published_at, is_live')
      .single();
    if (!error && data) return shape(data);
    if (error?.code !== '23505') throw new Error(error?.message ?? 'Could not create');
    slug = `${slugify(draft.displayName || 'creator')}-${Math.random().toString(36).slice(2, 5)}`;
  }
  throw new Error('Could not find a free link name. Try a different display name.');
}

export async function saveDraft(id: string, draft: MediaKitData): Promise<void> {
  const { error } = await supabase.from('media_kits').update({ draft }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Copies draft -> published. This is the only thing the public page sees. */
export async function publish(id: string, draft: MediaKitData): Promise<void> {
  const options = await listBrandOptions();
  const brandNames = draft.brandIds
    .map((bid) => options.find((o) => o.id === bid)?.name)
    .filter((n): n is string => !!n);
  const snapshot: MediaKitData = { ...draft, brandNames };

  const { error } = await supabase.from('media_kits').update({
    draft,
    published: snapshot,
    published_at: new Date().toISOString(),
    is_live: true,
  }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function unpublish(id: string): Promise<void> {
  const { error } = await supabase.from('media_kits').update({ is_live: false }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setSlug(id: string, slug: string): Promise<void> {
  const { error } = await supabase.from('media_kits').update({ slug }).eq('id', id);
  if (error) {
    if (error.code === '23505') throw new Error('That link name is taken.');
    if (error.code === '23514') throw new Error('Use 3–40 letters, numbers or hyphens.');
    throw new Error(error.message);
  }
}

export interface BrandOption { id: string; name: string; }

/**
 * Brands worth showing: those from deals that actually completed. A pitched or
 * abandoned deal is not a credential.
 */
export async function listBrandOptions(): Promise<BrandOption[]> {
  const creatorId = await getCreatorId();
  if (!creatorId) return [];
  const deals = await listDeals(creatorId);
  const seen = new Map<string, string>();
  for (const d of deals) {
    if (!d.brand) continue;
    if (d.status === 'delivered' || d.status === 'paid') seen.set(d.brand.id, d.brand.name);
  }
  return [...seen].map(([id, name]) => ({ id, name }));
}
