import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyWebhookSignature } from "@/lib/paystack";

const SECRET = "sk_test_secret";

function sign(body: string): string {
  return crypto.createHmac("sha512", SECRET).update(body).digest("hex");
}

describe("lib/paystack — verifyWebhookSignature", () => {
  it("accepts a correctly signed body", () => {
    const body = JSON.stringify({ event: "charge.success", data: { reference: "ref" } });
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a body signed with the wrong secret", () => {
    const body = JSON.stringify({ event: "charge.success" });
    const wrong = crypto.createHmac("sha512", "sk_wrong").update(body).digest("hex");
    expect(verifyWebhookSignature(body, wrong, SECRET)).toBe(false);
  });

  it("rejects a tampered body", () => {
    const body = JSON.stringify({ event: "charge.success" });
    const signature = sign(body);
    expect(verifyWebhookSignature(body + "x", signature, SECRET)).toBe(false);
  });

  it("returns false (does not throw) for a short malformed signature", () => {
    // timingSafeEqual throws on length mismatch — must be guarded to 401, not 500.
    const body = JSON.stringify({ event: "charge.success" });
    expect(() => verifyWebhookSignature(body, "abc", SECRET)).not.toThrow();
    expect(verifyWebhookSignature(body, "abc", SECRET)).toBe(false);
  });

  it("returns false (does not throw) for an empty signature", () => {
    const body = "{}";
    expect(() => verifyWebhookSignature(body, "", SECRET)).not.toThrow();
    expect(verifyWebhookSignature(body, "", SECRET)).toBe(false);
  });

  it("returns false (does not throw) for an overlong signature", () => {
    const body = "{}";
    const long = sign(body).repeat(2);
    expect(() => verifyWebhookSignature(body, long, SECRET)).not.toThrow();
    expect(verifyWebhookSignature(body, long, SECRET)).toBe(false);
  });
});
