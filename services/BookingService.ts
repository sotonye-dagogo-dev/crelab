import { db } from "@/lib/db";
import { bookings, providers, servicePackages } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import type { IBooking } from "@/types";
import { BookingStatus, PaymentMode } from "@/types";

export const LEGAL_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.REQUESTED]: [BookingStatus.ACCEPTED, BookingStatus.DECLINED, BookingStatus.CANCELLED],
  [BookingStatus.ACCEPTED]: [BookingStatus.HELD, BookingStatus.CANCELLED],
  [BookingStatus.DECLINED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.HELD]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED, BookingStatus.REFUNDED],
  [BookingStatus.IN_PROGRESS]: [BookingStatus.RELEASED, BookingStatus.DISPUTED],
  [BookingStatus.RELEASED]: [],
  [BookingStatus.DISPUTED]: [BookingStatus.RELEASED, BookingStatus.REFUNDED],
  [BookingStatus.REFUNDED]: [],
};

export class BookingStateError extends Error {
  constructor(
    message: string,
    public fromState: BookingStatus,
    public toState: BookingStatus,
  ) {
    super(message);
    this.name = "BookingStateError";
  }
}

function validateTransition(
  current: BookingStatus,
  target: BookingStatus,
): void {
  const allowed = LEGAL_TRANSITIONS[current];
  if (!allowed || !allowed.includes(target)) {
    throw new BookingStateError(
      `Cannot transition from ${current} to ${target}`,
      current,
      target,
    );
  }
}

function mapBooking(row: typeof bookings.$inferSelect): IBooking {
  return {
    id: row.id,
    providerId: row.providerId,
    clientId: row.clientId,
    packageId: row.packageId,
    status: row.status as BookingStatus,
    escrowState: row.escrowState as IBooking["escrowState"],
    subtotal: row.subtotal,
    fee: row.fee,
    total: row.total,
    serviceDate: row.serviceDate?.toISOString() ?? null,
    scopeNotes: row.scopeNotes,
    releaseDeadline: row.releaseDeadline?.toISOString() ?? null,
    paymentMode: (row.paymentMode ?? "ESCROW") as PaymentMode,
    paystackRef: row.paystackRef,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface IBookingService {
  createRequest(data: {
    providerId: string;
    clientId: string;
    packageId: string;
    serviceDate: string;
    scopeNotes?: string;
    paymentMode?: PaymentMode;
  }): Promise<IBooking>;
  acceptRequest(id: string): Promise<IBooking>;
  declineRequest(id: string): Promise<IBooking>;
  getById(id: string): Promise<IBooking | null>;
  getByClient(clientId: string): Promise<IBooking[]>;
  getByProvider(providerId: string): Promise<IBooking[]>;
}

export class BookingService implements IBookingService {
  async createRequest(data: {
    providerId: string;
    clientId: string;
    packageId: string;
    serviceDate: string;
    scopeNotes?: string;
    paymentMode?: PaymentMode;
  }): Promise<IBooking> {
    const [pkg] = await db
      .select()
      .from(servicePackages)
      .where(eq(servicePackages.id, data.packageId));

    if (!pkg) throw new Error("Package not found");

    const [prov] = await db
      .select()
      .from(providers)
      .where(eq(providers.id, data.providerId));

    if (!prov) throw new Error("Provider not found");
    if (!prov.active) throw new Error("Provider is not active");

    const serviceDateObj = new Date(data.serviceDate);
    if (isNaN(serviceDateObj.getTime())) throw new Error("Invalid service date");
    if (serviceDateObj <= new Date()) {
      throw new Error("Service date must be in the future");
    }
    // ACID: reject if wallet milestone payments requested but not enabled or below threshold
    const platformConfig = await PlatformConfigService.get();
    const feeKobo = Math.round(pkg.price * platformConfig.feeRate);
    const totalKobo = pkg.price + feeKobo;

    const requestedMode = data.paymentMode ?? PaymentMode.ESCROW;
    // Validate paymentMode against config
    if (requestedMode === PaymentMode.MILESTONE && !platformConfig.milestonePayments.enabled) {
      throw new Error("Milestone payments are currently disabled");
    }
    if (requestedMode === PaymentMode.MILESTONE && pkg.price < platformConfig.milestonePayments.minBookingAmountKobo) {
      throw new Error(`Milestone payments require a minimum booking of ₦${(platformConfig.milestonePayments.minBookingAmountKobo / 100).toLocaleString()}`);
    }

    const [row] = await db
      .insert(bookings)
      .values({
        id: crypto.randomUUID(),
        providerId: data.providerId,
        clientId: data.clientId,
        packageId: data.packageId,
        status: BookingStatus.REQUESTED,
        escrowState: "PENDING",
        subtotal: pkg.price,
        fee: feeKobo,
        total: totalKobo,
        serviceDate: serviceDateObj,
        scopeNotes: data.scopeNotes ?? null,
        paymentMode: requestedMode,
      })
      .returning();

    return mapBooking(row);
  }

  async acceptRequest(id: string): Promise<IBooking> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Booking not found");
    validateTransition(existing.status, BookingStatus.ACCEPTED);

    const [row] = await db
      .update(bookings)
      .set({ status: BookingStatus.ACCEPTED, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    return mapBooking(row);
  }

  async declineRequest(id: string): Promise<IBooking> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Booking not found");
    validateTransition(existing.status, BookingStatus.DECLINED);

    const [row] = await db
      .update(bookings)
      .set({ status: BookingStatus.DECLINED, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    return mapBooking(row);
  }

  async getById(id: string): Promise<IBooking | null> {
    const [row] = await db.select().from(bookings).where(eq(bookings.id, id));
    return row ? mapBooking(row) : null;
  }

  async getByClient(clientId: string): Promise<IBooking[]> {
    const rows = await db
      .select()
      .from(bookings)
      .where(eq(bookings.clientId, clientId))
      .orderBy(bookings.createdAt);
    return rows.map(mapBooking);
  }

  async getByProvider(providerId: string): Promise<IBooking[]> {
    const rows = await db
      .select()
      .from(bookings)
      .where(eq(bookings.providerId, providerId))
      .orderBy(bookings.createdAt);
    return rows.map(mapBooking);
  }
}
