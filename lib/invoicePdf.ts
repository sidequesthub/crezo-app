import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { amountInWords, lineTotal, stateName } from '@/constants/gst';
import type { Invoice } from './invoices';
import type { CreatorProfile } from './profile';

/**
 * Renders and shares an invoice PDF.
 *
 * Generated on-device with expo-print rather than server-side: it works
 * offline, needs no hosting, and shares straight into WhatsApp — which is how
 * most Indian brand deals actually get settled.
 */

const money = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dateLabel = (iso: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

export function invoiceHtml(invoice: Invoice, creator: CreatorProfile): string {
  const hasGst = invoice.gst_amount > 0;
  const number = invoice.invoice_number ? `INV-${String(invoice.invoice_number).padStart(4, '0')}` : 'DRAFT';
  const bank = [creator.bank_name, creator.bank_account_number, creator.bank_ifsc].filter(Boolean);

  const rows = invoice.line_items
    .map(
      (item, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${esc(item.description)}</td>
        <td class="c">${esc(invoice.sac_code)}</td>
        <td class="c">${item.quantity}</td>
        <td class="r">${money(item.rate)}</td>
        <td class="r">${money(lineTotal(item))}</td>
      </tr>`,
    )
    .join('');

  const taxRows = hasGst
    ? invoice.igst_amount > 0
      ? `<tr><td>IGST @ ${invoice.gst_rate}%</td><td class="r">${money(invoice.igst_amount)}</td></tr>`
      : `<tr><td>CGST @ ${invoice.gst_rate / 2}%</td><td class="r">${money(invoice.cgst_amount)}</td></tr>
         <tr><td>SGST @ ${invoice.gst_rate / 2}%</td><td class="r">${money(invoice.sgst_amount)}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1a1a1a; margin: 0; padding: 40px; font-size: 12px; line-height: 1.5;
  }
  .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .title { font-size: 30px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
  .sub { color: #6b7280; font-size: 11px; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px; }
  .meta { text-align: right; font-size: 11px; color: #4b5563; }
  .meta strong { color: #111; font-size: 13px; }
  .parties { display: flex; gap: 24px; margin-bottom: 28px; }
  .party { flex: 1; background: #f7f8fa; border-radius: 10px; padding: 16px; }
  .party h3 { margin: 0 0 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: 700; }
  .party .nm { font-weight: 700; font-size: 14px; margin-bottom: 3px; }
  .party div { color: #4b5563; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th {
    background: #f0f2f5; font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px;
    color: #4b5563; padding: 9px 10px; text-align: left; font-weight: 700;
  }
  tbody td { padding: 10px; border-bottom: 1px solid #eceef1; }
  .c { text-align: center; } .r { text-align: right; }
  .totals { margin-left: auto; width: 280px; }
  .totals table { margin: 0; }
  .totals td { padding: 6px 10px; border: none; }
  .totals tr.grand td {
    border-top: 2px solid #111; font-weight: 800; font-size: 15px; padding-top: 10px;
  }
  .words { background: #f7f8fa; border-radius: 8px; padding: 12px 14px; margin: 20px 0; }
  .words span { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
  .pay { display: flex; gap: 24px; margin-top: 28px; padding-top: 20px; border-top: 1px solid #eceef1; }
  .pay > div { flex: 1; }
  .pay h3 { margin: 0 0 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: 700; }
  .foot { margin-top: 36px; padding-top: 16px; border-top: 1px solid #eceef1; color: #9ca3af; font-size: 10px; display: flex; justify-content: space-between; }
  .sign { margin-top: 40px; text-align: right; }
  .sign .line { display: inline-block; border-top: 1px solid #9ca3af; padding-top: 6px; min-width: 180px; font-size: 11px; }
</style></head>
<body>
  <div class="head">
    <div>
      <h1 class="title">${hasGst ? 'Tax Invoice' : 'Invoice'}</h1>
      <div class="sub">${esc(creator.name)}</div>
    </div>
    <div class="meta">
      <strong>${number}</strong><br/>
      Date: ${dateLabel(invoice.invoice_date)}
      ${invoice.due_date ? `<br/>Due: ${dateLabel(invoice.due_date)}` : ''}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>From</h3>
      <div class="nm">${esc(creator.name)}</div>
      ${creator.address ? `<div>${esc(creator.address).replace(/\n/g, '<br/>')}</div>` : ''}
      ${creator.email ? `<div>${esc(creator.email)}</div>` : ''}
      ${creator.phone ? `<div>${esc(creator.phone)}</div>` : ''}
      ${creator.gst_number ? `<div><strong>GSTIN:</strong> ${esc(creator.gst_number)}</div>` : ''}
      ${creator.pan_number ? `<div><strong>PAN:</strong> ${esc(creator.pan_number)}</div>` : ''}
    </div>
    <div class="party">
      <h3>Bill to</h3>
      <div class="nm">${esc(invoice.brand?.name ?? '—')}</div>
      ${invoice.brand?.address ? `<div>${esc(invoice.brand.address).replace(/\n/g, '<br/>')}</div>` : ''}
      ${invoice.brand?.email ? `<div>${esc(invoice.brand.email)}</div>` : ''}
      ${invoice.brand?.gstin ? `<div><strong>GSTIN:</strong> ${esc(invoice.brand.gstin)}</div>` : ''}
      ${
        invoice.place_of_supply
          ? `<div><strong>Place of supply:</strong> ${esc(stateName(invoice.place_of_supply))} (${esc(invoice.place_of_supply)})</div>`
          : ''
      }
    </div>
  </div>

  <table>
    <thead><tr>
      <th class="c" style="width:36px">#</th>
      <th>Description</th>
      <th class="c" style="width:70px">SAC</th>
      <th class="c" style="width:44px">Qty</th>
      <th class="r" style="width:90px">Rate (₹)</th>
      <th class="r" style="width:100px">Amount (₹)</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals"><table>
    <tr><td>Subtotal</td><td class="r">${money(invoice.amount)}</td></tr>
    ${taxRows}
    <tr class="grand"><td>Total</td><td class="r">₹${money(invoice.total)}</td></tr>
  </table></div>

  <div style="clear:both"></div>

  <div class="words">
    <span>Amount in words</span><br/>
    <strong>${esc(amountInWords(invoice.total))}</strong>
  </div>

  ${
    creator.upi_id || bank.length > 0
      ? `<div class="pay">
          ${creator.upi_id ? `<div><h3>UPI</h3><div>${esc(creator.upi_id)}</div></div>` : ''}
          ${
            bank.length > 0
              ? `<div><h3>Bank transfer</h3>
                  ${creator.bank_name ? `<div>${esc(creator.bank_name)}</div>` : ''}
                  ${creator.bank_account_number ? `<div>A/C: ${esc(creator.bank_account_number)}</div>` : ''}
                  ${creator.bank_ifsc ? `<div>IFSC: ${esc(creator.bank_ifsc)}</div>` : ''}
                </div>`
              : ''
          }
        </div>`
      : ''
  }

  ${invoice.notes ? `<div style="margin-top:20px"><h3 style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin:0 0 4px">Notes</h3><div style="color:#4b5563">${esc(invoice.notes).replace(/\n/g, '<br/>')}</div></div>` : ''}

  <div class="sign"><div class="line">Authorised signatory</div></div>

  <div class="foot">
    <span>${hasGst ? 'This is a computer-generated tax invoice.' : 'This is a computer-generated invoice.'}</span>
    <span>Made with Crezo</span>
  </div>
</body></html>`;
}

/** Renders the PDF and opens the OS share sheet. Returns the file URI. */
export async function shareInvoicePdf(
  invoice: Invoice,
  creator: CreatorProfile,
): Promise<string> {
  const { uri } = await Print.printToFileAsync({
    html: invoiceHtml(invoice, creator),
    base64: false,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Invoice ${invoice.invoice_number ?? ''}`.trim(),
      UTI: 'com.adobe.pdf',
    });
  }

  return uri;
}
