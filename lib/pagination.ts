/**
 * Keyset pagination.
 *
 * Not offset/`range()`: offsets shift when rows are inserted while someone is
 * scrolling, which silently duplicates or skips items. A cursor anchored to
 * the last row read stays correct regardless of what else is written.
 *
 * Supabase also caps a response at 1000 rows by default, so an unbounded
 * `select()` does not error when a list outgrows it — it just stops returning
 * the rest. Every list query should be bounded.
 */

export const PAGE_SIZE = 30;

/** Points at the last row of the previous page. */
export interface Cursor {
  createdAt: string;
  id: string;
}

export interface Page<T> {
  items: T[];
  /** null when there is nothing after this page. */
  next: Cursor | null;
}

export function emptyPage<T>(): Page<T> {
  return { items: [], next: null };
}

/**
 * Typed structurally rather than against PostgrestFilterBuilder: importing
 * that type pulls in a second copy of postgrest-js's generics and trips
 * "type instantiation is excessively deep".
 *
 * Rows created in the same microsecond would be ambiguous ordered by time
 * alone, so the cursor falls back to the id as a tiebreak.
 */
export function afterCursor<Q extends { or(filter: string): Q }>(
  query: Q,
  cursor?: Cursor | null,
): Q {
  if (!cursor) return query;
  return query.or(
    `created_at.lt.${cursor.createdAt},` +
      `and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
  );
}

/** Ask for one more row than requested; its presence is what proves there is a next page. */
export function pageWindow(size: number = PAGE_SIZE): number {
  return size + 1;
}

export function toPage<T extends { id: string; created_at: string }>(
  rows: T[],
  size: number = PAGE_SIZE,
): Page<T> {
  const hasMore = rows.length > size;
  const items = hasMore ? rows.slice(0, size) : rows;
  const last = items[items.length - 1];
  return {
    items,
    next: hasMore && last ? { createdAt: last.created_at, id: last.id } : null,
  };
}
