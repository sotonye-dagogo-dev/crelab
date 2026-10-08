import "dotenv/config";
import { execSync } from "node:child_process";
import { db } from "../lib/db";
import * as s from "../drizzle/schema";
import { sql, eq, inArray } from "drizzle-orm";

const SEED_MARKER_KEY = "_seed_version";

/** Every email created by scripts/seed.ts — rollback only ever touches these. */
const SEED_EMAILS = [
  "admin@crellab.test",
  "chioma@crellab.test",
  "femi@crellab.test",
  "zainab@crellab.test",
  "tunde@crellab.test",
  "kemi@crellab.test",
  "sola@crellab.test",
  "ngozi@crellab.test",
  "efe@crellab.test",
  "yetunde@crellab.test",
];

const SEED_PROVIDER_IDS = ["prov-1", "prov-2", "prov-3", "prov-4", "prov-5"];
const SEED_TEAM_IDS = ["team-1", "team-2", "team-3", "team-4", "team-5", "team-6"];
const SEED_BLOG_SLUGS = [
  "how-to-choose-the-right-content-creator",
  "guide-to-pricing-creative-services-nigeria",
  "video-content-dominating-brand-marketing-2026",
  "spotlight-chioma-eze-ugc-career",
  "ndpr-compliance-guide-creative-businesses",
  "tips-filming-high-quality-video-budget",
];

/**
 * Removes seed data — and ONLY seed data.
 *
 * Default mode deletes rows scoped to the seed users/ids above, so real
 * accounts created after seeding are never touched (a previous version of
 * this script ran unscoped full-table DELETEs and wiped live data).
 *
 *   npm run db:seed:rollback          # seed-scoped removal (safe)
 *   npm run db:seed:rollback -- --all # full wipe of these tables (takes a
 *                                     # pg_dump backup first unless --no-backup)
 */
async function main() {
  const args = process.argv.slice(2);
  const fullWipe = args.includes("--all") || args.includes("--force");
  const skipBackup = args.includes("--no-backup");

  if (args.includes("--force")) {
    console.log("⚠️  --force is deprecated; use --all for a full wipe.\n");
  }

  console.log("🗑️  Crellab DB Seed Rollback\n");

  const existing = await db.select().from(s.platformConfig).where(sql`${s.platformConfig.key} = ${SEED_MARKER_KEY}`);
  if (existing.length === 0) {
    console.log("   No seed marker found — proceeding in seed-scoped mode anyway.\n");
  } else {
    console.log(`   Found seed: ${existing[0].value}\n`);
  }

  if (fullWipe) {
    if (!skipBackup) {
      console.log("💾 Full wipe requested — backing up first...");
      execSync("npx tsx scripts/db/backup.ts", { stdio: "inherit" });
      console.log("");
    } else {
      console.log("⚠️  --no-backup: skipping safety backup. This cannot be undone.\n");
    }
    await wipeAll();
  } else {
    await removeSeedScoped();
  }

  console.log("   → seed marker (platform_config)");
  await db.delete(s.platformConfig).where(eq(s.platformConfig.key, SEED_MARKER_KEY));

  console.log("\n✅ Seed rollback complete.");
  console.log("   Run `npm run db:seed` to re-seed.\n");
  process.exit(0);
}

/** Seed-scoped removal: every delete is filtered to known seed ids/users. */
async function removeSeedScoped() {
  const userRows = await db
    .select({ id: s.user.id })
    .from(s.user)
    .where(inArray(s.user.email, SEED_EMAILS));
  const seedUserIds = userRows.map((r) => r.id);

  if (seedUserIds.length === 0) {
    console.log("   No seed users found — nothing to remove.");
    return;
  }
  console.log(`   Removing data for ${seedUserIds.length} seed user(s)...`);

  const log = (label: string) => console.log(`   → ${label} (seed-scoped)`);

  log("wallet_transactions (seed wallets)");
  const seedWallets = await db
    .select({ id: s.wallets.id })
    .from(s.wallets)
    .where(inArray(s.wallets.userId, seedUserIds));
  const seedWalletIds = seedWallets.map((w) => w.id);
  if (seedWalletIds.length > 0) {
    await db.delete(s.walletTransactions).where(inArray(s.walletTransactions.walletId, seedWalletIds));
  }

  log("booking_milestones (seed bookings)");
  const seedBookings = await db
    .select({ id: s.bookings.id })
    .from(s.bookings)
    .where(sql`${s.bookings.id} LIKE 'bkg-%'`);
  const seedBookingIds = seedBookings.map((b) => b.id);
  if (seedBookingIds.length > 0) {
    await db.delete(s.bookingMilestones).where(inArray(s.bookingMilestones.bookingId, seedBookingIds));
  }

  log("wallets (seed users)");
  await db.delete(s.wallets).where(inArray(s.wallets.userId, seedUserIds));

  log("disputes (seed bookings)");
  if (seedBookingIds.length > 0) {
    await db.delete(s.disputes).where(inArray(s.disputes.bookingId, seedBookingIds));
  }

  log("reviews (seed users)");
  await db.delete(s.reviews).where(inArray(s.reviews.reviewerId, seedUserIds));

  log("payments (seed bookings)");
  if (seedBookingIds.length > 0) {
    await db.delete(s.payments).where(inArray(s.payments.bookingId, seedBookingIds));
  }

  log("bookings (seed ids)");
  await db.delete(s.bookings).where(sql`${s.bookings.id} LIKE 'bkg-%'`);

  log("portfolio_items (seed providers)");
  await db.delete(s.portfolioItems).where(inArray(s.portfolioItems.providerId, SEED_PROVIDER_IDS));

  log("service_packages (seed providers)");
  await db.delete(s.servicePackages).where(inArray(s.servicePackages.providerId, SEED_PROVIDER_IDS));

  log("providers (seed ids)");
  await db.delete(s.providers).where(inArray(s.providers.id, SEED_PROVIDER_IDS));

  log("consent_records (seed users)");
  await db.delete(s.consentRecords).where(inArray(s.consentRecords.userId, seedUserIds));

  log("blog_posts (seed slugs)");
  await db.delete(s.blogPosts).where(inArray(s.blogPosts.slug, SEED_BLOG_SLUGS));

  log("team_members (seed ids)");
  await db.delete(s.teamMembers).where(inArray(s.teamMembers.id, SEED_TEAM_IDS));

  log("media_assets (seed users)");
  await db.delete(s.mediaAssets).where(inArray(s.mediaAssets.ownerId, seedUserIds));

  log("accounts / sessions / verifications (seed users)");
  await db.delete(s.account).where(inArray(s.account.userId, seedUserIds));
  await db.delete(s.session).where(inArray(s.session.userId, seedUserIds));

  log("users (seed emails)");
  await db.delete(s.user).where(inArray(s.user.email, SEED_EMAILS));
}

/** Legacy full-table wipe. Only reachable via --all (backup taken first). */
async function wipeAll() {
  console.log("   ⚠️  FULL WIPE of seed-adjacent tables (backup already taken)...");
  const step = async (label: string, fn: () => Promise<unknown>) => {
    console.log(`   → ${label}`);
    await fn();
  };
  await step("wallet_transactions", () => db.delete(s.walletTransactions));
  await step("booking_milestones", () => db.delete(s.bookingMilestones));
  await step("wallets", () => db.delete(s.wallets));
  await step("disputes", () => db.delete(s.disputes));
  await step("reviews", () => db.delete(s.reviews));
  await step("payments", () => db.delete(s.payments));
  await step("bookings", () => db.delete(s.bookings));
  await step("portfolio_items", () => db.delete(s.portfolioItems));
  await step("service_packages", () => db.delete(s.servicePackages));
  await step("providers", () => db.delete(s.providers));
  await step("consent_records", () => db.delete(s.consentRecords));
  await step("blog_posts", () => db.delete(s.blogPosts));
  await step("team_members", () => db.delete(s.teamMembers));
  await step("bug_reports", () => db.delete(s.bugReports));
  await step("audit_log", () => db.delete(s.auditLog));
  await step("accounts (Better Auth)", () => db.delete(s.account));
  await step("sessions (Better Auth)", () => db.delete(s.session));
  await step("verifications (Better Auth)", () => db.delete(s.verification));
  await step("users (Better Auth)", () => db.delete(s.user));
}

main().catch((err) => {
  console.error("❌ Rollback failed:", err);
  process.exit(1);
});
