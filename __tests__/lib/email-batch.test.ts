import { describe, it, expect } from "vitest";
import {
  MAX_BATCH_RECIPIENTS,
  normalizeRecipientIds,
  filterRecipients,
  invertSelection,
  buildBatchResultMessage,
  type EmailRecipient,
} from "@/lib/email-batch";

const recipients: EmailRecipient[] = [
  { id: "u1", name: "Ada Creator", email: "ada@example.com", role: "PROVIDER", hasMarketingConsent: true, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "u2", name: "Brand Bob", email: "bob@example.com", role: "CLIENT", hasMarketingConsent: false, createdAt: "2026-01-02T00:00:00.000Z" },
  { id: "u3", name: "Cara Creator", email: "cara@example.com", role: "PROVIDER", hasMarketingConsent: false, createdAt: "2026-01-03T00:00:00.000Z" },
];

describe("normalizeRecipientIds", () => {
  it("dedupes, trims, and drops empties/non-strings", () => {
    expect(normalizeRecipientIds([" a ", "a", "", "  ", "b", 42, null])).toEqual(["a", "b"]);
  });

  it("returns [] for non-arrays", () => {
    expect(normalizeRecipientIds(undefined)).toEqual([]);
    expect(normalizeRecipientIds("u1")).toEqual([]);
  });

  it("caps at MAX_BATCH_RECIPIENTS", () => {
    const many = Array.from({ length: MAX_BATCH_RECIPIENTS + 50 }, (_, i) => `u${i}`);
    expect(normalizeRecipientIds(many)).toHaveLength(MAX_BATCH_RECIPIENTS);
  });
});

describe("filterRecipients", () => {
  it("filters only creators (PROVIDER)", () => {
    expect(filterRecipients(recipients, { role: "PROVIDER" }).map((r) => r.id)).toEqual(["u1", "u3"]);
  });

  it("filters only brands (CLIENT)", () => {
    expect(filterRecipients(recipients, { role: "CLIENT" }).map((r) => r.id)).toEqual(["u2"]);
  });

  it("filters only subscribers", () => {
    expect(filterRecipients(recipients, { consent: "SUBSCRIBERS" }).map((r) => r.id)).toEqual(["u1"]);
  });

  it("searches name or email case-insensitively", () => {
    expect(filterRecipients(recipients, { search: "CREATOR" }).map((r) => r.id)).toEqual(["u1", "u3"]);
    expect(filterRecipients(recipients, { search: "bob@" }).map((r) => r.id)).toEqual(["u2"]);
  });

  it("limit takes the first N (First 100 quick filter)", () => {
    expect(filterRecipients(recipients, { limit: 2 }).map((r) => r.id)).toEqual(["u1", "u2"]);
  });

  it("combines role + consent + search", () => {
    expect(
      filterRecipients(recipients, { role: "PROVIDER", consent: "SUBSCRIBERS", search: "ada" }).map((r) => r.id),
    ).toEqual(["u1"]);
  });
});

describe("invertSelection", () => {
  it("returns visible ids not currently selected", () => {
    expect(invertSelection(["u1", "u2", "u3"], new Set(["u1"]))).toEqual(["u2", "u3"]);
    expect(invertSelection(["u1", "u2"], ["u1", "u2"])).toEqual([]);
  });
});

describe("buildBatchResultMessage", () => {
  it("summarises sent/skipped/total", () => {
    expect(buildBatchResultMessage(8, 2, 10)).toBe(
      "Batch send complete: 8 sent, 2 skipped (10 selected).",
    );
  });
});
