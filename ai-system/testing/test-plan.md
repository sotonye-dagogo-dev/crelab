# Test Plan

> **Metadata**
> - last-updated-by: execute-feature (Session 2026-10-18 — Admin finance bookings + media fixes)
> - last-verified-against-code: 2026-10-18
> - staleness-policy: re-verify if new features are added

> **Overview:** Defines what needs to be tested and at what level for Crelab. Referenced by verify-work.md during the quality gate. Updated as new features are added.

---

## Unit Tests (Vitest)

- [ ] Service layer: BookingService methods (create request, accept, decline)
- [ ] Service layer: EscrowService state machine transitions
- [ ] Service layer: PaymentService (paystack ref validation, fee calc)
- [ ] Service layer: DriveService (URL validation, folder ID parsing, file filter, rate-limit classification/retry, stable thumbnails; previewFolder read-only mapping with zero DB writes)
- [ ] Service layer: PortfolioService (CRUD, reorder, hide/show)
- [x] Service layer: PortfolioService.listDriveItems — DRIVE source rows + provider join mapping (covered 2026-10-18, `__tests__/services/PortfolioService.test.ts`)
- [x] Service layer: FinanceService admin bookings — listBookings filters/aggregate, getBookingDetail merge + sorted audit, adminSettleBooking release/refund + 404/DISPUTED/no-HELD/already-settled guards + dual-level audit (covered 2026-10-18, `__tests__/services/FinanceService.test.ts`)
- [x] Component: MediaUpload Drive link tab — single link input (dedupe), Quick-preview button, onChange, tab switch (covered 2026-10-18, `__tests__/components/MediaUpload.test.tsx`; needs `esbuild: { jsx: "automatic" }` in vitest.config.ts)
- [ ] Service layer: ReviewService (create, aggregate rating)
- [ ] Utility functions: kobo formatting, date calculations, slug generation
- [ ] Config: PlatformConfigService (fallback chain, DB override)

---

## Integration Tests (Vitest + Supertest)

- [ ] API routes: Booking CRUD (happy path + error handling)
- [ ] API routes: Portfolio CRUD (happy path + auth gating)
- [ ] API routes: Drive sync trigger + drive/preview (auth, role guard, no provider-row gate on preview, validation, per-user budget 429, error states)
- [ ] API routes: Admin config update (auth, validation)
- [ ] API routes: Webhook handlers (Paystack HMAC verification, idempotency)
- [ ] Auth flow: registration, login, role assignment, consent recording
- [ ] Database: Drizzle CRUD operations for all tables
- [ ] Database: RLS policy enforcement (users can only access own data)

---

## End-to-End Tests (Playwright)

- [ ] Guest browse: Explore feed, search, profile viewing
- [ ] Auth: Registration with role selection, login, logout
- [ ] Provider: Onboarding wizard completion, profile live
- [ ] Booking: Request -> Accept -> Pay -> Confirm -> Release
- [ ] Escrow: Auto-release via cron simulation
- [ ] Dispute: Raise dispute -> admin resolve
- [ ] Drive: Link folder -> sync -> display on profile

---

## Performance Tests

- [ ] Explore feed: infinite scroll load time with 50+ cards
- [ ] Explore feed: video autoplay performance (IntersectionObserver)
- [ ] API response time under normal load
- [ ] Database query performance (indexed searches)
