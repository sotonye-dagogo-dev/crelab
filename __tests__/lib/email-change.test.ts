import { describe, it, expect } from "vitest";
import { resolveEmailChangeOutcome } from "@/lib/email-change";
import type { EmailSendResult } from "@/services/EmailService";

describe("lib/email-change — resolveEmailChangeOutcome", () => {
  it("reports success only when the confirmation was sent to the NEW address", () => {
    const outcome = resolveEmailChangeOutcome(
      { sent: true, to: "new@example.com" },
      "New@Example.com",
    );
    expect(outcome).toEqual({ success: true, sent: true });
  });

  it("reports success when every captured send targeted the new address", () => {
    const outcome = resolveEmailChangeOutcome(
      [
        { sent: true, to: "new@example.com" },
        { sent: true, to: "NEW@example.com" },
      ],
      "new@example.com",
    );
    expect(outcome).toEqual({ success: true, sent: true });
  });

  it("surfaces a real error when any send targeted the old/current address", () => {
    const outcome = resolveEmailChangeOutcome(
      [
        { sent: true, to: "old@example.com" },
        { sent: true, to: "new@example.com" },
      ],
      "new@example.com",
    );
    expect(outcome.success).toBe(false);
    expect(outcome.sent).toBe(false);
    expect(outcome.status).toBe(500);
    expect(outcome.error).toMatch(/new address/i);
  });

  it("surfaces a real error when the only captured send targeted the old address", () => {
    const outcome = resolveEmailChangeOutcome(
      { sent: true, to: "old@example.com" },
      "new@example.com",
    );
    expect(outcome.success).toBe(false);
    expect(outcome.sent).toBe(false);
    expect(outcome.status).toBe(500);
  });

  it("reports the failure reason when the send failed", () => {
    const outcome = resolveEmailChangeOutcome(
      { sent: false, to: "new@example.com", reason: "resend_api_error" },
      "new@example.com",
    );
    expect(outcome.success).toBe(true);
    expect(outcome.sent).toBe(false);
    expect(outcome.reason).toContain("rejected");
  });

  it("never reports a false success when no send was attempted", () => {
    const outcome = resolveEmailChangeOutcome(undefined, "new@example.com");
    expect(outcome.success).toBe(true);
    expect(outcome.sent).toBe(false);
    expect(outcome.reason).toContain("couldn't send a confirmation");
  });

  it("never reports a false success when the sink captured no sends", () => {
    const outcome = resolveEmailChangeOutcome([], "new@example.com");
    expect(outcome.success).toBe(true);
    expect(outcome.sent).toBe(false);
  });

  it("compares recipients case-insensitively", () => {
    const ok = resolveEmailChangeOutcome(
      { sent: true, to: "NEW@example.com" },
      "new@example.com",
    );
    expect(ok.sent).toBe(true);

    const bad = resolveEmailChangeOutcome(
      { sent: true, to: "OLD@example.com" },
      "new@example.com",
    );
    expect(bad.sent).toBe(false);
    expect(bad.error).toBeDefined();
  });

  it("treats an unknown recipient as sent (legacy results without a to field)", () => {
    const outcome = resolveEmailChangeOutcome(
      { sent: true } as EmailSendResult,
      "new@example.com",
    );
    expect(outcome).toEqual({ success: true, sent: true });
  });
});