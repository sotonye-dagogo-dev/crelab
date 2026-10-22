# Test Plan

> **Metadata**
> - last-updated-by: execute-feature (Session 2026-10-19 — Booking & payment flow integrity + guidance affordances)
> - last-verified-against-code: 2026-10-19
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
- [x] Pure escrow-hold vocabulary — `lib/payment-flow.ts` classifyHoldOutcome exhaustive HoldResult (held/already_held/duplicate_charge/hold_lost_race retryable/not_payable/no_booking), parseBookingIdFromRef round-trip, shouldRecordChargeEvent terminal-only, holdFailureMessage + isHoldPending (covered 2026-10-19, `__tests__/lib/payment-flow.test.ts`)
- [x] Pure booking guidance — `lib/booking-guidance.ts` bookingNextStep exhaustive status×side (null = dedicated panel owns state), resolveBookingGuidance config toggle + `${status}:${side}` override + "" hide (covered 2026-10-19, `__tests__/lib/booking-guidance.test.ts`)
- [x] Config tip copy — `lib/hints.ts` resolveHint defaults merge, "" hide, `{{name}}`/`{{feeRate}}`/`{{escrowWindow}}` token fill (covered 2026-10-19, `__tests__/lib/hints.test.ts`)
- [x] Component: ClInfoTip — render, a11y (button role/aria), open/close interactions (covered 2026-10-19, `__tests__/components/ClInfoTip.test.tsx`)
- [x] Component: ClTabs — tablist/tab/tabpanel semantics, click switching, Arrow/Home/End keyboard navigation, controlled mode, scrollable overflow list (covered 2026-10-22, `__tests__/components/ClTabs.test.tsx`)
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
- [ ] API routes: Webhook handlers (Paystack HMAC + Monnify SHA-512 verification, idempotency; unsigned Monnify events accepted only when no live secret is configured)
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
