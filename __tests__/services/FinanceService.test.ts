import { describe, it, expect, vi, beforeEach } from "vitest";

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt?: string;
};

const { dbMock, escrowMock, auditMock } = vi.hoisted(() => {
  const dbMock = {
    select: vi.fn(),
  };
  const escrowMock = {
    settleRelease: vi.fn(async () => undefined),
    refundBookingFunds: vi.fn(async () => undefined),
  };
  const auditMock = {
    log: vi.fn(async (_entry: AuditRow) => undefined),
    list: vi.fn(async (): Promise<AuditRow[]> => []),
    count: vi.fn(async () => 0),
  };
  return { dbMock, escrowMock, auditMock };
});

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("@/services/EscrowService", () => ({
  EscrowService: vi.fn(function EscrowService(this: unknown) {
    return escrowMock;
  }),
}));
vi.mock("@/services/AuditService", () => ({
  AuditService: auditMock,
}));
vi.mock("@/services/PlatformConfigService", () => ({
  PlatformConfigService: { get: vi.fn(async () => ({})), getCached: vi.fn(async () => ({})) },
}));

import { FinanceService } from "@/services/FinanceService";

/**
 * A thenable query-chain stub: any chain method returns the proxy itself and
 * awaiting the chain resolves to `value`.
 */
function q<T>(value: T) {
  const chain: Record<string, unknown> = {};
  const proxy = new Proxy(chain, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: T) => void) => resolve(value);
      }
      return () => proxy;
    },
  });
  return proxy as unknown;
}

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "bkg-1",
    status: "HELD",
    escrowState: "HELD",
    paymentMode: "ESCROW",
    subtotal: 100000,
    fee: 5000,
    total: 105000,
    paystackRef: "CRELLAB-bkg-1-1",
    serviceDate: new Date("2026-06-01T10:00:00Z"),
    createdAt: new Date("2026-05-20T09:00:00Z"),
    clientName: "Ada",
    clientEmail: "ada@example.com",
    providerName: "Studio X",
    packageLabel: "Standard",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FinanceService.listBookings", () => {
  it("maps booking rows with aggregated payment state and paginates", async () => {
    const rows = Array.from({ length: 3 }, (_, i) =>
      bookingRow({ id: `bkg-${i + 1}`, createdAt: new Date(`2026-05-2${i + 1}T09:00:00Z`) }),
    );
    const payRows = [
      { id: "pay-1", bookingId: "bkg-1", status: "HELD", paystackRef: "PSK-1", createdAt: new Date("2026-05-21T10:00:00Z") },
      { id: "pay-2", bookingId: "bkg-1", status: "RELEASED", paystackRef: "PSK-2", createdAt: new Date("2026-05-22T10:00:00Z") },
    ];
    dbMock.select
      .mockReturnValueOnce(q(rows))
      .mockReturnValueOnce(q(payRows));

    const result = await new FinanceService().listBookings({ pageSize: "2", page: "1" });

    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(2);
    expect(result.rows).toHaveLength(2);
    const bkg1 = result.rows.find((r) => r.id === "bkg-1");
    expect(bkg1?.clientName).toBe("Ada");
    expect(bkg1?.providerName).toBe("Studio X");
    // Latest payment (by createdAt desc) wins for paymentStatus; held count is separate.
    expect(bkg1?.paymentStatus).toBe("HELD");
    expect(bkg1?.heldPayments).toBe(1);
    // Bookings with no payments report null payment state.
    expect(result.rows.find((r) => r.id === "bkg-2")?.paymentStatus).toBeNull();
  });

  it("normalises invalid filter values without throwing", async () => {
    dbMock.select.mockReturnValueOnce(q([]));
    const result = await new FinanceService().listBookings({
      status: "NOT_A_STATUS",
      escrowState: "bogus",
      paymentMode: "???",
      page: "abc",
      pageSize: "9999",
    });
    expect(result.rows).toEqual([]);
    expect(result.pageSize).toBe(100); // capped
    expect(result.page).toBe(1);
  });
});

describe("FinanceService.getBookingDetail", () => {
  it("returns booking, payments, wallet ledger and merged sorted audit trail", async () => {
    const b = bookingRow();
    dbMock.select
      .mockReturnValueOnce(q([b]))
      .mockReturnValueOnce(q([
        { id: "pay-1", amount: 100000, fee: 5000, netAmount: 95000, status: "HELD", paystackRef: "PSK-1", createdAt: new Date("2026-05-21T10:00:00Z") },
      ]))
      .mockReturnValueOnce(q([
        { id: "wtx-1", type: "BOOKING_DEBIT", amountKobo: 100000, direction: "DEBIT", reference: "WALLET-bkg-1", createdAt: new Date("2026-05-21T10:00:00Z") },
      ]));

    auditMock.list
      .mockResolvedValueOnce([
        { id: "a-1", action: "escrow.release", entity: "bookings", entityId: "bkg-1", createdAt: "2026-05-25T00:00:00.000Z" },
      ])
      .mockResolvedValueOnce([
        { id: "a-2", action: "payment.release", entity: "payments", entityId: "pay-1", createdAt: "2026-05-25T00:00:01.000Z" },
      ]);

    const detail = await new FinanceService().getBookingDetail("bkg-1");
    expect(detail).not.toBeNull();
    expect(detail!.booking.id).toBe("bkg-1");
    expect(detail!.payments).toHaveLength(1);
    expect(detail!.walletTransactions).toHaveLength(1);
    expect(detail!.auditTrail.map((a) => a.id)).toEqual(["a-2", "a-1"]); // newest first
    expect(detail!.booking.heldPayments).toBe(1);
  });

  it("returns null when the booking does not exist", async () => {
    dbMock.select.mockReturnValueOnce(q([]));
    expect(await new FinanceService().getBookingDetail("nope")).toBeNull();
  });
});

describe("FinanceService.adminSettleBooking", () => {
  const heldBooking = bookingRow({ status: "HELD", escrowState: "HELD" });

  it("release: delegates to EscrowService.settleRelease and writes booking + per-payment audits", async () => {
    dbMock.select
      .mockReturnValueOnce(q([heldBooking])) // booking lookup
      .mockReturnValueOnce(q([{ id: "pay-1" }])) // held before
      .mockReturnValueOnce(q([{ id: "pay-1", status: "RELEASED" }])); // after

    const result = await new FinanceService().adminSettleBooking("bkg-1", "admin-1", "RELEASED");

    expect(escrowMock.settleRelease).toHaveBeenCalledWith("bkg-1");
    expect(escrowMock.refundBookingFunds).not.toHaveBeenCalled();
    expect(result.settledPayments).toEqual(["pay-1"]);

    const actions = auditMock.log.mock.calls.map((c) => c[0]);
    const bookingAudit = actions.find((a) => a.entity === "bookings");
    const paymentAudit = actions.find((a) => a.entity === "payments");
    expect(bookingAudit?.action).toBe("escrow.release.admin");
    expect(bookingAudit?.userId).toBe("admin-1");
    expect(paymentAudit?.action).toBe("payment.release");
    expect(paymentAudit?.entityId).toBe("pay-1");
    expect(paymentAudit?.oldValue).toEqual({ status: "HELD" });
  });

  it("refund: delegates to EscrowService.refundBookingFunds and audits both levels", async () => {
    dbMock.select
      .mockReturnValueOnce(q([heldBooking]))
      .mockReturnValueOnce(q([{ id: "pay-1" }]))
      .mockReturnValueOnce(q([{ id: "pay-1", status: "REFUNDED" }]));

    const result = await new FinanceService().adminSettleBooking("bkg-1", "admin-1", "REFUNDED");

    expect(escrowMock.refundBookingFunds).toHaveBeenCalledWith("bkg-1");
    expect(escrowMock.settleRelease).not.toHaveBeenCalled();
    const actions = auditMock.log.mock.calls.map((c) => c[0]);
    expect(actions.find((a) => a.entity === "bookings")?.action).toBe("escrow.refund.admin");
    expect(actions.find((a) => a.entity === "payments")?.action).toBe("payment.refund");
    expect(result.outcome).toBe("REFUNDED");
  });

  it("throws Booking not found without touching money paths", async () => {
    dbMock.select.mockReturnValueOnce(q([]));
    await expect(
      new FinanceService().adminSettleBooking("missing", "admin-1", "RELEASED"),
    ).rejects.toThrow("Booking not found");
    expect(escrowMock.settleRelease).not.toHaveBeenCalled();
    expect(auditMock.log).not.toHaveBeenCalled();
  });

  it("refuses disputed bookings (must go through the disputes flow)", async () => {
    dbMock.select.mockReturnValueOnce(
      q([bookingRow({ escrowState: "DISPUTED" })]),
    );
    await expect(
      new FinanceService().adminSettleBooking("bkg-1", "admin-1", "RELEASED"),
    ).rejects.toThrow(/disputed/i);
    expect(escrowMock.settleRelease).not.toHaveBeenCalled();
  });

  it("throws when there are no held payments", async () => {
    dbMock.select
      .mockReturnValueOnce(q([bookingRow({ escrowState: "RELEASED" })]))
      .mockReturnValueOnce(q([]));
    await expect(
      new FinanceService().adminSettleBooking("bkg-1", "admin-1", "RELEASED"),
    ).rejects.toThrow(/No held payments/);
    expect(auditMock.log).not.toHaveBeenCalled();
  });

  it("throws and writes no audit when no payment actually transitioned (idempotent race)", async () => {
    dbMock.select
      .mockReturnValueOnce(q([heldBooking]))
      .mockReturnValueOnce(q([{ id: "pay-1" }]))
      .mockReturnValueOnce(q([{ id: "pay-1", status: "HELD" }])); // still HELD — nothing settled

    await expect(
      new FinanceService().adminSettleBooking("bkg-1", "admin-1", "RELEASED"),
    ).rejects.toThrow(/already completed/);
    expect(auditMock.log).not.toHaveBeenCalled();
  });
});
