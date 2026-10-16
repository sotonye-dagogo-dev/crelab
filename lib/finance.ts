import type { IFinanceConfig } from "@/types";

/* ── Finance pure helpers (no DB, no I/O — unit-tested) ── */

export interface IInvoiceLineItem {
  label: string;
  /** Money in kobo */
  amountKobo: number;
}

export interface IInvoiceData {
  invoiceNumber: string;
  issuedAt: string;
  companyName: string;
  companyEmail: string;
  companyAddress: string;
  billToName: string;
  billToEmail: string;
  bookingId: string;
  providerName: string;
  packageLabel: string;
  paystackRef: string | null;
  paymentStatus: string;
  lineItems: IInvoiceLineItem[];
  /** Money in kobo */
  subtotalKobo: number;
  /** Money in kobo */
  feeKobo: number;
  /** Money in kobo */
  totalKobo: number;
  footerNote: string;
}

export function buildInvoiceNumber(prefix: string, issuedAt: Date, paymentId: string): string {
  const safePrefix = (prefix || "CRL").toUpperCase().replace(/[^A-Z0-9]/g, "") || "CRL";
  const year = issuedAt.getUTCFullYear();
  const suffix = (paymentId || "0000").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase().padEnd(4, "0");
  return `INV-${safePrefix}-${year}-${suffix}`;
}

export function buildInvoiceData(args: {
  finance: IFinanceConfig;
  platformName: string;
  paymentId: string;
  issuedAt?: Date;
  clientName: string;
  clientEmail: string;
  bookingId: string;
  providerName: string;
  packageLabel: string;
  subtotalKobo: number;
  feeKobo: number;
  totalKobo: number;
  paystackRef: string | null;
  paymentStatus: string;
  extraLines?: IInvoiceLineItem[];
}): IInvoiceData {
  const issuedAt = args.issuedAt ?? new Date();
  const lines: IInvoiceLineItem[] = [
    { label: `${args.packageLabel} — ${args.providerName}`, amountKobo: args.subtotalKobo },
    { label: `Platform service fee`, amountKobo: args.feeKobo },
    ...(args.extraLines ?? []),
  ];
  return {
    invoiceNumber: buildInvoiceNumber(args.finance.invoicePrefix, issuedAt, args.paymentId),
    issuedAt: issuedAt.toISOString(),
    companyName: args.finance.companyName || args.platformName,
    companyEmail: args.finance.companyEmail,
    companyAddress: args.finance.companyAddress,
    billToName: args.clientName,
    billToEmail: args.clientEmail,
    bookingId: args.bookingId,
    providerName: args.providerName,
    packageLabel: args.packageLabel,
    paystackRef: args.paystackRef,
    paymentStatus: args.paymentStatus,
    lineItems: lines,
    subtotalKobo: args.subtotalKobo,
    feeKobo: args.feeKobo,
    totalKobo: args.totalKobo,
    footerNote: args.finance.invoiceFooterNote,
  };
}

/** Normalises the admin transactions query params with safe fallbacks. */
export function normalizeTransactionFilters(query: Record<string, string | string[] | undefined>): {
  q: string;
  kind: "ALL" | "PAYMENT" | "WALLET";
  status: string;
  type: string;
  from: string | null;
  to: string | null;
  page: number;
  pageSize: number;
} {
  const first = (v: string | string[] | undefined): string =>
    Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
  const page = Math.max(1, Number.parseInt(first(query.page) || "1", 10) || 1);
  const rawSize = Number.parseInt(first(query.pageSize) || "20", 10) || 20;
  const pageSize = Math.min(100, Math.max(1, rawSize));
  const kindRaw = first(query.kind).toUpperCase();
  const kind = kindRaw === "PAYMENT" || kindRaw === "WALLET" ? kindRaw : "ALL";
  const fromRaw = first(query.from).trim();
  const toRaw = first(query.to).trim();
  const from = fromRaw && !Number.isNaN(Date.parse(fromRaw)) ? fromRaw : null;
  const to = toRaw && !Number.isNaN(Date.parse(toRaw)) ? toRaw : null;
  return {
    q: first(query.q).trim().slice(0, 120),
    kind,
    status: first(query.status).trim().slice(0, 40),
    type: first(query.type).trim().slice(0, 40),
    from,
    to,
    page,
    pageSize,
  };
}

/** Escapes a single CSV cell. */
export function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transactionsToCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(csvCell).join(",");
  const lines = rows.map((r) => columns.map((c) => csvCell((r[c] as string | number | null | undefined) ?? "")).join(","));
  return [header, ...lines].join("\n");
}

/** Buckets an ISO date into a `YYYY-MM-DD` day key (UTC). Returns null for invalid input. */
export function toDayKey(iso: string | Date | null | undefined): string | null {
  if (!iso) return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
