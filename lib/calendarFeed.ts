import { supabase } from './supabase';

/**
 * The creator's calendar subscription link.
 *
 * The feed itself is served by the website (crezo.studio/cal/<token>.ics),
 * built from content slots and deliverable due dates. Subscribing is
 * one-way and read-only: Crezo is the source of truth, the calendar app
 * just shows it.
 */

const FEED_HOST = 'www.crezo.studio';

export interface FeedLinks {
  https: string;   // copy / Outlook / anything else
  webcal: string;  // Apple Calendar subscribes directly
  google: string;  // Google Calendar's "add by URL" page
}

function links(token: string): FeedLinks {
  const path = `${FEED_HOST}/cal/${token}.ics`;
  const webcal = `webcal://${path}`;
  return {
    https: `https://${path}`,
    webcal,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
  };
}

/** Creates the link on first use. */
export async function getFeedLinks(): Promise<FeedLinks> {
  const { data, error } = await supabase.rpc('my_calendar_feed');
  if (error || typeof data !== 'string') throw new Error(error?.message ?? 'No calendar link');
  return links(data);
}

/** Issues a new link; calendars using the old one stop updating. */
export async function resetFeedLinks(): Promise<FeedLinks> {
  const { data, error } = await supabase.rpc('reset_calendar_feed');
  if (error || typeof data !== 'string') throw new Error(error?.message ?? 'Could not reset');
  return links(data);
}
