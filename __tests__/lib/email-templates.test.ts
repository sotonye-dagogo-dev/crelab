import { describe, it, expect } from "vitest";
import { WIRED_EMAIL_TEMPLATES, isWiredEmailTemplate } from "@/lib/email-templates";

describe("lib/email-templates — wired email templates", () => {
  it("marks the code-triggered transactional emails as wired", () => {
    expect(isWiredEmailTemplate("welcome")).toBe(true);
    expect(isWiredEmailTemplate("verifyEmail")).toBe(true);
    expect(isWiredEmailTemplate("emailChanged")).toBe(true);
    expect(isWiredEmailTemplate("passwordReset")).toBe(true);
    expect(isWiredEmailTemplate("bookingConfirmation")).toBe(true);
    expect(isWiredEmailTemplate("paymentReceived")).toBe(true);
  });

  it("treats admin-created templates as non-wired", () => {
    expect(isWiredEmailTemplate("customPromo")).toBe(false);
    expect(isWiredEmailTemplate("summerSale2026")).toBe(false);
    expect(isWiredEmailTemplate("")).toBe(false);
  });

  it("exposes a trigger description for every wired template", () => {
    for (const [key, meta] of Object.entries(WIRED_EMAIL_TEMPLATES)) {
      expect(meta.label, `label missing for ${key}`).toBeTruthy();
      expect(meta.trigger, `trigger missing for ${key}`).toContain("when");
    }
  });

  it("contains every template key used by the EmailService send methods", () => {
    expect(WIRED_EMAIL_TEMPLATES).toHaveProperty("welcome");
    expect(WIRED_EMAIL_TEMPLATES).toHaveProperty("verifyEmail");
    expect(WIRED_EMAIL_TEMPLATES).toHaveProperty("emailChanged");
    expect(WIRED_EMAIL_TEMPLATES).toHaveProperty("bookingConfirmation");
    expect(WIRED_EMAIL_TEMPLATES).toHaveProperty("paymentReceived");
    expect(WIRED_EMAIL_TEMPLATES).toHaveProperty("passwordReset");
  });

  it("has a passwordReset template configured as a wired default", async () => {
    const { DEFAULT_CONFIG } = await import("@/config/platform.config");
    expect(DEFAULT_CONFIG.emailConfig?.templates).toHaveProperty("passwordReset");
    expect(DEFAULT_CONFIG.emailConfig?.templates?.passwordReset?.enabled).toBe(true);
  });
});
