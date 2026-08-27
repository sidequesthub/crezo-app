/**
 * Local-date helpers for the calendar.
 *
 * `Date.toISOString()` converts to UTC first, so in IST (UTC+5:30) a local
 * midnight becomes 18:30 the *previous* day — slicing the first 10 characters
 * then yields the wrong date. Everything here formats from local components
 * instead, which is what `date` columns in Postgres expect.
 */

export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Local calendar date as `YYYY-MM-DD`. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parses `YYYY-MM-DD` as a local date (not UTC midnight). */
export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const next = startOfDay(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function addMonths(d: Date, n: number): Date {
  // Anchor to the 1st so month-end dates don't overflow (e.g. Jan 31 + 1).
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Sunday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  return addDays(d, -startOfDay(d).getDay());
}

/** The 7 days of the week containing `d`, Sunday first. */
export function weekDays(d: Date): Date[] {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Six-week grid covering `month`, padded with adjacent-month days so every
 * row is full. Six rows keeps the grid height stable as months change.
 */
export function monthGrid(month: Date): Date[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 7 }, (_, col) => addDays(start, row * 7 + col)),
  );
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/** e.g. `SUNDAY, 16 AUGUST`. */
export function longDayLabel(d: Date): string {
  return d
    .toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();
}
