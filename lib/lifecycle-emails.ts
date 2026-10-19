import { db } from "@/lib/db";
import { user, providers, servicePackages, bookings } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { EmailService, isResendConfigured } from "@/services/EmailService";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { resolveAbsoluteUrl } from "@/lib/url";
import { formatKobo } from "@/lib/currency";

/**
 * Lifecycle notification emails for the booking / payment / wallet / milestone
 * flows. Every helper is:
 *  - **fire-and-forget**: it never throws and never blocks the caller, so a
 *    Resend outage can never fail or delay a money path (ACID: email is
 *    deliberately outside every DB transaction);
 *  - **post-commit only**: call sites must invoke these AFTER the state change
 *    has committed;
 *  - **config-driven**: content lives in the admin-editable email templates
 *    (`platform_config.emailConfig.templates`), gated on the
 *    `features.emailNotifications` flag and Resend availability.
 */

type Vars = Record<string, string>;

async function emailsEnabled(): Promise<boolean> {
  if (!isResendConfigured()) return false;
  try {
    const cfg = await PlatformConfigService.get();
    return cfg.features?.emailNotifications !== false;
  } catch {
    return false;
  }
}

async function recipientById(userId: string): Promise<{ email: string; name: string } | null> {
  const [u] = await db
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!u?.email) return null;
  return { email: u.email, name: u.name || "there" };
}

function fire(to: string, templateKey: string, vars: Vars): void {
  void EmailService.send(to, templateKey, vars).catch((err) => {
    console.error(`[lifecycle-emails] "${templateKey}" to ${to} failed:`, err);
  });
}

function bookingUrl(bookingId: string): string {
  return resolveAbsoluteUrl(`/bookings/${bookingId}`);
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "TBD";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** Resolve the booking's client + provider (+ provider's user account) in one go. */
async function bookingParties(bookingId: string): Promise<{
  client: { email: string; name: string } | null;
  providerUser: { email: string; name: string } | null;
  providerDisplayName: string;
  packageName: string;
  amountLabel: string;
  serviceDateLabel: string;
} | null> {
  const [row] = await db
    .select({
      clientId: bookings.clientId,
      total: bookings.total,
      serviceDate: bookings.serviceDate,
      providerUserId: providers.userId,
      providerDisplayName: providers.displayName,
      packageLabel: servicePackages.label,
    })
    .from(bookings)
    .leftJoin(providers, eq(bookings.providerId, providers.id))
    .leftJoin(servicePackages, eq(bookings.packageId, servicePackages.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!row) return null;

  const [client, providerUser] = await Promise.all([
    recipientById(row.clientId),
    row.providerUserId ? recipientById(row.providerUserId) : Promise.resolve(null),
  ]);

  return {
    client,
    providerUser,
    providerDisplayName: row.providerDisplayName ?? "your provider",
    packageName: row.packageLabel ?? "Standard Package",
    amountLabel: formatKobo(Number(row.total)),
    serviceDateLabel: formatDate(row.serviceDate),
  };
}

/* ── Booking lifecycle ── */

/** Booking created (REQUESTED): confirm to client + notify the provider. */
export async function notifyBookingCreated(
  bookingId: string,
  opts: { providerName?: string; packageName?: string; amountLabel?: string; serviceDateLabel?: string } = {},
): Promise<void> {
  try {
    if (!(await emailsEnabled())) return;
    const parties = await bookingParties(bookingId);
    if (!parties) return;
    const providerDisplayName = opts.providerName ?? parties.providerDisplayName;
    const packageName = opts.packageName ?? parties.packageName;
    const amountLabel = opts.amountLabel ?? parties.amountLabel;
    const serviceDateLabel = opts.serviceDateLabel ?? parties.serviceDateLabel;

    if (parties.client) {
      fire(parties.client.email, "bookingConfirmation", {
        userName: parties.client.name,
        providerName: providerDisplayName,
        packageName,
        bookingDate: serviceDateLabel,
        amount: amountLabel,
        bookingUrl: bookingUrl(bookingId),
      });
    }
    if (parties.providerUser) {
      fire(parties.providerUser.email, "bookingRequestReceived", {
        userName: parties.providerUser.name,
        clientName: parties.client?.name ?? "A client",
        packageName,
        bookingDate: serviceDateLabel,
        amount: amountLabel,
        bookingUrl: bookingUrl(bookingId),
      });
    }
  } catch (err) {
    console.error("[lifecycle-emails] notifyBookingCreated failed:", err);
  }
}

export async function notifyBookingAccepted(bookingId: string): Promise<void> {
  try {
    if (!(await emailsEnabled())) return;
    const parties = await bookingParties(bookingId);
    if (!parties?.client) return;
    fire(parties.client.email, "bookingAccepted", {
      userName: parties.client.name,
      providerName: parties.providerDisplayName,
      packageName: parties.packageName,
      bookingDate: parties.serviceDateLabel,
      amount: parties.amountLabel,
      bookingUrl: bookingUrl(bookingId),
    });
  } catch (err) {
    console.error("[lifecycle-emails] notifyBookingAccepted failed:", err);
  }
}

export async function notifyBookingDeclined(bookingId: string): Promise<void> {
  try {
    if (!(await emailsEnabled())) return;
    const parties = await bookingParties(bookingId);
    if (!parties?.client) return;
    fire(parties.client.email, "bookingDeclined", {
      userName: parties.client.name,
      providerName: parties.providerDisplayName,
      packageName: parties.packageName,
      bookingUrl: bookingUrl(bookingId),
    });
  } catch (err) {
    console.error("[lifecycle-emails] notifyBookingDeclined failed:", err);
  }
}

/** Cancelled — both parties are told, since either may have acted on it. */
export async function notifyBookingCancelled(bookingId: string): Promise<void> {
  try {
    if (!(await emailsEnabled())) return;
    const parties = await bookingParties(bookingId);
    if (!parties) return;
    const vars = (name: string): Vars => ({
      userName: name,
      providerName: parties.providerDisplayName,
      packageName: parties.packageName,
      bookingUrl: bookingUrl(bookingId),
    });
    if (parties.client) fire(parties.client.email, "bookingCancelled", vars(parties.client.name));
    if (parties.providerUser) fire(parties.providerUser.email, "bookingCancelled", vars(parties.providerUser.name));
  } catch (err) {
    console.error("[lifecycle-emails] notifyBookingCancelled failed:", err);
  }
}

/** Work started (HELD → IN_PROGRESS): tell the client the ball is moving. */
export async function notifyBookingStarted(bookingId: string): Promise<void> {
  try {
    if (!(await emailsEnabled())) return;
    const parties = await bookingParties(bookingId);
    if (!parties?.client) return;
    fire(parties.client.email, "bookingStarted", {
      userName: parties.client.name,
      providerName: parties.providerDisplayName,
      packageName: parties.packageName,
      bookingUrl: bookingUrl(bookingId),
    });
  } catch (err) {
    console.error("[lifecycle-emails] notifyBookingStarted failed:", err);
  }
}

/* ── Payment lifecycle ── */

/** Funds landed in escrow — to the client (uses the existing paymentReceived template). */
export async function notifyFundsHeld(bookingId: string): Promise<void> {
  try {
    if (!(await emailsEnabled())) return;
    const parties = await bookingParties(bookingId);
    if (!parties?.client) return;
    fire(parties.client.email, "paymentReceived", {
      userName: parties.client.name,
      providerName: parties.providerDisplayName,
      amount: parties.amountLabel,
      bookingUrl: bookingUrl(bookingId),
    });
  } catch (err) {
    console.error("[lifecycle-emails] notifyFundsHeld failed:", err);
  }
}

/** Escrow released to the provider — tell the provider they got paid. */
export async function notifyFundsReleased(bookingId: string, netKobo?: number): Promise<void> {
  try {
    if (!(await emailsEnabled())) return;
    const parties = await bookingParties(bookingId);
    if (!parties?.providerUser) return;
    fire(parties.providerUser.email, "paymentReleased", {
      userName: parties.providerUser.name,
      clientName: parties.client?.name ?? "Your client",
      amount: typeof netKobo === "number" ? formatKobo(netKobo) : parties.amountLabel,
      bookingUrl: bookingUrl(bookingId),
    });
  } catch (err) {
    console.error("[lifecycle-emails] notifyFundsReleased failed:", err);
  }
}

/** Escrow refunded to the client — tell the client their money is back. */
export async function notifyFundsRefunded(bookingId: string): Promise<void> {
  try {
    if (!(await emailsEnabled())) return;
    const parties = await bookingParties(bookingId);
    if (!parties?.client) return;
    fire(parties.client.email, "paymentRefunded", {
      userName: parties.client.name,
      providerName: parties.providerDisplayName,
      amount: parties.amountLabel,
      bookingUrl: bookingUrl(bookingId),
    });
  } catch (err) {
    console.error("[lifecycle-emails] notifyFundsRefunded failed:", err);
  }
}

export async function notifyDisputeOpened(bookingId: string): Promise<void> {
  try {
    if (!(await emailsEnabled())) return;
    const parties = await bookingParties(bookingId);
    if (!parties) return;
    const base = {
      providerName: parties.providerDisplayName,
      clientName: parties.client?.name ?? "A client",
      bookingUrl: bookingUrl(bookingId),
    };
    if (parties.client) {
      fire(parties.client.email, "disputeOpened", { ...base, userName: parties.client.name });
    }
    if (parties.providerUser) {
      fire(parties.providerUser.email, "disputeOpened", { ...base, userName: parties.providerUser.name });
    }
  } catch (err) {
    console.error("[lifecycle-emails] notifyDisputeOpened failed:", err);
  }
}

export async function notifyDisputeResolved(
  bookingId: string,
  outcome: "RELEASED" | "REFUNDED",
): Promise<void> {
  try {
    if (!(await emailsEnabled())) return;
    const parties = await bookingParties(bookingId);
    if (!parties) return;
    const base = {
      providerName: parties.providerDisplayName,
      clientName: parties.client?.name ?? "A client",
      outcomeLabel: outcome === "RELEASED" ? "released to the provider" : "refunded to the client",
      bookingUrl: bookingUrl(bookingId),
    };
    if (parties.client) {
      fire(parties.client.email, "disputeResolved", { ...base, userName: parties.client.name });
    }
    if (parties.providerUser) {
      fire(parties.providerUser.email, "disputeResolved", { ...base, userName: parties.providerUser.name });
    }
  } catch (err) {
    console.error("[lifecycle-emails] notifyDisputeResolved failed:", err);
  }
}

/* ── Wallet ── */

export async function notifyWalletTopup(userId: string, amountKobo: number): Promise<void> {
  try {
    if (!(await emailsEnabled())) return;
    const recipient = await recipientById(userId);
    if (!recipient) return;
    fire(recipient.email, "walletTopup", {
      userName: recipient.name,
      amount: formatKobo(amountKobo),
      walletUrl: resolveAbsoluteUrl("/wallet"),
    });
  } catch (err) {
    console.error("[lifecycle-emails] notifyWalletTopup failed:", err);
  }
}

export async function notifyWithdrawalRequested(userId: string, amountKobo: number): Promise<void> {
  try {
    if (!(await emailsEnabled())) return;
    const recipient = await recipientById(userId);
    if (!recipient) return;
    fire(recipient.email, "withdrawalRequested", {
      userName: recipient.name,
      amount: formatKobo(amountKobo),
      walletUrl: resolveAbsoluteUrl("/wallet"),
    });
  } catch (err) {
    console.error("[lifecycle-emails] notifyWithdrawalRequested failed:", err);
  }
}

/* ── Milestones ── */

async function milestoneContext(milestoneId: string): Promise<{
  client: { email: string; name: string } | null;
  providerUser: { email: string; name: string } | null;
  title: string;
  amountLabel: string;
  bookingUrl: string;
} | null> {
  const { bookingMilestones } = await import("@/drizzle/schema");
  const [ms] = await db
    .select({
      title: bookingMilestones.title,
      amountKobo: bookingMilestones.amountKobo,
      bookingId: bookingMilestones.bookingId,
    })
    .from(bookingMilestones)
    .where(eq(bookingMilestones.id, milestoneId))
    .limit(1);
  if (!ms) return null;
  const parties = await bookingParties(ms.bookingId);
  if (!parties) return null;
  return {
    client: parties.client,
    providerUser: parties.providerUser,
    title: ms.title,
    amountLabel: formatKobo(Number(ms.amountKobo)),
    bookingUrl: bookingUrl(ms.bookingId),
  };
}

export async function notifyMilestoneFunded(milestoneId: string): Promise<void> {
  try {
    if (!(await emailsEnabled())) return;
    const ctx = await milestoneContext(milestoneId);
    if (!ctx?.providerUser) return;
    fire(ctx.providerUser.email, "milestoneFunded", {
      userName: ctx.providerUser.name,
      milestoneTitle: ctx.title,
      amount: ctx.amountLabel,
      bookingUrl: ctx.bookingUrl,
    });
  } catch (err) {
    console.error("[lifecycle-emails] notifyMilestoneFunded failed:", err);
  }
}

export async function notifyMilestoneSubmitted(milestoneId: string): Promise<void> {
  try {
    if (!(await emailsEnabled())) return;
    const ctx = await milestoneContext(milestoneId);
    if (!ctx?.client) return;
    fire(ctx.client.email, "milestoneSubmitted", {
      userName: ctx.client.name,
      milestoneTitle: ctx.title,
      amount: ctx.amountLabel,
      bookingUrl: ctx.bookingUrl,
    });
  } catch (err) {
    console.error("[lifecycle-emails] notifyMilestoneSubmitted failed:", err);
  }
}

export async function notifyMilestoneApproved(milestoneId: string): Promise<void> {
  try {
    if (!(await emailsEnabled())) return;
    const ctx = await milestoneContext(milestoneId);
    if (!ctx?.providerUser) return;
    fire(ctx.providerUser.email, "milestoneApproved", {
      userName: ctx.providerUser.name,
      milestoneTitle: ctx.title,
      amount: ctx.amountLabel,
      bookingUrl: ctx.bookingUrl,
    });
  } catch (err) {
    console.error("[lifecycle-emails] notifyMilestoneApproved failed:", err);
  }
}
