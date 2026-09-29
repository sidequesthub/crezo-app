import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { TAB_BAR_HEIGHT, FLOATING_GAP, MIN_BOTTOM_INSET } from '@/constants/Layout';
import { MediaGrid } from '@/components/vault/MediaGrid';
import {
  getPermission,
  requestPermission,
  presentLimitedPicker,
  listAssets,
  listAlbums,
  type DeviceAsset,
  type DeviceAlbum,
  type PermissionState,
} from '@/lib/deviceMedia';
import { listFolders, createFolder, addAssetsToFolder, type VaultFolder } from '@/lib/vault';
import { getCreatorId } from '@/lib/contentSlots';

type Tab = 'folders' | 'media' | 'albums';

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('folders');
  const [permission, setPermission] = useState<PermissionState>('undetermined');

  const [assets, setAssets] = useState<DeviceAsset[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const [albums, setAlbums] = useState<DeviceAlbum[]>([]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creatorId = useRef<string | null>(null);
  const loadingRef = useRef(false);

  /* Permission ------------------------------------------------------------ */

  useEffect(() => {
    getPermission().then(setPermission);
  }, []);

  async function ask() {
    setPermission(await requestPermission());
  }

  /* Device media ---------------------------------------------------------- */

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    if (permission !== 'granted' && permission !== 'limited') return;

    loadingRef.current = true;
    setLoadingMedia(true);
    try {
      const page = await listAssets({ after: cursor });
      setAssets((prev) => [...prev, ...page.assets]);
      setCursor(page.endCursor);
      setHasMore(page.hasNextPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read your library');
    } finally {
      loadingRef.current = false;
      setLoadingMedia(false);
    }
  }, [cursor, hasMore, permission]);

  // First page once permission lands.
  useEffect(() => {
    if ((permission === 'granted' || permission === 'limited') && assets.length === 0) {
      loadMore();
      listAlbums().then(setAlbums).catch(() => setAlbums([]));
    }
  }, [permission, assets.length, loadMore]);

  /* Folders --------------------------------------------------------------- */

  const loadFolders = useCallback(async () => {
    try {
      if (!creatorId.current) creatorId.current = await getCreatorId();
      if (!creatorId.current) {
        setFolders([]);
        return;
      }
      setFolders(await listFolders(creatorId.current));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load folders');
    } finally {
      setLoadingFolders(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFolders();
    }, [loadFolders]),
  );

  /* Selection ------------------------------------------------------------- */

  function toggle(asset: DeviceAsset) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) next.delete(asset.id);
      else next.add(asset.id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }

  function beginSelection(asset: DeviceAsset) {
    setSelectionMode(true);
    setSelection(new Set([asset.id]));
  }

  function clearSelection() {
    setSelection(new Set());
    setSelectionMode(false);
  }

  async function moveToFolder(folder: VaultFolder) {
    if (!creatorId.current || saving) return;
    const ids = [...selection];
    setSheetOpen(false);
    setSaving(true);
    setError(null);
    try {
      const added = await addAssetsToFolder(
        creatorId.current,
        folder.id,
        ids,
        folder.deal_id,
      );
      clearSelection();
      await loadFolders();
      Alert.alert(
        'Added',
        added === 0
          ? `Already in ${folder.name}.`
          : `${added} ${added === 1 ? 'item' : 'items'} added to ${folder.name}.`,
      );
    } catch (e) {
      // Keep the selection so the user can just tap again.
      const message = e instanceof Error ? e.message : 'Could not add to folder';
      setError(
        /network|fetch/i.test(message)
          ? 'Network dropped while saving. Your selection is still here — tap again to retry.'
          : message,
      );
    } finally {
      setSaving(false);
    }
  }

  async function createAndMove(name: string) {
    if (!creatorId.current || !name.trim()) return;
    try {
      const folder = await createFolder(creatorId.current, name);
      await moveToFolder(folder);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create folder');
    }
  }

  const bottomInset =
    Math.max(insets.bottom, MIN_BOTTOM_INSET) + TAB_BAR_HEIGHT + FLOATING_GAP;

  /* Render ---------------------------------------------------------------- */

  const needsPermission = permission === 'denied' || permission === 'undetermined';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Asset Vault</Text>
            <Text style={styles.subtitle}>
              Organise your media — nothing leaves your phone
            </Text>
          </View>
          {selectionMode && (
            <View style={styles.selectionControls}>
              <View style={styles.countPill}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.onPrimaryContainer} />
                <Text style={styles.countText}>{selection.size}</Text>
              </View>
              <Pressable onPress={clearSelection} hitSlop={8} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.segment}>
          {(['folders', 'media', 'albums'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              // Selection belongs to the media view — carrying it into Folders
              // left an "Add N to folder" bar floating over unrelated content.
              onPress={() => {
                if (t !== tab) clearSelection();
                setTab(t);
              }}
              style={[styles.segmentItem, tab === t && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, tab === t && styles.segmentTextActive]}>
                {t === 'folders' ? 'Folders' : t === 'media' ? 'All media' : 'Albums'}
              </Text>
            </Pressable>
          ))}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={15} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {permission === 'limited' && tab !== 'folders' && (
          <Pressable onPress={presentLimitedPicker} style={styles.limitedBanner}>
            <Ionicons name="information-circle" size={16} color={Colors.secondary} />
            <Text style={styles.limitedText}>
              You&apos;ve shared only some photos. Tap to choose more.
            </Text>
          </Pressable>
        )}

        {tab === 'folders' ? (
          <FoldersTab
            folders={folders}
            loading={loadingFolders}
            bottomInset={bottomInset}
            onOpen={(f) => router.push(`/vault/${f.id}`)}
            onCreate={() => setSheetOpen(true)}
          />
        ) : needsPermission ? (
          <PermissionGate state={permission} onAsk={ask} />
        ) : tab === 'media' ? (
          <MediaGrid
            assets={assets}
            selected={selection}
            selectionMode={selectionMode}
            onPressAsset={(a) => (selectionMode ? toggle(a) : beginSelection(a))}
            onLongPressAsset={beginSelection}
            onEndReached={loadMore}
            contentPadding={bottomInset + (selectionMode ? 72 : 0)}
            ListFooterComponent={
              loadingMedia ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              loadingMedia ? null : (
                <Empty
                  icon="images-outline"
                  title="No media found"
                  body="Nothing in your library yet."
                />
              )
            }
          />
        ) : (
          <AlbumsTab
            albums={albums}
            bottomInset={bottomInset}
            onOpen={(a) => router.push(`/vault/album/${encodeURIComponent(a.id)}?title=${encodeURIComponent(a.title)}`)}
          />
        )}
      </SafeAreaView>

      {selectionMode && selection.size > 0 && tab !== 'folders' && (
        <View style={[styles.actionBar, { bottom: bottomInset }]}>
          <Pressable
            onPress={() => setSheetOpen(true)}
            disabled={saving}
            style={styles.actionButton}
          >
            {saving ? (
              <ActivityIndicator color={Colors.onPrimaryContainer} />
            ) : (
              <>
                <Ionicons name="folder-open" size={18} color={Colors.onPrimaryContainer} />
                <Text style={styles.actionText}>
                  Add {selection.size} {selection.size === 1 ? 'item' : 'items'} to folder
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      <FolderSheet
        visible={sheetOpen}
        folders={folders}
        onClose={() => setSheetOpen(false)}
        onPick={moveToFolder}
        onCreate={createAndMove}
        selecting={selection.size > 0}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function FoldersTab({
  folders,
  loading,
  bottomInset,
  onOpen,
  onCreate,
}: {
  folders: VaultFolder[];
  loading: boolean;
  bottomInset: number;
  onOpen: (f: VaultFolder) => void;
  onCreate: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.loadingBlock}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: bottomInset, gap: 10 }}
      showsVerticalScrollIndicator={false}
    >
      {folders.length === 0 ? (
        <Empty
          icon="folder-open-outline"
          title="No folders yet"
          body="Group clips by campaign. Folders live in Crezo — your photos never move."
          ctaLabel="Create a folder"
          onPress={onCreate}
        />
      ) : (
        folders.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => onOpen(f)}
            style={({ pressed }) => [styles.folderRow, pressed && styles.folderRowPressed]}
          >
            <View style={styles.folderIcon}>
              <Ionicons name="folder" size={20} color={Colors.primary} />
            </View>
            <View style={styles.folderBody}>
              <Text style={styles.folderName} numberOfLines={1}>
                {f.name}
              </Text>
              <Text style={styles.folderMeta}>
                {f.assetCount} {f.assetCount === 1 ? 'item' : 'items'}
                {f.deal ? ` · ${f.deal.brand?.name ?? f.deal.title}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.onSurfaceVariant} />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function AlbumsTab({
  albums,
  bottomInset,
  onOpen,
}: {
  albums: DeviceAlbum[];
  bottomInset: number;
  onOpen: (a: DeviceAlbum) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: bottomInset, gap: 10 }}
      showsVerticalScrollIndicator={false}
    >
      {albums.length === 0 ? (
        <Empty icon="albums-outline" title="No albums" body="No device albums with media." />
      ) : (
        albums.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => onOpen(a)}
            style={({ pressed }) => [styles.folderRow, pressed && styles.folderRowPressed]}
          >
            <View style={styles.folderIcon}>
              <Ionicons name="albums" size={20} color={Colors.tertiaryFixed} />
            </View>
            <View style={styles.folderBody}>
              <Text style={styles.folderName} numberOfLines={1}>
                {a.title}
              </Text>
              <Text style={styles.folderMeta}>{a.assetCount} items</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.onSurfaceVariant} />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function PermissionGate({ state, onAsk }: { state: PermissionState; onAsk: () => void }) {
  const denied = state === 'denied';
  return (
    <View style={styles.gate}>
      <View style={styles.gateIcon}>
        <Ionicons name="lock-closed-outline" size={30} color={Colors.primary} />
      </View>
      <Text style={styles.gateTitle}>
        {denied ? 'Photo access is off' : 'See your camera roll'}
      </Text>
      <Text style={styles.gateBody}>
        Crezo reads your library so you can group clips into folders. It never uploads,
        moves, or deletes anything — access is read-only.
      </Text>
      {!denied && (
        <Pressable onPress={onAsk} style={({ pressed }) => [styles.gateCta, pressed && { opacity: 0.85 }]}>
          <Text style={styles.gateCtaText}>Allow access</Text>
        </Pressable>
      )}
      {denied && (
        <Text style={styles.gateHint}>
          Enable it in Settings → Privacy → Photos.
        </Text>
      )}
    </View>
  );
}

function FolderSheet({
  visible,
  folders,
  onClose,
  onPick,
  onCreate,
  selecting,
}: {
  visible: boolean;
  folders: VaultFolder[];
  onClose: () => void;
  onPick: (f: VaultFolder) => void;
  onCreate: (name: string) => void;
  selecting: boolean;
}) {
  const [name, setName] = useState('');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {selecting ? 'Add to folder' : 'New folder'}
          </Text>

          <View style={styles.newRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="New folder name…"
              placeholderTextColor="rgba(193, 198, 215, 0.4)"
              style={styles.newInput}
              onSubmitEditing={() => {
                onCreate(name);
                setName('');
              }}
              returnKeyType="done"
            />
            <Pressable
              onPress={() => {
                onCreate(name);
                setName('');
              }}
              disabled={!name.trim()}
              style={styles.newButton}
            >
              <Ionicons
                name="add"
                size={20}
                color={name.trim() ? Colors.primary : Colors.onSurfaceVariant}
              />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {folders.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => onPick(f)}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <Ionicons name="folder" size={18} color={Colors.primary} />
                <Text style={styles.optionText} numberOfLines={1}>
                  {f.name}
                </Text>
                <Text style={styles.optionCount}>{f.assetCount}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Empty({
  icon,
  title,
  body,
  ctaLabel,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  ctaLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={Colors.onSurfaceVariant} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {ctaLabel && onPress && (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.85 }]}>
          <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  safe: { flex: 1 },
  loadingBlock: { paddingVertical: 64, alignItems: 'center' },
  footerLoader: { paddingVertical: 24, alignItems: 'center' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 32,
    color: Colors.onSurface,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  headerLeft: { flex: 1 },
  selectionControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  countText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: Colors.onPrimaryContainer,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.surfaceContainerLow,
  },
  cancelText: { fontFamily: 'Manrope_700Bold', fontSize: 12, color: Colors.primary },

  segment: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 999,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  segmentItemActive: { backgroundColor: Colors.surfaceContainerHighest },
  segmentText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  segmentTextActive: { color: Colors.primary, fontFamily: 'Manrope_700Bold' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(147, 0, 10, 0.22)',
  },
  errorText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: Colors.onErrorContainer,
  },
  limitedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(254, 148, 0, 0.14)',
  },
  limitedText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: Colors.secondaryFixed,
  },

  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainer,
  },
  folderRowPressed: { backgroundColor: Colors.surfaceContainerHigh },
  folderIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHighest,
  },
  folderBody: { flex: 1, gap: 2 },
  folderName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: Colors.onSurface,
  },
  folderMeta: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },

  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  gateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    marginBottom: 6,
  },
  gateTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: Colors.onSurface,
  },
  gateBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  gateCta: {
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  gateCtaText: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.primary },
  gateHint: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 6,
  },

  actionBar: { position: 'absolute', left: 20, right: 20, zIndex: 30 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  actionText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: Colors.onPrimaryContainer,
  },

  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surfaceContainer,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 34,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(193, 198, 215, 0.25)',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: Colors.onSurface,
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLow,
  },
  newInput: {
    flex: 1,
    paddingVertical: 13,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: Colors.onSurface,
  },
  newButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 16,
  },
  optionPressed: { backgroundColor: 'rgba(193, 198, 215, 0.06)' },
  optionText: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    color: Colors.onSurface,
  },
  optionCount: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },

  empty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 24,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    marginBottom: 2,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: Colors.onSurface,
  },
  emptyBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  emptyCtaText: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: Colors.primary },
});
