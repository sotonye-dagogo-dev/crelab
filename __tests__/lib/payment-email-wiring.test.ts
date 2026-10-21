import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/config/platform.config";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("payment lifecycle email wiring", () => {
  const lifecycle = read("lib/lifecycle-emails.ts");
  const templateKeys = Array.from(
    new Set(
      Array.from(lifecycle.matchAll(/fire\([^,]+,\s*"([^"]+)"/g)).map((m) => m[1]),
    ),
  );

  it("finds the expected payment/booking notification triggers", () => {
    expect(templateKeys).toEqual(
      expect.arrayContaining([
        "bookingConfirmation",
        "bookingRequestReceived",
        "bookingAccepted",
        "bookingDeclined",
        "bookingCancelled",
        "bookingStarted",
        "paymentReceived",
        "paymentReleased",
        "paymentRefunded",
        "disputeOpened",
        "disputeResolved",
        "walletTopup",
        "withdrawalRequested",
        "milestoneFunded",
        "milestoneSubmitted",
        "milestoneApproved",
      ]),
    );
  });

  it("ships every wired template enabled and non-empty", () => {
    expect(DEFAULT_CONFIG.features.emailNotifications).toBe(true);
    const emailConfig = DEFAULT_CONFIG.emailConfig;
    expect(emailConfig).toBeDefined();
    for (const key of templateKeys) {
      const template = emailConfig?.templates[key];
      if (!template) throw new Error(`missing template "${key}"`);
      expect(template.enabled).not.toBe(false);
      expect(template.subject.trim().length).toBeGreaterThan(0);
      expect(template.bodyHtml.trim().length).toBeGreaterThan(0);
    }
  });

  it("routes both providers through the same idempotent money handlers", () => {
    const paystack = read("app/api/webhooks/paystack/route.ts");
    const monnify = read("app/api/webhooks/monnify/route.ts");

    for (const source of [paystack, monnify]) {
      expect(source).toContain("topUpFromCard");
      expect(source).toContain("onPaystackSuccess");
    }
  });
});
