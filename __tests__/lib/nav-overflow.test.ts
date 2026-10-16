import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import {
  BASE_NAV_LINKS,
  WALLET_NAV_LINK,
  fitCountForWidth,
  partitionNavLinks,
  resolveNavLinks,
  type NavVisibility,
} from "@/lib/nav-overflow";

const allOn: NavVisibility = {
  blogEnabled: true,
  referralsEnabled: true,
  webinarsEnabled: true,
  walletEnabled: true,
  isAuthenticated: true,
};

describe("navigation config defaults", () => {
  it("ships overflow + wallet defaults so older configs keep working", () => {
    const nav = DEFAULT_CONFIG.navigation;
    expect(nav).toBeDefined();
    expect(nav?.maxDesktopLinks).toBeGreaterThan(0);
    expect(nav?.moreLabel?.trim().length).toBeGreaterThan(0);
    expect(nav?.showWalletInNav).toBe(true);
    expect(nav?.walletLabel?.trim().length).toBeGreaterThan(0);
    expect(nav?.walletHref?.trim().length).toBeGreaterThan(0);
  });
});

describe("resolveNavLinks", () => {
  it("appends the wallet link for signed-in users when enabled", () => {
    const links = resolveNavLinks([...BASE_NAV_LINKS, WALLET_NAV_LINK], allOn);
    expect(links.some((l) => l.href === "/wallet")).toBe(true);
  });

  it("hides the wallet link for guests", () => {
    const links = resolveNavLinks([...BASE_NAV_LINKS, WALLET_NAV_LINK], {
      ...allOn,
      isAuthenticated: false,
    });
    expect(links.some((l) => l.href === "/wallet")).toBe(false);
  });

  it("hides the wallet link when the wallet is disabled", () => {
    const links = resolveNavLinks([...BASE_NAV_LINKS, WALLET_NAV_LINK], {
      ...allOn,
      walletEnabled: false,
    });
    expect(links.some((l) => l.href === "/wallet")).toBe(false);
  });

  it("respects feature flags for referrals/blog/webinars", () => {
    const links = resolveNavLinks(BASE_NAV_LINKS, {
      ...allOn,
      blogEnabled: false,
      referralsEnabled: false,
      webinarsEnabled: false,
    });
    const hrefs = links.map((l) => l.href);
    expect(hrefs).not.toContain("/blog");
    expect(hrefs).not.toContain("/referrals");
    expect(hrefs).not.toContain("/leaderboard");
    expect(hrefs).not.toContain("/webinars");
    expect(hrefs).toContain("/explore");
  });
});

describe("partitionNavLinks", () => {
  it("keeps everything inline when under the cap", () => {
    const { visible, overflow } = partitionNavLinks(BASE_NAV_LINKS.slice(0, 3), 5);
    expect(visible).toHaveLength(3);
    expect(overflow).toHaveLength(0);
  });

  it("spills excess links into overflow", () => {
    const { visible, overflow } = partitionNavLinks(BASE_NAV_LINKS, 5);
    expect(visible).toHaveLength(5);
    expect(overflow).toHaveLength(BASE_NAV_LINKS.length - 5);
    expect(visible.concat(overflow).map((l) => l.href)).toEqual(
      BASE_NAV_LINKS.map((l) => l.href),
    );
  });

  it("avoids a one-item More dropdown by showing the straggler inline", () => {
    const { visible, overflow } = partitionNavLinks(BASE_NAV_LINKS.slice(0, 6), 5);
    expect(visible).toHaveLength(6);
    expect(overflow).toHaveLength(0);
  });

  it("clamps degenerate caps to at least one visible link", () => {
    const { visible } = partitionNavLinks(BASE_NAV_LINKS.slice(0, 3), 0);
    expect(visible.length).toBeGreaterThanOrEqual(1);
  });
});

describe("fitCountForWidth", () => {
  it("falls back to maxVisible when nothing is measured yet", () => {
    expect(fitCountForWidth([], 800, 96, 5)).toBe(5);
    expect(fitCountForWidth([100, 100], 0, 96, 5)).toBe(5);
  });

  it("fits what the container can hold, reserving room for the trigger", () => {
    // Three 100px links + 24px gaps in a 300px bar: only one link fits once
    // the ~96px More trigger is reserved.
    const fitted = fitCountForWidth([124, 124, 124], 300, 96, 5);
    expect(fitted).toBeLessThan(3);
    expect(fitted).toBeGreaterThanOrEqual(1);
  });

  it("caps at maxVisible even when everything fits", () => {
    expect(fitCountForWidth([50, 50, 50], 5000, 96, 2)).toBeLessThanOrEqual(2);
  });
});
