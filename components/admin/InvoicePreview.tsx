"use client";

import type { IInvoiceData } from "@/lib/finance";

function kobo(n: number): string {
  return `₦${(n / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Printable invoice preview. Uses a white card that prints cleanly via the
 * browser print dialog (admin prints / saves to PDF from there), plus an
 * HTML-file download for record-keeping. Amounts arrive in kobo already.
 */
export function InvoicePreview({ invoice }: { invoice: IInvoiceData }) {
  const print = () => window.print();

  const downloadHtml = () => {
    const rows = invoice.lineItems
      .map((l) => `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(l.label)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${kobo(l.amountKobo)}</td></tr>`)
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(invoice.invoiceNumber)}</title></head><body style="font-family:Arial,sans-serif;max-width:640px;margin:32px auto;color:#111;">
<h1>${escapeHtml(invoice.invoiceNumber)}</h1>
<p>Issued: ${escapeHtml(invoice.issuedAt.slice(0, 10))} · Status: ${escapeHtml(invoice.paymentStatus)}</p>
<p><strong>From:</strong> ${escapeHtml(invoice.companyName)} · ${escapeHtml(invoice.companyEmail)} · ${escapeHtml(invoice.companyAddress)}</p>
<p><strong>Bill to:</strong> ${escapeHtml(invoice.billToName)} (${escapeHtml(invoice.billToEmail)})</p>
<p>Booking: ${escapeHtml(invoice.bookingId)}${invoice.paystackRef ? ` · Ref: ${escapeHtml(invoice.paystackRef)}` : ""}</p>
<table style="width:100%;border-collapse:collapse;margin-top:16px;"><tbody>${rows}</tbody></table>
<p style="text-align:right;"><strong>Subtotal:</strong> ${kobo(invoice.subtotalKobo)}<br><strong>Fee:</strong> ${kobo(invoice.feeKobo)}<br><strong>Total:</strong> ${kobo(invoice.totalKobo)}</p>
<p style="font-size:12px;color:#555;">${escapeHtml(invoice.footerNote)}</p>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.invoiceNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="print-area">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <div>
          <div className="text-[16px] font-bold font-[family-name:var(--font-mono)]">{invoice.invoiceNumber}</div>
          <div className="text-[12px] text-[var(--color-text-secondary)]">
            Issued {new Date(invoice.issuedAt).toLocaleDateString("en-GB")} · {invoice.paymentStatus}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadHtml}
            className="h-9 px-3 rounded-[8px] border border-[var(--color-border-mid)] bg-transparent text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            Download
          </button>
          <button
            onClick={print}
            className="h-9 px-4 rounded-[8px] bg-[var(--color-accent)] text-[#0A0A0A] text-[13px] font-semibold cursor-pointer border-none"
          >
            Print / PDF
          </button>
        </div>
      </div>

      <div className="rounded-[12px] border border-[var(--color-border)] bg-white text-[#111] p-6 print:border-none">
        <div className="flex justify-between items-start gap-4 pb-4 border-b border-[#eee]">
          <div>
            <div className="text-[18px] font-bold">{invoice.companyName}</div>
            <div className="text-[12px] text-[#555]">{invoice.companyAddress}</div>
            <div className="text-[12px] text-[#555]">{invoice.companyEmail}</div>
          </div>
          <div className="text-right">
            <div className="text-[16px] font-bold font-[family-name:var(--font-mono)]">INVOICE</div>
            <div className="text-[12px] text-[#555] font-[family-name:var(--font-mono)]">{invoice.invoiceNumber}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 text-[13px]">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#777] mb-1">Bill to</div>
            <div className="font-semibold">{invoice.billToName}</div>
            <div className="text-[#555]">{invoice.billToEmail || "—"}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-[#777] mb-1">Details</div>
            <div>Booking: <span className="font-[family-name:var(--font-mono)] text-[12px]">{invoice.bookingId}</span></div>
            {invoice.paystackRef && <div>Ref: <span className="font-[family-name:var(--font-mono)] text-[12px]">{invoice.paystackRef}</span></div>}
            <div>Status: {invoice.paymentStatus}</div>
          </div>
        </div>

        <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[#777]">
              <th className="py-2 pr-2 font-semibold">Description</th>
              <th className="py-2 pl-2 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((l, i) => (
              <tr key={i} className="border-t border-[#eee]">
                <td className="py-2 pr-2">{l.label}</td>
                <td className="py-2 pl-2 text-right font-[family-name:var(--font-mono)]">{kobo(l.amountKobo)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end pt-4 text-[13px]">
          <div className="w-[220px]">
            <div className="flex justify-between py-1"><span className="text-[#555]">Subtotal</span><span className="font-[family-name:var(--font-mono)]">{kobo(invoice.subtotalKobo)}</span></div>
            <div className="flex justify-between py-1"><span className="text-[#555]">Platform fee</span><span className="font-[family-name:var(--font-mono)]">{kobo(invoice.feeKobo)}</span></div>
            <div className="flex justify-between py-2 border-t border-[#111] mt-1 font-bold text-[15px"><span>Total</span><span className="font-[family-name:var(--font-mono)]">{kobo(invoice.totalKobo)}</span></div>
          </div>
        </div>

        <p className="text-[11px] text-[#777] pt-4 border-t border-[#eee] mt-2">{invoice.footerNote}</p>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
