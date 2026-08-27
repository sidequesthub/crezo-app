import * as MediaLibrary from 'expo-media-library';

/**
 * Read-only access to the device's photo library.
 *
 * Crezo never writes to the library: no albums are created, nothing is moved,
 * copied, or deleted. Folders live entirely in our database and reference
 * assets by their device id.
 */

export interface DeviceAsset {
  id: string;
  uri: string;
  mediaType: MediaLibrary.MediaTypeValue;
  /** Seconds; 0 for photos. */
  duration: number;
  width: number;
  height: number;
  creationTime: number;
}

export interface AssetPage {
  assets: DeviceAsset[];
  endCursor: string | undefined;
  hasNextPage: boolean;
}

/** How many assets to pull per request — a camera roll can hold tens of thousands. */
export const PAGE_SIZE = 90;

export type PermissionState = 'granted' | 'limited' | 'denied' | 'undetermined';

export async function getPermission(): Promise<PermissionState> {
  const res = await MediaLibrary.getPermissionsAsync();
  return toState(res);
}

export async function requestPermission(): Promise<PermissionState> {
  const res = await MediaLibrary.requestPermissionsAsync();
  return toState(res);
}

function toState(res: MediaLibrary.PermissionResponse): PermissionState {
  if (res.status === 'granted') {
    // iOS 14+ can grant access to a hand-picked subset only.
    return res.accessPrivileges === 'limited' ? 'limited' : 'granted';
  }
  if (res.status === 'denied') return 'denied';
  return 'undetermined';
}

/** Opens the OS picker so the user can widen a "limited" selection (iOS only). */
export async function presentLimitedPicker(): Promise<void> {
  await MediaLibrary.presentPermissionsPickerAsync();
}

/**
 * One page of media, newest first. Pass the previous page's `endCursor` as
 * `after` to continue.
 */
export async function listAssets(options: {
  after?: string;
  albumId?: string;
  includeVideos?: boolean;
}): Promise<AssetPage> {
  const { after, albumId, includeVideos = true } = options;

  const page = await MediaLibrary.getAssetsAsync({
    first: PAGE_SIZE,
    after,
    album: albumId,
    mediaType: includeVideos
      ? [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video]
      : [MediaLibrary.MediaType.photo],
    sortBy: [MediaLibrary.SortBy.creationTime],
  });

  return {
    assets: page.assets.map(toDeviceAsset),
    endCursor: page.endCursor,
    hasNextPage: page.hasNextPage,
  };
}

/**
 * Resolves stored device ids back to assets. Ids that no longer exist — the
 * user deleted the photo — are dropped rather than rendered as broken tiles.
 *
 * `shouldDownloadFromNetwork: false` matters a lot here: by default iOS will
 * pull the original from iCloud before returning, which for a video means
 * downloading the whole file. We only need dimensions and a thumbnail URI, so
 * the local representation is enough.
 */
export async function resolveAssets(ids: string[]): Promise<DeviceAsset[]> {
  if (ids.length === 0) return [];

  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(id, {
          shouldDownloadFromNetwork: false,
        });
        return info ? toDeviceAsset(info) : null;
      } catch {
        return null;
      }
    }),
  );

  return results.filter((a): a is DeviceAsset => a !== null);
}

export interface DeviceAlbum {
  id: string;
  title: string;
  assetCount: number;
}

export async function listAlbums(): Promise<DeviceAlbum[]> {
  const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
  return albums
    .map((a) => ({ id: a.id, title: a.title, assetCount: a.assetCount ?? 0 }))
    .filter((a) => a.assetCount > 0)
    .sort((a, b) => b.assetCount - a.assetCount);
}

/** `0:42`, `1:05:30` — omitted entirely for photos. */
export function formatDuration(seconds: number): string | null {
  if (!seconds || seconds < 1) return null;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return h > 0
    ? `${h}:${mm}:${String(s).padStart(2, '0')}`
    : `${mm}:${String(s).padStart(2, '0')}`;
}

function toDeviceAsset(a: MediaLibrary.Asset): DeviceAsset {
  return {
    id: a.id,
    uri: a.uri,
    mediaType: a.mediaType,
    duration: a.duration ?? 0,
    width: a.width,
    height: a.height,
    creationTime: a.creationTime,
  };
}
