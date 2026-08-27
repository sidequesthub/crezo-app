/**
 * Indian GST rules for creator invoices.
 *
 * The tax split is the part that has to be right. GST on an invoice is either
 * CGST + SGST (an intra-state supply, split evenly) or IGST (inter-state, the
 * full rate as one line). Which applies depends on whether the supplier's state
 * matches the place of supply — not on who the brand is.
 *
 * State is derived from the first two digits of a GSTIN, which are the state
 * code. Where a party has no GSTIN the state must be chosen manually.
 */

export const GST_RATE = 18;

/** GST state codes, as used in the first two digits of a GSTIN. */
export const STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
};

export const STATE_OPTIONS = Object.entries(STATE_CODES).map(([code, name]) => ({
  code,
  name,
}));

/** The state code embedded in a GSTIN, or null if it isn't a usable GSTIN. */
export function stateCodeFromGstin(gstin: string | null | undefined): string | null {
  if (!gstin) return null;
  const code = gstin.trim().slice(0, 2);
  return STATE_CODES[code] ? code : null;
}

export function stateName(code: string | null | undefined): string | null {
  return code ? (STATE_CODES[code] ?? null) : null;
}

export interface LineItem {
  description: string;
  quantity: number;
  rate: number;
}

export interface TaxBreakdown {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  total: number;
  /** True when supplier and place of supply share a state. */
  intraState: boolean;
}

export function lineTotal(item: LineItem): number {
  return round2(item.quantity * item.rate);
}

/**
 * Computes the invoice totals.
 *
 * `applyGst` is false for creators below the registration threshold — they
 * invoice without tax, which is the common case under ₹20L turnover.
 */
export function calculateTax(
  items: LineItem[],
  options: {
    applyGst: boolean;
    supplierStateCode: string | null;
    placeOfSupplyCode: string | null;
    rate?: number;
  },
): TaxBreakdown {
  const { applyGst, supplierStateCode, placeOfSupplyCode, rate = GST_RATE } = options;
  const subtotal = round2(items.reduce((sum, i) => sum + lineTotal(i), 0));

  if (!applyGst) {
    return { subtotal, cgst: 0, sgst: 0, igst: 0, totalTax: 0, total: subtotal, intraState: false };
  }

  // Absent a place of supply we cannot know the split; assume intra-state,
  // which is the safer default for a creator invoicing locally.
  const intraState =
    !placeOfSupplyCode || !supplierStateCode || supplierStateCode === placeOfSupplyCode;

  const totalTax = round2((subtotal * rate) / 100);

  if (intraState) {
    const half = round2(totalTax / 2);
    return {
      subtotal,
      cgst: half,
      // Absorb any rounding remainder into SGST so the halves always sum exactly.
      sgst: round2(totalTax - half),
      igst: 0,
      totalTax,
      total: round2(subtotal + totalTax),
      intraState: true,
    };
  }

  return {
    subtotal,
    cgst: 0,
    sgst: 0,
    igst: totalTax,
    totalTax,
    total: round2(subtotal + totalTax),
    intraState: false,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Rupees in words, Indian style — a convention on Indian tax invoices.
 * e.g. 145200 -> "One Lakh Forty Five Thousand Two Hundred Rupees Only"
 */
export function amountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

  let words = rupees > 0 ? `${convert(rupees)} Rupees` : '';
  if (paise > 0) words += `${words ? ' and ' : ''}${convert(paise)} Paise`;
  return `${words} Only`;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function under100(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t} ${o}` : t;
}

/** Indian grouping: crore, lakh, thousand, hundred. */
function convert(n: number): string {
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  if (crore) parts.push(`${convert(crore)} Crore`);
  n %= 10000000;

  const lakh = Math.floor(n / 100000);
  if (lakh) parts.push(`${under100(lakh)} Lakh`);
  n %= 100000;

  const thousand = Math.floor(n / 1000);
  if (thousand) parts.push(`${under100(thousand)} Thousand`);
  n %= 1000;

  const hundred = Math.floor(n / 100);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  n %= 100;

  if (n) parts.push(under100(n));
  return parts.join(' ');
}
