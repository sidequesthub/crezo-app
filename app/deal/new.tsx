import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { DealForm, type DealFormValues } from '@/components/deals/DealForm';
import { DeliverablesEditor } from '@/components/deals/DeliverablesEditor';
import { createDeal, findOrCreateBrand, addDeliverable, setDeliverableStatus, type Deliverable } from '@/lib/deals';
import { getCreatorId } from '@/lib/contentSlots';

export default function NewDealScreen() {
  const router = useRouter();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  // Kept locally until the deal exists, then saved with it.
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);

  // Resolved in the background so the form renders immediately; only the brand
  // suggestion chips depend on it.
  useEffect(() => {
    let active = true;
    getCreatorId().then((id) => {
      if (active) setCreatorId(id);
    });
    return () => {
      active = false;
    };
  }, []);

  const initial: DealFormValues = {
    brandName: '',
    title: '',
    value_inr: 0,
    status: 'pitched',
    end_date: null,
    usage_rights: null,
    notes: null,
  };

  return (
    <DealForm
      heading="New deal"
      initial={initial}
      creatorId={creatorId}
      submitLabel="Add deal"
      onClose={() => router.back()}
      onSubmit={async ({ brandName, ...values }) => {
        const cid = creatorId ?? (await getCreatorId());
        if (!cid) throw new Error('No creator profile found for this account.');
        const brandId = await findOrCreateBrand(cid, brandName);
        const deal = await createDeal(cid, { ...values, brand_id: brandId });
        try {
          for (const d of deliverables) {
            const saved = await addDeliverable(deal.id, d.title ?? '', d.platform, d.due_date);
            if (d.status === 'done') await setDeliverableStatus(saved.id, 'done');
          }
        } catch {
          // The deal exists now, so retrying here would duplicate it. Continue
          // on its edit screen, where the deliverables that saved are listed.
          Alert.alert('Deal saved', 'Some deliverables could not be saved. Add them again here.');
          router.replace(`/deal/${deal.id}`);
          return;
        }
        router.back();
      }}
    >
      <DeliverablesEditor dealId={null} items={deliverables} onChanged={setDeliverables} />
    </DealForm>
  );
}
