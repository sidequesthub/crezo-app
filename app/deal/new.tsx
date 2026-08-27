import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { DealForm, type DealFormValues } from '@/components/deals/DealForm';
import { createDeal, findOrCreateBrand } from '@/lib/deals';
import { getCreatorId } from '@/lib/contentSlots';

export default function NewDealScreen() {
  const router = useRouter();
  const [creatorId, setCreatorId] = useState<string | null>(null);

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
        await createDeal(cid, { ...values, brand_id: brandId });
        router.back();
      }}
    />
  );
}
