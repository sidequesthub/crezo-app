import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from './Colors';

/** Mirrors the `platform` check constraint on content_slots and deliverables. */
export type ContentPlatform = 'ig_reel' | 'yt_video' | 'yt_short' | 'story' | 'post' | 'other';

/** Mirrors the `status` check constraint on content_slots. */
export type ContentStatus = 'idea' | 'scripted' | 'shot' | 'edited' | 'posted';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface PlatformMeta {
  label: string;
  icon: IoniconName;
  /** Tint for the icon tile. Kept muted so cards stay in the dark palette. */
  tint: string;
}

export const PLATFORMS: Record<ContentPlatform, PlatformMeta> = {
  ig_reel: { label: 'Instagram Reel', icon: 'logo-instagram', tint: '#E1477E' },
  yt_video: { label: 'YouTube Video', icon: 'logo-youtube', tint: '#FF4E45' },
  yt_short: { label: 'YouTube Short', icon: 'logo-youtube', tint: '#FF7A45' },
  story: { label: 'Story', icon: 'camera', tint: '#A97BFF' },
  post: { label: 'Post', icon: 'image', tint: '#4B8EFF' },
  other: { label: 'Other', icon: 'document-text', tint: '#8B90A0' },
};

export const PLATFORM_ORDER: ContentPlatform[] = [
  'ig_reel',
  'yt_video',
  'yt_short',
  'story',
  'post',
  'other',
];

interface StatusMeta {
  label: string;
  fg: string;
  bg: string;
}

/** Progression from idea to posted, matching the spec's content pipeline. */
export const STATUSES: Record<ContentStatus, StatusMeta> = {
  idea: { label: 'IDEA', fg: Colors.onSurfaceVariant, bg: 'rgba(193, 198, 215, 0.10)' },
  scripted: { label: 'SCRIPTED', fg: Colors.tertiaryFixed, bg: 'rgba(226, 226, 226, 0.12)' },
  shot: { label: 'SHOT', fg: Colors.secondary, bg: 'rgba(255, 188, 124, 0.14)' },
  edited: { label: 'EDITED', fg: Colors.primary, bg: 'rgba(173, 198, 255, 0.14)' },
  posted: { label: 'POSTED', fg: Colors.onPrimary, bg: Colors.primary },
};

export const STATUS_ORDER: ContentStatus[] = ['idea', 'scripted', 'shot', 'edited', 'posted'];

export function platformMeta(p: string | null | undefined): PlatformMeta {
  return PLATFORMS[(p as ContentPlatform) ?? 'other'] ?? PLATFORMS.other;
}

export function statusMeta(s: string | null | undefined): StatusMeta {
  return STATUSES[(s as ContentStatus) ?? 'idea'] ?? STATUSES.idea;
}

/** `HH:MM:SS` (Postgres time) → `6:00 PM`. Returns null for empty input. */
export function formatTime(t: string | null | undefined): string | null {
  if (!t) return null;
  const [hStr, mStr] = t.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}
