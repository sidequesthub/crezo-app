import { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { formatDuration, type DeviceAsset } from '@/lib/deviceMedia';

const COLUMNS = 3;
const GAP = 2;

interface Props {
  assets: DeviceAsset[];
  selected: Set<string>;
  selectionMode: boolean;
  onPressAsset: (asset: DeviceAsset) => void;
  onLongPressAsset: (asset: DeviceAsset) => void;
  onEndReached?: () => void;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  ListFooterComponent?: React.ReactElement | null;
  contentPadding?: number;
}

/**
 * Virtualized 3-column grid. A camera roll can hold tens of thousands of items,
 * so this must never render the full list — FlashList recycles rows and
 * expo-image handles thumbnail caching and decoding off the JS thread.
 */
export function MediaGrid({
  assets,
  selected,
  selectionMode,
  onPressAsset,
  onLongPressAsset,
  onEndReached,
  ListHeaderComponent,
  ListEmptyComponent,
  ListFooterComponent,
  contentPadding = 0,
}: Props) {
  const { width } = useWindowDimensions();
  const tile = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  const renderItem = useCallback(
    ({ item }: { item: DeviceAsset }) => (
      <Tile
        asset={item}
        size={tile}
        selected={selected.has(item.id)}
        selectionMode={selectionMode}
        onPress={() => onPressAsset(item)}
        onLongPress={() => onLongPressAsset(item)}
      />
    ),
    [tile, selected, selectionMode, onPressAsset, onLongPressAsset],
  );

  return (
    <FlashList
      data={assets}
      numColumns={COLUMNS}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={{ paddingBottom: contentPadding }}
      showsVerticalScrollIndicator={false}
    />
  );
}

function Tile({
  asset,
  size,
  selected,
  selectionMode,
  onPress,
  onLongPress,
}: {
  asset: DeviceAsset;
  size: number;
  selected: boolean;
  selectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const duration = formatDuration(asset.duration);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={220}
      style={{ width: size, height: size, padding: GAP / 2 }}
    >
      <View style={styles.tileInner}>
        <Image
          source={{ uri: asset.uri }}
          style={styles.image}
          contentFit="cover"
          // Lets FlashList reuse the view without flashing the previous image.
          recyclingKey={asset.id}
          transition={120}
          cachePolicy="memory-disk"
        />

        {duration && (
          <View style={styles.durationBadge}>
            <Ionicons name="play" size={8} color={Colors.onSurface} />
            <Text style={styles.durationText}>{duration}</Text>
          </View>
        )}

        {selectionMode && (
          <View style={[styles.check, selected && styles.checkOn]}>
            {selected && <Ionicons name="checkmark" size={13} color={Colors.onPrimary} />}
          </View>
        )}

        {selected && <View style={styles.selectedOverlay} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tileInner: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    overflow: 'hidden',
    borderRadius: 4,
  },
  image: { flex: 1 },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    borderRadius: 4,
    backgroundColor: 'rgba(75, 142, 255, 0.18)',
  },
  durationBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  durationText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9,
    color: Colors.onSurface,
  },
  check: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  checkOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
});
