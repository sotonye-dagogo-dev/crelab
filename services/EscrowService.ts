import { db } from "@/lib/db";
import { bookings, payments, disputes } from "@/drizzle/schema";
import { eq, and, lt, gte } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { initTransaction } from "@/lib/paystack";
import {
  EscrowState,
  BookingStatus,
} from "@/types";
import type {
  IBooking,
  IPayment,
  IDispute,
} from "@/types";
import { BookingService } from "@/services/BookingService";

function mapPayment(row: typeof payments.$inferSelect): IPayment {
  return {
    id: row.id,
    bookingId: row.bookingId,
    amount: row.amount,
    fee: row.fee,
    netAmount: row.netAmount,
    paystackRef: row.paystackRef,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapDispute(row: typeof disputes.$inferSelect): IDispute {
  return {
    id: row.id,
    bookingId: row.bookingId,
    raisedById: row.raisedById,
    reason: row.reason,
    outcome: row.outcome as IDispute["outcome"],
    adminNotes: row.adminNotes,
    resolvedById: row.resolvedById,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

export interface IEscrowService {
  initiate(bookingId: string): Promise<{
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  }>;
  onPaystackSuccess(reference: string): Promise<void>;
  setInProgress(): Promise<{ processed: number; errors: string[] }>;
  clientConfirmRelease(bookingId: string, clientId: string): Promise<IBooking>;
  autoRelease(): Promise<{ processed: number; errors: string[] }>;
  raiseDispute(
    bookingId: string,
    clientId: string,
    reason: string,
  ): Promise<IDispute>;
  resolveDispute(
    disputeId: string,
    adminId: string,
    outcome: "RELEASED" | "REFUNDED",
    adminNotes?: string,
  ): Promise<IDispute>;
}

export class EscrowService implements IEscrowService {
  async initiate(bookingId: string) {
    const booking = await new BookingService().getById(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "ACCEPTED")
      throw new Error("Booking must be ACCEPTED before payment");

    const ref = `CRELAB-${booking.id}-${Date.now()}`;

    const platformConfig = await PlatformConfigService.get();

    const result = await initTransaction(
      booking.total,
      "payment@crelab.app",
      ref,
    );

    await db
      .update(bookings)
      .set({
        paystackRef: ref,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    return result;
  }

  async onPaystackSuccess(reference: string): Promise<void> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.paystackRef, reference));

    if (!booking) throw new Error(`No booking found for ref ${reference}`);

    const platformConfig = await PlatformConfigService.get();
    const releaseDeadline = new Date(booking.serviceDate!);
    releaseDeadline.setDate(
      releaseDeadline.getDate() + platformConfig.escrowReleaseDays,
    );

    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          status: "HELD",
          escrowState: "HELD",
          releaseDeadline,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, booking.id));

      await tx.insert(payments).values({
        id: crypto.randomUUID(),
        bookingId: booking.id,
        amount: booking.total,
        fee: booking.fee,
        netAmount: booking.total - booking.fee,
        paystackRef: reference,
        status: "HELD",
      });
    });
  }

  async setInProgress(): Promise<{ processed: number; errors: string[] }> {
    const platformConfig = await PlatformConfigService.get();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const toProgress = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "HELD"),
          gte(bookings.serviceDate!, todayStart),
          lt(bookings.serviceDate!, new Date(todayEnd.getTime() + 1000)),
        ),
      );

    let processed = 0;
    const errors: string[] = [];

    for (const booking of toProgress) {
      try {
        await db
          .update(bookings)
          .set({
            status: "IN_PROGRESS",
            escrowState: "IN_PROGRESS",
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, booking.id));
        processed++;
      } catch (err) {
        errors.push(
          `Booking ${booking.id}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }

    return { processed, errors };
  }

  async clientConfirmRelease(
    bookingId: string,
    clientId: string,
  ): Promise<IBooking> {
    const booking = await new BookingService().getById(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.clientId !== clientId)
      throw new Error("Only the client can confirm release");
    if (booking.status !== "IN_PROGRESS")
      throw new Error("Booking must be IN_PROGRESS");

    const [row] = await db
      .update(bookings)
      .set({
        status: "RELEASED",
        escrowState: "RELEASED",
        updatedAt: new Date(),
      })
      .where(and(eq(bookings.id, bookingId), eq(bookings.clientId, clientId)))
      .returning();

    if (!row) throw new Error("Failed to confirm release");
    return new BookingService().getById(bookingId) as Promise<IBooking>;
  }

  async autoRelease(): Promise<{ processed: number; errors: string[] }> {
    const now = new Date();

    const pendingRelease = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "IN_PROGRESS"),
          lt(bookings.releaseDeadline!, now),
        ),
      );

    let processed = 0;
    const errors: string[] = [];

    for (const booking of pendingRelease) {
      try {
        const openDispute = await db
          .select()
          .from(disputes)
          .where(
            and(
              eq(disputes.bookingId, booking.id),
              eq(disputes.outcome as any, null),
            ),
          );

        if (openDispute.length > 0) continue;

        await db
          .update(bookings)
          .set({
            status: "RELEASED",
            escrowState: "RELEASED",
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, booking.id));
        processed++;
      } catch (err) {
        errors.push(
          `Booking ${booking.id}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }

    return { processed, errors };
  }

  async raiseDispute(
    bookingId: string,
    clientId: string,
    reason: string,
  ): Promise<IDispute> {
    const booking = await new BookingService().getById(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.clientId !== clientId)
      throw new Error("Only the client can raise a dispute");
    if (booking.status !== "IN_PROGRESS")
      throw new Error("Booking must be IN_PROGRESS");
    if (new Date() >= new Date(booking.releaseDeadline!))
      throw new Error("Release deadline has passed");

    const [dispute] = await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          status: "DISPUTED",
          escrowState: "DISPUTED",
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, bookingId));

      return tx
        .insert(disputes)
        .values({
          id: crypto.randomUUID(),
          bookingId,
          raisedById: clientId,
          reason,
        })
        .returning();
    });

    return mapDispute(dispute);
  }

  async resolveDispute(
    disputeId: string,
    adminId: string,
    outcome: "RELEASED" | "REFUNDED",
    adminNotes?: string,
  ): Promise<IDispute> {
    const [dispute] = await db
      .select()
      .from(disputes)
      .where(eq(disputes.id, disputeId));

    if (!dispute) throw new Error("Dispute not found");

    const targetEscrowState: EscrowState =
      outcome === "RELEASED" ? EscrowState.RELEASED : EscrowState.REFUNDED;
    const targetBookingStatus: BookingStatus =
      outcome === "RELEASED" ? BookingStatus.RELEASED : BookingStatus.REFUNDED;

    const disputeOutcome = outcome === "RELEASED" ? "RESOLVED" : "REFUNDED";

    const rows = await db.transaction(async (tx) => {
      await tx
        .update(disputes)
        .set({
          outcome: disputeOutcome,
          adminNotes: adminNotes ?? null,
          resolvedById: adminId,
          resolvedAt: new Date(),
        })
        .where(eq(disputes.id, disputeId));

      await tx
        .update(bookings)
        .set({
          status: targetBookingStatus,
          escrowState: targetEscrowState,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, dispute.bookingId));

      return tx
        .select()
        .from(disputes)
        .where(eq(disputes.id, disputeId));
    });

    return mapDispute(rows[0]);
  }
}
