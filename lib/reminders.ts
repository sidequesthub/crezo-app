import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { getCreatorId } from './contentSlots';
import { loadPrefs } from './preferences';
import { fromISODate } from './dates';

/**
 * Local reminders for deliverable deadlines and invoice due dates.
 *
 * Scheduled on the device, not pushed from a server: both dates are known in
 * advance, so the phone can book the reminder itself and it fires even
 * offline.
 *
 * The schedule is rebuilt from the database rather than patched. Tracking which
 * notification belongs to which deliverable is where these systems go wrong —
 * a reminder survives its deliverable being deleted, or fires for an invoice
 * already paid. Rebuilding from current data makes that impossible: anything
 * no longer due simply isn't in the next schedule.
 */

// iOS keeps at most 64 pending local notifications and silently drops the
// rest. Stay under it, keeping the nearest ones.
const MAX_SCHEDULED = 60;

const DEADLINE_HOUR = 9;   // the day before a deliverable is due
const PAYMENT_HOUR = 10;   // the day an invoice falls due
const OVERDUE_AFTER_DAYS = 3;

interface Planned {
  at: Date;
  title: string;
  body: string;
  url: string;
}

// Foreground behaviour: without a handler, iOS suppresses notifications while
// the app is open, and a reminder that fires mid-session would vanish.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function at(isoDate: string, hour: number, dayOffset = 0): Date {
  const d = fromISODate(isoDate);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function rupees(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

async function planDeadlines(creatorId: string, now: Date): Promise<Planned[]> {
  const { data, error } = await supabase
    .from('deliverables')
    .select('id, title, due_date, status, deal:deals!inner(id, title, creator_id, brand:brands(name))')
    .eq('deal.creator_id', creatorId)
    .not('due_date', 'is', null)
    .neq('status', 'done')
    .gte('due_date', now.toISOString().slice(0, 10))
    .limit(200);
  if (error || !data) return [];

  const planned: Planned[] = [];
  for (const row of data as unknown as {
    id: string; title: string | null; due_date: string;
    deal: { id: string; title: string; brand: { name: string } | null } | null;
  }[]) {
    const brand = row.deal?.brand?.name;
    const what = row.title || 'A deliverable';
    const url = row.deal ? `/deal/${row.deal.id}` : '/(tabs)/deals';

    // Prefer the evening-before warning; if that moment has already passed
    // (it was set late), fall back to the morning of the day itself.
    const dayBefore = at(row.due_date, DEADLINE_HOUR, -1);
    const dayOf = at(row.due_date, DEADLINE_HOUR);
    if (dayBefore > now) {
      planned.push({
        at: dayBefore,
        title: 'Due tomorrow',
        body: brand ? `${what} for ${brand}` : what,
        url,
      });
    } else if (dayOf > now) {
      planned.push({
        at: dayOf,
        title: 'Due today',
        body: brand ? `${what} for ${brand}` : what,
        url,
      });
    }
  }
  return planned;
}

async function planPayments(creatorId: string, now: Date): Promise<Planned[]> {
  // Only invoices that have gone out and are still owed. Drafts were never
  // sent; paid and cancelled ones are settled.
  const { data, error } = await supabase
    .from('invoices')
    .select('id, due_date, total, status, brand:brands(name)')
    .eq('creator_id', creatorId)
    .in('status', ['sent', 'acknowledged'])
    .not('due_date', 'is', null)
    .limit(200);
  if (error || !data) return [];

  const planned: Planned[] = [];
  for (const row of data as unknown as {
    id: string; due_date: string; total: number; brand: { name: string } | null;
  }[]) {
    const who = row.brand?.name ?? 'A brand';
    const amount = rupees(row.total ?? 0);
    const url = `/invoices/${row.id}`;

    const dueDay = at(row.due_date, PAYMENT_HOUR);
    if (dueDay > now) {
      planned.push({ at: dueDay, title: 'Payment due today', body: `${who} · ${amount}`, url });
    }
    // Marking the invoice paid triggers a rebuild, which drops this — so it
    // only ever fires for money genuinely still outstanding.
    const overdue = at(row.due_date, PAYMENT_HOUR, OVERDUE_AFTER_DAYS);
    if (overdue > now) {
      planned.push({
        at: overdue,
        title: 'Payment overdue',
        body: `${who} hasn’t paid ${amount} — ${OVERDUE_AFTER_DAYS} days past due`,
        url,
      });
    }
  }
  return planned;
}

/**
 * Permission is asked with context — the first time a date is set — never on
 * launch. A prompt that arrives just after you've set a deadline explains
 * itself; one on first open reads as spam and gets declined.
 */
async function hasPermission(ask: boolean): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

async function rebuild(ask: boolean): Promise<void> {
  const prefs = await loadPrefs();
  const creatorId = await getCreatorId();

  // Always clear first: turning a toggle off must remove what's already booked.
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!creatorId || (!prefs.deadlineReminders && !prefs.paymentReminders)) return;

  const now = new Date();
  const [deadlines, payments] = await Promise.all([
    prefs.deadlineReminders ? planDeadlines(creatorId, now) : Promise.resolve([]),
    prefs.paymentReminders ? planPayments(creatorId, now) : Promise.resolve([]),
  ]);

  const planned = [...deadlines, ...payments]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_SCHEDULED);
  if (planned.length === 0) return;

  if (!(await hasPermission(ask))) return;

  for (const p of planned) {
    await Notifications.scheduleNotificationAsync({
      content: { title: p.title, body: p.body, data: { url: p.url } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at },
    });
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
let pendingAsk = false;

/**
 * Rebuild soon. Coalesced, because a single edit can fire several mutations
 * (a deal save touches the deal and each deliverable) and one rebuild covers
 * all of them. Fire-and-forget: a failed reschedule must never block a save.
 */
export function syncReminders(options: { askPermission?: boolean } = {}): void {
  pendingAsk = pendingAsk || !!options.askPermission;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const ask = pendingAsk;
    pendingAsk = false;
    timer = null;
    rebuild(ask).catch(() => undefined);
  }, 800);
}
