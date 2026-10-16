/**
 * Pure navbar-overflow helpers — no React, no DOM. Partitioning the visible
 * link list is deterministic so it can be unit-tested and reused by any nav.
 */

export interface NavLinkItem {
  href: string;
  label: string;
  /** Optional IFeatureFlags key — the link renders unless the flag is false */
  flag?: "referralsEnabled" | "webinarsEnabled";
  /** When true the link only renders for signed-in users */
  authOnly?: boolean;
  /** When true the link also requires wallet.enabled */
  requiresWallet?: boolean;
}

export interface NavVisibility {
  blogEnabled: boolean;
  referralsEnabled: boolean;
  webinarsEnabled: boolean;
  walletEnabled: boolean;
  isAuthenticated: boolean;
}

/** Base desktop links in canonical order. Wallet is appended last so it is
 *  the first candidate to spill into "More" as the list grows. */
export const BASE_NAV_LINKS: NavLinkItem[] = [
  { href: "/explore", label: "Explore" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/blog", label: "Blog" },
  { href: "/team", label: "Team" },
  { href: "/referrals", label: "Referrals", flag: "referralsEnabled" },
  { href: "/leaderboard", label: "Leaderboard", flag: "referralsEnabled" },
  { href: "/webinars", label: "Webinars", flag: "webinarsEnabled" },
];

export const WALLET_NAV_LINK: NavLinkItem = {
  href: "/wallet",
  label: "Wallet",
  authOnly: true,
  requiresWallet: true,
};

export function resolveNavLinks(
  links: NavLinkItem[],
  visibility: NavVisibility,
): NavLinkItem[] {
  return links.filter((l) => {
    if (l.href === "/blog" && !visibility.blogEnabled) return false;
    if (l.flag === "referralsEnabled" && !visibility.referralsEnabled) return false;
    if (l.flag === "webinarsEnabled" && !visibility.webinarsEnabled) return false;
    if (l.authOnly && !visibility.isAuthenticated) return false;
    if (l.requiresWallet && !visibility.walletEnabled) return false;
    return true;
  });
}

/**
 * Split a resolved link list into inline + overflow. Never returns an
 * overflow with a single straggler when the list barely exceeds the cap —
 * a lone "More ▾" holding one link is worse than showing it inline, so the
 * boundary shifts by one in that case.
 */
export function partitionNavLinks(
  links: NavLinkItem[],
  maxVisible: number,
): { visible: NavLinkItem[]; overflow: NavLinkItem[] } {
  const cap = Number.isFinite(maxVisible) ? Math.max(1, Math.floor(maxVisible)) : links.length;
  if (links.length <= cap) return { visible: [...links], overflow: [] };
  // Avoid a one-item dropdown: show cap+1 inline instead of "More" with one link.
  if (links.length === cap + 1) return { visible: [...links], overflow: [] };
  return { visible: links.slice(0, cap), overflow: links.slice(cap) };
}

/**
 * Given measured pixel widths, return how many leading links fit before the
 * "More" trigger must appear. Falls back to maxVisible when nothing is
 * measured yet (SSR / first paint). Pure and testable.
 */
export function fitCountForWidth(
  linkWidths: number[],
  availableWidth: number,
  moreTriggerWidth: number,
  maxVisible: number,
): number {
  if (linkWidths.length === 0 || availableWidth <= 0) return maxVisible;
  let used = 0;
  let count = 0;
  for (let i = 0; i < linkWidths.length; i += 1) {
    const needsTrigger = i < linkWidths.length - 1;
    const reserve = needsTrigger ? moreTriggerWidth : 0;
    if (used + (linkWidths[i] ?? 0) + reserve <= availableWidth) {
      used += linkWidths[i] ?? 0;
      count += 1;
    } else {
      break;
    }
  }
  // Mirror the no-lone-straggler rule from partitionNavLinks.
  if (count + 1 === linkWidths.length && count < maxVisible) return linkWidths.length;
  return Math.max(1, Math.min(count, maxVisible));
}
