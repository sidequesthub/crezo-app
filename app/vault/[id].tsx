import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { MediaGrid } from '@/components/vault/MediaGrid';
import { resolveAssets, type DeviceAsset } from '@/lib/deviceMedia';
import {
  listFolderAssets,
  removeAssetsFromFolder,
  deleteFolder,
  type AssetMeta,
} from '@/lib/vault';
import { supabase } from '@/lib/supabase';

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('Folder');
  const [metas, setMetas] = useState<AssetMeta[]>([]);
  const [assets, setAssets] = useState<DeviceAsset[]>([]);
  const [missing, setMissing] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [{ data: folder }, rows] = await Promise.all([
        supabase.from('vault_folders').select('name').eq('id', id).single(),
        listFolderAssets(id),
      ]);

      if (folder?.name) setName(String(folder.name));
      setMetas(rows);

      // Assets the user has since deleted from the device simply drop out.
      const resolved = await resolveAssets(rows.map((r) => r.device_asset_id));
      setAssets(resolved);
      setMissing(rows.length - resolved.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this folder');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(asset: DeviceAsset) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) next.delete(asset.id);
      else next.add(asset.id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }

  async function removeSelected() {
    const ids = metas
      .filter((m) => selection.has(m.device_asset_id))
      .map((m) => m.id);
    try {
      await removeAssetsFromFolder(ids);
      setSelection(new Set());
      setSelectionMode(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove');
    }
  }

  function confirmDeleteFolder() {
    Alert.alert(
      `Delete “${name}”?`,
      'The folder and its references are removed. Your photos stay on your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(id);
              router.back();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not delete');
            }
          },
        },
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
            {name}
          </Text>
          <Text style={styles.subtitle}>
            {selectionMode
              ? `${selection.size} selected`
              : `${assets.length} ${assets.length === 1 ? 'item' : 'items'}`}
          </Text>
        </View>
        <Pressable onPress={confirmDeleteFolder} hitSlop={10} style={styles.iconButton}>
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </Pressable>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {missing > 0 && (
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle" size={15} color={Colors.secondary} />
          <Text style={styles.noticeText}>
            {missing} {missing === 1 ? 'item is' : 'items are'} no longer on this device.
          </Text>
        </View>
      )}

      {loading ? (
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
          contentPadding={insets.bottom + (selectionMode ? 90 : 24)}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={26} color={Colors.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyBody}>
                Add media from the All media tab in the vault.
              </Text>
            </View>
          }
        />
      )}

      {selectionMode && selection.size > 0 && (
        <View style={[styles.actionBar, { bottom: Math.max(insets.bottom, 16) }]}>
          <Pressable onPress={removeSelected} style={styles.removeButton}>
            <Ionicons name="remove-circle-outline" size={18} color={Colors.onErrorContainer} />
            <Text style={styles.removeText}>Remove {selection.size} from folder</Text>
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
  errorBox: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(147, 0, 10, 0.22)',
  },
  errorText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: Colors.onErrorContainer,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(254, 148, 0, 0.14)',
  },
  noticeText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: Colors.secondaryFixed,
  },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: Colors.onSurface,
    marginTop: 6,
  },
  emptyBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  actionBar: { position: 'absolute', left: 20, right: 20 },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: Colors.errorContainer,
  },
  removeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: Colors.onErrorContainer,
  },
});
