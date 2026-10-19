# Architecture History

> **Metadata**
> - last-updated-by: update-ai-system (Session 2026-10-19)
> - last-verified-against-code: 2026-10-19
> - staleness-policy: historical entries do not go stale — only the current architecture (in system-architecture.md) needs re-verification

> **Overview:** Chronological record of how Crelab's system architecture has evolved.

---

## History

### 2026-10-19 — Escrow Hold Integrity + Guidance Layer

**State:**
The escrow hold path gained a truthful result vocabulary and a repair architecture. Where `onPaystackSuccess` previously returned a bare boolean (and `/pay/verify` reported `verified:true` even when the hold failed), every surface now consumes an exhaustive `HoldResult` classified in pure `lib/payment-flow.ts` (held / already_held / duplicate_charge / hold_lost_race [retryable] / not_payable / no_booking). The webhook records the de-dupe `payments` row only on terminal outcomes (retryable → 500 so Paystack retries) and attributes charges through layered resolution — exact ref → `metadata.bookingId` → UUID parsed from the `CRELLAB-{bookingId}-{millis}` reference — which makes `initiate()`'s per-checkout ref overwrite harmless without any schema change. Non-retryable failures are audited.

`EscrowService.reconcileBooking` is the single repair primitive (processor-verify → idempotent hold → `escrow.reconcile` audit), driven by four callers: `/pay` pre-flight, the cron `reconcileStuckHolds` sweep (every 6h, grace-bounded), a rate-limited silent booking-page self-heal, and an explicit admin finance action. `BookingService.cancelBooking` now accepts a provider actor pre-payment.

Guidance became a layer: pure `lib/booking-guidance.ts` (`bookingNextStep` — who acts next, exhaustive, null when a dedicated panel owns the state) feeding `NextStepBanner` on panel-less states; `ClInfoTip` joined the Cl* primitive set with `lib/hints.ts` driving eight config-managed tips (token-filled, "" hides) across pay panel, escrow timeline, wallet, dashboard stat and admin finance; the `bookingFlow`/`hints` config blocks gained admin "Guidance" editor fields.

**Rationale:**
A verification endpoint that reports success when the money action failed is worse than no endpoint — it converts a transient hold failure into a permanent-looking product bug with no forensic trail and no repair path. Truthful classification + terminal-only idempotency rows + layered ref attribution + one reconcile primitive (with cron/page/admin callers) closes the class of bug rather than the instance. Guidance is config-driven so copy and toggles stay admin-manageable without code.

### 2026-10-19 — Booking Lifecycle + Payment Path Consolidation

**State:**
The booking state machine gained its missing edges and a single client-side money path. Four new lifecycle routes (`/api/bookings/[id]/{accept,decline,cancel,start}`) make the PRD flow (REQUESTED → provider accept → client pays into escrow) reachable for the first time — accept/decline existed as service methods but had zero callers. Race-safe conditional updates (`assertConcurrentChange`, `EscrowService.startBooking`) protect every transition; `validateTransition`/`LEGAL_TRANSITIONS` are now exported for reuse.

Access control was centralised in `lib/booking-access.ts` (viewer resolution + actor asserts, ADMIN-pass, fail-closed, mock-mode bypass) and applied to both the bookings list and detail pages (previously unscoped — every user saw every booking). Errors map through `lib/booking-action-errors.ts` with no internal leakage.

Client money movement collapsed into one hook (`hooks/useBookingPayment.ts`) shared by the booking drawer and the new `BookingPayPanel` — server-verify-only success, hosted new-tab fallback, popup watchdog, ref-based race guards. The broken DIRECT "Add Payment" wallet-topup (a documented residual since 2026-08-20) was removed in favor of the real `/pay` escrow path.

Dashboards moved from "silently empty" to truthful: pure `lib/booking-status.ts` owns status groupings with exhaustive-coverage tests, kanban columns cover every status (attention/refunded/cancelled appended), stats derive from rows, and payment history drops the 90-day cut (config `dashboard.paymentHistoryDays`, default 0) while gaining derived `stage`-labelled rows for charge-initiated bookings with no settled payment.

**Rationale:**
Fixing "records exist but users see nothing" required lifecycle wiring + scoping + truthful aggregation simultaneously — any one alone would have left a visible gap (payable-but-unreachable, visible-but-unpayable, or rendered-but-not-yours).

### 2026-07-04 — Initial Architecture

**State:**
Greenfield project. No application code yet. .ai-system governance structure initialized via bootstrap-project command. Full PRD (v2.1), ROADMAP (v1.1), and DESIGN (v1.1) documented. 19 HTML design screens completed in `.ai-system/designs/`.

Planned architecture: Next.js 15 App Router with route groups ((public), (auth), (admin), api/), OOP class-based services, interface-first TypeScript types, Drizzle ORM on Supabase PostgreSQL, Better Auth for standalone authentication, Paystack for payments with escrow state machine.

**Rationale:**
Metadata-driven, config-first architecture chosen so platform name, colours, fee rates, and categories are admin-configurable without code changes. Cl* wrappers around shadcn/ui isolate third-party UI dependencies. Service layer provides testable, injectable business logic. Supabase RLS ensures privacy by design from first migration.

---

### 2026-07-05 — Full MVP Build Sprint

**State:**
Milestones 1.0-1.4 substantially built in a single sprint. Application code now exists across the full stack: Next.js routes (public, auth, admin, API), 7 OOP services, 329-line Drizzle schema with migrations, Better Auth integration, 30+ React components, 8 lib wrappers, middleware route protection, and admin panel.

**Key architectural decisions realized in code:**
- PlatformConfigService with DB override + `unstable_cache` + `revalidateTag` pattern
- BookingService with LEGAL_TRANSITIONS map for state validation
- EscrowService with `setInProgress`/`autoRelease` cron endpoints and Paystack webhook HMAC-SHA512 verification
- ExploreService with cursor-based pagination via composite `(createdAt, id)` keys encoded in base64url
- DriveService with folder URL validation, paginated file fetch, supported MIME type filtering
- All monetary values in kobo (integer) — no float arithmetic

**Drift from original architecture:**
- `app/admin/` not `app/(admin)/` — no route group wrapping for admin
- `services/ReviewService.ts` not implemented (reviews handled inline in schema)
- `lib/mux.ts` stub only

---

### 2026-07-05 — OC-7 Production Readiness + Blog System

**State:**
OC-7 full audit completed. All 7 domains clean: wrapper compliance, config compliance, money audit, performance, accessibility, NDPR compliance, build gate. Sanity CMS blog system built with 4 blog components, 2 content schemas (blog post + creator spotlight), /blog and /blog/[slug] routes, sitemap.ts + robots.ts. NDPR compliance pages (/privacy, /terms) and CookieConsentBanner added. 40 pages building with zero errors/warnings.

**Key architectural changes:**
- `sanity/` directory added: config + schemas for Sanity CMS
- `lib/sanity.ts` — Sanity client wrapper
- `components/blog/` — ArticleBody, BlogCard, CreatorSpotlightEmbed, ToCSidebar
- `app/sitemap.ts`, `app/robots.ts` — Next.js SEO generation
- `components/shared/CookieConsentBanner.tsx` — NDPR compliance UI

**Drift resolved:**
- Sanity CMS integration — **complete** (previously listed as drift)
- Blog components — **complete** (previously empty directory)
- sitemap/robots — **complete** (previously missing)

**Remaining drift:**
- `app/admin/` not `app/(admin)/` — minor, no route group wrapping
- `services/ReviewService.ts` not implemented (reviews handled inline)
- `lib/mux.ts` stub only
- Provider Dashboard and Client Dashboard (Phase 2)

---

### 2026-07-22 — DB Seed System

**State:**
Created a reproducible database seeding system with working authentication. User creation now goes through Better Auth's HTTP API (`POST /api/auth/sign-up/email` on the Vercel deployment) so passwords are hashed correctly. The seed script creates 10 users, 5 provider profiles, 13 service packages, 14 portfolio items, 8 bookings, 5 payments, 2 reviews, 1 dispute, 9 wallets, 10 wallet transactions, and 30 consent records. A rollback script deletes all data in reverse FK dependency order with a `_seed_version` marker for idempotency.

**Key architectural changes:**
- `scripts/` directory added: `seed.ts` (275 lines) + `seed-rollback.ts` (87 lines)
- Seed relies on the Vercel deployment's auth endpoint — requires `BETTER_AUTH_URL` env var
- `package.json` scripts: `db:seed`, `db:seed:rollback`
- `tsx` and `dotenv` added as dependencies for script execution

**Architectural insight:**
Better Auth's password hashing/verification is a black box — pre-computed bcryptjs hashes are rejected even when they match the standard `$2b$10$` format. To create seed users with working passwords, the seed must route through Better Auth's native signUp flow. This has implications for any future admin "create user" functionality — it cannot bypass Better Auth's API.

**Drift resolved:**
- pre-hashed password approach — replaced with Better Auth API calls

**Remaining drift:**
- `app/admin/` not `app/(admin)/` — minor, no route group wrapping
- `services/ReviewService.ts` not implemented (reviews handled inline)
- `lib/mux.ts` stub only

---
