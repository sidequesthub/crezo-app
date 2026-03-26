import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { SelectField } from '@/components/ui';
import { colors, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useAPI } from '@/hooks/useAPI';
import { useCreatorData } from '@/hooks/useCreatorData';
import type { ContentPlatform } from '@/types';

type AssetStatus = 'raw' | 'edited' | 'final' | 'submitted' | 'approved';

const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: 'raw', label: 'Raw' },
  { value: 'edited', label: 'Edited' },
  { value: 'final', label: 'Final' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
];

const STATUS_COLORS: Record<AssetStatus, string> = {
  raw: colors.on_surface_variant,
  edited: colors.secondary,
  final: colors.primary,
  submitted: colors.primary_container,
  approved: '#16a34a',
};

type VaultAsset = {
  id: string;
  device_asset_id: string;
  deal_id: string | null;
  deliverable_status: AssetStatus;
  uri?: string;
  mediaType?: string;
};

export default function VaultScreen() {
  const { user } = useAuth();
  const { vault: vaultSvc } = useAPI();
  const { creator, deals } = useCreatorData();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const isWeb = Platform.OS === 'web';

  const [permission, setPermission] = useState<MediaLibrary.PermissionStatus | null>(null);
  const [albums, setAlbums] = useState<MediaLibrary.Album[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [dbAssets, setDbAssets] = useState<VaultAsset[]>([]);
  const [deviceAssets, setDeviceAssets] = useState<MediaLibrary.Asset[]>([]);
  const [picking, setPicking] = useState(false);
  const [pickAssets, setPickAssets] = useState<MediaLibrary.Asset[]>([]);
  const [selectedForPick, setSelectedForPick] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<AssetStatus | 'all'>('all');

  const selectedDeal = deals.find((d) => d.id === selectedDealId);

  useEffect(() => {
    if (isWeb) {
      setPermission(MediaLibrary.PermissionStatus.GRANTED);
      return;
    }
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setPermission(status);
    })();
  }, [isWeb]);

  useEffect(() => {
    if (permission !== 'granted' || isWeb) return;
    (async () => {
      const albumList = await MediaLibrary.getAlbumsAsync();
      setAlbums(albumList.filter((a) => a.assetCount > 0));
    })();
  }, [permission, isWeb]);

  const loadDealAssets = useCallback(async () => {
    if (!creator || !selectedDealId) {
      setDbAssets([]);
      return;
    }
    try {
      const rows = await vaultSvc.listByDeal(creator.id, selectedDealId);
      setDbAssets(rows as VaultAsset[]);

      if (!isWeb) {
        const ids = rows.map((r: { device_asset_id: string }) => r.device_asset_id).filter(Boolean);
        if (ids.length > 0) {
          const result = await MediaLibrary.getAssetsAsync({
            mediaType: ['photo', 'video'],
            first: 500,
          });
          const idSet = new Set(ids);
          setDeviceAssets(result.assets.filter((a) => idSet.has(a.id)));
        }
      }
    } catch {}
  }, [creator, selectedDealId, isWeb]);

  useEffect(() => {
    loadDealAssets();
  }, [loadDealAssets]);

  async function openPicker() {
    if (isWeb) return;
    setPicking(true);
    setSelectedForPick(new Set());
    try {
      const result = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo', 'video'],
        first: 100,
        sortBy: [MediaLibrary.SortBy.creationTime],
      });
      setPickAssets(result.assets);
    } catch {
      setPicking(false);
    }
  }

  function togglePickAsset(assetId: string) {
    setSelectedForPick((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  }

  async function confirmPick() {
    if (!creator || !selectedDealId || !selectedDeal || selectedForPick.size === 0) return;
    setSaving(true);
    try {
      const selectedAssets = pickAssets.filter((a) => selectedForPick.has(a.id));
      const albumName = `🎯 ${selectedDeal.title} — ${new Date().toLocaleDateString('en', { month: 'short', year: 'numeric' })}`;

      try {
        const existing = await MediaLibrary.getAlbumAsync(albumName);
        if (existing) {
          await MediaLibrary.addAssetsToAlbumAsync(selectedAssets, existing, false);
        } else {
          const album = await MediaLibrary.createAlbumAsync(
            albumName,
            selectedAssets[0],
            false
          );
          if (selectedAssets.length > 1) {
            await MediaLibrary.addAssetsToAlbumAsync(
              selectedAssets.slice(1),
              album,
              false
            );
          }
        }
      } catch {}

      for (const asset of selectedAssets) {
        await vaultSvc.upsert({
          creator_id: creator.id,
          deal_id: selectedDealId,
          device_asset_id: asset.id,
          device_album_name: albumName,
          platform: 'other' as ContentPlatform,
          deliverable_status: 'raw',
        });
      }

      await loadDealAssets();
      const albumList = await MediaLibrary.getAlbumsAsync();
      setAlbums(albumList.filter((a) => a.assetCount > 0));

      setPicking(false);
      setPickAssets([]);
      setSelectedForPick(new Set());
    } catch {} finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(assetId: string, newStatus: AssetStatus) {
    try {
      await vaultSvc.updateStatus(assetId, newStatus);
      setDbAssets((prev) =>
        prev.map((a) =>
          a.id === assetId ? { ...a, deliverable_status: newStatus } : a
        )
      );
    } catch {}
  }

  const filteredAssets = useMemo(() => {
    if (filterStatus === 'all') return dbAssets;
    return dbAssets.filter((a) => a.deliverable_status === filterStatus);
  }, [dbAssets, filterStatus]);

  const deviceAssetMap = useMemo(() => {
    const map = new Map<string, MediaLibrary.Asset>();
    deviceAssets.forEach((a) => map.set(a.id, a));
    return map;
  }, [deviceAssets]);

  if (permission === 'denied') {
    return (
      <View style={styles.container}>
        <AppHeader title="Asset Vault" subtitle="Organize by deal" />
        <View style={styles.permissionView}>
          <Ionicons name="images-outline" size={48} color={colors.primary} />
          <Text style={styles.permissionTitle}>Camera Roll Access Needed</Text>
          <Text style={styles.permissionText}>
            Crezo creates native albums on your device — visible in CapCut,
            WhatsApp, and Gallery. Grant access in Settings.
          </Text>
        </View>
      </View>
    );
  }

  if (picking) {
    return (
      <View style={styles.container}>
        <View style={styles.pickerHeader}>
          <Pressable onPress={() => setPicking(false)} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.on_surface} />
          </Pressable>
          <Text style={styles.pickerTitle}>
            Select Media ({selectedForPick.size} selected)
          </Text>
          <Pressable
            onPress={confirmPick}
            disabled={saving || selectedForPick.size === 0}
            hitSlop={12}
          >
            <Text
              style={[
                styles.pickerDone,
                (saving || selectedForPick.size === 0) && styles.pickerDoneDisabled,
              ]}
            >
              {saving ? 'Saving...' : 'Done'}
            </Text>
          </Pressable>
        </View>
        <FlatList
          data={pickAssets}
          numColumns={isWide ? 5 : 3}
          key={isWide ? 'wide' : 'narrow'}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.pickerGrid}
          renderItem={({ item }) => {
            const selected = selectedForPick.has(item.id);
            return (
              <Pressable
                style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                onPress={() => togglePickAsset(item.id)}
              >
                <Image source={{ uri: item.uri }} style={styles.pickerThumb} />
                {item.mediaType === 'video' && (
                  <View style={styles.videoOverlay}>
                    <Ionicons name="videocam" size={14} color="#fff" />
                    <Text style={styles.videoDuration}>
                      {Math.round(item.duration)}s
                    </Text>
                  </View>
                )}
                {selected && (
                  <View style={styles.checkOverlay}>
                    <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Asset Vault" subtitle="Deal-linked native albums" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={StyleSheet.flatten([styles.scrollContent, isWide && styles.scrollContentWide])}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dealSelector}>
          <Text style={styles.sectionTitle}>Select a Deal</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dealChips}
          >
            <Pressable
              style={[styles.dealChip, !selectedDealId && styles.dealChipActive]}
              onPress={() => setSelectedDealId(null)}
            >
              <Text style={[styles.chipText, !selectedDealId && styles.chipActive]}>
                All Albums
              </Text>
            </Pressable>
            {deals.map((d) => (
              <Pressable
                key={d.id}
                style={[
                  styles.dealChip,
                  selectedDealId === d.id && styles.dealChipActive,
                ]}
                onPress={() => setSelectedDealId(d.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedDealId === d.id && styles.chipActive,
                  ]}
                  numberOfLines={1}
                >
                  {d.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {selectedDealId ? (
          <>
            <View style={styles.dealHeader}>
              <View>
                <Text style={styles.dealName}>{selectedDeal?.title}</Text>
                <Text style={styles.assetCount}>
                  {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
                </Text>
              </View>
              {!isWeb && (
                <Pressable style={styles.addMediaBtn} onPress={openPicker}>
                  <Ionicons name="add" size={20} color={colors.on_primary} />
                  <Text style={styles.addMediaText}>Add Media</Text>
                </Pressable>
              )}
            </View>

            {filteredAssets.length > 0 && (
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Filter:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterChips}
                >
                  <Pressable
                    style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
                    onPress={() => setFilterStatus('all')}
                  >
                    <Text style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}>
                      All
                    </Text>
                  </Pressable>
                  {STATUS_OPTIONS.map((s) => (
                    <Pressable
                      key={s.value}
                      style={[styles.filterChip, filterStatus === s.value && styles.filterChipActive]}
                      onPress={() => setFilterStatus(s.value)}
                    >
                      <Text style={[styles.filterChipText, filterStatus === s.value && styles.filterChipTextActive]}>
                        {s.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {filteredAssets.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={36} color={colors.on_surface_variant} />
                <Text style={styles.emptyText}>
                  {isWeb
                    ? 'Media picker is available on mobile. Open this deal on your phone to add media.'
                    : 'No media tagged to this deal yet.\nTap "Add Media" to select from your camera roll.'}
                </Text>
              </View>
            ) : (
              <View style={styles.assetGrid}>
                {filteredAssets.map((asset) => {
                  const devAsset = deviceAssetMap.get(asset.device_asset_id);
                  return (
                    <View key={asset.id} style={styles.assetCard}>
                      {devAsset ? (
                        <Image source={{ uri: devAsset.uri }} style={styles.assetThumb} />
                      ) : (
                        <View style={[styles.assetThumb, styles.assetPlaceholder]}>
                          <Ionicons name="image-outline" size={24} color={colors.on_surface_variant} />
                        </View>
                      )}
                      <View style={styles.assetMeta}>
                        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[asset.deliverable_status] + '25' }]}>
                          <Text style={[styles.statusText, { color: STATUS_COLORS[asset.deliverable_status] }]}>
                            {asset.deliverable_status}
                          </Text>
                        </View>
                        <SelectField
                          label=""
                          options={STATUS_OPTIONS}
                          value={asset.deliverable_status}
                          onChange={(v) => handleStatusChange(asset.id, v as AssetStatus)}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Deal Albums</Text>
              {!isWeb && albums.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-open-outline" size={36} color={colors.on_surface_variant} />
                  <Text style={styles.emptyText}>
                    No deal albums yet. Select a deal above, then tap "Add Media" to create
                    a native album on your device.
                  </Text>
                </View>
              ) : !isWeb ? (
                albums.map((album) => (
                  <Pressable key={album.id} style={styles.albumCard}>
                    <View style={styles.albumIcon}>
                      <Ionicons name="folder-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.albumTitle}>{album.title}</Text>
                      <Text style={styles.albumCount}>
                        {album.assetCount} {album.assetCount === 1 ? 'item' : 'items'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.on_surface_variant} />
                  </Pressable>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="phone-portrait-outline" size={36} color={colors.on_surface_variant} />
                  <Text style={styles.emptyText}>
                    The Asset Vault uses your device's native photo library. Open the app on
                    your phone or tablet to manage deal albums.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.howItWorks}>
              <Text style={styles.howTitle}>How It Works</Text>
              <View style={styles.howStep}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                <Text style={styles.stepText}>Select a deal from the chips above</Text>
              </View>
              <View style={styles.howStep}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                <Text style={styles.stepText}>Tap "Add Media" → multi-select from camera roll</Text>
              </View>
              <View style={styles.howStep}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                <Text style={styles.stepText}>App creates native album "🎯 [Deal] — [Month]"</Text>
              </View>
              <View style={styles.howStep}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>4</Text></View>
                <Text style={styles.stepText}>Album visible in CapCut, WhatsApp, Gallery — everywhere</Text>
              </View>
              <View style={styles.howStep}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>5</Text></View>
                <Text style={styles.stepText}>Track each file: Raw → Edited → Final → Submitted</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 120 },
  scrollContentWide: { maxWidth: 960, alignSelf: 'center', width: '100%' },
  permissionView: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  permissionTitle: {
    ...typography.headline_lg,
    color: colors.on_surface,
    textAlign: 'center',
  },
  permissionText: {
    ...typography.body_md,
    color: colors.on_surface_variant,
    textAlign: 'center',
    maxWidth: 340,
  },
  dealSelector: { gap: 8, marginBottom: 20 },
  dealChips: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  dealChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface_container_low,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dealChipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  chipText: { ...typography.label_md, color: colors.on_surface_variant },
  chipActive: { color: colors.primary },
  sectionTitle: { ...typography.headline_md, color: colors.on_surface },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dealName: { ...typography.headline_sm, color: colors.on_surface },
  assetCount: { ...typography.label_sm, color: colors.on_surface_variant, marginTop: 2 },
  addMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  addMediaText: { ...typography.label_md, color: colors.on_primary },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  filterLabel: { ...typography.label_md, color: colors.on_surface_variant },
  filterChips: { flexDirection: 'row', gap: 6 },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.surface_container_low,
  },
  filterChipActive: { backgroundColor: colors.primary + '25' },
  filterChipText: { ...typography.label_sm, color: colors.on_surface_variant },
  filterChipTextActive: { color: colors.primary },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface_container_low,
    borderRadius: 16,
  },
  emptyText: {
    ...typography.body_md,
    color: colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: 22,
  },
  assetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  assetCard: {
    width: 160,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
    overflow: 'hidden',
  },
  assetThumb: {
    width: '100%',
    height: 120,
    backgroundColor: colors.surface_container_highest,
  },
  assetPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  assetMeta: { padding: 8, gap: 6 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusText: {
    ...typography.label_sm,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  section: { gap: 12, marginBottom: 24 },
  albumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
  },
  albumIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumTitle: { ...typography.body_md, color: colors.on_surface, fontWeight: '600' },
  albumCount: { ...typography.label_sm, color: colors.on_surface_variant, marginTop: 2 },
  howItWorks: {
    backgroundColor: colors.surface_container_low,
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  howTitle: { ...typography.headline_sm, color: colors.on_surface },
  howStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumText: { ...typography.label_md, color: colors.primary, fontWeight: '700' },
  stepText: { ...typography.body_md, color: colors.on_surface_variant, flex: 1 },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 52,
    backgroundColor: colors.surface_container_high,
  },
  pickerTitle: { ...typography.headline_sm, color: colors.on_surface },
  pickerDone: { ...typography.label_lg, color: colors.primary },
  pickerDoneDisabled: { color: colors.on_surface_variant },
  pickerGrid: { padding: 4 },
  pickerItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pickerItemSelected: {
    borderColor: colors.primary,
    borderRadius: 8,
  },
  pickerThumb: { width: '100%', height: '100%' },
  videoOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoDuration: { ...typography.label_sm, color: '#fff' },
  checkOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 14,
  },
});
