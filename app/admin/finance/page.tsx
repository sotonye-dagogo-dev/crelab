"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClButton, ClCard, ClDataTable, ClModal, ClPagination, type ClColumn } from "@/components/ui";
import { InvoicePreview } from "@/components/admin/InvoicePreview";
import { transactionsToCsv, type IInvoiceData } from "@/lib/finance";
import { useToast } from "@/lib/toast";
import { Download, ReceiptText, RotateCcw, Search } from "lucide-react";

interface IFinanceSummary {
  lifetimeGmvKobo: number;
  lifetimeFeesKobo: number;
  heldEscrowKobo: number;
  walletBalancesKobo: number;
  totalPayments: number;
  refundedPayments: number;
  totalBookings: number;
  bookingsByStatus: Record<string, number>;
}

interface ITxn {
  id: string;
  kind: "PAYMENT" | "WALLET";
  type: string;
  status: string;
  amountKobo: number;
  feeKobo: number;
  direction: "CREDIT" | "DEBIT" | null;
  reference: string;
  bookingId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  providerName: string | null;
  createdAt: string;
}

const WALLET_TYPES = [
  "TOPUP_CARD",
  "TOPUP_BANK",
  "BOOKING_DEBIT",
  "ESCROW_HOLD",
  "ESCROW_RELEASE",
  "MILESTONE_DEBIT",
  "MILESTONE_RELEASE",
  "DIRECT_PAYMENT_DEBIT",
  "DIRECT_PAYMENT_CREDIT",
  "WITHDRAWAL",
  "FEE_DEBIT",
  "REFUND",
];

const PAYMENT_STATUSES = ["HELD", "RELEASED", "REFUNDED", "DISPUTED"];
const PAGE_SIZE = 20;

const kobo = (n: number) => `₦${(n / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function AdminFinancePage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("ALL");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ q: "", kind: "ALL", status: "", type: "", from: "", to: "" });
  const [selected, setSelected] = useState<ITxn | null>(null);
  const [invoice, setInvoice] = useState<IInvoiceData | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [applied]);

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (applied.q) p.set("q", applied.q);
    if (applied.kind !== "ALL") p.set("kind", applied.kind);
    if (applied.status) p.set("status", applied.status);
    if (applied.type) p.set("type", applied.type);
    if (applied.from) p.set("from", applied.from);
    if (applied.to) p.set("to", applied.to);
    return p.toString();
  }, [page, applied]);

  const summaryQuery = useQuery<IFinanceSummary>({
    queryKey: ["admin-finance-summary"],
    queryFn: async () => {
      const res = await fetch("/api/admin/finance/summary");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load summary");
      return json.data;
    },
  });

  const txnQuery = useQuery<{ rows: ITxn[]; total: number; page: number; pageSize: number; totalPages: number }>({
    queryKey: ["admin-finance-txns", query],
    queryFn: async () => {
      const res = await fetch(`/api/admin/finance/transactions?${query}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load transactions");
      return json;
    },
  });

  const applyFilters = () => setApplied({ q: q.trim(), kind, status, type, from, to });
  const resetFilters = () => {
    setQ("");
    setKind("ALL");
    setStatus("");
    setType("");
    setFrom("");
    setTo("");
    setApplied({ q: "", kind: "ALL", status: "", type: "", from: "", to: "" });
    setPage(1);
  };

  const openInvoice = async (txn: ITxn) => {
    setSelected(txn);
    setInvoice(null);
    setInvoiceError(null);
    if (!txn.bookingId && txn.kind !== "PAYMENT") {
      setInvoiceError("This ledger entry is not linked to a booking, so no invoice can be generated.");
      return;
    }
    setInvoiceLoading(true);
    try {
      const params = new URLSearchParams();
      if (txn.kind === "PAYMENT") params.set("paymentId", txn.id);
      else if (txn.bookingId) params.set("bookingId", txn.bookingId);
      const res = await fetch(`/api/admin/finance/invoice?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Invoice unavailable");
      setInvoice(json.data);
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : "Invoice unavailable");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const exportCsv = () => {
    const rows = txnQuery.data?.rows ?? [];
    if (rows.length === 0) {
      toast("Nothing to export on this page", "error");
      return;
    }
    const cols = ["id", "kind", "type", "status", "amountKobo", "feeKobo", "direction", "reference", "bookingId", "actorName", "actorEmail", "providerName", "createdAt"];
    const csv = transactionsToCsv(rows as unknown as Record<string, unknown>[], cols);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Transactions exported as CSV", "success");
  };

  const stats = summaryQuery.data;
  const statCards = [
    { label: "Lifetime GMV", value: stats ? kobo(stats.lifetimeGmvKobo) : "—", hint: `${stats?.totalPayments ?? 0} payments` },
    { label: "Platform fees earned", value: stats ? kobo(stats.lifetimeFeesKobo) : "—", hint: "lifetime" },
    { label: "Held in escrow", value: stats ? kobo(stats.heldEscrowKobo) : "—", hint: "across wallets" },
    { label: "Wallet balances", value: stats ? kobo(stats.walletBalancesKobo) : "—", hint: "user funds" },
    { label: "Refunded payments", value: stats ? String(stats.refundedPayments) : "—", hint: `${stats?.totalBookings ?? 0} bookings` },
  ];

  const columns: ClColumn<ITxn>[] = [
    {
      key: "created",
      header: "Date",
      cell: (r) => <span className="text-[11px] font-[family-name:var(--font-mono)] whitespace-nowrap">{fmtDate(r.createdAt)}</span>,
    },
    {
      key: "kind",
      header: "Kind",
      cell: (r) => (
        <span
          className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
            r.kind === "PAYMENT" ? "bg-[var(--color-accent)] text-[#0A0A0A]" : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]"
          }`}
        >
          {r.kind}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type / Status",
      cell: (r) => (
        <div className="min-w-0">
          <div className="text-[12px] font-[family-name:var(--font-mono)] break-all">{r.type}</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">{r.status}{r.direction ? ` · ${r.direction}` : ""}</div>
        </div>
      ),
    },
    {
      key: "parties",
      header: "Parties",
      cell: (r) => (
        <div className="min-w-0">
          <div className="text-[12px] truncate">{r.actorName ?? "—"}{r.providerName ? ` → ${r.providerName}` : ""}</div>
          {r.actorEmail && <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">{r.actorEmail}</div>}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (r) => (
        <span className={`text-[12px] font-bold font-[family-name:var(--font-mono)] whitespace-nowrap ${r.direction === "DEBIT" ? "text-[var(--color-error)]" : "text-[var(--color-accent)]"}`}>
          {r.direction === "DEBIT" ? "−" : r.direction === "CREDIT" ? "+" : ""}{kobo(r.amountKobo)}
        </span>
      ),
    },
    {
      key: "ref",
      header: "Reference",
      hideOnMobile: true,
      cell: (r) => (
        <div className="min-w-0 max-w-[180px]">
          <div className="text-[11px] font-[family-name:var(--font-mono)] truncate" title={r.reference}>{r.reference}</div>
          {r.bookingId && <div className="text-[10px] text-[var(--color-text-tertiary)] truncate" title={r.bookingId}>{r.bookingId}</div>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <ClButton variant="ghost" size="sm" onClick={() => openInvoice(r)} disabled={!r.bookingId && r.kind !== "PAYMENT"}>
          <ReceiptText size={14} strokeWidth={2} className="mr-1" />
          Invoice
        </ClButton>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">Finance & Transactions</h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Every payment and wallet movement across the platform — with invoice generation.
          </div>
        </div>
        <div className="flex gap-2">
          <ClButton variant="ghost" size="default" onClick={() => { summaryQuery.refetch(); txnQuery.refetch(); }} loading={txnQuery.isFetching}>
            <RotateCcw size={14} strokeWidth={2} className="mr-1.5" />
            Refresh
          </ClButton>
          <ClButton variant="accent-outlined" size="default" onClick={exportCsv}>
            <Download size={14} strokeWidth={2} className="mr-1.5" />
            Export CSV
          </ClButton>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        {statCards.map((s) => (
          <ClCard key={s.label} className="p-4">
            <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] font-semibold">{s.label}</div>
            <div className="text-[18px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-accent)] mt-1 truncate" title={s.value}>
              {summaryQuery.isLoading ? "…" : s.value}
            </div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">{s.hint}</div>
          </ClCard>
        ))}
      </div>
      {summaryQuery.isError && (
        <div className="text-[13px] text-[var(--color-error)] mb-4">Could not load the finance summary — the table below still works.</div>
      )}

      <ClCard className="mb-4 p-3 sm:p-4">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
              placeholder="Name, email, reference, booking…"
              className="w-full h-9 rounded-[8px] border border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] px-3 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1">Kind</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full h-9 rounded-[8px] border border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] px-2 text-[13px] outline-none">
              <option value="ALL">All</option>
              <option value="PAYMENT">Payments</option>
              <option value="WALLET">Wallet</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1">Pay status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-9 rounded-[8px] border border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] px-2 text-[13px] outline-none">
              <option value="">All</option>
              {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1">Wallet type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-9 rounded-[8px] border border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] px-2 text-[13px] outline-none">
              <option value="">All</option>
              {WALLET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <ClButton variant="primary" size="default" onClick={applyFilters}>
              <Search size={14} strokeWidth={2} className="mr-1.5" />
              Apply
            </ClButton>
            <ClButton variant="ghost" size="default" onClick={resetFilters}>Reset</ClButton>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full h-9 rounded-[8px] border border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] px-2 text-[13px] outline-none" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full h-9 rounded-[8px] border border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] px-2 text-[13px] outline-none" />
          </div>
        </div>
      </ClCard>

      {txnQuery.isError ? (
        <div className="text-[13px] text-[var(--color-error)]">Failed to load transactions.</div>
      ) : txnQuery.isLoading ? (
        <div className="text-[var(--color-text-secondary)] text-[14px]">Loading transactions...</div>
      ) : (
        <>
          <ClDataTable
            columns={columns}
            rows={txnQuery.data?.rows ?? []}
            rowKey={(r) => `${r.kind}-${r.id}`}
            emptyState={
              <div className="text-[12px] text-[var(--color-text-tertiary)] text-center py-8">
                No transactions match your filters. Try widening the date range or clearing the search.
              </div>
            }
          />
          <ClPagination
            page={txnQuery.data?.page ?? page}
            totalPages={txnQuery.data?.totalPages ?? 1}
            onPageChange={setPage}
            pageSize={txnQuery.data?.pageSize ?? PAGE_SIZE}
            totalItems={txnQuery.data?.total ?? 0}
            className="mt-3"
          />
        </>
      )}

      <ClModal open={selected !== null} onClose={() => { setSelected(null); setInvoice(null); setInvoiceError(null); }} title="Transaction & Invoice" size="lg">
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div><span className="text-[var(--color-text-tertiary)]">Kind:</span> {selected.kind}</div>
              <div><span className="text-[var(--color-text-tertiary)]">Type:</span> <span className="font-[family-name:var(--font-mono)]">{selected.type}</span></div>
              <div><span className="text-[var(--color-text-tertiary)]">Amount:</span> <strong className="font-[family-name:var(--font-mono)]">{kobo(selected.amountKobo)}</strong></div>
              <div><span className="text-[var(--color-text-tertiary)]">Date:</span> {fmtDate(selected.createdAt)}</div>
              <div className="col-span-2 break-all"><span className="text-[var(--color-text-tertiary)]">Reference:</span> <span className="font-[family-name:var(--font-mono)] text-[12px]">{selected.reference}</span></div>
              {selected.bookingId && <div className="col-span-2 break-all"><span className="text-[var(--color-text-tertiary)]">Booking:</span> <span className="font-[family-name:var(--font-mono)] text-[12px]">{selected.bookingId}</span></div>}
            </div>
            {invoiceLoading && <div className="text-[13px] text-[var(--color-text-secondary)]">Generating invoice...</div>}
            {invoiceError && <div className="text-[13px] text-[var(--color-error)]">{invoiceError}</div>}
            {invoice && <InvoicePreview invoice={invoice} />}
          </div>
        )}
      </ClModal>
    </div>
  );
}
