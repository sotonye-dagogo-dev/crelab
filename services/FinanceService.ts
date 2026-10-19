import { db } from "@/lib/db";
import {
  bookings,
  payments,
  providers,
  servicePackages,
  user,
  wallets,
  walletTransactions,
} from "@/drizzle/schema";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { AuditService, type AuditLogEntry } from "@/services/AuditService";
import { EscrowService } from "@/services/EscrowService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import {
  buildInvoiceData,
  normalizeBookingFilters,
  normalizeTransactionFilters,
  toDayKey,
  type IInvoiceData,
} from "@/lib/finance";

export interface IFinanceSummary {
  /** Money in kobo */
  lifetimeGmvKobo: number;
  /** Money in kobo */
  lifetimeFeesKobo: number;
  /** Money in kobo */
  heldEscrowKobo: number;
  /** Money in kobo */
  walletBalancesKobo: number;
  totalPayments: number;
  refundedPayments: number;
  totalBookings: number;
  bookingsByStatus: Record<string, number>;
}

export interface IUnifiedTransaction {
  id: string;
  kind: "PAYMENT" | "WALLET";
  type: string;
  status: string;
  /** Money in kobo (signed display handled client-side via direction) */
  amountKobo: number;
  feeKobo: number;
  direction: "CREDIT" | "DEBIT" | null;
  reference: string;
  bookingId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  providerName: string | null;
  /** ISO 8601 */
  createdAt: string;
}

export interface ITransactionList {
  rows: IUnifiedTransaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IAdminBookingRow {
  id: string;
  status: string;
  escrowState: string;
  paymentMode: string;
  /** Money in kobo */
  subtotalKobo: number;
  /** Money in kobo */
  feeKobo: number;
  /** Money in kobo */
  totalKobo: number;
  clientName: string | null;
  clientEmail: string | null;
  providerName: string | null;
  packageLabel: string | null;
  /** Status of the most recent payment row, if any. */
  paymentStatus: string | null;
  /** Count of payments currently in HELD state (funds actionable). */
  heldPayments: number;
  paystackRef: string | null;
  serviceDate: string | null;
  /** ISO 8601 */
  createdAt: string;
}

export interface IBookingList {
  rows: IAdminBookingRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IBookingFinanceDetail {
  booking: IAdminBookingRow;
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
  /** Audit entries for the booking itself AND each of its payments (merged). */
  auditTrail: AuditLogEntry[];
}

const SEARCH_CAP = 500;

export class FinanceService {
  /* ── Summary KPIs (lifetime; analytics page covers windowed trends) ── */

  async getSummary(): Promise<IFinanceSummary> {
    const [payAgg] = await db
      .select({
        gmv: sql<number>`COALESCE(SUM(${payments.amount}), 0)`.as("gmv"),
        fees: sql<number>`COALESCE(SUM(${payments.fee}), 0)`.as("fees"),
        count: sql<number>`COUNT(*)`.as("count"),
        refunded: sql<number>`COUNT(*) FILTER (WHERE ${payments.status} = 'REFUNDED')`.as("refunded"),
      })
      .from(payments);

    const [walletAgg] = await db
      .select({
        balances: sql<number>`COALESCE(SUM(${wallets.balanceKobo}), 0)`.as("balances"),
        escrow: sql<number>`COALESCE(SUM(${wallets.escrowKobo}), 0)`.as("escrow"),
      })
      .from(wallets);

    const statusRows = await db
      .select({ status: bookings.status, count: sql<number>`COUNT(*)`.as("count") })
      .from(bookings)
      .groupBy(bookings.status);

    const bookingsByStatus: Record<string, number> = {};
    let totalBookings = 0;
    for (const r of statusRows) {
      const c = Number(r.count ?? 0);
      bookingsByStatus[r.status] = c;
      totalBookings += c;
    }

    return {
      lifetimeGmvKobo: Number(payAgg?.gmv ?? 0),
      lifetimeFeesKobo: Number(payAgg?.fees ?? 0),
      heldEscrowKobo: Number(walletAgg?.escrow ?? 0),
      walletBalancesKobo: Number(walletAgg?.balances ?? 0),
      totalPayments: Number(payAgg?.count ?? 0),
      refundedPayments: Number(payAgg?.refunded ?? 0),
      totalBookings,
      bookingsByStatus,
    };
  }

  /* ── Unified transaction feed (payments + wallet ledger, merged in memory) ── */

  async listTransactions(rawQuery: Record<string, string | string[] | undefined>): Promise<ITransactionList> {
    const f = normalizeTransactionFilters(rawQuery);
    const fromDate = f.from ? new Date(f.from) : null;
    // Inclusive end-of-day for `to` so a date pick covers the whole day.
    const toDate = f.to ? new Date(new Date(f.to).getTime() + 86399999) : null;

    const rows: IUnifiedTransaction[] = [];

    if (f.kind === "ALL" || f.kind === "PAYMENT") {
      const payConds = [];
      if (fromDate) payConds.push(gte(payments.createdAt, fromDate));
      if (toDate) payConds.push(lte(payments.createdAt, toDate));
      if (f.status) payConds.push(eq(payments.status, f.status));
      if (f.q) {
        payConds.push(
          or(
            ilike(payments.paystackRef, `%${f.q}%`),
            ilike(payments.bookingId, `%${f.q}%`),
            ilike(payments.id, `%${f.q}%`),
          ),
        );
      }
      const payRows = await db
        .select({
          id: payments.id,
          amount: payments.amount,
          fee: payments.fee,
          status: payments.status,
          paystackRef: payments.paystackRef,
          bookingId: payments.bookingId,
          createdAt: payments.createdAt,
          clientName: user.name,
          clientEmail: user.email,
          providerName: providers.displayName,
          packageLabel: servicePackages.label,
        })
        .from(payments)
        .leftJoin(bookings, eq(bookings.id, payments.bookingId))
        .leftJoin(user, eq(user.id, bookings.clientId))
        .leftJoin(providers, eq(providers.id, bookings.providerId))
        .leftJoin(servicePackages, eq(servicePackages.id, bookings.packageId))
        .where(payConds.length > 0 ? and(...payConds) : undefined)
        .orderBy(desc(payments.createdAt))
        .limit(SEARCH_CAP);

      for (const r of payRows) {
        rows.push({
          id: r.id,
          kind: "PAYMENT",
          type: "PAYMENT",
          status: r.status,
          amountKobo: r.amount,
          feeKobo: r.fee,
          direction: null,
          reference: r.paystackRef,
          bookingId: r.bookingId,
          actorName: r.clientName ?? null,
          actorEmail: r.clientEmail ?? null,
          providerName: r.providerName ?? null,
          createdAt: r.createdAt.toISOString(),
        });
      }
    }

    if (f.kind === "ALL" || f.kind === "WALLET") {
      const wConds = [];
      if (fromDate) wConds.push(gte(walletTransactions.createdAt, fromDate));
      if (toDate) wConds.push(lte(walletTransactions.createdAt, toDate));
      if (f.type) wConds.push(eq(walletTransactions.type, f.type as never));
      if (f.q) {
        wConds.push(
          or(
            ilike(walletTransactions.reference, `%${f.q}%`),
            ilike(walletTransactions.paystackRef, `%${f.q}%`),
            ilike(user.email, `%${f.q}%`),
            ilike(user.name, `%${f.q}%`),
          ),
        );
      }
      const wRows = await db
        .select({
          id: walletTransactions.id,
          type: walletTransactions.type,
          amountKobo: walletTransactions.amountKobo,
          direction: walletTransactions.direction,
          reference: walletTransactions.reference,
          bookingId: walletTransactions.relatedBookingId,
          createdAt: walletTransactions.createdAt,
          actorName: user.name,
          actorEmail: user.email,
        })
        .from(walletTransactions)
        .leftJoin(wallets, eq(wallets.id, walletTransactions.walletId))
        .leftJoin(user, eq(user.id, wallets.userId))
        .where(wConds.length > 0 ? and(...wConds) : undefined)
        .orderBy(desc(walletTransactions.createdAt))
        .limit(SEARCH_CAP);

      // Provider names for wallet rows need a second hop; resolve only the
      // page-relevant booking ids to keep the query bounded.
      const bookingIds = [...new Set(wRows.map((r) => r.bookingId).filter((b): b is string => !!b))].slice(0, 100);
      const providerByBooking = new Map<string, string>();
      if (bookingIds.length > 0) {
        const bRows = await db
          .select({ bookingId: bookings.id, providerName: providers.displayName })
          .from(bookings)
          .leftJoin(providers, eq(providers.id, bookings.providerId))
          .where(sql`${bookings.id} IN (${sql.join(bookingIds.map((b) => sql`${b}`), sql`, `)})`);
        for (const b of bRows) if (b.providerName) providerByBooking.set(b.bookingId, b.providerName);
      }

      for (const r of wRows) {
        rows.push({
          id: r.id,
          kind: "WALLET",
          type: r.type,
          status: r.type,
          amountKobo: r.amountKobo,
          feeKobo: 0,
          direction: (r.direction as "CREDIT" | "DEBIT") ?? null,
          reference: r.reference,
          bookingId: r.bookingId ?? null,
          actorName: r.actorName ?? null,
          actorEmail: r.actorEmail ?? null,
          providerName: r.bookingId ? (providerByBooking.get(r.bookingId) ?? null) : null,
          createdAt: r.createdAt.toISOString(),
        });
      }
    }

    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

    // Search across joined display fields that SQL couldn't filter (provider
    // names on the merged feed). Bounded: only the capped result set.
    let filtered = rows;
    if (f.q && f.kind === "ALL") {
      const q = f.q.toLowerCase();
      filtered = rows.filter(
        (r) =>
          (r.providerName ?? "").toLowerCase().includes(q) ||
          (r.actorName ?? "").toLowerCase().includes(q) ||
          (r.actorEmail ?? "").toLowerCase().includes(q) ||
          r.reference.toLowerCase().includes(q) ||
          (r.bookingId ?? "").toLowerCase().includes(q),
      );
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / f.pageSize));
    const page = Math.min(f.page, totalPages);
    const start = (page - 1) * f.pageSize;

    return {
      rows: filtered.slice(start, start + f.pageSize),
      total,
      page,
      pageSize: f.pageSize,
      totalPages,
    };
  }

  /* ── Bookings (financial view for the admin finance page) ── */

  async listBookings(rawQuery: Record<string, string | string[] | undefined>): Promise<IBookingList> {
    const f = normalizeBookingFilters(rawQuery);
    const fromDate = f.from ? new Date(f.from) : null;
    const toDate = f.to ? new Date(new Date(f.to).getTime() + 86399999) : null;

    const conds = [];
    if (fromDate) conds.push(gte(bookings.createdAt, fromDate));
    if (toDate) conds.push(lte(bookings.createdAt, toDate));
    if (f.status) conds.push(eq(bookings.status, f.status as never));
    if (f.escrowState) conds.push(eq(bookings.escrowState, f.escrowState as never));
    if (f.paymentMode) conds.push(eq(bookings.paymentMode, f.paymentMode as never));
    if (f.q) {
      conds.push(
        or(
          ilike(bookings.id, `%${f.q}%`),
          ilike(user.name, `%${f.q}%`),
          ilike(user.email, `%${f.q}%`),
          ilike(providers.displayName, `%${f.q}%`),
          ilike(servicePackages.label, `%${f.q}%`),
        ),
      );
    }

    const bRows = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        escrowState: bookings.escrowState,
        paymentMode: bookings.paymentMode,
        subtotal: bookings.subtotal,
        fee: bookings.fee,
        total: bookings.total,
        paystackRef: bookings.paystackRef,
        serviceDate: bookings.serviceDate,
        createdAt: bookings.createdAt,
        clientName: user.name,
        clientEmail: user.email,
        providerName: providers.displayName,
        packageLabel: servicePackages.label,
      })
      .from(bookings)
      .leftJoin(user, eq(user.id, bookings.clientId))
      .leftJoin(providers, eq(providers.id, bookings.providerId))
      .leftJoin(servicePackages, eq(servicePackages.id, bookings.packageId))
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(bookings.createdAt))
      .limit(SEARCH_CAP);

    // Aggregate payment state per booking from a single bounded query.
    const ids = bRows.map((b) => b.id);
    const payByBooking = new Map<string, { latestStatus: string | null; held: number; latestRef: string | null }>();
    if (ids.length > 0) {
      const pRows = await db
        .select({
          id: payments.id,
          bookingId: payments.bookingId,
          status: payments.status,
          paystackRef: payments.paystackRef,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .where(sql`${payments.bookingId} IN (${sql.join(ids.map((b) => sql`${b}`), sql`, `)})`)
        .orderBy(desc(payments.createdAt));
      for (const p of pRows) {
        const entry = payByBooking.get(p.bookingId) ?? { latestStatus: null, held: 0, latestRef: null };
        if (entry.latestStatus === null) {
          entry.latestStatus = p.status;
          entry.latestRef = p.paystackRef;
        }
        if (p.status === "HELD") entry.held += 1;
        payByBooking.set(p.bookingId, entry);
      }
    }

    const rows: IAdminBookingRow[] = bRows.map((b) => {
      const pay = payByBooking.get(b.id);
      return {
        id: b.id,
        status: b.status,
        escrowState: b.escrowState,
        paymentMode: b.paymentMode,
        subtotalKobo: b.subtotal,
        feeKobo: b.fee,
        totalKobo: b.total,
        clientName: b.clientName ?? null,
        clientEmail: b.clientEmail ?? null,
        providerName: b.providerName ?? null,
        packageLabel: b.packageLabel ?? null,
        paymentStatus: pay?.latestStatus ?? null,
        heldPayments: pay?.held ?? 0,
        paystackRef: pay?.latestRef ?? b.paystackRef ?? null,
        serviceDate: b.serviceDate ? b.serviceDate.toISOString() : null,
        createdAt: b.createdAt.toISOString(),
      };
    });

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / f.pageSize));
    const page = Math.min(f.page, totalPages);
    const start = (page - 1) * f.pageSize;

    return {
      rows: rows.slice(start, start + f.pageSize),
      total,
      page,
      pageSize: f.pageSize,
      totalPages,
    };
  }

  /** Booking + its payments + related wallet ledger + merged audit trail. */
  async getBookingDetail(bookingId: string): Promise<IBookingFinanceDetail | null> {
    const [bRow] = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        escrowState: bookings.escrowState,
        paymentMode: bookings.paymentMode,
        subtotal: bookings.subtotal,
        fee: bookings.fee,
        total: bookings.total,
        paystackRef: bookings.paystackRef,
        serviceDate: bookings.serviceDate,
        createdAt: bookings.createdAt,
        clientName: user.name,
        clientEmail: user.email,
        providerName: providers.displayName,
        packageLabel: servicePackages.label,
      })
      .from(bookings)
      .leftJoin(user, eq(user.id, bookings.clientId))
      .leftJoin(providers, eq(providers.id, bookings.providerId))
      .leftJoin(servicePackages, eq(servicePackages.id, bookings.packageId))
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!bRow) return null;

    const [pRows, wRows] = await Promise.all([
      db
        .select({
          id: payments.id,
          amount: payments.amount,
          fee: payments.fee,
          netAmount: payments.netAmount,
          status: payments.status,
          paystackRef: payments.paystackRef,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .where(eq(payments.bookingId, bookingId))
        .orderBy(desc(payments.createdAt)),
      db
        .select({
          id: walletTransactions.id,
          type: walletTransactions.type,
          amountKobo: walletTransactions.amountKobo,
          direction: walletTransactions.direction,
          reference: walletTransactions.reference,
          createdAt: walletTransactions.createdAt,
        })
        .from(walletTransactions)
        .where(eq(walletTransactions.relatedBookingId, bookingId))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(100),
    ]);

    // Merged audit trail: booking-level + one lookup per payment id.
    const auditTrail: AuditLogEntry[] = [];
    try {
      const [bookingAudit, ...paymentAudits] = await Promise.all([
        AuditService.list({ entity: "bookings", entityId: bookingId, limit: 50 }),
        ...pRows.map((p) => AuditService.list({ entity: "payments", entityId: p.id, limit: 25 })),
      ]);
      auditTrail.push(...bookingAudit, ...paymentAudits.flat());
      auditTrail.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    } catch (err) {
      console.error(`[finance] audit trail load failed for booking ${bookingId}`, err);
    }

    const booking: IAdminBookingRow = {
      id: bRow.id,
      status: bRow.status,
      escrowState: bRow.escrowState,
      paymentMode: bRow.paymentMode,
      subtotalKobo: bRow.subtotal,
      feeKobo: bRow.fee,
      totalKobo: bRow.total,
      clientName: bRow.clientName ?? null,
      clientEmail: bRow.clientEmail ?? null,
      providerName: bRow.providerName ?? null,
      packageLabel: bRow.packageLabel ?? null,
      paymentStatus: pRows[0]?.status ?? null,
      heldPayments: pRows.filter((p) => p.status === "HELD").length,
      paystackRef: pRows[0]?.paystackRef ?? bRow.paystackRef ?? null,
      serviceDate: bRow.serviceDate ? bRow.serviceDate.toISOString() : null,
      createdAt: bRow.createdAt.toISOString(),
    };

    return {
      booking,
      payments: pRows.map((p) => ({
        id: p.id,
        amountKobo: p.amount,
        feeKobo: p.fee,
        netAmountKobo: p.netAmount,
        status: p.status,
        paystackRef: p.paystackRef,
        createdAt: p.createdAt.toISOString(),
      })),
      walletTransactions: wRows.map((w) => ({
        id: w.id,
        type: w.type,
        amountKobo: w.amountKobo,
        direction: w.direction,
        reference: w.reference,
        createdAt: w.createdAt.toISOString(),
      })),
      auditTrail,
    };
  }

  /* ── Admin settlement actions (same EscrowService money paths as the
     non-admin flow — never a custom money path — plus dual-level audit:
       • general:    audit_log entity "bookings"  (who did what to the booking)
       • per-txn:    audit_log entity "payments"  (one entry per payment that
                     actually transitioned, keyed by payment id)            ── */

  async adminSettleBooking(
    bookingId: string,
    adminId: string,
    outcome: "RELEASED" | "REFUNDED",
  ): Promise<{ bookingId: string; outcome: string; settledPayments: string[] }> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!booking) throw new Error("Booking not found");
    if (booking.escrowState === "DISPUTED") {
      throw new Error(
        "This booking is disputed — resolve it from the Disputes page instead of settling directly.",
      );
    }

    const heldBefore = await db
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.bookingId, bookingId), eq(payments.status, "HELD")));
    if (heldBefore.length === 0) {
      throw new Error("No held payments on this booking — nothing to settle");
    }
    const heldIds = new Set(heldBefore.map((p) => p.id));

    const escrow = new EscrowService();
    if (outcome === "RELEASED") await escrow.settleRelease(bookingId);
    else await escrow.refundBookingFunds(bookingId);

    // Only payments that actually transitioned get per-transaction audit rows
    // (idempotent re-runs and races produce an empty set → single 409 below).
    const after = await db
      .select({ id: payments.id, status: payments.status })
      .from(payments)
      .where(eq(payments.bookingId, bookingId));
    const settled = after.filter(
      (p) => heldIds.has(p.id) && p.status === outcome,
    );

    if (settled.length === 0) {
      throw new Error(
        "Settlement was already completed by another process — no payments transitioned",
      );
    }

    // General trail: one booking-level entry naming the admin and payments.
    await AuditService.log({
      userId: adminId,
      action: outcome === "RELEASED" ? "escrow.release.admin" : "escrow.refund.admin",
      entity: "bookings",
      entityId: bookingId,
      oldValue: { status: booking.status, escrowState: booking.escrowState },
      newValue: {
        status: outcome === "RELEASED" ? "RELEASED" : "REFUNDED",
        paymentIds: settled.map((p) => p.id),
        actor: "admin",
      },
    }).catch((err) => {
      console.error(`[finance] booking-level audit failed for ${bookingId}`, err);
    });

    // Transaction trail: one entry per payment, keyed by payment id.
    for (const p of settled) {
      await AuditService.log({
        userId: adminId,
        action: outcome === "RELEASED" ? "payment.release" : "payment.refund",
        entity: "payments",
        entityId: p.id,
        oldValue: { status: "HELD" },
        newValue: { status: p.status, bookingId, actor: "admin" },
      }).catch((err) => {
        console.error(`[finance] payment-level audit failed for ${p.id}`, err);
      });
    }

    return { bookingId, outcome, settledPayments: settled.map((p) => p.id) };
  }

  /* ── Invoice (read-only projection over existing payment + booking rows) ── */

  async getInvoiceData(paymentId?: string, bookingId?: string): Promise<IInvoiceData | null> {
    let payRow: {
      id: string;
      amount: number;
      fee: number;
      status: string;
      paystackRef: string;
      createdAt: Date;
      bookingId: string;
    } | null = null;

    if (paymentId) {
      const [row] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
      if (row) {
        payRow = {
          id: row.id,
          amount: row.amount,
          fee: row.fee,
          status: row.status,
          paystackRef: row.paystackRef,
          createdAt: row.createdAt,
          bookingId: row.bookingId,
        };
      }
    } else if (bookingId) {
      const bRows = await db.select().from(payments).where(eq(payments.bookingId, bookingId)).orderBy(desc(payments.createdAt)).limit(1);
      const row = bRows[0];
      if (row) {
        payRow = {
          id: row.id,
          amount: row.amount,
          fee: row.fee,
          status: row.status,
          paystackRef: row.paystackRef,
          createdAt: row.createdAt,
          bookingId: row.bookingId,
        };
      }
    }

    if (!payRow) return null;

    const [bRow] = await db.select().from(bookings).where(eq(bookings.id, payRow.bookingId)).limit(1);
    if (!bRow) return null;

    const [[client], [provider], [pkg]] = await Promise.all([
      db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, bRow.clientId)).limit(1),
      db.select({ displayName: providers.displayName }).from(providers).where(eq(providers.id, bRow.providerId)).limit(1),
      db.select({ label: servicePackages.label }).from(servicePackages).where(eq(servicePackages.id, bRow.packageId)).limit(1),
    ]);

    const config = await PlatformConfigService.get().catch(() => DEFAULT_CONFIG);
    const finance = config.finance ?? DEFAULT_CONFIG.finance!;
    const dayKey = toDayKey(payRow.createdAt) ?? new Date().toISOString().slice(0, 10);

    return buildInvoiceData({
      finance,
      platformName: config.name,
      paymentId: payRow.id,
      issuedAt: new Date(`${dayKey}T00:00:00.000Z`),
      clientName: client?.name ?? "Client",
      clientEmail: client?.email ?? "",
      bookingId: bRow.id,
      providerName: provider?.displayName ?? "Provider",
      packageLabel: pkg?.label ?? "Service package",
      subtotalKobo: bRow.subtotal,
      feeKobo: bRow.fee,
      totalKobo: bRow.total,
      paystackRef: payRow.paystackRef,
      paymentStatus: payRow.status,
    });
  }
}
