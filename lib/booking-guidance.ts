import type { IPlatformConfig } from "@/types";

/**
 * "Who acts next?" guidance for the booking detail page — one pure, exhaustive
 * mapping from (status, side) to the copy a client or provider needs to know
 * what happens next and who is expected to act.
 *
 * WHY: the detail page's action panels are bespoke per state, and several
 * states had NO panel at all (client HELD/RELEASED/REFUNDED, provider
 * IN_PROGRESS/terminal) — leaving both parties guessing whether they were
 * waiting on the other side, on the platform, or on nobody. This module makes
 * the guidance data, not per-page prose, so it stays consistent between
 * surfaces and is admin-overridable via `config.bookingFlow.copy` (keyed
 * `${status}:${side}`; an empty-string override hides that state's banner).
 *
 * The banner is rendered ONLY for states/sides that lack their own action
 * panel (see BookingDetailClient) — this function returns `null` for those
 * states so the banner never duplicates an existing panel.
 */

export type GuidanceSide = "client" | "provider";

export interface BookingGuidance {
  /** Short headline — what is happening right now. */
  title: string;
  /** Who is expected to act (or that nobody is), and what happens next. */
  description: string;
  /** Optional call-to-action the banner can offer (e.g. "Top up wallet"). */
  cta?: { label: string; href: string };
  tone: "info" | "success" | "warning";
}

export interface GuidanceContext {
  /** Milestone-funded bookings fund per-milestone, not one escrow hold. */
  milestone?: boolean;
  /** Names for readable copy ("Alice" instead of "the client"). */
  clientName?: string | null;
  providerName?: string | null;
}

const CLOSED: BookingGuidance = {
  title: "This booking is closed",
  description: "No further action is needed from either party.",
  tone: "success",
};

/**
 * Pure, exhaustive guidance lookup. `status` is a BookingStatus string; unknown
 * statuses return `null` (never guess on money-adjacent copy).
 */
export function bookingNextStep(
  status: string,
  side: GuidanceSide,
  ctx: GuidanceContext = {},
): BookingGuidance | null {
  const client = ctx.clientName ?? "The client";
  const provider = ctx.providerName ?? "The provider";

  // States with their own bespoke action panels return null — the banner must
  // never duplicate a panel that already explains and offers actions:
  //  REQUESTED (both sides: accept/decline + awaiting-response panels),
  //  ACCEPTED:client (pay panel, incl. milestone funding CTA),
  //  ACCEPTED:provider (waiting-for-payment panel),
  //  HELD:provider (start-work panel),
  //  DECLINED/CANCELLED:client (closed panels),
  //  DISPUTED (both sides: the timeline's dispute box).
  switch (`${status}:${side}`) {
    // ── No banner: an action panel already exists for this state/side. ──
    case "REQUESTED:client":
    case "REQUESTED:provider":
    case "ACCEPTED:client": // pay panel (or milestone funding CTA on the timeline)
    case "ACCEPTED:provider":
    case "HELD:provider": // start-work panel
    case "DECLINED:client":
    case "CANCELLED:client":
    case "DISPUTED:client":
    case "DISPUTED:provider":
      return null;

    // ── Client waiting on money/escrow states. ──
    case "HELD:client":
      return {
        title: "Your payment is held in escrow",
        description: `${provider} has been paid into escrow but won't receive the funds until you approve the delivery — or automatically after the release window passes with no dispute. No action is needed from you right now.`,
        tone: "info",
      };
    case "IN_PROGRESS:client":
      return {
        title: `${provider} is working on your project`,
        description:
          "Once the work is delivered, review it and either confirm the release (which pays the provider) or raise a dispute. Funds release automatically after the release window if no dispute is raised.",
        tone: "info",
      };
    case "RELEASED:client":
      return {
        ...CLOSED,
        title: "Funds released — booking complete",
        description: `You approved the delivery and the funds were released to ${provider}. This booking is complete — nothing else is needed from you.`,
      };
    case "REFUNDED:client":
      return {
        ...CLOSED,
        title: "Payment refunded",
        description:
          "The held funds were returned to you after the dispute was resolved in your favour. This booking is closed — nothing else is needed from you.",
      };

    // ── Provider waiting on money/escrow states. ──
    case "IN_PROGRESS:provider":
      return {
        title: "You're on the clock",
        description: `${client} releases the funds when they approve your delivery — or automatically after the release window passes with no dispute. No action is needed from you right now; keep the client posted on progress.`,
        tone: "info",
      };
    case "RELEASED:provider":
      return {
        ...CLOSED,
        title: "Payout released — booking complete",
        description: `The escrow was released and ${client}'s payment landed in your wallet. This booking is complete — withdraw any time from your wallet.`,
        tone: "success",
      };
    case "REFUNDED:provider":
      return {
        ...CLOSED,
        title: "Payment refunded to the client",
        description:
          "The dispute was resolved in the client's favour, so the held funds were returned to them and no payout will be made for this booking. This booking is closed.",
        tone: "warning",
      };

    // ── Terminal states the non-acting side needs a closing note for. ──
    case "DECLINED:provider":
      return {
        ...CLOSED,
        title: "Request declined",
        description: `You declined this booking request. Nothing was charged and ${client} has been notified. This booking is closed.`,
      };
    case "CANCELLED:provider":
      return {
        ...CLOSED,
        title: "Booking cancelled",
        description: `This booking was cancelled before payment was held, so nothing was charged to ${client} and no payout will be made. This booking is closed.`,
      };

    default:
      return null;
  }
}

/**
 * Config-aware resolver: applies the admin's `bookingFlow` toggle and any
 * `${status}:${side}` copy override (empty string hides the banner). Copy
 * overrides replace the DESCRIPTION only — the title stays the curated
 * headline so overrides can't break the banner's visual hierarchy.
 */
export function resolveBookingGuidance(
  status: string,
  side: GuidanceSide,
  config: Pick<IPlatformConfig, "bookingFlow">,
  ctx: GuidanceContext = {},
): BookingGuidance | null {
  if (config.bookingFlow?.enabled === false) return null;
  const base = bookingNextStep(status, side, ctx);
  if (!base) return null;

  const override = config.bookingFlow?.copy?.[`${status}:${side}`];
  if (typeof override === "string") {
    if (override.trim() === "") return null;
    return { ...base, description: override };
  }
  return base;
}
