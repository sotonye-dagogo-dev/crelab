import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bookings,
  portfolioItems,
  providers,
  reviews,
  teamMembers,
  user,
} from "@/drizzle/schema";

export type IPlatformStats = {
  providers: number;
  bookings: number;
  reviews: number | null;
  portfolioItems: number;
  user: number;
  teamMembers: number;
};

export class PlatformStatsService {
  static async get(): Promise<IPlatformStats | null> {
    try {
      const [providersRows, bookingsRows, reviewsRows, portfolioRows, userRows, teamRows] =
        await Promise.all([
          db.select({ value: sql<number>`COUNT(*)`.as("value") }).from(providers),
          db.select({ value: sql<number>`COUNT(*)`.as("value") }).from(bookings),
          db
            .select({ value: sql<number | null>`AVG(${reviews.rating})`.as("value") })
            .from(reviews),
          db.select({ value: sql<number>`COUNT(*)`.as("value") }).from(portfolioItems),
          db.select({ value: sql<number>`COUNT(*)`.as("value") }).from(user),
          db.select({ value: sql<number>`COUNT(*)`.as("value") }).from(teamMembers),
        ]);

      const rawAverage = reviewsRows[0]?.value;
      const averageRating =
        rawAverage === null || rawAverage === undefined ? NaN : Number(rawAverage);

      return {
        providers: Number(providersRows[0]?.value ?? 0),
        bookings: Number(bookingsRows[0]?.value ?? 0),
        reviews: Number.isFinite(averageRating) ? averageRating : null,
        portfolioItems: Number(portfolioRows[0]?.value ?? 0),
        user: Number(userRows[0]?.value ?? 0),
        teamMembers: Number(teamRows[0]?.value ?? 0),
      };
    } catch {
      return null;
    }
  }

  static getCached = unstable_cache(
    async () => this.get(),
    ["platform-stats"],
    { revalidate: 300, tags: ["platform-stats"] },
  );
}
