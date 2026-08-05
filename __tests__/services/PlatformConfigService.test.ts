import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG } from "@/config/platform.config";

describe("config/platform.config — DEFAULT_CONFIG", () => {
  it("has the correct platform name", () => {
    expect(DEFAULT_CONFIG.name).toBe("Crellab");
  });

  it("has the correct fee rate", () => {
    expect(DEFAULT_CONFIG.feeRate).toBe(0.05);
  });

  it("has the correct escrow release days", () => {
    expect(DEFAULT_CONFIG.escrowReleaseDays).toBe(5);
  });

  it("has the correct cancellation policy", () => {
    expect(DEFAULT_CONFIG.cancellationPolicy.fullRefundThresholdHours).toBe(48);
    expect(DEFAULT_CONFIG.cancellationPolicy.lateCancellationHoldPercent).toBe(50);
  });

  it("has milestone payments enabled with correct limits", () => {
    const mp = DEFAULT_CONFIG.milestonePayments;
    expect(mp.enabled).toBe(true);
    expect(mp.maxMilestones).toBe(5);
    expect(mp.minMilestones).toBe(2);
    expect(mp.reviewWindowDays).toBe(8);
  });

  it("has wallet enabled with correct limits", () => {
    const w = DEFAULT_CONFIG.wallet;
    expect(w.enabled).toBe(true);
    expect(w.minTopUpKobo).toBe(100000);
    expect(w.minWithdrawalKobo).toBe(100000);
  });

  it("has two categories", () => {
    expect(DEFAULT_CONFIG.categories).toHaveLength(2);
  });

  it("has content-creator category with correct fields", () => {
    const cc = DEFAULT_CONFIG.categories.find((c) => c.slug === "content-creator");
    expect(cc).toBeDefined();
    expect(cc!.label).toBe("Content Creator");
    expect(cc!.active).toBe(true);
    expect(cc!.fieldSchema).toHaveLength(6);
  });

  it("has cinematographer category with correct fields", () => {
    const cg = DEFAULT_CONFIG.categories.find((c) => c.slug === "cinematographer");
    expect(cg).toBeDefined();
    expect(cg!.label).toBe("Cinematographer / Videographer");
    expect(cg!.active).toBe(true);
    expect(cg!.fieldSchema).toHaveLength(7);
  });

  it("has correct feature flags", () => {
    expect(DEFAULT_CONFIG.features.guestBrowse).toBe(true);
    expect(DEFAULT_CONFIG.features.googleDriveSync).toBe(true);
    expect(DEFAULT_CONFIG.features.blogEnabled).toBe(true);
  });

  it("has dev credit text and url", () => {
    expect(DEFAULT_CONFIG.devCredit?.text).toBe("Built for African creativity, by S.D.");
    expect(DEFAULT_CONFIG.devCredit?.url).toBe("https://sotonye-dagogo.is-a.dev");
  });
});