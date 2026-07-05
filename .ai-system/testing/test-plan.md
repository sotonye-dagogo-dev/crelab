# Test Plan

> **Metadata**
> - last-updated-by: update-ai-system
> - last-verified-against-code: 2026-07-05
> - staleness-policy: re-verify if new features are added

> **Overview:** Defines what needs to be tested and at what level for Crelab. Referenced by verify-work.md during the quality gate. Updated as new features are added.

---

## Unit Tests (Vitest)

- [ ] Service layer: BookingService methods (create request, accept, decline)
- [ ] Service layer: EscrowService state machine transitions
- [ ] Service layer: PaymentService (paystack ref validation, fee calc)
- [ ] Service layer: DriveService (URL validation, folder ID parsing, file filter)
- [ ] Service layer: PortfolioService (CRUD, reorder, hide/show)
- [ ] Service layer: ReviewService (create, aggregate rating)
- [ ] Utility functions: kobo formatting, date calculations, slug generation
- [ ] Config: PlatformConfigService (fallback chain, DB override)

---

## Integration Tests (Vitest + Supertest)

- [ ] API routes: Booking CRUD (happy path + error handling)
- [ ] API routes: Portfolio CRUD (happy path + auth gating)
- [ ] API routes: Drive sync trigger (auth, validation, error states)
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
