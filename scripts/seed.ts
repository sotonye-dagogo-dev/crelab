import "dotenv/config";
import { db } from "../lib/db";
import * as s from "../drizzle/schema";
import { sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";

const SEED_MARKER_KEY = "_seed_version";
const SEED_VERSION = "2026-07-21-v1";
const BASE_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

const SEED_PASSWORD = "password123";

interface SeedUser {
  email: string; name: string; role: "ADMIN" | "PROVIDER" | "CLIENT"; phoneNumber: string;
}

const seedUsers: SeedUser[] = [
  { name: "Amara Okafor", email: "admin@crelab.test", role: "ADMIN", phoneNumber: "+2348010000001" },
  { name: "Chioma Eze", email: "chioma@crelab.test", role: "PROVIDER", phoneNumber: "+2348020000001" },
  { name: "Femi Adeyemi", email: "femi@crelab.test", role: "PROVIDER", phoneNumber: "+2348020000002" },
  { name: "Zainab Bello", email: "zainab@crelab.test", role: "PROVIDER", phoneNumber: "+2348020000003" },
  { name: "Tunde Bakare", email: "tunde@crelab.test", role: "PROVIDER", phoneNumber: "+2348020000004" },
  { name: "Kemi Balogun", email: "kemi@crelab.test", role: "PROVIDER", phoneNumber: "+2348020000005" },
  { name: "Sola Adegoke", email: "sola@crelab.test", role: "CLIENT", phoneNumber: "+2348030000001" },
  { name: "Ngozi Okonkwo", email: "ngozi@crelab.test", role: "CLIENT", phoneNumber: "+2348030000002" },
  { name: "Efe Thompson", email: "efe@crelab.test", role: "CLIENT", phoneNumber: "+2348030000003" },
  { name: "Yetunde Gbadebo", email: "yetunde@crelab.test", role: "CLIENT", phoneNumber: "+2348030000004" },
];

const providerEmails = [
  "chioma@crelab.test",
  "femi@crelab.test",
  "zainab@crelab.test",
  "tunde@crelab.test",
  "kemi@crelab.test",
] as const;

const clientEmails = [
  "sola@crelab.test",
  "ngozi@crelab.test",
  "efe@crelab.test",
  "yetunde@crelab.test",
] as const;

async function createUser(u: SeedUser, attempt = 1): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": BASE_URL, "Referer": BASE_URL + "/" },
    body: JSON.stringify({ email: u.email, password: SEED_PASSWORD, name: u.name }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 422 && body.includes("USER_ALREADY_EXISTS")) {
      console.log(`   ${u.email} already exists, updating role...`);
      const rows = await db.select({ id: s.user.id }).from(s.user).where(sql`${s.user.email} = ${u.email}`);
      const uid = rows[0]?.id;
      if (!uid) throw new Error(`User ${u.email} exists per API but not found in DB`);
      await db.update(s.user).set({ role: u.role, phoneNumber: u.phoneNumber, phoneNumberVerified: true, emailVerified: true }).where(sql`${s.user.id} = ${uid}`);
      return uid;
    }
    if (res.status === 429 && attempt <= 5) {
      const backoff = Math.min(5000 * attempt, 30000);
      console.log(`   Rate limited. Retrying in ${backoff / 1000}s (attempt ${attempt})...`);
      await new Promise(r => setTimeout(r, backoff));
      return createUser(u, attempt + 1);
    }
    throw new Error(`Sign-up failed for ${u.email}: ${res.status} ${body}`);
  }
  const data = await res.json() as { user: { id: string } };
  const uid = data.user.id;
  await db.update(s.user).set({ role: u.role, phoneNumber: u.phoneNumber, phoneNumberVerified: true, emailVerified: true }).where(sql`${s.user.id} = ${uid}`);
  return uid;
}

async function main() {
  console.log("Seed: Crelab DB\n");

  const existing = await db.select().from(s.platformConfig).where(sql`${s.platformConfig.key} = ${SEED_MARKER_KEY}`);
  if (existing.length > 0) {
    console.log("Seed already applied (version:", existing[0].value, ")");
    console.log("Run `npm run db:seed:rollback` first to re-seed.");
    process.exit(0);
  }

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  console.log(`Creating ${seedUsers.length} users via ${BASE_URL}...`);
  const userIdByEmail: Record<string, string> = {};
  for (const u of seedUsers) {
    const uid = await createUser(u);
    userIdByEmail[u.email] = uid;
    console.log(`   ${u.email} -> ${uid}`);
    await delay(3000);
  }

  const now30 = daysAgo(30);

  const P = (email: string) => userIdByEmail[email];
  if (!P) throw new Error("Missing user mapping");

  console.log("\nCreating provider profiles...");
  const providers = [
    { id: "prov-1", userId: P("chioma@crelab.test")!, categorySlug: "content-creator", displayName: "Chioma Eze Creative", bio: "Lagos-based content creator specialising in UGC, lifestyle, and brand storytelling. 5+ years crafting authentic narratives for Africa's biggest brands.", location: "Lagos, Nigeria", yearsActive: 5, experienceLevel: "ESTABLISHED" as const, featured: true, verified: true, profileViews: 1240 },
    { id: "prov-2", userId: P("femi@crelab.test")!, categorySlug: "cinematographer", displayName: "Femi Adeyemi Films", bio: "Award-winning cinematographer with a passion for visual storytelling. From corporate commercials to narrative documentaries, I bring your vision to life.", location: "Abuja, Nigeria", yearsActive: 8, experienceLevel: "VETERAN" as const, featured: true, verified: true, profileViews: 890 },
    { id: "prov-3", userId: P("zainab@crelab.test")!, categorySlug: "content-creator", displayName: "Zainab Bello Media", bio: "Kano-born content creator bridging the gap between northern Nigerian culture and modern brand storytelling. Specialise in Hausa/English bilingual content.", location: "Kano, Nigeria", yearsActive: 3, experienceLevel: "ESTABLISHED" as const, featured: false, verified: true, profileViews: 560 },
    { id: "prov-4", userId: P("tunde@crelab.test")!, categorySlug: "cinematographer", displayName: "Tunde Bakare Visuals", bio: "Port Harcourt-based cinematographer and editor. Music videos, events, and commercial work. Sony FX6 and DJI RS4 Pro equipped.", location: "Port Harcourt, Nigeria", yearsActive: 6, experienceLevel: "ESTABLISHED" as const, featured: false, verified: false, profileViews: 720 },
    { id: "prov-5", userId: P("kemi@crelab.test")!, categorySlug: "content-creator", displayName: "Kemi Balogun Studio", bio: "Ibadan-based creative director helping brands connect with Gen Z and Millennial audiences through authentic, scroll-stopping video content.", location: "Ibadan, Nigeria", yearsActive: 4, experienceLevel: "ESTABLISHED" as const, featured: true, verified: true, profileViews: 980 },
  ];
  for (const p of providers) {
    await db.insert(s.providers).values({ ...p, active: true, createdAt: now30, updatedAt: now30 });
  }
  console.log(`   ${providers.length} provider profiles created`);

  const pid = (n: number) => `prov-${n}`;
  const cid = (e: string) => {
    const idx = clientEmails.indexOf(e as typeof clientEmails[number]);
    return `prov-${5 + idx + 1}`;
  };

  console.log("\nCreating service packages...");
  const packages = [
    { id: "pkg-1", providerId: pid(1), tier: "BASIC" as const, label: "Basic UGC Clip", price: 75000, deliverables: JSON.stringify(["1x 60s vertical video", "1 revision", "Raw footage included", "Usage license (6 months)"]), turnaroundDays: 3 },
    { id: "pkg-2", providerId: pid(1), tier: "STANDARD" as const, label: "Standard Brand Campaign", price: 150000, deliverables: JSON.stringify(["2x 60s videos (vertical + horizontal)", "2 revisions", "Raw footage", "Usage license (12 months)", "B-roll pack"]), turnaroundDays: 5 },
    { id: "pkg-3", providerId: pid(1), tier: "PREMIUM" as const, label: "Premium Campaign Bundle", price: 350000, deliverables: JSON.stringify(["3x 60s videos", "5 revisions", "Raw footage", "Unlimited usage", "B-roll pack", "Behind-the-scenes reel", "Social media cutdowns"]), turnaroundDays: 7 },
    { id: "pkg-4", providerId: pid(2), tier: "BASIC" as const, label: "Event Highlights", price: 120000, deliverables: JSON.stringify(["3-5 min highlight reel", "1 revision", "Licensed music", "1080p delivery"]), turnaroundDays: 5 },
    { id: "pkg-5", providerId: pid(2), tier: "STANDARD" as const, label: "Commercial Package", price: 300000, deliverables: JSON.stringify(["60s commercial spot", "3 revisions", "Licensed music", "Colour grading", "4K delivery"]), turnaroundDays: 10 },
    { id: "pkg-6", providerId: pid(2), tier: "PREMIUM" as const, label: "Narrative Short Film", price: 750000, deliverables: JSON.stringify(["5-10 min short film", "Unlimited revisions", "Full colour grading", "Sound design", "4K delivery", "Behind-the-scenes photos", "Festival submission prep"]), turnaroundDays: 21 },
    { id: "pkg-7", providerId: pid(3), tier: "BASIC" as const, label: "Social Media Reel", price: 50000, deliverables: JSON.stringify(["1x 30-60s reel", "1 revision", "Captioned version", "Usage license (3 months)"]), turnaroundDays: 2 },
    { id: "pkg-8", providerId: pid(3), tier: "STANDARD" as const, label: "Brand Partnership Video", price: 120000, deliverables: JSON.stringify(["1x 60s hero video", "3 revisions", "Bilingual captioning (Hausa/English)", "Usage license (6 months)", "Thumbnail pack"]), turnaroundDays: 4 },
    { id: "pkg-9", providerId: pid(4), tier: "BASIC" as const, label: "Music Video Package", price: 200000, deliverables: JSON.stringify(["3-4 min music video", "2 revisions", "Colour grading", "1080p delivery"]), turnaroundDays: 7 },
    { id: "pkg-10", providerId: pid(4), tier: "STANDARD" as const, label: "Event Coverage", price: 350000, deliverables: JSON.stringify(["Full event coverage (up to 6 hrs)", "5-7 min highlight reel", "Full ceremony edit", "2 revisions", "4K delivery", "Photo gallery (50+ edited shots)"]), turnaroundDays: 14 },
    { id: "pkg-11", providerId: pid(5), tier: "BASIC" as const, label: "TikTok/Reels Pack", price: 60000, deliverables: JSON.stringify(["3x 30s vertical videos", "1 revision per video", "Trending audio", "Caption files"]), turnaroundDays: 3 },
    { id: "pkg-12", providerId: pid(5), tier: "STANDARD" as const, label: "Campaign Content Suite", price: 250000, deliverables: JSON.stringify(["5x vertical videos", "3x horizontal cutdowns", "5 revisions total", "Usage license (12 months)", "Analytics report", "A/B test thumbnails"]), turnaroundDays: 7 },
    { id: "pkg-13", providerId: pid(5), tier: "PREMIUM" as const, label: "Full Funnel Video Strategy", price: 600000, deliverables: JSON.stringify(["10x short-form videos", "2x long-form testimonial/case study", "8 revisions total", "Unlimited usage", "Strategy consultation", "Performance report", "Ad creative variants"]), turnaroundDays: 14 },
  ];
  for (const pkg of packages) {
    await db.insert(s.servicePackages).values({ ...pkg, createdAt: daysAgo(27), updatedAt: daysAgo(27) });
  }
  console.log(`   ${packages.length} service packages created`);

  console.log("\nCreating portfolio items...");
  const portfolioItems = [
    { id: "port-1", providerId: pid(1), source: "DIRECT" as const, url: "https://example.com/portfolio/chioma-ugc-1.mp4", title: "Skincare Brand UGC Campaign", caption: "Authentic product integration for a leading African skincare brand. 1M+ views across TikTok and Instagram.", mimeType: "video/mp4", orderIndex: 0 },
    { id: "port-2", providerId: pid(1), source: "DIRECT" as const, url: "https://example.com/portfolio/chioma-lifestyle-1.mp4", title: "Lifestyle Brand Collaboration", caption: "Day-in-the-life content for a Lagos-based fashion label.", mimeType: "video/mp4", orderIndex: 1 },
    { id: "port-3", providerId: pid(1), source: "DIRECT" as const, url: "https://example.com/portfolio/chioma-food-1.mp4", title: "Food Brand Reel Series", caption: "Mouth-watering recipe reels for a fast-growing African food delivery startup.", mimeType: "video/mp4", orderIndex: 2 },
    { id: "port-4", providerId: pid(2), source: "DIRECT" as const, url: "https://example.com/portfolio/femi-commercial-1.mp4", title: "Telecoms Commercial", caption: "National TV commercial for a major Nigerian telecom provider. Directed and shot by Femi.", mimeType: "video/mp4", orderIndex: 0 },
    { id: "port-5", providerId: pid(2), source: "DIRECT" as const, url: "https://example.com/portfolio/femi-doc-1.mp4", title: "Lagos Waterfront Documentary", caption: "Short documentary exploring the lives of Lagos waterfront communities. Official selection at AFRIFF 2025.", mimeType: "video/mp4", orderIndex: 1 },
    { id: "port-6", providerId: pid(2), source: "DIRECT" as const, url: "https://example.com/portfolio/femi-wedding-1.mp4", title: "Luxury Wedding Film", caption: "Cinematic wedding film for a high-profile Lagos couple. Shot over 3 days with drone coverage.", mimeType: "video/mp4", orderIndex: 2 },
    { id: "port-7", providerId: pid(3), source: "DIRECT" as const, url: "https://example.com/portfolio/zainab-fashion-1.mp4", title: "Northern Fashion Collection", caption: "Fashion lookbook video showcasing a Kano-based designer's latest collection. Bilingual narration.", mimeType: "video/mp4", orderIndex: 0 },
    { id: "port-8", providerId: pid(3), source: "DIRECT" as const, url: "https://example.com/portfolio/zainab-food-1.mp4", title: "Traditional Cuisine Series", caption: "Viral recipe series celebrating northern Nigerian cuisine. 500K+ combined views.", mimeType: "video/mp4", orderIndex: 1 },
    { id: "port-9", providerId: pid(3), source: "DIRECT" as const, url: "https://example.com/portfolio/zainab-interview-1.mp4", title: "Entrepreneur Spotlight", caption: "Interview series featuring young northern Nigerian entrepreneurs. Produced in partnership with a local incubator.", mimeType: "video/mp4", orderIndex: 2 },
    { id: "port-10", providerId: pid(4), source: "DIRECT" as const, url: "https://example.com/portfolio/tunde-music-1.mp4", title: "Afrobeat Music Video", caption: "Official music video for a rising Port Harcourt artist. 2M+ YouTube views.", mimeType: "video/mp4", orderIndex: 0 },
    { id: "port-11", providerId: pid(4), source: "DIRECT" as const, url: "https://example.com/portfolio/tunde-event-1.mp4", title: "Corporate Annual Dinner", caption: "Full event coverage for a major oil & gas company's annual dinner and awards night.", mimeType: "video/mp4", orderIndex: 1 },
    { id: "port-12", providerId: pid(5), source: "DIRECT" as const, url: "https://example.com/portfolio/kemi-beauty-1.mp4", title: "Beauty Brand Campaign", caption: "Full funnel campaign for a Nigerian beauty brand. From awareness ads to conversion-driven testimonial content.", mimeType: "video/mp4", orderIndex: 0 },
    { id: "port-13", providerId: pid(5), source: "DIRECT" as const, url: "https://example.com/portfolio/kemi-tech-1.mp4", title: "Fintech App Launch", caption: "Launch campaign for a Nigerian fintech startup. Included explainer videos, social cutdowns, and founder interview.", mimeType: "video/mp4", orderIndex: 1 },
    { id: "port-14", providerId: pid(5), source: "DIRECT" as const, url: "https://example.com/portfolio/kemi-event-1.mp4", title: "Fashion Week Coverage", caption: "Behind-the-scenes coverage of Lagos Fashion Week 2025. Real-time social content plus recap film.", mimeType: "video/mp4", orderIndex: 2 },
  ];
  for (const item of portfolioItems) {
    await db.insert(s.portfolioItems).values({ ...item, visible: true, createdAt: daysAgo(25), updatedAt: daysAgo(25) });
  }
  console.log(`   ${portfolioItems.length} portfolio items created`);

  console.log("\nCreating bookings in various states...");
  const bookings = [
    { id: "bkg-1", providerId: pid(1), clientId: P("sola@crelab.test")!, packageId: "pkg-2", status: "REQUESTED" as const, escrowState: "PENDING" as const, paymentMode: "ESCROW" as const, subtotal: 150000, fee: 7500, total: 157500, scopeNotes: "Campaign for our new organic skincare line. Need 2 videos (vertical + horizontal) showcasing product benefits.", createdAt: daysAgo(5) },
    { id: "bkg-2", providerId: pid(1), clientId: P("ngozi@crelab.test")!, packageId: "pkg-1", status: "ACCEPTED" as const, escrowState: "PENDING" as const, paymentMode: "ESCROW" as const, subtotal: 75000, fee: 3750, total: 78750, serviceDate: daysAgo(-3), scopeNotes: "Quick UGC video for our restaurant's new menu item. Want authentic, casual feel.", createdAt: daysAgo(10) },
    { id: "bkg-3", providerId: pid(2), clientId: P("sola@crelab.test")!, packageId: "pkg-5", status: "HELD" as const, escrowState: "HELD" as const, paymentMode: "ESCROW" as const, subtotal: 300000, fee: 15000, total: 315000, serviceDate: daysAgo(7), paystackRef: "pay_abc123", scopeNotes: "60-second commercial for our fintech app launch. Script provided, need creative input on visuals.", createdAt: daysAgo(14) },
    { id: "bkg-4", providerId: pid(2), clientId: P("efe@crelab.test")!, packageId: "pkg-4", status: "IN_PROGRESS" as const, escrowState: "IN_PROGRESS" as const, paymentMode: "ESCROW" as const, subtotal: 120000, fee: 6000, total: 126000, serviceDate: daysAgo(2), scopeNotes: "Highlight reel for our annual tech conference. Need 3-5 minute cut.", createdAt: daysAgo(20) },
    { id: "bkg-5", providerId: pid(5), clientId: P("yetunde@crelab.test")!, packageId: "pkg-12", status: "RELEASED" as const, escrowState: "RELEASED" as const, paymentMode: "ESCROW" as const, subtotal: 250000, fee: 12500, total: 262500, serviceDate: daysAgo(20), paystackRef: "pay_def456", scopeNotes: "Full campaign content suite for our fashion brand's summer collection launch.", createdAt: daysAgo(30) },
    { id: "bkg-6", providerId: pid(3), clientId: P("ngozi@crelab.test")!, packageId: "pkg-8", status: "DISPUTED" as const, escrowState: "DISPUTED" as const, paymentMode: "ESCROW" as const, subtotal: 120000, fee: 6000, total: 126000, serviceDate: daysAgo(10), paystackRef: "pay_ghi789", scopeNotes: "Brand partnership video for our snack brand. Need bilingual Hausa/English content.", createdAt: daysAgo(25) },
    { id: "bkg-7", providerId: pid(4), clientId: P("efe@crelab.test")!, packageId: "pkg-10", status: "CANCELLED" as const, escrowState: "REFUNDED" as const, paymentMode: "ESCROW" as const, subtotal: 350000, fee: 17500, total: 367500, scopeNotes: "Event coverage for our company's 10th anniversary. Event was postponed.", createdAt: daysAgo(15) },
    { id: "bkg-8", providerId: pid(5), clientId: P("sola@crelab.test")!, packageId: "pkg-11", status: "REQUESTED" as const, escrowState: "PENDING" as const, paymentMode: "ESCROW" as const, subtotal: 60000, fee: 3000, total: 63000, scopeNotes: "Need 3 TikTok-style reels for our new product teaser campaign.", createdAt: daysAgo(1) },
  ];
  for (const b of bookings) {
    await db.insert(s.bookings).values({ ...b, updatedAt: b.createdAt });
  }
  console.log(`   ${bookings.length} bookings created`);

  console.log("\nCreating payments...");
  const payments = [
    { id: "pay-1", bookingId: "bkg-3", amount: 300000, fee: 15000, netAmount: 285000, paystackRef: "pay_abc123", status: "success", createdAt: daysAgo(12) },
    { id: "pay-2", bookingId: "bkg-4", amount: 120000, fee: 6000, netAmount: 114000, paystackRef: "pay_jkl012", status: "success", createdAt: daysAgo(18) },
    { id: "pay-3", bookingId: "bkg-5", amount: 250000, fee: 12500, netAmount: 237500, paystackRef: "pay_def456", status: "success", createdAt: daysAgo(28) },
    { id: "pay-4", bookingId: "bkg-6", amount: 120000, fee: 6000, netAmount: 114000, paystackRef: "pay_ghi789", status: "success", createdAt: daysAgo(22) },
    { id: "pay-5", bookingId: "bkg-7", amount: 350000, fee: 17500, netAmount: 332500, paystackRef: "pay_mno345", status: "refunded", createdAt: daysAgo(12) },
  ];
  for (const p of payments) {
    await db.insert(s.payments).values(p);
  }
  console.log(`   ${payments.length} payments created`);

  console.log("\nCreating reviews...");
  const reviews = [
    { id: "rev-1", bookingId: "bkg-5", reviewerId: P("yetunde@crelab.test")!, providerId: pid(5), rating: 5, body: "Kemi exceeded our expectations! The campaign content was creative, on-brand, and delivered ahead of schedule. Our summer collection launch saw a 40% engagement increase. Will definitely work with Kemi again.", createdAt: daysAgo(15) },
    { id: "rev-2", bookingId: "bkg-3", reviewerId: P("sola@crelab.test")!, providerId: pid(2), rating: 4, body: "Femi is incredibly talented. The commercial spot captured our brand vision perfectly. Communication was smooth. Only gave 4 stars because delivery was 2 days late, but the quality made up for it.", createdAt: daysAgo(5) },
  ];
  for (const r of reviews) {
    await db.insert(s.reviews).values(r);
  }
  console.log(`   ${reviews.length} reviews created`);

  console.log("\nCreating disputes...");
  await db.insert(s.disputes).values({
    id: "disp-1", bookingId: "bkg-6", raisedById: P("ngozi@crelab.test")!,
    reason: "The delivered video did not include the agreed bilingual captions. Communication broke down after multiple revision requests. Requesting a partial refund.",
    createdAt: daysAgo(7),
  });
  console.log("   1 dispute created");

  console.log("\nCreating wallet records...");
  const walletUuids = ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002", "550e8400-e29b-41d4-a716-446655440003", "550e8400-e29b-41d4-a716-446655440004", "550e8400-e29b-41d4-a716-446655440005", "550e8400-e29b-41d4-a716-446655440006", "550e8400-e29b-41d4-a716-446655440007", "550e8400-e29b-41d4-a716-446655440008", "550e8400-e29b-41d4-a716-446655440009"];
  const wallets = [
    { id: walletUuids[0], userId: P("chioma@crelab.test")!, balanceKobo: 250000, escrowKobo: 78750, totalEarnedKobo: 450000 },
    { id: walletUuids[1], userId: P("femi@crelab.test")!, balanceKobo: 500000, escrowKobo: 315000, totalEarnedKobo: 1200000 },
    { id: walletUuids[2], userId: P("zainab@crelab.test")!, balanceKobo: 80000, escrowKobo: 120000, totalEarnedKobo: 300000 },
    { id: walletUuids[3], userId: P("tunde@crelab.test")!, balanceKobo: 150000, escrowKobo: 0, totalEarnedKobo: 600000 },
    { id: walletUuids[4], userId: P("kemi@crelab.test")!, balanceKobo: 380000, escrowKobo: 63000, totalEarnedKobo: 850000 },
    { id: walletUuids[5], userId: P("sola@crelab.test")!, balanceKobo: 1000000, escrowKobo: 63000, totalEarnedKobo: 0 },
    { id: walletUuids[6], userId: P("ngozi@crelab.test")!, balanceKobo: 500000, escrowKobo: 126000, totalEarnedKobo: 0 },
    { id: walletUuids[7], userId: P("efe@crelab.test")!, balanceKobo: 750000, escrowKobo: 126000, totalEarnedKobo: 0 },
    { id: walletUuids[8], userId: P("yetunde@crelab.test")!, balanceKobo: 300000, escrowKobo: 0, totalEarnedKobo: 0 },
  ];
  for (const w of wallets) {
    await db.insert(s.wallets).values({ ...w, createdAt: now30, updatedAt: now30 });
  }
  console.log(`   ${wallets.length} wallets created`);

  console.log("\nCreating wallet transactions...");
  const txnUuids = ["660e8400-e29b-41d4-a716-446655440001", "660e8400-e29b-41d4-a716-446655440002", "660e8400-e29b-41d4-a716-446655440003", "660e8400-e29b-41d4-a716-446655440004", "660e8400-e29b-41d4-a716-446655440005", "660e8400-e29b-41d4-a716-446655440006", "660e8400-e29b-41d4-a716-446655440007", "660e8400-e29b-41d4-a716-446655440008", "660e8400-e29b-41d4-a716-446655440009", "660e8400-e29b-41d4-a716-446655440010"];
  const txns = [
    { id: txnUuids[0], walletId: walletUuids[0], type: "ESCROW_RELEASE" as const, amountKobo: 150000, direction: "CREDIT" as const, balanceAfterKobo: 250000, reference: "ref_esc_rel_1", createdAt: daysAgo(20) },
    { id: txnUuids[1], walletId: walletUuids[0], type: "ESCROW_HOLD" as const, amountKobo: 78750, direction: "DEBIT" as const, balanceAfterKobo: 171250, reference: "ref_esc_hold_1", relatedBookingId: "bkg-2", createdAt: daysAgo(8) },
    { id: txnUuids[2], walletId: walletUuids[1], type: "ESCROW_RELEASE" as const, amountKobo: 500000, direction: "CREDIT" as const, balanceAfterKobo: 500000, reference: "ref_esc_rel_2", createdAt: daysAgo(10) },
    { id: txnUuids[3], walletId: walletUuids[1], type: "ESCROW_HOLD" as const, amountKobo: 315000, direction: "DEBIT" as const, balanceAfterKobo: 185000, reference: "ref_esc_hold_2", relatedBookingId: "bkg-3", createdAt: daysAgo(12) },
    { id: txnUuids[4], walletId: walletUuids[2], type: "ESCROW_HOLD" as const, amountKobo: 120000, direction: "DEBIT" as const, balanceAfterKobo: 80000, reference: "ref_esc_hold_3", relatedBookingId: "bkg-6", createdAt: daysAgo(22) },
    { id: txnUuids[5], walletId: walletUuids[3], type: "ESCROW_RELEASE" as const, amountKobo: 600000, direction: "CREDIT" as const, balanceAfterKobo: 600000, reference: "ref_esc_rel_4", createdAt: daysAgo(5) },
    { id: txnUuids[6], walletId: walletUuids[4], type: "ESCROW_RELEASE" as const, amountKobo: 250000, direction: "CREDIT" as const, balanceAfterKobo: 380000, reference: "ref_esc_rel_5", relatedBookingId: "bkg-5", createdAt: daysAgo(15) },
    { id: txnUuids[7], walletId: walletUuids[4], type: "ESCROW_HOLD" as const, amountKobo: 63000, direction: "DEBIT" as const, balanceAfterKobo: 317000, reference: "ref_esc_hold_5", relatedBookingId: "bkg-8", createdAt: daysAgo(1) },
    { id: txnUuids[8], walletId: walletUuids[5], type: "TOPUP_BANK" as const, amountKobo: 1000000, direction: "CREDIT" as const, balanceAfterKobo: 1000000, reference: "ref_topup_1", createdAt: daysAgo(28) },
    { id: txnUuids[9], walletId: walletUuids[5], type: "ESCROW_HOLD" as const, amountKobo: 63000, direction: "DEBIT" as const, balanceAfterKobo: 937000, reference: "ref_esc_hold_6", relatedBookingId: "bkg-8", createdAt: daysAgo(1) },
  ];
  for (const t of txns) {
    await db.insert(s.walletTransactions).values(t);
  }
  console.log(`   ${txns.length} wallet transactions created`);

  console.log("\nCreating consent records...");
  const consentTypes = ["TERMS", "MARKETING", "ANALYTICS"] as const;
  for (const u of seedUsers) {
    for (const ct of consentTypes) {
      await db.insert(s.consentRecords).values({
        id: `consent-${u.email.split("@")[0]}-${ct.toLowerCase()}`,
        userId: userIdByEmail[u.email],
        type: ct,
        granted: true,
        createdAt: now30,
      });
    }
  }
  console.log(`   ${seedUsers.length * 3} consent records created`);

  console.log("\nCreating team members...");
  const teamMemberData = [
    { id: "team-1", name: "Sotonye Dagogo", role: "Founder & Product Lead", bio: "Building the future of creative hiring in Africa. Product, design, and strategy.", socialLinks: JSON.stringify([{ platform: "Twitter", url: "https://x.com" }, { platform: "LinkedIn", url: "https://linkedin.com" }]), orderIndex: 0 },
    { id: "team-2", name: "Chioma Okafor", role: "Lead Engineer", bio: "Full-stack engineer passionate about developer experience and African tech ecosystems.", socialLinks: JSON.stringify([{ platform: "GitHub", url: "https://github.com" }, { platform: "LinkedIn", url: "https://linkedin.com" }]), orderIndex: 1 },
    { id: "team-3", name: "Emeka Nwosu", role: "Design Lead", bio: "Crafting cinematic interfaces that feel as good as they look.", socialLinks: JSON.stringify([{ platform: "Dribbble", url: "https://dribbble.com" }, { platform: "X", url: "https://x.com" }]), orderIndex: 2 },
    { id: "team-4", name: "Amina Bello", role: "Operations", bio: "Ensuring creators and clients have a seamless experience from first click to final delivery.", socialLinks: JSON.stringify([{ platform: "LinkedIn", url: "https://linkedin.com" }]), orderIndex: 3 },
    { id: "team-5", name: "Tunde Balogun", role: "Community Lead", bio: "Building the community that powers Nigeria's creative economy.", socialLinks: JSON.stringify([{ platform: "Twitter", url: "https://x.com" }, { platform: "LinkedIn", url: "https://linkedin.com" }]), orderIndex: 4 },
    { id: "team-6", name: "Zainab Ibrahim", role: "Growth & Marketing", bio: "Driving adoption and telling the Crellab story across Africa.", socialLinks: JSON.stringify([{ platform: "LinkedIn", url: "https://linkedin.com" }]), orderIndex: 5 },
  ];
  for (const m of teamMemberData) {
    await db.insert(s.teamMembers).values({ ...m, active: true, createdAt: now30, updatedAt: now30 });
  }
  console.log(`   ${teamMemberData.length} team members created`);

  console.log("\nCreating blog posts...");
  const blogPosts = [
    {
      id: uuid(),
      title: "How to Choose the Right Content Creator for Your Brand",
      slug: "how-to-choose-the-right-content-creator",
      content: [
        { _type: "block", _key: "intro", style: "normal", children: [{ _type: "span", _key: "intro-text", text: "Finding the right content creator for your brand can feel overwhelming. With Nigeria's creative economy booming, there are more talented professionals than ever — but how do you know who will be the best fit for your specific needs?" }] },
        { _type: "block", _key: "h2-1", style: "h2", children: [{ _type: "span", _key: "h2-1-text", text: "1. Define Your Goals" }] },
        { _type: "block", _key: "p1", style: "normal", children: [{ _type: "span", _key: "p1-text", text: "Before you start browsing portfolios, get crystal clear on what you want to achieve. Are you looking for brand awareness? Product sales? Event coverage? Different creators excel at different types of content." }] },
        { _type: "block", _key: "h2-2", style: "h2", children: [{ _type: "span", _key: "h2-2-text", text: "2. Review Their Portfolio" }] },
        { _type: "block", _key: "p2", style: "normal", children: [{ _type: "span", _key: "p2-text", text: "A creator's portfolio is their resume. Look for consistency in quality, storytelling ability, and whether their style aligns with your brand's aesthetic. On Crelab, you can watch video portfolios directly in the feed." }] },
        { _type: "block", _key: "h2-3", style: "h2", children: [{ _type: "span", _key: "h2-3-text", text: "3. Check Reviews and Ratings" }] },
        { _type: "block", _key: "p3", style: "normal", children: [{ _type: "span", _key: "p3-text", text: "Previous client experiences tell you a lot. Look for creators with consistent high ratings and detailed reviews that mention professionalism, communication, and delivery quality." }] },
        { _type: "block", _key: "h2-4", style: "h2", children: [{ _type: "span", _key: "h2-4-text", text: "4. Start with a Small Project" }] },
        { _type: "block", _key: "p4", style: "normal", children: [{ _type: "span", _key: "p4-text", text: "If you're unsure, many creators offer basic packages that are perfect for a trial run. Crelab's escrow system protects both parties, so you can start with confidence." }] },
        { _type: "block", _key: "outro", style: "normal", children: [{ _type: "span", _key: "outro-text", text: "Ready to find your perfect creator? Browse Crelab's curated marketplace and discover Nigeria's best creative talent today." }] },
      ],
      metaDescription: "A practical guide for brands looking to hire content creators in Nigeria. Learn how to evaluate portfolios, check reviews, and find the perfect creative partner.",
      heroImageUrl: null,
      category: "hiring-guides",
      tags: ["hiring", "content creation", "brand marketing"],
      author: "Crelab Editorial",
      published: true,
      publishedAt: new Date("2026-07-15").toISOString(),
    },
    {
      id: uuid(),
      title: "The Complete Guide to Pricing Creative Services in Nigeria",
      slug: "guide-to-pricing-creative-services-nigeria",
      content: [
        { _type: "block", _key: "intro", style: "normal", children: [{ _type: "span", _key: "intro-text", text: "Pricing creative work is one of the biggest challenges for Nigerian content creators and cinematographers. Charge too little and you undervalue your craft. Charge too much and you price yourself out of opportunities." }] },
        { _type: "block", _key: "h2-1", style: "h2", children: [{ _type: "span", _key: "h2-1-text", text: "Know Your Costs" }] },
        { _type: "block", _key: "p1", style: "normal", children: [{ _type: "span", _key: "p1-text", text: "Start by calculating your monthly operating costs: equipment maintenance, software subscriptions, transportation, data, and your own time. A simple formula: (Monthly Costs + Desired Salary) / Available Working Days = Minimum Daily Rate." }] },
        { _type: "block", _key: "h2-2", style: "h2", children: [{ _type: "span", _key: "h2-2-text", text: "Research Market Rates" }] },
        { _type: "block", _key: "p2", style: "normal", children: [{ _type: "span", _key: "p2-text", text: "On Crelab, you can browse what other creators with similar experience levels charge. Emerging creators typically price between ₦25,000–₦75,000 per project, while established and veteran creators command ₦100,000–₦750,000+." }] },
        { _type: "block", _key: "h2-3", style: "h2", children: [{ _type: "span", _key: "h2-3-text", text: "Package Your Services" }] },
        { _type: "block", _key: "p3", style: "normal", children: [{ _type: "span", _key: "p3-text", text: "Tiered packages (Basic, Standard, Premium) make it easy for clients to choose. Each tier should offer progressively more value — more videos, faster turnaround, additional revisions, or extra deliverables." }] },
      ],
      metaDescription: "Learn how Nigerian content creators and cinematographers can price their services competitively. From cost calculation to package strategy, this guide covers it all.",
      heroImageUrl: null,
      category: "pricing",
      tags: ["pricing", "freelance tips", "creative business"],
      author: "Crelab Editorial",
      published: true,
      publishedAt: new Date("2026-07-10").toISOString(),
    },
    {
      id: uuid(),
      title: "Why Video Content Is Dominating Brand Marketing in 2026",
      slug: "video-content-dominating-brand-marketing-2026",
      content: [
        { _type: "block", _key: "intro", style: "normal", children: [{ _type: "span", _key: "intro-text", text: "If a picture is worth a thousand words, a video is worth a million. In 2026, video isn't just part of the marketing mix — for many brands, it IS the marketing mix." }] },
        { _type: "block", _key: "h2-1", style: "h2", children: [{ _type: "span", _key: "h2-1-text", text: "The Attention Economy" }] },
        { _type: "block", _key: "p1", style: "normal", children: [{ _type: "span", _key: "p1-text", text: "Nigerian consumers spend an average of 3+ hours per day on social media, with video content accounting for over 70% of data consumption. Brands that aren't creating video content are invisible to a massive audience." }] },
        { _type: "block", _key: "h2-2", style: "h2", children: [{ _type: "span", _key: "h2-2-text", text: "Authenticity Wins" }] },
        { _type: "block", _key: "p2", style: "normal", children: [{ _type: "span", _key: "p2-text", text: "Today's consumers can spot a polished corporate ad from a mile away. What resonates is authentic, relatable content — the kind that UGC creators excel at producing. Raw, real, and relevant." }] },
        { _type: "block", _key: "h2-3", style: "h2", children: [{ _type: "span", _key: "h2-3-text", text: "Platform-Specific Strategies" }] },
        { _type: "block", _key: "p3", style: "normal", children: [{ _type: "span", _key: "p3-text", text: "Different platforms demand different approaches. TikTok favours short, punchy vertical content. YouTube rewards longer, more educational formats. Instagram sits somewhere in between. The best creators understand these nuances." }] },
      ],
      metaDescription: "Video content is the most powerful tool in brand marketing. Discover why Nigerian brands are investing in video and how to leverage it for your business.",
      heroImageUrl: null,
      category: "industry-news",
      tags: ["video marketing", "content strategy", "branding"],
      author: "Crelab Editorial",
      published: true,
      publishedAt: new Date("2026-07-05").toISOString(),
    },
    {
      id: uuid(),
      title: "Spotlight: How Chioma Eze Built a Thriving UGC Career",
      slug: "spotlight-chioma-eze-ugc-career",
      content: [
        { _type: "block", _key: "intro", style: "normal", children: [{ _type: "span", _key: "intro-text", text: "Chioma Eze started creating content as a side hustle in 2020. Four years later, she runs one of Lagos' most sought-after UGC studios, working with brands like Paystack, Flutterwave, and多家 international fashion labels." }] },
        { _type: "block", _key: "h2-1", style: "h2", children: [{ _type: "span", _key: "h2-1-text", text: "The Turning Point" }] },
        { _type: "block", _key: "p1", style: "normal", children: [{ _type: "span", _key: "p1-text", text: "\"The moment I stopped trying to be everything to everyone was when my career took off,\" Chioma recalls. \"I niched down to lifestyle and beauty UGC, and suddenly brands started reaching out to me.\"" }] },
        { _type: "block", _key: "h2-2", style: "h2", children: [{ _type: "span", _key: "h2-2-text", text: "Building a Portfolio" }] },
        { _type: "block", _key: "p2", style: "normal", children: [{ _type: "span", _key: "p2-text", text: "Chioma credits her Crelab portfolio for landing her biggest clients. \"Having a professional space where clients can see my work, read reviews, and book me directly has been transformative. It's like having a 24/7 salesperson.\"" }] },
      ],
      metaDescription: "Meet Chioma Eze, the Lagos-based content creator who built a thriving UGC career. Learn her strategies for niching down, building a portfolio, and landing brand deals.",
      heroImageUrl: null,
      category: "creator-spotlights",
      tags: ["creator spotlight", "UGC", "career growth"],
      author: "Crelab Editorial",
      published: true,
      publishedAt: new Date("2026-06-28").toISOString(),
    },
    {
      id: uuid(),
      title: "NDPR Compliance Guide for Creative Businesses",
      slug: "ndpr-compliance-guide-creative-businesses",
      content: [
        { _type: "block", _key: "intro", style: "normal", children: [{ _type: "span", _key: "intro-text", text: "Nigeria's Data Protection Regulation (NDPR) affects every business that handles personal data — including creative professionals who collect client information, store footage featuring individuals, or manage email lists." }] },
        { _type: "block", _key: "h2-1", style: "h2", children: [{ _type: "span", _key: "h2-1-text", text: "What You Need to Know" }] },
        { _type: "block", _key: "p1", style: "normal", children: [{ _type: "span", _key: "p1-text", text: "NDPR requires consent for data collection, purpose limitation, data minimisation, and the right to erasure. For creators, this means being transparent about how you use client data and footage." }] },
        { _type: "block", _key: "h2-2", style: "h2", children: [{ _type: "span", _key: "h2-2-text", text: "Practical Steps" }] },
        { _type: "block", _key: "p2", style: "normal", children: [{ _type: "span", _key: "p2-text", text: "Create a simple privacy policy, obtain written consent before publishing content featuring individuals, store client data securely, and have a process for deletion requests. Crelab's built-in consent management makes this easier." }] },
      ],
      metaDescription: "A practical guide to NDPR compliance for Nigerian creative professionals. Learn how to protect client data and stay compliant with data protection regulations.",
      heroImageUrl: null,
      category: "content-creation",
      tags: ["NDPR", "compliance", "data protection", "legal"],
      author: "Crelab Editorial",
      published: true,
      publishedAt: new Date("2026-06-20").toISOString(),
    },
    {
      id: uuid(),
      title: "5 Tips for Filming High-Quality Video on a Budget",
      slug: "tips-filming-high-quality-video-budget",
      content: [
        { _type: "block", _key: "intro", style: "normal", children: [{ _type: "span", _key: "intro-text", text: "You don't need a ₦5 million camera setup to create professional-looking videos. With the right techniques, even a smartphone can produce stunning content that attracts clients." }] },
        { _type: "block", _key: "h2-1", style: "h2", children: [{ _type: "span", _key: "h2-1-text", text: "1. Lighting Is Everything" }] },
        { _type: "block", _key: "p1", style: "normal", children: [{ _type: "span", _key: "p1-text", text: "Natural window light is free and flattering. For indoor shoots, a ₦15,000 LED panel from any photography store in Lagos makes a huge difference. Never use overhead fluorescent lighting." }] },
        { _type: "block", _key: "h2-2", style: "h2", children: [{ _type: "span", _key: "h2-2-text", text: "2. Audio Matters More Than Video" }] },
        { _type: "block", _key: "p2", style: "normal", children: [{ _type: "span", _key: "p2-text", text: "Viewers will forgive slightly soft footage but will click away immediately if audio is poor. A ₦25,000 lapel microphone is the best investment you can make." }] },
        { _type: "block", _key: "h2-3", style: "h2", children: [{ _type: "span", _key: "h2-3-text", text: "3. Stabilise Your Shots" }] },
        { _type: "block", _key: "p3", style: "normal", children: [{ _type: "span", _key: "p3-text", text: "Shaky footage screams amateur. Use a tripod (₦10,000–₦30,000) or a gimbal (₦80,000–₦200,000). For phone users, a simple phone tripod with a Bluetooth remote costs under ₦5,000." }] },
      ],
      metaDescription: "Create professional-looking video content without breaking the bank. Practical tips for lighting, audio, and stabilisation that every Nigerian creator can afford.",
      heroImageUrl: null,
      category: "content-creation",
      tags: ["video production", "budget tips", "filmmaking"],
      author: "Crelab Editorial",
      published: true,
      publishedAt: new Date("2026-06-15").toISOString(),
    },
  ];

  for (const post of blogPosts) {
    await db.insert(s.blogPosts).values({
      ...post,
      content: post.content,
      tags: post.tags,
      createdAt: new Date(post.publishedAt),
      updatedAt: new Date(post.publishedAt),
    });
  }
  console.log(`   ${blogPosts.length} blog posts created`);

  console.log("\nWriting seed marker...");
  await db.insert(s.platformConfig).values({
    id: "cfg-seed-marker",
    key: SEED_MARKER_KEY,
    value: JSON.stringify(SEED_VERSION),
    createdAt: now,
    updatedAt: now,
  });

  console.log("\nSeed complete!");
  console.log("   Login credentials:");
  console.log("   Admin:    admin@crelab.test / password123");
  console.log("   Providers: chioma@crelab.test, femi@crelab.test, zainab@crelab.test, tunde@crelab.test, kemi@crelab.test / password123");
  console.log("   Clients:   sola@crelab.test, ngozi@crelab.test, efe@crelab.test, yetunde@crelab.test / password123\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
