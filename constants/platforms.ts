/**
 * The platforms a creator can list on their media kit.
 *
 * Deliberately short. A picker with thirty networks makes people scroll past
 * the two they actually use — for Indian creators that is overwhelmingly
 * Instagram and YouTube.
 *
 * `profileUrl` is what makes a handle clickable: a brand's team should be able
 * to tap through to the actual profile rather than copy a string out.
 */

export interface PlatformSpec {
  id: string;
  label: string;
  /** Brand colour, used for the icon tile. */
  color: string;
  /** Shown in the handle field so the expected format is obvious. */
  placeholder: string;
  profileUrl: (handle: string) => string;
  /** What the platform calls its audience, when it isn't "Followers". */
  audience?: string;
}

/** Handles get typed with @, with a full URL pasted in, or bare. Accept all three. */
export function normaliseHandle(raw: string): string {
  let h = raw.trim();
  if (h.startsWith('http')) {
    // Someone pasted the profile URL — take the last meaningful segment.
    const parts = h.replace(/\/+$/, '').split('/');
    h = parts[parts.length - 1] || '';
  }
  return h.replace(/^@+/, '').trim();
}

export const PLATFORMS: PlatformSpec[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    color: '#E1477E',
    placeholder: '@yourhandle',
    profileUrl: (h) => `https://instagram.com/${normaliseHandle(h)}`,
  },
  {
    id: 'youtube',
    audience: 'Subscribers',
    label: 'YouTube',
    color: '#FF4E45',
    placeholder: '@yourchannel',
    profileUrl: (h) => `https://youtube.com/@${normaliseHandle(h)}`,
  },
  {
    id: 'x',
    label: 'X',
    color: '#E5E2E1',
    placeholder: '@yourhandle',
    profileUrl: (h) => `https://x.com/${normaliseHandle(h)}`,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: '#4B8EFF',
    placeholder: 'your-name',
    profileUrl: (h) => `https://linkedin.com/in/${normaliseHandle(h)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    color: '#5C8DFF',
    placeholder: 'yourpage',
    profileUrl: (h) => `https://facebook.com/${normaliseHandle(h)}`,
  },
  {
    id: 'snapchat',
    audience: 'Subscribers',
    label: 'Snapchat',
    color: '#FFD400',
    placeholder: 'yourhandle',
    profileUrl: (h) => `https://snapchat.com/add/${normaliseHandle(h)}`,
  },
];

export function platformSpec(id: string): PlatformSpec | undefined {
  return PLATFORMS.find((p) => p.id === id);
}

export function profileUrlFor(platformId: string, handle: string): string | null {
  const spec = platformSpec(platformId);
  const clean = normaliseHandle(handle);
  if (!spec || !clean) return null;
  return spec.profileUrl(clean);
}

/** "Subscribers" on YouTube and Snapchat, "Followers" elsewhere. */
export function audienceLabel(id: string): string {
  return PLATFORMS.find((p) => p.id === id)?.audience ?? 'Followers';
}
