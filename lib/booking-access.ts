import { db } from "@/lib/db";
import { providers } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { MockDataService } from "@/services/MockDataService";

/**
 * Who is allowed to *see* and *act on* a booking. Every booking surface and
 * every booking action route routes through here so ownership can never drift
 * between pages — a booking belongs to exactly three parties: its client, the
 * provider it was booked with, and an admin.
 */

export type BookingViewerRole = "CLIENT" | "PROVIDER" | "ADMIN";

export interface IBookingSessionUser {
  id: string;
  role?: string | undefined;
}

/** Minimal booking shape needed for access decisions. */
export interface IBookingAccessRow {
  clientId: string;
  providerId: string;
}

/** The provider row owned by a user (null when the user is not a provider). */
export async function getProviderIdForUser(userId: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const rows = await db
      .select({ id: providers.id })
      .from(providers)
      .where(eq(providers.userId, userId))
      .limit(1);
    return rows[0]?.id ?? null;
  } catch (err) {
    // Access checks must fail CLOSED — never grant a role because the lookup
    // broke; the caller surfaces the usual 403/404 instead of leaking data.
    console.error("[booking-access] provider lookup failed", err);
    return null;
  }
}

/**
 * Resolve the viewer's relationship to a booking.
 * Returns `null` when the session may not view it (caller should 404/403).
 * ADMIN passes unconditionally; demo (mock) sessions stay browsable.
 */
export async function resolveBookingViewer(
  booking: IBookingAccessRow,
  sessionUser: IBookingSessionUser,
): Promise<BookingViewerRole | null> {
  if (!sessionUser?.id) return null;
  if (sessionUser.role === "ADMIN") return "ADMIN";
  if (booking.clientId === sessionUser.id) return "CLIENT";

  try {
    const providerId = await getProviderIdForUser(sessionUser.id);
    if (providerId && booking.providerId === providerId) return "PROVIDER";
  } catch {
    return null;
  }

  // Mock/demo mode uses synthetic ids that don't own DB rows — keep the demo
  // browsable exactly as it was before scoping was introduced.
  if (MockDataService.isEnabled()) return "CLIENT";

  return null;
}

/**
 * Guard for provider-side actions (accept / decline / start work).
 * ADMIN may act on any booking — admin money actions are separately audited.
 * Throws with a message the route maps to 403.
 */
export async function assertProviderActor(
  booking: IBookingAccessRow,
  sessionUser: IBookingSessionUser,
): Promise<void> {
  if (!sessionUser?.id) throw new Error("Unauthorized");
  if (sessionUser.role === "ADMIN") return;

  const providerId = await getProviderIdForUser(sessionUser.id);
  if (!providerId || providerId !== booking.providerId) {
    throw new Error("Only the provider for this booking can do that");
  }
}

/** Guard for client-side actions (pay / cancel / release / dispute). */
export function assertClientActor(
  booking: IBookingAccessRow,
  sessionUser: IBookingSessionUser,
): void {
  if (!sessionUser?.id) throw new Error("Unauthorized");
  if (sessionUser.role === "ADMIN") return;
  if (booking.clientId !== sessionUser.id) {
    throw new Error("Only the client for this booking can do that");
  }
}
