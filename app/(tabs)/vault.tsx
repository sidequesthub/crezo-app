/**
 * Asset Vault — Native album approach, zero cloud storage
 * Organizes media via native OS albums, metadata only in DB
 */

import * as MediaLibrary from 'expo-media-library';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { colors, typography } from '@/constants/theme';

export default function VaultScreen() {
  const [permission, setPermission] = useState<MediaLibrary.PermissionStatus | null>(null);
  const [albums, setAlbums] = useState<MediaLibrary.Album[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setPermission(status);
      if (status === 'granted') {
        const { assets } = await MediaLibrary.getAssetsAsync({
          mediaType: ['photo', 'video'],
          first: 20,
        });
        const albumList = await MediaLibrary.getAlbumsAsync();
        setAlbums(albumList.filter((a) => a.title.includes('🎯') || a.assetCount > 0));
      }
    })();
  }, []);

  if (permission === 'denied') {
    return (
      <View style={styles.container}>
        <AppHeader title="Asset Vault" subtitle="Organize by deal" />
        <View style={styles.permissionView}>
          <Text style={styles.permissionTitle}>Camera Roll Access Needed</Text>
          <Text style={styles.permissionText}>
            Crezo creates native albums on your device. Grant access to organize
            your content by deal — visible in CapCut, WhatsApp, and Gallery.
          </Text>
          <Text style={styles.permissionHint}>
            Go to Settings → Crezo → Photos
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Asset Vault"
        subtitle="Deal-linked native albums"
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Zero Cloud Storage</Text>
          <Text style={styles.heroText}>
            Your app creates real native albums on your device. Add media to a
            deal from your camera roll — it stays on your phone and appears in
            every app that reads photos (CapCut, WhatsApp, Gallery).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Deal Albums</Text>
          {albums.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No deal albums yet. Open a deal and tap "Add Media" to create an
                album named after the deal.
              </Text>
              <Text style={styles.emptyHint}>
                Example: 🎯 Boat Earphones — Mar 2026
              </Text>
            </View>
          ) : (
            albums.map((album) => (
              <View key={album.id} style={styles.albumCard}>
                <Text style={styles.albumTitle}>{album.title}</Text>
                <Text style={styles.albumCount}>
                  {album.assetCount} {album.assetCount === 1 ? 'item' : 'items'}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.howItWorks}>
          <Text style={styles.howTitle}>How it works</Text>
          <Text style={styles.howStep}>
            1. Open a deal → Tap "Add Media"
          </Text>
          <Text style={styles.howStep}>
            2. Multi-select from your camera roll
          </Text>
          <Text style={styles.howStep}>
            3. App creates native album "🎯 [Deal Name] — [Month]"
          </Text>
          <Text style={styles.howStep}>
            4. Album appears in CapCut, WhatsApp, Gallery — everywhere
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
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
  },
  permissionHint: {
    ...typography.label_sm,
    color: colors.primary,
  },
  hero: {
    backgroundColor: colors.surface_container_high,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(65, 71, 85, 0.1)',
  },
  heroTitle: {
    ...typography.headline_md,
    color: colors.primary,
    marginBottom: 8,
  },
  heroText: {
    ...typography.body_md,
    color: colors.on_surface_variant,
    lineHeight: 24,
  },
  section: {
    gap: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    ...typography.headline_md,
    color: colors.on_surface,
    marginBottom: 8,
  },
  emptyState: {
    padding: 24,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
    gap: 8,
  },
  emptyText: {
    ...typography.body_md,
    color: colors.on_surface_variant,
  },
  emptyHint: {
    ...typography.label_sm,
    color: colors.primary,
  },
  albumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
  },
  albumTitle: {
    ...typography.body_md,
    color: colors.on_surface,
    fontWeight: '600',
  },
  albumCount: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
  },
  howItWorks: {
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  howTitle: {
    ...typography.headline_sm,
    color: colors.on_surface,
    marginBottom: 4,
  },
  howStep: {
    ...typography.body_md,
    color: colors.on_surface_variant,
  },
});
