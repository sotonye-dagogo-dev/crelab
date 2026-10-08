import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG } from "@/config/platform.config";

/**
 * The `/team` hiring block is config-driven (`teamPage`) and admin-editable
 * from `/admin/team`. These defaults are the backward-compatible fallback when
 * no DB override has been saved yet.
 */
describe("teamPage config defaults", () => {
  it("ships a hiring block that is enabled with copy and a CTA", () => {
    const teamPage = DEFAULT_CONFIG.teamPage;
    expect(teamPage).toBeDefined();
    expect(teamPage?.hiringEnabled).toBe(true);
    expect(teamPage?.hiringTitle?.trim().length).toBeGreaterThan(0);
    expect(teamPage?.hiringSubtitle?.trim().length).toBeGreaterThan(0);
    expect(teamPage?.hiringCtaLabel?.trim().length).toBeGreaterThan(0);
    expect(teamPage?.hiringCtaHref?.trim().length).toBeGreaterThan(0);
  });

  it("defaults the CTA href to a contact channel, never a dead '#' link", () => {
    expect(DEFAULT_CONFIG.teamPage?.hiringCtaHref).not.toBe("#");
    expect(DEFAULT_CONFIG.teamPage?.hiringCtaHref?.trim().length).toBeGreaterThan(0);
  });
});
