import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SlotForm } from '@/components/content/SlotForm';
import { createSlot, getCreatorId, type ContentSlotInput } from '@/lib/contentSlots';
import { toISODate, startOfDay } from '@/lib/dates';

export default function NewContentScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [creatorId, setCreatorId] = useState<string | null>(null);

  // Resolved in the background — the form is usable before it lands, and only
  // the optional deal chips depend on it.
  useEffect(() => {
    let active = true;
    getCreatorId().then((id) => {
      if (active) setCreatorId(id);
    });
    return () => {
      active = false;
    };
  }, []);

  const initial: ContentSlotInput = {
    title: '',
    platform: 'ig_reel',
    status: 'idea',
    scheduled_date: date ?? toISODate(startOfDay(new Date())),
    scheduled_time: null,
    deal_id: null,
    notes: null,
  };

  return (
    <SlotForm
      heading="Plan content"
      initial={initial}
      creatorId={creatorId}
      submitLabel="Add to calendar"
      onClose={() => router.back()}
      onSubmit={async (values) => {
        // Falls back to resolving on demand if the user saves before it lands.
        const cid = creatorId ?? (await getCreatorId());
        if (!cid) throw new Error('No creator profile found for this account.');
        await createSlot(cid, values);
        router.back();
      }}
    />
  );
}
