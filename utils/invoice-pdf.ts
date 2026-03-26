import type { Creator, Deal, Invoice } from '@/types';

interface InvoicePdfData {
  invoice: Invoice;
  creator: Creator;
  deal: Deal | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

function getInvoiceNumber(invoice: Invoice): string {
  const num = invoice.invoice_number || 1;
  return `CREZO-${String(num).padStart(4, '0')}`;
}

export { getInvoiceNumber };

export function generateInvoiceHtml({ invoice, creator, deal }: InvoicePdfData): string {
  const brandName = deal?.brand?.name ?? 'Client';
  const brandContact = deal?.brand?.contact_person ?? '';
  const brandEmail = deal?.brand?.email ?? '';
  const brandPhone = deal?.brand?.phone ?? '';
  const invoiceNum = getInvoiceNumber(invoice);
  const invoiceDate = formatDate(invoice.created_at);
  const dueStatus = invoice.status === 'paid' ? 'PAID' : invoice.status.toUpperCase();

  const hasBankDetails = creator.bank_account_number || creator.bank_ifsc || creator.bank_name;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${invoiceNum}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif;
    color: #0f172a;
    background: #fff;
    font-size: 13px;
    line-height: 1.6;
    padding: 0;
  }
  .page {
    max-width: 800px;
    margin: 0 auto;
    padding: 48px;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 40px;
  }
  .brand-block {}
  .brand-logo {
    font-size: 26px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.8px;
    margin-bottom: 12px;
  }
  .brand-details {
    font-size: 12px;
    color: #64748b;
    line-height: 1.7;
  }
  .invoice-block {
    text-align: right;
  }
  .invoice-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #94a3b8;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .invoice-num {
    font-size: 24px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
  }
  .invoice-date {
    font-size: 12px;
    color: #64748b;
  }

  /* Status */
  .status-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 32px;
  }
  .status-badge {
    display: inline-block;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .status-paid { background: #dcfce7; color: #166534; }
  .status-sent { background: #dbeafe; color: #1e40af; }
  .status-draft { background: #f1f5f9; color: #475569; }
  .status-acknowledged { background: #fef3c7; color: #92400e; }

  /* Parties */
  .parties {
    display: flex;
    gap: 48px;
    margin-bottom: 36px;
    padding: 24px;
    background: #f8fafc;
    border-radius: 12px;
  }
  .party { flex: 1; }
  .party-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #94a3b8;
    margin-bottom: 10px;
    font-weight: 700;
  }
  .party-name {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 6px;
  }
  .party-detail {
    color: #64748b;
    font-size: 12px;
    line-height: 1.6;
  }

  /* Separator */
  .divider {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 0 0 28px 0;
  }

  /* Table */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 28px;
  }
  thead tr {
    border-bottom: 2px solid #0f172a;
  }
  th {
    text-align: left;
    padding: 12px 16px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #64748b;
    font-weight: 700;
  }
  th:nth-child(2) { text-align: center; }
  th:last-child { text-align: right; }
  td {
    padding: 16px;
    font-size: 13px;
    border-bottom: 1px solid #f1f5f9;
  }
  td:nth-child(2) { text-align: center; color: #64748b; }
  td:last-child { text-align: right; font-weight: 600; }

  /* Totals */
  .totals-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 36px;
  }
  .totals {
    min-width: 300px;
    background: #f8fafc;
    border-radius: 12px;
    padding: 20px 24px;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 13px;
  }
  .total-row .label { color: #64748b; }
  .total-row .value { font-weight: 600; color: #0f172a; }
  .total-row.grand {
    border-top: 2px solid #0f172a;
    margin-top: 10px;
    padding-top: 14px;
  }
  .total-row.grand .label {
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
  }
  .total-row.grand .value {
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
  }

  /* Payment */
  .payment-section {
    background: #f8fafc;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 28px;
  }
  .payment-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #94a3b8;
    font-weight: 700;
    margin-bottom: 16px;
  }
  .payment-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 32px;
  }
  .payment-item {}
  .payment-label {
    font-size: 11px;
    color: #94a3b8;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .payment-value {
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    font-family: 'SF Mono', 'Fira Code', monospace;
    letter-spacing: 0.5px;
  }

  /* Footer */
  .footer {
    text-align: center;
    padding-top: 24px;
    border-top: 1px solid #e2e8f0;
  }
  .footer-text {
    font-size: 11px;
    color: #94a3b8;
  }
  .footer-brand {
    font-size: 12px;
    font-weight: 700;
    color: #cbd5e1;
    margin-top: 6px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  @media print {
    body { padding: 0; }
    .page { padding: 32px; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="brand-block">
      <div class="brand-logo">Crezo</div>
      <div class="brand-details">
        ${creator.name}<br>
        ${creator.email}${creator.phone ? '<br>' + creator.phone : ''}
        ${creator.gst_number ? '<br>GSTIN: ' + creator.gst_number : ''}
        ${creator.pan_number ? '<br>PAN: ' + creator.pan_number : ''}
      </div>
    </div>
    <div class="invoice-block">
      <div class="invoice-label">Invoice</div>
      <div class="invoice-num">${invoiceNum}</div>
      <div class="invoice-date">
        Date: ${invoiceDate}
        ${invoice.sent_date ? '<br>Sent: ' + formatDate(invoice.sent_date) : ''}
        ${invoice.paid_date ? '<br>Paid: ' + formatDate(invoice.paid_date) : ''}
      </div>
    </div>
  </div>

  <div class="status-row">
    <span class="status-badge status-${invoice.status}">${dueStatus}</span>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Billed To</div>
      <div class="party-name">${brandName}</div>
      ${brandContact ? `<div class="party-detail">${brandContact}</div>` : ''}
      ${brandEmail ? `<div class="party-detail">${brandEmail}</div>` : ''}
      ${brandPhone ? `<div class="party-detail">${brandPhone}</div>` : ''}
    </div>
    <div class="party">
      <div class="party-label">For Project</div>
      <div class="party-name">${deal?.title ?? 'Services Rendered'}</div>
      ${deal?.start_date ? `<div class="party-detail">Start: ${formatDate(deal.start_date)}</div>` : ''}
      ${deal?.end_date ? `<div class="party-detail">End: ${formatDate(deal.end_date)}</div>` : ''}
    </div>
  </div>

  <hr class="divider">

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${deal?.title ?? 'Content creation services'}</strong><br><span style="color:#64748b;font-size:11px">${deal?.brand?.name ? 'Brand: ' + deal.brand.name : ''}</span></td>
        <td>1</td>
        <td>${formatCurrency(invoice.amount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals-wrapper">
    <div class="totals">
      <div class="total-row">
        <span class="label">Subtotal</span>
        <span class="value">${formatCurrency(invoice.amount)}</span>
      </div>
      ${invoice.gst_amount > 0 ? `
      <div class="total-row">
        <span class="label">GST @ 18%${invoice.gstin ? ' (' + invoice.gstin + ')' : ''}</span>
        <span class="value">${formatCurrency(invoice.gst_amount)}</span>
      </div>` : ''}
      <div class="total-row grand">
        <span class="label">Total Due</span>
        <span class="value">${formatCurrency(invoice.total)}</span>
      </div>
    </div>
  </div>

  ${(creator.upi_id || hasBankDetails) ? `
  <div class="payment-section">
    <div class="payment-title">Payment Details</div>
    <div class="payment-grid">
      ${creator.upi_id ? `
      <div class="payment-item">
        <div class="payment-label">UPI ID</div>
        <div class="payment-value">${creator.upi_id}</div>
      </div>` : ''}
      ${creator.bank_name ? `
      <div class="payment-item">
        <div class="payment-label">Bank</div>
        <div class="payment-value">${creator.bank_name}</div>
      </div>` : ''}
      ${creator.bank_account_number ? `
      <div class="payment-item">
        <div class="payment-label">Account Number</div>
        <div class="payment-value">${creator.bank_account_number}</div>
      </div>` : ''}
      ${creator.bank_ifsc ? `
      <div class="payment-item">
        <div class="payment-label">IFSC Code</div>
        <div class="payment-value">${creator.bank_ifsc}</div>
      </div>` : ''}
    </div>
  </div>` : ''}

  <div class="footer">
    <div class="footer-text">Thank you for your business. Payment is due within 15 days of invoice date.</div>
    <div class="footer-brand">CREZO</div>
  </div>

</div>
</body>
</html>`;
}
