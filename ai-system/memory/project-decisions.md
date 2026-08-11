# Project Decisions

> **Metadata**
> - last-updated-by: update-ai-system
> - last-verified-against-code: 2026-08-05
> - staleness-policy: each entry has its own staleness — check supersedes links

> **Overview:** Log of significant architectural, technical, and product decisions for Crelab.

---

## Decision Format

```
## [Decision Title]

**Decision:** [What was decided]
**Date:** [YYYY-MM-DD]
**Made by:** [Role / Agent / Developer]
**Supersedes:** [link to any prior decision this replaces, or None]
**Superseded by:** [link to any newer decision that replaces this, or None]

**Reason:**
[Why this choice was made]

**Alternatives Considered:**
[What else was evaluated and why it was rejected]

**Implications:**
[What this decision affects going forward]
```

---

## Decisions

## Launch Categories: Content Creators + Cinematographers

**Decision:** Launch with two categories — Content Creators and Cinematographers/Videographers. Category schema is admin-configurable JSONB — expansion requires zero code changes.
**Date:** 2026-07-04
**Made by:** Co-founders (PRD v2.1 D1)
**Supersedes:** None
**Superseded by:** None

**Reason:** Focused launch scope. These two categories cover the highest-demand creative services based on primary survey data. Metadata-driven schema allows expansion without code changes.

**Alternatives Considered:** Launching with 5+ categories; single category. Both rejected — too broad or too narrow.

**Implications:** Admin panel needs a category manager with field schema builder. All category-specific UI must be rendered from config, not hardcoded.

---

## Payment Release Trigger: Hybrid Auto-Release

**Decision:** Hybrid model — auto-release 5 days post-service date unless client raises formal dispute. Client can also confirm and release early.
**Date:** 2026-07-04
**Made by:** Co-founders (PRD v2.1 D2)
**Supersedes:** None
**Superseded by:** None

**Reason:** Balances provider need for guaranteed payment with client protection. Auto-release prevents funds being stuck indefinitely. Early release option gives clients control.

**Alternatives Considered:** Pure manual release (disputes could lock funds forever); pure auto-release (no client protection).

**Implications:** Cron endpoints needed for setInProgress and autoRelease. EscrowTimelineUI needs live countdown. Dispute window logic required.

---

## Platform Fee: 5%

**Decision:** 5% platform fee on completed transactions. Admin-configurable rate.
**Date:** 2026-07-04
**Made by:** Co-founders (PRD v2.1 D3)
**Supersedes:** None
**Superseded by:** None

**Reason:** Competitive rate that funds escrow and dispute infrastructure. Paystack subaccount split deducts fee before provider payout.

**Alternatives Considered:** Tiered pricing; subscription model. Both rejected for simplicity at MVP.

**Implications:** Fee rate displayed prominently in booking flow. Paystack subaccount configuration needed. Fee displayed as platformConfig.feeRate — never hardcoded.

---

## Provider Profile Review: Soft Launch

**Decision:** Profiles go live immediately with "New" badge. Manual admin review within 48h. Abuse reports trigger suspension.
**Date:** 2026-07-04
**Made by:** Co-founders (PRD v2.1 D4)
**Supersedes:** None
**Superseded by:** None

**Reason:** Reduces friction for provider onboarding while maintaining quality control. "New" badge signals to clients that profile is unverified.

**Alternatives Considered:** Hard gating (profiles hidden until review) — rejected as too slow for cold start.

**Implications:** Provider review queue in admin panel. Badge component for "New" state. Verification system in admin.

---

## Guest Browse, Gate Booking

**Decision:** Anyone can browse Explore and view profiles. Registration required to book or message.
**Date:** 2026-07-04
**Made by:** Co-founders (PRD v2.1 D5)
**Supersedes:** None
**Superseded by:** None

**Reason:** Maximizes SEO and discovery while maintaining trust for transactions. Auth gate modal (not page redirect) preserves browsing context.

**Alternatives Considered:** Full gating (login wall) — rejected as it kills organic discovery.

**Implications:** AuthGate modal component needed. sessionStorage for pending action. Middleware protects only booking/messaging routes.

---

## Paystack Subaccount Model for Escrow

**Decision:** Use Paystack subaccount model where Crelab never holds user funds directly. Keeps Crelab outside direct CBN licensing requirements at MVP.
**Date:** 2026-07-04
**Made by:** Product (PRD v2.1 §9.3)
**Supersedes:** None
**Superseded by:** None

**Reason:** PCI SAQ A scope (lowest complexity). No CBN payment licence needed at MVP. Paystack handles all regulatory compliance for payment processing.

**Alternatives Considered:** Direct fund holding (requires CBN licence); Flutterwave-only (less Nigerian market penetration than Paystack).

**Implications:** Paystack webhook HMAC-SHA512 verification mandatory. Subaccount split configuration. Legal counsel required to confirm model before real money flows.

---

## All Money in Kobo (Integer)

**Decision:** All monetary values stored as integers (kobo). No floating point arithmetic on money anywhere in the codebase.
**Date:** 2026-07-04
**Made by:** Technical Lead (PRD v2.1 §7)
**Supersedes:** None
**Superseded by:** None

**Reason:** Floating point arithmetic on money causes rounding errors. Integer math is precise, auditable, and standard practice for financial systems.

**Alternatives Considered:** Decimal type in PostgreSQL; float with rounding. Both rejected as error-prone.

**Implications:** All DB columns are INTEGER with JSDoc comments specifying kobo. Services format to Naira for display only. Display layer divides by 100 for user-facing values.

---

## Cursor-Based Pagination for Explore Feed

**Decision:** Use composite cursor pagination with `(createdAt, id)` pair encoded in base64url. No offset-based pagination. Limit = 20, fetch limit+1 to determine hasMore.
**Date:** 2026-07-05
**Made by:** Implementer
**Supersedes:** None
**Superseded by:** None

**Reason:** Avoids offset drift when new providers are added during pagination. Cursor is stable and efficient with composite index on `(created_at, id)`.

**Alternatives Considered:** Offset-based (drift problem), keyset with single field (collisions possible).

**Implications:** All paginated endpoints should use cursor pattern. Explore endpoint must return `cursor` and `hasMore`.

---

## PlatformConfigService: Config Context + DB Override + Cache

**Decision:** PlatformConfigService loads from DB, merges with DEFAULT_CONFIG, wraps in Next.js `unstable_cache` with 5-minute revalidation. Admin writes go through `set()` which revalidates the cache tag.
**Date:** 2026-07-05
**Made by:** Implementer
**Supersedes:** None
**Superseded by:** None

**Reason:** Config must be hot-reloadable by admin without deploy. DB override with fallback default gives flexibility. Cache prevents DB hit on every request.

**Alternatives Considered:** Server-only config file (requires deploy); no cache (DB every request).

**Implications:** PlatformConfigProvider wraps root layout. All components consuming config use `usePlatformConfig()` hook.

---

## Booking State Machine: Explicit Legal Transition Map

**Decision:** `LEGAL_TRANSITIONS` map in `BookingService.ts` defines exactly which state transitions are allowed. Illegal transitions throw `BookingStateError`.
**Date:** 2026-07-05
**Made by:** Implementer
**Supersedes:** None
**Superseded by:** None

**Reason:** Prevents business logic bugs where bookings skip required states (e.g., REQUESTED -> HELD without ACCEPTED). Explicit map makes state machine auditable and testable.

**Alternatives Considered:** State machine library (overhead for 9 states, 7 transitions).

**Implications:** Any booking state change must go through `validateTransition`. Adding new states requires updating the map.

---

## Email Service: Resend + Simulation Fallback

**Decision:** Use Resend for transactional emails with a simulation fallback that shows an HTML preview modal when `RESEND_API_KEY` is not set. Email templates are config-driven via `platformConfig.emailConfig.templates`, admin-editable through `/admin/email-templates`.
**Date:** 2026-07-29
**Made by:** Implementer
**Supersedes:** None
**Superseded by:** None

**Reason:** Resend is the simplest transactional email provider with a generous free tier. The simulation fallback allows development and testing without sending actual emails. Config-driven templates allow non-engineer admins to modify email copy without code deploys.

**Alternatives Considered:** Nodemailer (more complex SMTP setup, no free tier); SendGrid (heavier SDK, more complex API); custom SMTP (operational overhead). Resend's REST API is the simplest to integrate.

**Implications:** EmailService wraps Resend behind an internal interface. All transactional email goes through `EmailService.send()` which handles template lookup, variable substitution, and Resend API calls. If `RESEND_API_KEY` is not set, the service returns a preview HTML instead of sending. Admin changes to templates via `/admin/email-templates` or config API apply immediately via PlatformConfigService cache invalidation.

### Session 20 update — email is now operational by default
- `DEFAULT_CONFIG.features.emailNotifications` is now `true`. It was previously undefined, so the feature check in `/api/email/send` and `/api/email/welcome` short-circuited with "Email notifications disabled" even when `RESEND_API_KEY` was present — the system could NOT go live with env vars plugged in. Fixed.
- Added `isResendConfigured()`/`getResendConfig()` (mirrors Cloudinary's guard) and a `/api/email/status` health route (mirrors `/api/media/status`).
- Subjects now receive `name`/`logoUrl` too, so `{{name}}` in a subject (e.g. welcome) actually resolves.

---

## In-App Notification Centre: Confirmed Phase 2 — Not Part of Phase 1 MVP

**Decision:** The in-app notification centre is Phase 2, NOT Phase 1 MVP. When asked to "deliver the in-app notification system if it is part of the phase 1 MVP", it was confirmed against `planning/project-plan.md` (Phase 2 list) and `planning/task-queue.md` ("in-app notification centre (Phase 2)") that it is not, so it was NOT implemented in Session 20. The email (Resend) half of notifications was made operational instead.
**Date:** 2026-08-11
**Made by:** Implementer (per issue directive condition)
**Supersedes:** None
**Superseded by:** None

**Reason:** Phase 1 Milestones 1.0–1.4 (foundation, provider supply, discovery, booking/payment, admin/SEO) do not include an in-app notification centre. Delivering it would violate scope discipline and the directive's explicit condition.

**Implications:** The `[~]` "in progress" marker on the notifications task in task-queue.md was resolved to `[x]` for the email portion and the in-app centre remains a Phase 2 backlog item. When Phase 2 begins, reference the design and the config-driven pattern (DB overrides + graceful env guard) used for email/Cloudinary.

---

## Google OAuth Sign-Up: Role + Consent Finalize Step Before Onboarding

**Decision:** Google OAuth is offered on the register page as a first-class alternative to email/password. New Google users land on the existing role-selection + NDPR-consent step (step 2 of the register flow), then move to onboarding exactly like email/password users. Users may self-assign `CLIENT` or `PROVIDER` via `POST /api/auth/role`; `ADMIN` is never assignable.
**Date:** 2026-08-05
**Made by:** Implementer
**Supersedes:** None
**Superseded by:** None

**Reason:** Better Auth creates the user at the Google consent callback, before the user has chosen a role or granted consent. Routing new users through the existing step-2 finalize keeps the onboarding experience identical to the email/password flow ("handling it successfully then moving to the onboarding phase seamlessly") and preserves NDPR consent capture for OAuth signups. Role self-assignment mirrors the product's open register flow (anyone may choose "A Creator"); restricting ADMIN requires no product change.

**Alternatives Considered:**
- Straight-to-`/explore` on OAuth success — rejected: skips role selection + NDPR consent and never routes new providers into the onboarding wizard.
- Setting role during the OAuth callback via Better Auth hooks — rejected: `role` is `input: false`, and the callback cannot ask the user for a role choice.
- Popup-based OAuth — rejected: Better Auth's full-page redirect flow with `newUserCallbackURL` is simpler and already available.

**Implications:**
- New Google users landing on the register page (or from the login page's Google button) always complete role + consent before onboarding.
- `POST /api/auth/role` must keep its allow-list to `CLIENT`/`PROVIDER` to prevent ADMIN escalation.
- The email/password provider signup path also calls the role endpoint, fixing the pre-existing gap where providers stayed `CLIENT` in the DB.
- Google OAuth requires `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and the `/api/auth/callback/google` redirect URI registered in Google Cloud.
