/**
 * Indian numbering: thousands, lakh, crore — not millions. Used everywhere a
 * rupee figure is shown, so the app never reads like a converted dollar amount.
 */
export function formatINR(amount: number): string {
  if (amount >= 1e7) return `${trim(amount / 1e7)}Cr`;
  if (amount >= 1e5) return `${trim(amount / 1e5)}L`;
  if (amount >= 1e3) return `${trim(amount / 1e3)}K`;
  return amount.toLocaleString('en-IN');
}

/** Full rupee value with separators, e.g. `45,000`. */
export function formatINRFull(amount: number): string {
  return amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/** One decimal, but drop a trailing `.0` so `1.0L` reads as `1L`. */
function trim(n: number): string {
  const s = n.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}
