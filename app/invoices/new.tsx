import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { InvoiceForm } from '@/components/invoices/InvoiceForm';
import { createInvoice, getCreatorId, lineItemsFromDeal, type InvoiceInput } from '@/lib/invoices';
import { getProfile, type CreatorProfile } from '@/lib/profile';
import { stateCodeFromGstin } from '@/constants/gst';
import { toISODate, startOfDay } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

export default function NewInvoiceScreen() {
  const router = useRouter();
  // Opened from a deal, the invoice pre-fills from its deliverables.
  const { dealId } = useLocalSearchParams<{ dealId?: string }>();

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [initial, setInitial] = useState<InvoiceInput | null>(null);

  useEffect(() => {
    (async () => {
      const [cid, profile] = await Promise.all([getCreatorId(), getProfile()]);
      setCreatorId(cid);
      setCreator(profile);

      let brandId: string | null = null;
      let items = [{ description: '', quantity: 1, rate: 0 }];

      if (dealId) {
        const { data: deal } = await supabase.from('deals').select('brand_id').eq('id', dealId).single();
        brandId = (deal?.brand_id as string) ?? null;
        const seeded = await lineItemsFromDeal(dealId);
        if (seeded.length > 0) items = seeded;
      }

      setInitial({
        deal_id: dealId ?? null,
        brand_id: brandId,
        invoice_date: toISODate(startOfDay(new Date())),
        due_date: null,
        line_items: items,
        // Only default GST on when the creator is actually registered.
        applyGst: Boolean(profile?.gst_number),
        place_of_supply: null,
        sac_code: '998363',
        notes: null,
      });
    })().catch(() => undefined);
  }, [dealId]);

  if (!initial) return null;

  return (
    <InvoiceForm
      heading="New invoice"
      initial={initial}
      creatorId={creatorId}
      creator={creator}
      submitLabel="Create invoice"
      onClose={() => router.back()}
      onSubmit={async (values) => {
        const cid = creatorId ?? (await getCreatorId());
        if (!cid) throw new Error('No creator profile found for this account.');
        const supplierState = creator?.state_code ?? stateCodeFromGstin(creator?.gst_number);
        const created = await createInvoice(cid, values, supplierState, creator?.gst_number ?? null);
        router.replace(`/invoices/${created.id}`);
      }}
    />
  );
}
