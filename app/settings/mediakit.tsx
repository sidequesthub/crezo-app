import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, Share, Modal, Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { SettingsScreen, Section } from '@/components/settings/SettingsScreen';
import { LabelledInput, ToggleRow, SaveButton, ActionRow } from '@/components/settings/Fields';
import {
  getMyMediaKit, createMediaKit, saveDraft, publish, unpublish, setSlug,
  listBrandOptions, publicUrl, uploadPhoto, EMPTY,
  type MediaKit, type MediaKitData, type BrandOption, type Platform,
} from '@/lib/mediaKit';
import { PLATFORMS, platformSpec, profileUrlFor, audienceLabel } from '@/constants/platforms';
import { PlatformIcon } from '@/components/brand/PlatformIcon';

export default function MediaKitScreen() {
  const [kit, setKit] = useState<MediaKit | null>(null);
  const [data, setData] = useState<MediaKitData>(EMPTY);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [slugDraft, setSlugDraft] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [k, b] = await Promise.all([getMyMediaKit(), listBrandOptions()]);
      setBrands(b);
      if (k) {
        setKit(k);
        setData(k.draft);
        setSlugDraft(k.slug);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const create = () => run(async () => {
    const k = await createMediaKit();
    setKit(k); setData(k.draft); setSlugDraft(k.slug);
  });

  const save = () => run(async () => {
    if (!kit) return;
    await saveDraft(kit.id, data);
    await load();
  });

  const publishNow = () => run(async () => {
    if (!kit) return;
    if (slugDraft !== kit.slug) await setSlug(kit.id, slugDraft);
    await publish(kit.id, data);
    await load();
  });

  function patch(next: Partial<MediaKitData>) {
    setData((d) => ({ ...d, ...next }));
  }

  function toggleBrand(id: string) {
    patch({
      brandIds: data.brandIds.includes(id)
        ? data.brandIds.filter((b) => b !== id)
        : [...data.brandIds, id],
    });
  }

  function addPlatform() {
    // Offer the first platform they haven't used yet — usually the one they want.
    const used = new Set(data.platforms.map((p) => p.network));
    const next = PLATFORMS.find((p) => !used.has(p.id)) ?? PLATFORMS[0];
    const p: Platform = {
      id: Math.random().toString(36).slice(2),
      network: next.id, handle: '', followers: '', avgViews: '',
    };
    patch({ platforms: [...data.platforms, p] });
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo access is needed to pick an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    await run(async () => {
      const url = await uploadPhoto(result.assets[0].uri);
      patch({ photoUrl: url });
    });
  }

  function patchPlatform(id: string, next: Partial<Platform>) {
    patch({ platforms: data.platforms.map((p) => (p.id === id ? { ...p, ...next } : p)) });
  }

  if (!loaded) {
    return (
      <SettingsScreen title="Media kit">
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      </SettingsScreen>
    );
  }

  // ------------------------------------------------------------ first run
  if (!kit) {
    return (
      <SettingsScreen
        title="Media kit"
        subtitle="A public page brands can open — your platforms, the brands you've worked with, and how to reach you."
      >
        <Section>
          <View style={styles.intro}>
            <Text style={styles.introText}>
              Crezo fills it in from your profile and your completed deals. You choose
              what appears before anything goes live.
            </Text>
          </View>
        </Section>
        {error && <Text style={styles.error}>{error}</Text>}
        <SaveButton label="Generate media kit link" onPress={create} saving={busy} />
      </SettingsScreen>
    );
  }

  const url = publicUrl(kit.slug);

  return (
    <SettingsScreen
      title="Media kit"
      subtitle={
        kit.isLive
          ? kit.hasUnpublishedChanges
            ? 'You have changes that aren’t published yet.'
            : 'Live and up to date.'
          : 'Hidden. Publish to make it reachable.'
      }
    >
      <Section label="Your link">
        <View style={styles.linkCard}>
          <Text style={styles.link} numberOfLines={1}>{url}</Text>
          <View style={styles.linkActions}>
            <Pressable
              style={styles.linkBtn}
              onPress={async () => {
                await Clipboard.setStringAsync(url);
                Alert.alert('Copied', 'Link copied to clipboard.');
              }}
            >
              <Ionicons name="copy-outline" size={16} color={Colors.primary} />
              <Text style={styles.linkBtnText}>Copy</Text>
            </Pressable>
            <Pressable style={styles.linkBtn} onPress={() => Share.share({ message: url })}>
              <Ionicons name="share-outline" size={16} color={Colors.primary} />
              <Text style={styles.linkBtnText}>Share</Text>
            </Pressable>
          </View>
        </View>
        <LabelledInput
          label="Link name"
          value={slugDraft}
          onChangeText={(v) => setSlugDraft(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          autoCapitalize="none"
          hint="crezo.studio/your-name — 3 to 40 letters, numbers or hyphens."
        />
      </Section>

      <Section label="Photo">
        <View style={styles.photoRow}>
          {data.photoUrl ? (
            <Image source={{ uri: data.photoUrl }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoEmpty]}>
              <Text style={styles.photoInitial}>
                {(data.displayName || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.photoActions}>
            <Pressable style={styles.photoBtn} onPress={pickPhoto}>
              <Ionicons name="image-outline" size={15} color={Colors.primary} />
              <Text style={styles.photoBtnText}>
                {data.photoUrl ? 'Change photo' : 'Add photo'}
              </Text>
            </Pressable>
            {!!data.photoUrl && (
              <Pressable onPress={() => patch({ photoUrl: '' })}>
                <Text style={styles.photoRemove}>Remove</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Section>

      <Section label="About">
        <LabelledInput label="Display name" value={data.displayName}
          onChangeText={(v) => patch({ displayName: v })} />
        <LabelledInput label="Tagline" value={data.tagline}
          onChangeText={(v) => patch({ tagline: v })}
          placeholder="Skincare and everyday beauty, in Hindi" />
        <LabelledInput label="Bio" value={data.bio} multiline
          onChangeText={(v) => patch({ bio: v })} />
      </Section>

      <Section label="Platforms">
        {data.platforms.map((p) => {
          const spec = platformSpec(p.network);
          const link = profileUrlFor(p.network, p.handle);
          return (
            <View key={p.id} style={styles.platform}>
              <View style={styles.platformHead}>
                <Pressable style={styles.networkPick} onPress={() => setPickerFor(p.id)}>
                  <View style={[styles.networkIcon, { backgroundColor: (spec?.color ?? '#8B90A0') + '22' }]}>
                    <PlatformIcon platform={p.network} size={17} color={spec?.color ?? Colors.onSurfaceVariant} />
                  </View>
                  <Text style={styles.networkLabel}>{spec?.label ?? 'Choose platform'}</Text>
                  <Ionicons name="chevron-down" size={15} color={Colors.onSurfaceVariant} />
                </Pressable>
                <Pressable
                  onPress={() => patch({ platforms: data.platforms.filter((x) => x.id !== p.id) })}
                  hitSlop={10}
                  style={styles.remove}
                >
                  <Ionicons name="close" size={16} color={Colors.onSurfaceVariant} />
                </Pressable>
              </View>
              <LabelledInput label="Handle" value={p.handle} autoCapitalize="none"
                onChangeText={(v) => patchPlatform(p.id, { handle: v })}
                placeholder={spec?.placeholder ?? '@yourhandle'}
                hint={link ? link.replace('https://', '') : undefined} />
              <LabelledInput label={audienceLabel(p.network)} value={p.followers}
                onChangeText={(v) => patchPlatform(p.id, { followers: v })} placeholder="128K" />
              <LabelledInput label="Average views" value={p.avgViews}
                onChangeText={(v) => patchPlatform(p.id, { avgViews: v })} placeholder="45K" />
            </View>
          );
        })}
        <ActionRow icon="add-circle-outline" label="Add a platform"
          description="Audience numbers are typed in by hand — Crezo doesn't read them from your platforms."
          onPress={addPlatform} tint={Colors.primary} />
      </Section>

      <Section label="Brands you've worked with">
        {brands.length === 0 ? (
          <Text style={styles.note}>
            Brands appear here once a deal reaches delivered or paid.
          </Text>
        ) : (
          <View style={styles.chips}>
            {brands.map((b) => {
              const on = data.brandIds.includes(b.id);
              return (
                <Pressable key={b.id} onPress={() => toggleBrand(b.id)}
                  style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{b.name}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        <Text style={styles.note}>
          Only the ones you pick appear. Deal values are never shown.
        </Text>
      </Section>

      <Section label="What to show">
        <ToggleRow icon="people-outline" label="Platforms" value={data.show.platforms}
          onValueChange={(v) => patch({ show: { ...data.show, platforms: v } })} />
        <ToggleRow icon="briefcase-outline" label="Brands" value={data.show.brands}
          onValueChange={(v) => patch({ show: { ...data.show, brands: v } })} />
        <ToggleRow icon="pricetag-outline" label="Rates" value={data.show.rates}
          description="Off by default."
          onValueChange={(v) => patch({ show: { ...data.show, rates: v } })} />
        <ToggleRow icon="mail-outline" label="Contact email" value={data.show.contact}
          onValueChange={(v) => patch({ show: { ...data.show, contact: v } })} />
        <LabelledInput label="Contact email" value={data.contactEmail} autoCapitalize="none"
          keyboardType="email-address" onChangeText={(v) => patch({ contactEmail: v })} />
      </Section>

      {error && <Text style={styles.error}>{error}</Text>}

      <SaveButton
        label={kit.isLive ? 'Update live page' : 'Publish'}
        onPress={publishNow}
        saving={busy}
      />
      <ActionRow icon="save-outline" label="Save without publishing"
        description="Keeps the public page as it is."
        onPress={save} />
      {kit.isLive && (
        <ActionRow icon="eye-off-outline" label="Hide the page" tint={Colors.error}
          description="The link stops working until you publish again."
          onPress={() => run(async () => { await unpublish(kit.id); await load(); })} />
      )}

      <Modal
        visible={pickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerFor(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setPickerFor(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Platform</Text>
            {PLATFORMS.map((spec) => {
              const current = data.platforms.find((x) => x.id === pickerFor);
              const active = current?.network === spec.id;
              // A platform already listed elsewhere would produce a duplicate row.
              const taken = data.platforms.some(
                (x) => x.network === spec.id && x.id !== pickerFor,
              );
              return (
                <Pressable
                  key={spec.id}
                  disabled={taken}
                  onPress={() => {
                    if (pickerFor) patchPlatform(pickerFor, { network: spec.id });
                    setPickerFor(null);
                  }}
                  style={[styles.option, active && styles.optionActive, taken && { opacity: 0.4 }]}
                >
                  <View style={[styles.networkIcon, { backgroundColor: spec.color + '22' }]}>
                    <PlatformIcon platform={spec.id} size={17} color={spec.color} />
                  </View>
                  <Text style={styles.optionText}>{spec.label}</Text>
                  {taken && <Text style={styles.photoRemove}>Added</Text>}
                  {active && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  intro: { padding: 16, borderRadius: 16, backgroundColor: Colors.surfaceContainerLow },
  introText: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 21, color: Colors.onSurfaceVariant },
  linkCard: { padding: 16, borderRadius: 16, backgroundColor: Colors.surfaceContainerLow, gap: 12 },
  link: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: Colors.onSurface },
  linkActions: { flexDirection: 'row', gap: 10 },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8,
    paddingHorizontal: 14, borderRadius: 999, backgroundColor: Colors.surfaceContainerHigh,
  },
  linkBtnText: { fontFamily: 'Manrope_700Bold', fontSize: 12, color: Colors.primary },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  photo: { width: 72, height: 72, borderRadius: 24 },
  photoEmpty: {
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  photoInitial: {
    fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 28, color: Colors.primary,
  },
  photoActions: { gap: 10 },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999,
    backgroundColor: Colors.surfaceContainerHigh, alignSelf: 'flex-start',
  },
  photoBtnText: { fontFamily: 'Manrope_700Bold', fontSize: 12, color: Colors.primary },
  photoRemove: {
    fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: Colors.onSurfaceVariant,
  },
  networkPick: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 12, borderRadius: 14,
    backgroundColor: Colors.surfaceContainer,
  },
  networkIcon: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  networkLabel: {
    flex: 1, fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.onSurface,
  },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surfaceContainer,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 34, gap: 2,
  },
  sheetHandle: {
    alignSelf: 'center', width: 38, height: 4, borderRadius: 999,
    backgroundColor: 'rgba(193, 198, 215, 0.25)', marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16,
    color: Colors.onSurface, paddingHorizontal: 10, paddingBottom: 10,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16,
  },
  optionActive: { backgroundColor: Colors.surfaceContainerHigh },
  optionText: { flex: 1, fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: Colors.onSurface },
  platform: {
    padding: 12, borderRadius: 16, backgroundColor: Colors.surfaceContainerLow, marginBottom: 10,
  },
  platformHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  remove: { padding: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    backgroundColor: Colors.surfaceContainerLow,
  },
  chipOn: { backgroundColor: 'rgba(75, 142, 255, 0.16)' },
  chipText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: Colors.onSurfaceVariant },
  chipTextOn: { color: Colors.primary },
  note: {
    fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 18,
    color: Colors.onSurfaceVariant, marginTop: 10,
  },
  error: {
    fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.error,
    textAlign: 'center', marginTop: 12,
  },
});
