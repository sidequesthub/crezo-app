import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { MediaGrid } from '@/components/vault/MediaGrid';
import { listAssets, type DeviceAsset } from '@/lib/deviceMedia';
import { listFolders, addAssetsToFolder, type VaultFolder } from '@/lib/vault';
import { getCreatorId } from '@/lib/contentSlots';

/** Browses one of the device's own albums, read-only. */
export default function AlbumScreen() {
  const { albumId, title } = useLocalSearchParams<{ albumId: string; title?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [assets, setAssets] = useState<DeviceAsset[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [folders, setFolders] = useState<VaultFolder[]>([]);

  const creatorId = useRef<string | null>(null);
  const busy = useRef(false);

  const loadMore = useCallback(async () => {
    if (busy.current || !hasMore) return;
    busy.current = true;
    try {
      const page = await listAssets({ after: cursor, albumId });
      setAssets((prev) => [...prev, ...page.assets]);
      setCursor(page.endCursor);
      setHasMore(page.hasNextPage);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [albumId, cursor, hasMore]);

  useEffect(() => {
    loadMore();
    (async () => {
      creatorId.current = await getCreatorId();
      if (creatorId.current) setFolders(await listFolders(creatorId.current));
    })().catch(() => undefined);
    // Only on mount — pagination is driven by onEndReached.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(a: DeviceAsset) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(a.id)) next.delete(a.id);
      else next.add(a.id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }

  function chooseFolder() {
    if (folders.length === 0) {
      Alert.alert('No folders yet', 'Create a folder in the vault first.');
      return;
    }
    Alert.alert(
      'Add to folder',
      `${selection.size} selected`,
      [
        ...folders.slice(0, 8).map((f) => ({
          text: f.name,
          onPress: async () => {
            if (!creatorId.current) return;
            const added = await addAssetsToFolder(
              creatorId.current,
              f.id,
              [...selection],
              f.deal_id,
            );
            setSelection(new Set());
            setSelectionMode(false);
            Alert.alert(
              'Added',
              added === 0
                ? `Already in ${f.name}.`
                : `${added} added to ${f.name}.`,
            );
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.onSurface} />
        </Pressable>
        <View style={styles.headerBody}>
          <Text style={styles.title} numberOfLines={1}>
            {title ?? 'Album'}
          </Text>
          <Text style={styles.subtitle}>
            {selectionMode ? `${selection.size} selected` : `${assets.length} loaded`}
          </Text>
        </View>
        {selectionMode && (
          <Pressable
            onPress={() => {
              setSelection(new Set());
              setSelectionMode(false);
            }}
            hitSlop={10}
            style={styles.iconButton}
          >
            <Ionicons name="close" size={22} color={Colors.onSurface} />
          </Pressable>
        )}
      </View>

      {loading && assets.length === 0 ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <MediaGrid
          assets={assets}
          selected={selection}
          selectionMode={selectionMode}
          onPressAsset={(a) => {
            if (selectionMode) toggle(a);
            else {
              setSelectionMode(true);
              setSelection(new Set([a.id]));
            }
          }}
          onLongPressAsset={(a) => {
            setSelectionMode(true);
            setSelection(new Set([a.id]));
          }}
          onEndReached={loadMore}
          contentPadding={insets.bottom + (selectionMode ? 90 : 24)}
        />
      )}

      {selectionMode && selection.size > 0 && (
        <View style={[styles.actionBar, { bottom: Math.max(insets.bottom, 16) }]}>
          <Pressable onPress={chooseFolder} style={styles.actionButton}>
            <Ionicons name="folder-open" size={18} color={Colors.onPrimaryContainer} />
            <Text style={styles.actionText}>Add {selection.size} to folder</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  loadingBlock: { paddingVertical: 64, alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
    gap: 4,
  },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerBody: { flex: 1 },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  actionBar: { position: 'absolute', left: 20, right: 20 },
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
});
