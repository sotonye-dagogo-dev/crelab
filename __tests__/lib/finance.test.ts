import { describe, expect, it } from "vitest";
import {
  buildInvoiceData,
  buildInvoiceNumber,
  csvCell,
  normalizeTransactionFilters,
  toDayKey,
  transactionsToCsv,
} from "@/lib/finance";

const FINANCE = {
  invoicePrefix: "CRL",
  companyName: "Crellab",
  companyEmail: "hello@mail.crellab.com",
  companyAddress: "Lagos, Nigeria",
  invoiceFooterNote: "Thanks.",
  defaultPageSize: 20,
};

describe("buildInvoiceNumber", () => {
  it("builds a deterministic number from payment id + year", () => {
    const n = buildInvoiceNumber("CRL", new Date("2026-03-01T00:00:00Z"), "pay_abc123xyz");
    expect(n).toBe("INV-CRL-2026-PAYABC12");
  });

  it("sanitises hostile prefixes and short ids", () => {
    expect(buildInvoiceNumber("c r!l", new Date("2026-01-01T00:00:00Z"), "ab")).toBe("INV-CRL-2026-AB00");
    expect(buildInvoiceNumber("", new Date("2026-01-01T00:00:00Z"), "")).toBe("INV-CRL-2026-0000");
  });
});

describe("buildInvoiceData", () => {
  it("projects ledger amounts into line items with company config", () => {
    const inv = buildInvoiceData({
      finance: FINANCE,
      platformName: "Crellab",
      paymentId: "pay_1",
      issuedAt: new Date("2026-05-01T00:00:00Z"),
      clientName: "Ada",
      clientEmail: "ada@example.com",
      bookingId: "b_1",
      providerName: "Studio X",
      packageLabel: "Standard",
      subtotalKobo: 100000,
      feeKobo: 5000,
      totalKobo: 105000,
      paystackRef: "PSK-1",
      paymentStatus: "HELD",
    });
    expect(inv.invoiceNumber).toContain("INV-CRL-2026-");
    expect(inv.lineItems).toHaveLength(2);
    expect(inv.subtotalKobo).toBe(100000);
    expect(inv.totalKobo).toBe(105000);
    expect(inv.companyEmail).toBe("hello@mail.crellab.com");
  });
});

describe("normalizeTransactionFilters", () => {
  it("applies safe defaults for empty input", () => {
    const f = normalizeTransactionFilters({});
    expect(f).toMatchObject({ q: "", kind: "ALL", page: 1, pageSize: 20, from: null, to: null });
  });

  it("clamps page/pageSize and rejects invalid kinds and dates", () => {
    const f = normalizeTransactionFilters({ page: "-3", pageSize: "9999", kind: "NOPE", from: "not-a-date", to: "2026-13-99" });
    expect(f.page).toBe(1);
    expect(f.pageSize).toBe(100);
    expect(f.kind).toBe("ALL");
    expect(f.from).toBeNull();
    expect(f.to).toBeNull();
  });

  it("keeps valid wallet filters", () => {
    const f = normalizeTransactionFilters({ kind: "WALLET", type: "REFUND", from: "2026-01-01", to: "2026-02-01" });
    expect(f.kind).toBe("WALLET");
    expect(f.type).toBe("REFUND");
    expect(f.from).toBe("2026-01-01");
  });
});

describe("csv helpers", () => {
  it("escapes commas, quotes and newlines", () => {
    expect(csvCell('a,b"c\nd')).toBe('"a,b""c\nd"');
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(null)).toBe("");
  });

  it("builds a header + rows csv", () => {
    const csv = transactionsToCsv([{ a: 1, b: "x,y" }], ["a", "b"]);
    expect(csv).toBe('a,b\n1,"x,y"');
  });
});

describe("toDayKey", () => {
  it("buckets to UTC day and rejects garbage", () => {
    expect(toDayKey("2026-10-16T05:00:00.000Z")).toBe("2026-10-16");
    expect(toDayKey(null)).toBeNull();
    expect(toDayKey("garbage")).toBeNull();
  });
});
