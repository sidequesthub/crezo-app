import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { DeliverablesEditor } from '@/components/deals/DeliverablesEditor';
import { DealForm, type DealFormValues } from '@/components/deals/DealForm';
import { getDeal, updateDeal, deleteDeal, findOrCreateBrand, type Deliverable } from '@/lib/deals';
import { getCreatorId } from '@/lib/contentSlots';

export default function EditDealScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [initial, setInitial] = useState<DealFormValues | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [cid, deal] = await Promise.all([getCreatorId(), getDeal(id)]);
      if (!deal) throw new Error('This deal no longer exists.');

      setCreatorId(cid);
      setDeliverables(deal.deliverables ?? []);
      setInitial({
        brandName: deal.brand?.name ?? '',
        title: deal.title,
        value_inr: deal.value_inr,
        status: deal.status,
        end_date: deal.end_date,
        usage_rights: deal.usage_rights,
        notes: deal.notes,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function confirmDelete() {
    Alert.alert('Delete this deal?', 'Its deliverables will be removed too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDeal(id);
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
    <DealForm
      heading="Edit deal"
      initial={initial}
      creatorId={creatorId}
      submitLabel="Save changes"
      onClose={() => router.back()}
      onDelete={confirmDelete}
      onSubmit={async ({ brandName, ...values }) => {
        if (!creatorId) throw new Error('No creator profile found for this account.');
        const brandId = await findOrCreateBrand(creatorId, brandName);
        await updateDeal(id, { ...values, brand_id: brandId });
        router.back();
      }}
    >
      <DeliverablesEditor
        dealId={id}
        items={deliverables}
        onChanged={setDeliverables}
      />
    </DealForm>
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
