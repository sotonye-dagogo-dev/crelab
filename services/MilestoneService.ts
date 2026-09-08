import { db } from "@/lib/db";
import { bookings, bookingMilestones } from "@/drizzle/schema";
import { eq, and, asc } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { WalletService } from "@/services/WalletService";
import { BookingService } from "@/services/BookingService";
import {
  MilestoneAmountMismatchError,
  MilestoneLimitError,
  MilestoneMinimumError,
} from "@/lib/errors";
import type { IBookingMilestone } from "@/types";
import { MilestoneStatus } from "@/types";
import crypto from "crypto";

function mapMilestone(row: typeof bookingMilestones.$inferSelect): IBookingMilestone {
  return {
    id: row.id,
    bookingId: row.bookingId,
    index: row.index,
    title: row.title,
    description: row.description ?? undefined,
    amountKobo: row.amountKobo,
    feeKobo: row.feeKobo,
    status: row.status as MilestoneStatus,
    dueDate: row.dueDate?.toISOString() ?? undefined,
    fundedAt: row.fundedAt?.toISOString() ?? undefined,
    submittedAt: row.submittedAt?.toISOString() ?? undefined,
    approvedAt: row.approvedAt?.toISOString() ?? undefined,
    releasedAt: row.releasedAt?.toISOString() ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface IMilestoneService {
  createMilestones(
    bookingId: string,
    milestones: Array<{ title: string; description?: string; amountKobo: number; dueDate?: string }>,
  ): Promise<IBookingMilestone[]>;
  fundMilestone(milestoneId: string, clientUserId: string): Promise<IBookingMilestone>;
  submitMilestone(milestoneId: string, providerUserId: string, deliveryNote?: string): Promise<IBookingMilestone>;
  approveMilestone(milestoneId: string, clientUserId: string): Promise<IBookingMilestone>;
  autoApproveMilestone(milestoneId: string): Promise<void>;
  disputeMilestone(milestoneId: string, clientUserId: string, reason: string): Promise<IBookingMilestone>;
  getMilestonesByBooking(bookingId: string): Promise<IBookingMilestone[]>;
}

export class MilestoneService implements IMilestoneService {
  async createMilestones(
    bookingId: string,
    milestones: Array<{ title: string; description?: string; amountKobo: number; dueDate?: string }>,
  ): Promise<IBookingMilestone[]> {
    if (milestones.length > 5) throw new MilestoneLimitError();
    if (milestones.length < 2) throw new MilestoneMinimumError();

    const booking = await new BookingService().getById(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.paymentMode !== "MILESTONE") throw new Error("Booking must be in MILESTONE payment mode");

    const totalMilestoneAmount = milestones.reduce((sum, m) => sum + m.amountKobo, 0);
    if (totalMilestoneAmount !== booking.subtotal) {
      throw new MilestoneAmountMismatchError();
    }

    const platformConfig = await PlatformConfigService.get();

    const rows = await db.transaction(async (tx) => {
      const values = milestones.map((m, i) => ({
        id: crypto.randomUUID(),
        bookingId,
        index: i + 1,
        title: m.title,
        description: m.description ?? null,
        amountKobo: m.amountKobo,
        feeKobo: Math.round(m.amountKobo * platformConfig.feeRate),
        status: "PENDING" as const,
        dueDate: m.dueDate ? new Date(m.dueDate) : null,
        reviewDeadline: null,
        fundedAt: null,
        submittedAt: null,
        approvedAt: null,
        releasedAt: null,
        createdAt: new Date(),
      }));

      return tx.insert(bookingMilestones).values(values).returning();
    });

    return rows.map(mapMilestone);
  }

  async fundMilestone(milestoneId: string, clientUserId: string): Promise<IBookingMilestone> {
    const [milestone] = await db
      .select()
      .from(bookingMilestones)
      .where(eq(bookingMilestones.id, milestoneId));

    if (!milestone) throw new Error("Milestone not found");
    if (milestone.status !== "PENDING") throw new Error("Milestone must be PENDING to fund");

    const booking = await new BookingService().getById(milestone.bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.clientId !== clientUserId) throw new Error("Only the client can fund a milestone");

    if (milestone.index > 1) {
      const [prevMilestone] = await db
        .select()
        .from(bookingMilestones)
        .where(
          and(
            eq(bookingMilestones.bookingId, milestone.bookingId),
            eq(bookingMilestones.index, milestone.index - 1),
          ),
        );

      if (!prevMilestone || prevMilestone.status !== "RELEASED") {
        throw new Error("Previous milestone must be RELEASED before funding the next one");
      }
    }

    const walletService = new WalletService();
    await walletService.debitForMilestone(clientUserId, milestoneId, milestone.amountKobo, milestone.feeKobo);

    const [updated] = await db
      .update(bookingMilestones)
      .set({
        status: "FUNDED",
        fundedAt: new Date(),
      })
      .where(eq(bookingMilestones.id, milestoneId))
      .returning();

    return mapMilestone(updated);
  }

  async submitMilestone(milestoneId: string, providerUserId: string, deliveryNote?: string): Promise<IBookingMilestone> {
    const [milestone] = await db
      .select()
      .from(bookingMilestones)
      .where(eq(bookingMilestones.id, milestoneId));

    if (!milestone) throw new Error("Milestone not found");
    if (milestone.status !== "FUNDED") throw new Error("Milestone must be FUNDED to submit");

    const booking = await new BookingService().getById(milestone.bookingId);
    if (!booking) throw new Error("Booking not found");

    const provider = await db.query.providers.findFirst({
      where: (providers, { eq: eq2 }) => eq2(providers.id, booking.providerId),
    });
    if (!provider || provider.userId !== providerUserId) {
      throw new Error("Only the provider can submit a milestone");
    }

    const platformConfig = await PlatformConfigService.get();
    const reviewDeadline = new Date();
    reviewDeadline.setDate(reviewDeadline.getDate() + platformConfig.milestonePayments.reviewWindowDays);

    const metadata: Record<string, unknown> = {};
    if (deliveryNote) metadata.deliveryNote = deliveryNote;

    const [updated] = await db
      .update(bookingMilestones)
      .set({
        status: "SUBMITTED",
        submittedAt: new Date(),
        reviewDeadline,
      })
      .where(eq(bookingMilestones.id, milestoneId))
      .returning();

    return mapMilestone(updated);
  }

  async approveMilestone(milestoneId: string, clientUserId: string): Promise<IBookingMilestone> {
    const [milestone] = await db
      .select()
      .from(bookingMilestones)
      .where(eq(bookingMilestones.id, milestoneId));

    if (!milestone) throw new Error("Milestone not found");
    if (milestone.status !== "SUBMITTED") throw new Error("Milestone must be SUBMITTED to approve");

    const booking = await new BookingService().getById(milestone.bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.clientId !== clientUserId) throw new Error("Only the client can approve a milestone");

    if (milestone.reviewDeadline && new Date() > milestone.reviewDeadline) {
      throw new Error("Review window has expired — milestone will be auto-approved");
    }

    // Credit goes to the provider, not the client — milestone funds were escrowed from client wallet on funding
    const provider = await db.query.providers.findFirst({
      where: (providers, { eq: eq2 }) => eq2(providers.id, booking.providerId),
    });
    if (!provider) throw new Error("Provider not found for booking");
    const walletService = new WalletService();
    await walletService.creditMilestoneRelease(
      provider.userId,
      milestoneId,
      milestone.amountKobo - milestone.feeKobo,
      milestone.feeKobo,
    );

    const [updated] = await db
      .update(bookingMilestones)
      .set({
        status: "APPROVED",
        approvedAt: new Date(),
      })
      .where(eq(bookingMilestones.id, milestoneId))
      .returning();

    return mapMilestone(updated);
  }

  async autoApproveMilestone(milestoneId: string): Promise<void> {
    const [milestone] = await db
      .select()
      .from(bookingMilestones)
      .where(eq(bookingMilestones.id, milestoneId));

    if (!milestone) throw new Error("Milestone not found");
    if (milestone.status !== "SUBMITTED") return;

    if (!milestone.reviewDeadline || new Date() <= milestone.reviewDeadline) return;

    const booking = await new BookingService().getById(milestone.bookingId);
    if (!booking) throw new Error("Booking not found");

    const provider = await db.query.providers.findFirst({
      where: (providers, { eq: eq2 }) => eq2(providers.id, booking.providerId),
    });
    if (!provider) throw new Error("Provider not found for booking");
    const walletService = new WalletService();
    await walletService.creditMilestoneRelease(
      provider.userId,
      milestoneId,
      milestone.amountKobo - milestone.feeKobo,
      milestone.feeKobo,
    );

    await db
      .update(bookingMilestones)
      .set({
        status: "APPROVED",
        approvedAt: new Date(),
      })
      .where(eq(bookingMilestones.id, milestoneId));
  }

  async disputeMilestone(milestoneId: string, clientUserId: string, reason: string): Promise<IBookingMilestone> {
    const [milestone] = await db
      .select()
      .from(bookingMilestones)
      .where(eq(bookingMilestones.id, milestoneId));

    if (!milestone) throw new Error("Milestone not found");
    if (milestone.status !== "SUBMITTED") throw new Error("Milestone must be SUBMITTED to dispute");

    const booking = await new BookingService().getById(milestone.bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.clientId !== clientUserId) throw new Error("Only the client can dispute a milestone");

    if (milestone.reviewDeadline && new Date() > milestone.reviewDeadline) {
      throw new Error("Review window has expired");
    }

    await db
      .update(bookingMilestones)
      .set({
        status: "DISPUTED",
      })
      .where(eq(bookingMilestones.id, milestoneId));

    await db
      .update(bookings)
      .set({
        status: "DISPUTED",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, milestone.bookingId));

    const [updated] = await db
      .select()
      .from(bookingMilestones)
      .where(eq(bookingMilestones.id, milestoneId));

    return mapMilestone(updated);
  }

  async getMilestonesByBooking(bookingId: string): Promise<IBookingMilestone[]> {
    const rows = await db
      .select()
      .from(bookingMilestones)
      .where(eq(bookingMilestones.bookingId, bookingId))
      .orderBy(asc(bookingMilestones.index));

    return rows.map(mapMilestone);
  }
}
