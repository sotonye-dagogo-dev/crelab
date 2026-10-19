"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClBadge,
  ClButton,
  ClCard,
  ClConfirmDialog,
  ClDataTable,
  ClModal,
  ClPagination,
  type ClColumn,
} from "@/components/ui";
import { InvoicePreview } from "@/components/admin/InvoicePreview";
import { transactionsToCsv, type IInvoiceData } from "@/lib/finance";
import { useToast } from "@/lib/toast";
import { Download, ReceiptText, RotateCcw, Search, ScrollText, Undo2, HandCoins } from "lucide-react";

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

interface IBookingRow {
  id: string;
  status: string;
  escrowState: string;
  paymentMode: string;
  subtotalKobo: number;
  feeKobo: number;
  totalKobo: number;
  clientName: string | null;
  clientEmail: string | null;
  providerName: string | null;
  packageLabel: string | null;
  paymentStatus: string | null;
  heldPayments: number;
  paystackRef: string | null;
  serviceDate: string | null;
  createdAt: string;
}

interface IAuditEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
}

interface IBookingDetail {
  booking: IBookingRow;
  payments: {
    id: string;
    amountKobo: number;
    feeKobo: number;
    netAmountKobo: number;
    status: string;
    paystackRef: string;
    createdAt: string;
  }[];
  walletTransactions: {
    id: string;
    type: string;
    amountKobo: number;
    direction: string;
    reference: string;
    createdAt: string;
  }[];
  auditTrail: IAuditEntry[];
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
const BOOKING_STATUS_OPTIONS = ["REQUESTED", "ACCEPTED", "DECLINED", "CANCELLED", "HELD", "IN_PROGRESS", "RELEASED", "DISPUTED", "REFUNDED"];
const ESCROW_STATE_OPTIONS = ["PENDING", "HELD", "IN_PROGRESS", "RELEASED", "DISPUTED", "REFUNDED"];
const PAGE_SIZE = 20;

const kobo = (n: number) => `₦${(n / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function statusBadgeVariant(s: string): "success" | "warning" | "info" | "default" {
  if (["RELEASED", "SYNCED"].includes(s)) return "success";
  if (["HELD", "IN_PROGRESS", "ACCEPTED"].includes(s)) return "info";
  if (["DISPUTED", "REFUNDED", "DECLINED", "CANCELLED"].includes(s)) return "warning";
  return "default";
}

function AuditTrailList({ entries, emptyText }: { entries: IAuditEntry[]; emptyText?: string }) {
  if (entries.length === 0) {
    return (
      <div className="text-[12px] text-[var(--color-text-tertiary)]">
        {emptyText ?? "No audit entries recorded yet."}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
      {entries.map((e) => (
        <div key={e.id} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-accent)]">{e.action}</span>
            <span className="text-[10px] text-[var(--color-text-tertiary)] whitespace-nowrap">{fmtDate(e.createdAt)}</span>
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
            {e.entity && <span className="font-[family-name:var(--font-mono)]">{e.entity}</span>}
            {e.entityId && <span className="text-[var(--color-text-tertiary)]"> · {e.entityId}</span>}
          </div>
          <div className="text-[11px] text-[var(--color-text-tertiary)]">
            by {e.actorName ?? "system"}{e.actorEmail ? ` (${e.actorEmail})` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Merged booking-level + per-transaction audit trail for the selected txn. */
function TxnAuditSection({ txn }: { txn: ITxn }) {
  const ids = useMemo(() => {
    const list = [txn.id];
    if (txn.bookingId) list.push(txn.bookingId);
    return list;
  }, [txn]);

  const { data: entries = [], isLoading } = useQuery<IAuditEntry[]>({
    queryKey: ["admin-finance-txn-audit", ids],
    queryFn: async () => {
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/admin/audit-log?entityId=${encodeURIComponent(id)}&pageSize=25`);
          const json = await res.json();
          if (!json.success) return [] as IAuditEntry[];
          return (json.data ?? []) as IAuditEntry[];
        }),
      );
      const merged = results.flat();
      const seen = new Set<string>();
      return merged
        .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    },
  });

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <ScrollText size={13} strokeWidth={1.8} className="text-[var(--color-text-tertiary)]" />
        <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">Audit trail</span>
        {isLoading && <span className="text-[11px] text-[var(--color-text-tertiary)]">Loading…</span>}
      </div>
      <AuditTrailList
        entries={entries}
        emptyText="No audit entries for this transaction or its booking yet."
      />
    </div>
  );
}

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

  // ── Bookings tab state ──
  const [view, setView] = useState<"txns" | "bookings">("txns");
  const [bPage, setBPage] = useState(1);
  const [bq, setBq] = useState("");
  const [bStatus, setBStatus] = useState("");
  const [bEscrow, setBEscrow] = useState("");
  const [bMode, setBMode] = useState("");
  const [bFrom, setBFrom] = useState("");
  const [bTo, setBTo] = useState("");
  const [bApplied, setBApplied] = useState({ q: "", status: "", escrowState: "", paymentMode: "", from: "", to: "" });
  const [bookingDetailId, setBookingDetailId] = useState<string | null>(null);
  const [settleConfirm, setSettleConfirm] = useState<{ outcome: "RELEASED" | "REFUNDED"; booking: IBookingRow } | null>(null);
  const [runningSettle, setRunningSettle] = useState(false);

  const queryClient = useQueryClient();

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

  // ── Bookings tab data ──
  const bQuery = useMemo(() => {
    const p = new URLSearchParams({ page: String(bPage), pageSize: String(PAGE_SIZE) });
    if (bApplied.q) p.set("q", bApplied.q);
    if (bApplied.status) p.set("status", bApplied.status);
    if (bApplied.escrowState) p.set("escrowState", bApplied.escrowState);
    if (bApplied.paymentMode) p.set("paymentMode", bApplied.paymentMode);
    if (bApplied.from) p.set("from", bApplied.from);
    if (bApplied.to) p.set("to", bApplied.to);
    return p.toString();
  }, [bPage, bApplied]);

  useEffect(() => {
    setBPage(1);
  }, [bApplied]);

  const bookingsQuery = useQuery<{ rows: IBookingRow[]; total: number; page: number; pageSize: number; totalPages: number }>({
    queryKey: ["admin-finance-bookings", bQuery],
    queryFn: async () => {
      const res = await fetch(`/api/admin/finance/bookings?${bQuery}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load bookings");
      return json;
    },
    enabled: view === "bookings",
  });

  const bookingDetailQuery = useQuery<IBookingDetail>({
    queryKey: ["admin-finance-booking-detail", bookingDetailId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/finance/bookings/${bookingDetailId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load booking detail");
      return json.data;
    },
    enabled: !!bookingDetailId,
  });

  const applyBookingFilters = () =>
    setBApplied({ q: bq.trim(), status: bStatus, escrowState: bEscrow, paymentMode: bMode, from: bFrom, to: bTo });
  const resetBookingFilters = () => {
    setBq("");
    setBStatus("");
    setBEscrow("");
    setBMode("");
    setBFrom("");
    setBTo("");
    setBApplied({ q: "", status: "", escrowState: "", paymentMode: "", from: "", to: "" });
  };

  const runSettle = async () => {
    if (!settleConfirm) return;
    const { outcome, booking } = settleConfirm;
    setRunningSettle(true);
    try {
      const res = await fetch(
        `/api/admin/finance/bookings/${booking.id}/${outcome === "RELEASED" ? "release" : "refund"}`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `${outcome} failed`);
      toast(
        outcome === "RELEASED"
          ? "Released held funds to provider (audit logged)"
          : "Refunded held funds to client (audit logged)",
        "success",
      );
      setSettleConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["admin-finance-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-finance-txns"] });
      queryClient.invalidateQueries({ queryKey: ["admin-finance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["admin-finance-booking-detail"] });
    } catch (err) {
      toast(err instanceof Error ? err.message : `${outcome} failed`, "error");
    } finally {
      setRunningSettle(false);
    }
  };

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

  const bookingColumns: ClColumn<IBookingRow>[] = [
    {
      key: "created",
      header: "Date",
      cell: (r) => <span className="text-[11px] font-[family-name:var(--font-mono)] whitespace-nowrap">{fmtDate(r.createdAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <div className="flex flex-col gap-1">
          <ClBadge variant={statusBadgeVariant(r.status)}>{r.status}</ClBadge>
          <ClBadge variant={statusBadgeVariant(r.escrowState)}>escrow: {r.escrowState}</ClBadge>
        </div>
      ),
    },
    {
      key: "parties",
      header: "Parties",
      cell: (r) => (
        <div className="min-w-0">
          <div className="text-[12px] truncate">{r.clientName ?? "—"} → {r.providerName ?? "—"}</div>
          <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">
            {r.packageLabel ?? "—"} · {r.paymentMode}
          </div>
          {r.clientEmail && <div className="text-[10px] text-[var(--color-text-tertiary)] truncate">{r.clientEmail}</div>}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (r) => (
        <div className="whitespace-nowrap">
          <span className="text-[12px] font-bold font-[family-name:var(--font-mono)]">{kobo(r.totalKobo)}</span>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">fee {kobo(r.feeKobo)}</div>
        </div>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      hideOnMobile: true,
      cell: (r) => (
        <div className="min-w-0 max-w-[170px]">
          {r.paymentStatus ? (
            <ClBadge variant={statusBadgeVariant(r.paymentStatus)}>{r.paymentStatus}</ClBadge>
          ) : (
            <span className="text-[11px] text-[var(--color-text-tertiary)]">No payment yet</span>
          )}
          {r.heldPayments > 0 && (
            <div className="text-[10px] text-[var(--color-accent)] mt-0.5">{r.heldPayments} held payment(s)</div>
          )}
          {r.paystackRef && (
            <div className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--color-text-tertiary)] truncate" title={r.paystackRef}>
              {r.paystackRef}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "id",
      header: "Booking",
      hideOnMobile: true,
      cell: (r) => (
        <button
          onClick={() => setBookingDetailId(r.id)}
          className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-accent)] truncate max-w-[120px] block cursor-pointer bg-transparent border-none p-0 text-left"
          title={r.id}
        >
          {r.id}
        </button>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (r) => (
        <div className="flex items-center gap-1 flex-wrap">
          <ClButton variant="ghost" size="sm" onClick={() => setBookingDetailId(r.id)}>
            <ScrollText size={13} strokeWidth={2} className="mr-1" />
            Detail
          </ClButton>
          {r.heldPayments > 0 && (
            <>
              <ClButton
                variant="accent-outlined"
                size="sm"
                onClick={() => setSettleConfirm({ outcome: "RELEASED", booking: r })}
              >
                <HandCoins size={13} strokeWidth={2} className="mr-1" />
                Release
              </ClButton>
              <ClButton
                variant="outlined"
                size="sm"
                onClick={() => setSettleConfirm({ outcome: "REFUNDED", booking: r })}
              >
                <Undo2 size={13} strokeWidth={2} className="mr-1" />
                Refund
              </ClButton>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">Finance & Transactions</h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Every payment, wallet movement and booking across the platform — with invoice generation and audited escrow actions.
          </div>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2">
          <div className="inline-flex rounded-[8px] border border-[var(--color-border)] overflow-hidden self-start sm:self-end">
            {([
              { v: "txns", label: "Transactions" },
              { v: "bookings", label: "Bookings" },
            ] as const).map((t) => (
              <button
                key={t.v}
                onClick={() => setView(t.v)}
                className={`px-4 h-9 text-[12px] font-semibold cursor-pointer border-none ${
                  view === t.v
                    ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <ClButton variant="ghost" size="default" onClick={() => { summaryQuery.refetch(); txnQuery.refetch(); bookingsQuery.refetch(); }} loading={txnQuery.isFetching || bookingsQuery.isFetching}>
              <RotateCcw size={14} strokeWidth={2} className="mr-1.5" />
              Refresh
            </ClButton>
            {view === "txns" && (
              <ClButton variant="accent-outlined" size="default" onClick={exportCsv}>
                <Download size={14} strokeWidth={2} className="mr-1.5" />
                Export CSV
              </ClButton>
            )}
          </div>
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

      {view === "txns" ? (
        <>
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
        </>
      ) : (
        <>
          <ClCard className="mb-4 p-3 sm:p-4">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1">Search</label>
                <input
                  value={bq}
                  onChange={(e) => setBq(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") applyBookingFilters(); }}
                  placeholder="Booking id, client, provider, package…"
                  className="w-full h-9 rounded-[8px] border border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] px-3 text-[13px] outline-none focus:border-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1">Booking status</label>
                <select value={bStatus} onChange={(e) => setBStatus(e.target.value)} className="w-full h-9 rounded-[8px] border border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] px-2 text-[13px] outline-none">
                  <option value="">All</option>
                  {BOOKING_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1">Escrow state</label>
                <select value={bEscrow} onChange={(e) => setBEscrow(e.target.value)} className="w-full h-9 rounded-[8px] border border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] px-2 text-[13px] outline-none">
                  <option value="">All</option>
                  {ESCROW_STATE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1">Payment mode</label>
                <select value={bMode} onChange={(e) => setBMode(e.target.value)} className="w-full h-9 rounded-[8px] border border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] px-2 text-[13px] outline-none">
                  <option value="">All</option>
                  <option value="ESCROW">ESCROW</option>
                  <option value="MILESTONE">MILESTONE</option>
                  <option value="DIRECT">DIRECT</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <ClButton variant="primary" size="default" onClick={applyBookingFilters}>
                  <Search size={14} strokeWidth={2} className="mr-1.5" />
                  Apply
                </ClButton>
                <ClButton variant="ghost" size="default" onClick={resetBookingFilters}>Reset</ClButton>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1">From</label>
                <input type="date" value={bFrom} onChange={(e) => setBFrom(e.target.value)} className="w-full h-9 rounded-[8px] border border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] px-2 text-[13px] outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1">To</label>
                <input type="date" value={bTo} onChange={(e) => setBTo(e.target.value)} className="w-full h-9 rounded-[8px] border border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] px-2 text-[13px] outline-none" />
              </div>
            </div>
          </ClCard>

          {bookingsQuery.isError ? (
            <div className="text-[13px] text-[var(--color-error)]">Failed to load bookings.</div>
          ) : bookingsQuery.isLoading && !bookingsQuery.data ? (
            <div className="text-[var(--color-text-secondary)] text-[14px]">Loading bookings...</div>
          ) : (
            <>
              <ClDataTable
                columns={bookingColumns}
                rows={bookingsQuery.data?.rows ?? []}
                rowKey={(r) => r.id}
                emptyState={
                  <div className="text-[12px] text-[var(--color-text-tertiary)] text-center py-8">
                    No bookings match your filters.
                  </div>
                }
              />
              <ClPagination
                page={bookingsQuery.data?.page ?? bPage}
                totalPages={bookingsQuery.data?.totalPages ?? 1}
                onPageChange={setBPage}
                pageSize={bookingsQuery.data?.pageSize ?? PAGE_SIZE}
                totalItems={bookingsQuery.data?.total ?? 0}
                className="mt-3"
              />
            </>
          )}
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
            <TxnAuditSection txn={selected} />
          </div>
        )}
      </ClModal>

      {/* Booking financial detail (payments + wallet ledger + audit trail) */}
      <ClModal
        open={bookingDetailId !== null}
        onClose={() => setBookingDetailId(null)}
        title="Booking financials"
        size="lg"
      >
        {bookingDetailQuery.isLoading && <div className="text-[13px] text-[var(--color-text-secondary)]">Loading booking…</div>}
        {bookingDetailQuery.isError && (
          <div className="text-[13px] text-[var(--color-error)]">{bookingDetailQuery.error instanceof Error ? bookingDetailQuery.error.message : "Failed to load booking"}</div>
        )}
        {bookingDetailQuery.data && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="col-span-2 break-all"><span className="text-[var(--color-text-tertiary)]">Booking:</span> <span className="font-[family-name:var(--font-mono)] text-[12px]">{bookingDetailQuery.data.booking.id}</span></div>
              <div><span className="text-[var(--color-text-tertiary)]">Status:</span> <ClBadge variant={statusBadgeVariant(bookingDetailQuery.data.booking.status)}>{bookingDetailQuery.data.booking.status}</ClBadge></div>
              <div><span className="text-[var(--color-text-tertiary)]">Escrow:</span> <ClBadge variant={statusBadgeVariant(bookingDetailQuery.data.booking.escrowState)}>{bookingDetailQuery.data.booking.escrowState}</ClBadge></div>
              <div><span className="text-[var(--color-text-tertiary)]">Client:</span> {bookingDetailQuery.data.booking.clientName ?? "—"}</div>
              <div><span className="text-[var(--color-text-tertiary)]">Provider:</span> {bookingDetailQuery.data.booking.providerName ?? "—"}</div>
              <div><span className="text-[var(--color-text-tertiary)]">Total:</span> <strong className="font-[family-name:var(--font-mono)]">{kobo(bookingDetailQuery.data.booking.totalKobo)}</strong></div>
              <div><span className="text-[var(--color-text-tertiary)]">Fee:</span> <span className="font-[family-name:var(--font-mono)]">{kobo(bookingDetailQuery.data.booking.feeKobo)}</span></div>
            </div>

            <div>
              <div className="text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Payments</div>
              {bookingDetailQuery.data.payments.length === 0 ? (
                <div className="text-[12px] text-[var(--color-text-tertiary)]">No payments recorded.</div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {bookingDetailQuery.data.payments.map((p) => (
                    <div key={p.id} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-[12px] flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-[family-name:var(--font-mono)] text-[11px] truncate" title={p.id}>{p.id}</div>
                        <div className="text-[10px] text-[var(--color-text-tertiary)] font-[family-name:var(--font-mono)] truncate" title={p.paystackRef}>{p.paystackRef}</div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <div className="font-bold font-[family-name:var(--font-mono)]">{kobo(p.amountKobo)}</div>
                        <ClBadge variant={statusBadgeVariant(p.status)}>{p.status}</ClBadge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Wallet ledger (this booking)</div>
              {bookingDetailQuery.data.walletTransactions.length === 0 ? (
                <div className="text-[12px] text-[var(--color-text-tertiary)]">No wallet movements recorded.</div>
              ) : (
                <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
                  {bookingDetailQuery.data.walletTransactions.map((w) => (
                    <div key={w.id} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-[family-name:var(--font-mono)] text-[var(--color-text-secondary)]">{w.type}</span>
                      <span className={`font-[family-name:var(--font-mono)] ${w.direction === "DEBIT" ? "text-[var(--color-error)]" : "text-[var(--color-accent)]"}`}>
                        {w.direction === "DEBIT" ? "−" : "+"}{kobo(w.amountKobo)}
                      </span>
                      <span className="text-[var(--color-text-tertiary)] font-[family-name:var(--font-mono)] truncate max-w-[140px]" title={w.reference}>{w.reference}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Audit trail (booking + payments)</div>
              <AuditTrailList entries={bookingDetailQuery.data.auditTrail} />
            </div>

            <div className="flex justify-end gap-2">
              <ClButton
                variant="ghost"
                size="default"
                onClick={() => {
                  const params = new URLSearchParams({ bookingId: bookingDetailQuery.data!.booking.id });
                  fetch(`/api/admin/finance/invoice?${params.toString()}`)
                    .then((r) => r.json())
                    .then((json) => {
                      if (!json.success) throw new Error(json.error ?? "Invoice unavailable");
                      setInvoice(json.data);
                      setSelected({
                        id: bookingDetailQuery.data!.booking.id,
                        kind: "PAYMENT",
                        type: "BOOKING",
                        status: bookingDetailQuery.data!.booking.paymentStatus ?? "—",
                        amountKobo: bookingDetailQuery.data!.booking.totalKobo,
                        feeKobo: bookingDetailQuery.data!.booking.feeKobo,
                        direction: null,
                        reference: bookingDetailQuery.data!.booking.paystackRef ?? "",
                        bookingId: bookingDetailQuery.data!.booking.id,
                        actorName: bookingDetailQuery.data!.booking.clientName,
                        actorEmail: bookingDetailQuery.data!.booking.clientEmail,
                        providerName: bookingDetailQuery.data!.booking.providerName,
                        createdAt: bookingDetailQuery.data!.booking.createdAt,
                      });
                    })
                    .catch((err) => setInvoiceError(err instanceof Error ? err.message : "Invoice unavailable"));
                }}
              >
                <ReceiptText size={14} strokeWidth={2} className="mr-1" />
                Invoice
              </ClButton>
              {bookingDetailQuery.data.booking.heldPayments > 0 && (
                <>
                  <ClButton
                    variant="accent-outlined"
                    size="default"
                    onClick={() => setSettleConfirm({ outcome: "RELEASED", booking: bookingDetailQuery.data!.booking })}
                  >
                    <HandCoins size={14} strokeWidth={2} className="mr-1" />
                    Release
                  </ClButton>
                  <ClButton
                    variant="outlined"
                    size="default"
                    onClick={() => setSettleConfirm({ outcome: "REFUNDED", booking: bookingDetailQuery.data!.booking })}
                  >
                    <Undo2 size={14} strokeWidth={2} className="mr-1" />
                    Refund
                  </ClButton>
                </>
              )}
            </div>
          </div>
        )}
      </ClModal>

      <ClConfirmDialog
        open={settleConfirm !== null}
        title={settleConfirm?.outcome === "RELEASED" ? "Release escrow to provider" : "Refund held funds to client"}
        message={
          settleConfirm?.outcome === "RELEASED"
            ? `Release the held escrow funds for booking ${settleConfirm?.booking.id} to ${settleConfirm?.booking.providerName ?? "the provider"}? This uses the exact same settlement path as the regular (non-admin) release flow and will be recorded in the audit trail (general + per-transaction).`
            : `Refund the held escrow funds for booking ${settleConfirm?.booking.id} back to ${settleConfirm?.booking.clientName ?? "the client"}? This uses the exact same refund path as dispute resolution and will be recorded in the audit trail (general + per-transaction).`
        }
        confirmLabel={settleConfirm?.outcome === "RELEASED" ? "Release funds" : "Refund funds"}
        loading={runningSettle}
        onConfirm={runSettle}
        onCancel={() => setSettleConfirm(null)}
      />
    </div>
  );
}
