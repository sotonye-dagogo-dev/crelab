import { DEFAULT_CONFIG } from "@/config/platform.config";
import type { IWebinarsConfig, WebinarStatus } from "@/types";

/**
 * Shared webinar helpers that are safe to import from both server and client
 * code (no DB, no services). The public page, the registration API and the
 * admin editor all read page copy through here so the hardcoded defaults in
 * `platform.config` and whatever the admin saved stay reconciled in one place.
 */

const FALLBACK_WEBINARS_CONFIG: IWebinarsConfig = {
  heroTitle: "Webinars",
  heroSubtitle: "Live sessions with creators and brands — practical, focused, and free to join.",
  upcomingTitle: "Upcoming sessions",
  pastTitle: "Past sessions",
  maxRegistrantsPerWebinar: 500,
  guestPrompt:
    "Create an account to save your seat and keep access to recordings and future sessions.",
  guestPromptCtaLabel: "Create account",
  registerCtaLabel: "Reserve my seat",
  registeredLabel: "You're registered",
  marketingConsentLabel: "Email me about future sessions and platform news.",
};

/**
 * Seats guard — 0 means "unlimited" (the documented sentinel), negatives and
 * garbage fall back to the hardcoded default. Admin-entered values arrive from
 * free-form config writes, so nothing is trusted as-is.
 */
export function normalizeSeatLimit(raw?: number | null): number {
  const base =
    DEFAULT_CONFIG.webinars?.maxRegistrantsPerWebinar ??
    FALLBACK_WEBINARS_CONFIG.maxRegistrantsPerWebinar;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return base;
  return Math.floor(n);
}

/** Pure config resolution: hardcoded defaults overridden by whatever config carries. */
export function resolveWebinarsConfig(raw?: Partial<IWebinarsConfig> | null): IWebinarsConfig {
  const base = DEFAULT_CONFIG.webinars ?? FALLBACK_WEBINARS_CONFIG;
  if (!raw) return { ...base };
  return {
    heroTitle: raw.heroTitle || base.heroTitle,
    heroSubtitle: raw.heroSubtitle ?? base.heroSubtitle,
    upcomingTitle: raw.upcomingTitle || base.upcomingTitle,
    pastTitle: raw.pastTitle || base.pastTitle,
    maxRegistrantsPerWebinar: normalizeSeatLimit(raw.maxRegistrantsPerWebinar ?? base.maxRegistrantsPerWebinar),
    guestPrompt: raw.guestPrompt ?? base.guestPrompt,
    guestPromptCtaLabel: raw.guestPromptCtaLabel || base.guestPromptCtaLabel,
    registerCtaLabel: raw.registerCtaLabel || base.registerCtaLabel,
    registeredLabel: raw.registeredLabel || base.registeredLabel,
    marketingConsentLabel: raw.marketingConsentLabel ?? base.marketingConsentLabel,
  };
}

export const WEBINAR_STATUS_LABELS: Record<WebinarStatus, string> = {
  UPCOMING: "Upcoming",
  LIVE: "Live now",
  CANCELLED: "Cancelled",
  ENDED: "Ended",
};

export function webinarStatusLabel(status: WebinarStatus | string): string {
  return WEBINAR_STATUS_LABELS[status as WebinarStatus] ?? status;
}

export type ClBadgeVariant = "accent" | "success" | "warning" | "error" | "info" | "default";

export function webinarStatusVariant(status: WebinarStatus | string): ClBadgeVariant {
  switch (status) {
    case "LIVE":
      return "error";
    case "UPCOMING":
      return "info";
    case "CANCELLED":
      return "warning";
    case "ENDED":
      return "default";
    default:
      return "default";
  }
}

/**
 * Human-readable session time for cards and confirmation emails.
 * Pass `timeZone` + `timeZoneLabel` for server-side sends where the recipient's
 * browser timezone is unknown (the webinars are WAT-based events).
 */
export function formatWebinarStart(
  startsAt?: string | Date | null,
  opts?: { timeZone?: string; timeZoneLabel?: string },
): string | null {
  if (!startsAt) return null;
  const date = startsAt instanceof Date ? startsAt : new Date(startsAt);
  if (Number.isNaN(date.getTime())) return null;
  try {
    const formatted = date.toLocaleString("en-NG", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: opts?.timeZone,
    });
    return opts?.timeZoneLabel ? `${formatted} (${opts.timeZoneLabel})` : formatted;
  } catch {
    return date.toISOString();
  }
}
