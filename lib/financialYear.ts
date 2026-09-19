/**
 * Indian financial years: 1 April to 31 March.
 *
 * The label format matches the one already used in invoice numbers
 * (`2026-27/0007`), so a filter here lines up with the series a creator sees
 * on their invoices.
 */

import { toISODate } from '@/lib/dates';

export interface FinancialYear {
  /** '2026-27' — also the prefix of every invoice number in that year. */
  code: string;
  label: string;
  /** Inclusive, local dates as YYYY-MM-DD. */
  startISO: string;
  endISO: string;
}

/** The FY a date falls in. January to March belong to the year that started last April. */
export function financialYearOf(date: Date = new Date()): FinancialYear {
  const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return buildFinancialYear(year);
}

function buildFinancialYear(startYear: number): FinancialYear {
  const code = `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
  return {
    code,
    label: `FY ${code}`,
    startISO: toISODate(new Date(startYear, 3, 1)),        // 1 April
    endISO: toISODate(new Date(startYear + 1, 2, 31)),     // 31 March
  };
}

/** Current FY first, then previous ones — for a picker. */
export function recentFinancialYears(count = 4, from: Date = new Date()): FinancialYear[] {
  const current = financialYearOf(from);
  const startYear = Number(current.code.slice(0, 4));
  return Array.from({ length: count }, (_, i) => buildFinancialYear(startYear - i));
}

export type Period =
  | { kind: 'all' }
  | { kind: 'fy'; year: FinancialYear };

export const ALL_TIME: Period = { kind: 'all' };

export function periodLabel(period: Period): string {
  return period.kind === 'all' ? 'All time' : period.year.label;
}

/** `[fromISO, toISO]`, or null when the period is unbounded. */
export function periodRange(period: Period): [string, string] | null {
  return period.kind === 'all' ? null : [period.year.startISO, period.year.endISO];
}
