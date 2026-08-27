import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { SlotForm } from '@/components/content/SlotForm';
import { supabase } from '@/lib/supabase';
import {
  updateSlot,
  deleteSlot,
  getCreatorId,
  getLinkedDeliverable,
  type ContentSlotInput,
} from '@/lib/contentSlots';

export default function EditContentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [initial, setInitial] = useState<ContentSlotInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [cid, { data, error: err }, linked] = await Promise.all([
          getCreatorId(),
          supabase
            .from('content_slots')
            .select('title, platform, status, scheduled_date, scheduled_time, deal_id, notes')
            .eq('id', id)
            .single(),
          getLinkedDeliverable(id),
        ]);

        if (!active) return;
        if (err) throw new Error(err.message);
        if (!data) throw new Error('This item no longer exists.');

        setCreatorId(cid);
        setInitial({ ...(data as ContentSlotInput), deliverable_id: linked });
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not load');
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  function confirmDelete() {
    Alert.alert('Delete this?', 'It will be removed from your calendar.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSlot(id);
            router.back();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not delete');
          }
        },
      },
    ]);
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!initial) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SlotForm
      heading="Edit content"
      initial={initial}
      creatorId={creatorId}
      submitLabel="Save changes"
      onClose={() => router.back()}
      onDelete={async () => confirmDelete()}
      onSubmit={async (values) => {
        await updateSlot(id, values);
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors.surface,
  },
  errorText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
