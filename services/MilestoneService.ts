import { db } from "@/lib/db";
import { bookings, bookingMilestones } from "@/drizzle/schema";
import { eq, and, asc } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { WalletService } from "@/services/WalletService";
import { BookingService } from "@/services/BookingService";
import { AuditService } from "@/services/AuditService";
import { isUniqueViolation } from "@/services/EscrowService";
import {
  notifyMilestoneApproved,
  notifyMilestoneFunded,
  notifyMilestoneSubmitted,
} from "@/lib/lifecycle-emails";
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
    actorId?: string,
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
    actorId?: string,
  ): Promise<IBookingMilestone[]> {
    if (milestones.length > 5) throw new MilestoneLimitError();
    if (milestones.length < 2) throw new MilestoneMinimumError();

    const booking = await new BookingService().getById(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.paymentMode !== "MILESTONE") throw new Error("Booking must be in MILESTONE payment mode");

    // Authorization: only the booking's own client or provider may define its
    // milestones — any other authenticated user is refused (previously any
    // signed-in user could create milestones on anyone's milestone booking).
    if (actorId) {
      const providerRow = await db.query.providers.findFirst({
        where: (providers, { eq: eq2 }) => eq2(providers.id, booking.providerId),
      });
      const isClient = booking.clientId === actorId;
      const isProvider = providerRow?.userId === actorId;
      if (!isClient && !isProvider) {
        throw new Error("Only the client or provider for this booking can manage its milestones");
      }
    }

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

    void AuditService.log({
      userId: actorId ?? null,
      action: "milestones.created",
      entity: "bookings",
      entityId: bookingId,
      newValue: { count: rows.length, totalKobo: totalMilestoneAmount },
    }).catch(() => {});

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

    // Conditional PENDING→FUNDED flip: if another actor moved the milestone
    // between the check and now (double-click / concurrent fund), reverse the
    // debit instead of leaving money parked with no milestone to show for it.
    const [updated] = await db
      .update(bookingMilestones)
      .set({
        status: "FUNDED",
        fundedAt: new Date(),
      })
      .where(and(eq(bookingMilestones.id, milestoneId), eq(bookingMilestones.status, "PENDING")))
      .returning();

    if (!updated) {
      try {
        await walletService.reverseMilestoneDebit(clientUserId, milestoneId, milestone.amountKobo, milestone.feeKobo);
      } catch (revertErr) {
        console.error(
          `[milestones] debit reversal failed for milestone ${milestoneId} after lost fund race — manual wallet correction required`,
          revertErr,
        );
      }
      const [current] = await db
        .select()
        .from(bookingMilestones)
        .where(eq(bookingMilestones.id, milestoneId));
      if (current && current.status === "FUNDED") return mapMilestone(current); // concurrent fund won
      throw new Error("Milestone changed state before it could be funded — refresh and try again");
    }

    void AuditService.log({
      userId: clientUserId,
      action: "milestones.funded",
      entity: "booking_milestones",
      entityId: milestoneId,
      newValue: { amountKobo: milestone.amountKobo, feeKobo: milestone.feeKobo, bookingId: milestone.bookingId },
    }).catch(() => {});
    void notifyMilestoneFunded(milestoneId);

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
      .where(and(eq(bookingMilestones.id, milestoneId), eq(bookingMilestones.status, "FUNDED")))
      .returning();
    if (!updated) {
      const [current] = await db.select().from(bookingMilestones).where(eq(bookingMilestones.id, milestoneId));
      if (current && current.status === "SUBMITTED") return mapMilestone(current); // concurrent submit won
      throw new Error("Milestone changed state before it could be submitted — refresh and try again");
    }

    void AuditService.log({
      userId: providerUserId,
      action: "milestones.submitted",
      entity: "booking_milestones",
      entityId: milestoneId,
      newValue: { bookingId: milestone.bookingId, deliveryNote: deliveryNote ?? null },
    }).catch(() => {});
    void notifyMilestoneSubmitted(milestoneId);

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

    // Credit goes to the provider, not the client — milestone funds were escrowed from client wallet on funding.
    // Money first (idempotent — deterministic `MILESTONE-RELEASE-{milestoneId}`
    // reference, unique in wallet_transactions; a unique violation means a
    // concurrent approve/auto-approve already credited), then a conditional
    // SUBMITTED→APPROVED flip so concurrent paths collapse to one transition.
    const provider = await db.query.providers.findFirst({
      where: (providers, { eq: eq2 }) => eq2(providers.id, booking.providerId),
    });
    if (!provider) throw new Error("Provider not found for booking");
    const walletService = new WalletService();
    try {
      await walletService.creditMilestoneRelease(
        provider.userId,
        milestoneId,
        milestone.amountKobo - milestone.feeKobo,
        milestone.feeKobo,
      );
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // Already credited — fall through to the flip, which completes the retry.
    }

    const [updated] = await db
      .update(bookingMilestones)
      .set({
        status: "APPROVED",
        approvedAt: new Date(),
      })
      .where(and(eq(bookingMilestones.id, milestoneId), eq(bookingMilestones.status, "SUBMITTED")))
      .returning();

    if (!updated) {
      const [current] = await db.select().from(bookingMilestones).where(eq(bookingMilestones.id, milestoneId));
      if (current && current.status === "APPROVED") return mapMilestone(current); // concurrent approve won
      throw new Error("Milestone changed state before approval could complete — refresh and try again");
    }

    void AuditService.log({
      userId: clientUserId,
      action: "milestones.approved",
      entity: "booking_milestones",
      entityId: milestoneId,
      newValue: { amountKobo: milestone.amountKobo, feeKobo: milestone.feeKobo, bookingId: milestone.bookingId },
    }).catch(() => {});
    void notifyMilestoneApproved(milestoneId);

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
    // Money first, exactly-once (deterministic reference — a unique violation
    // means the client's manual approval already credited; fall through to the
    // conditional flip either way).
    try {
      await walletService.creditMilestoneRelease(
        provider.userId,
        milestoneId,
        milestone.amountKobo - milestone.feeKobo,
        milestone.feeKobo,
      );
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }

    await db
      .update(bookingMilestones)
      .set({
        status: "APPROVED",
        approvedAt: new Date(),
      })
      .where(and(eq(bookingMilestones.id, milestoneId), eq(bookingMilestones.status, "SUBMITTED")));

    void AuditService.log({
      userId: null,
      action: "milestones.auto_approved",
      entity: "booking_milestones",
      entityId: milestoneId,
      newValue: { amountKobo: milestone.amountKobo, feeKobo: milestone.feeKobo, bookingId: milestone.bookingId },
    }).catch(() => {});
    void notifyMilestoneApproved(milestoneId);
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

    void AuditService.log({
      userId: clientUserId,
      action: "milestones.disputed",
      entity: "booking_milestones",
      entityId: milestoneId,
      newValue: { reason, bookingId: milestone.bookingId },
    }).catch(() => {});

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
