# Project Decisions

> **Metadata**
> - last-updated-by: execute-feature (Session 2026-10-08 — leaderboard-zero + explore-content + portfolio-attach)
> - last-verified-against-code: 2026-10-01
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

## Leaderboard Scoring: Pluggable Factor Registry + Config Weights, Not a Fixed Formula

**Decision:** Leaderboard ranking is computed by `services/LeaderboardService.ts` as a registry of `LeaderboardFactor` objects (`key`, `label`, `weight`, `collect()`), each reading raw values through its own aggregate query; the weighted score and rank order are produced by factor-agnostic code. Which factors exist, whether they are enabled, their labels/descriptions and their weights all live in config (`leaderboard.factors.*`), and every enabled factor is surfaced on the public page in a "How scoring works" panel. Four factors ship: `referrals` (`SUM(points)` over `referral_events`), `portfolio` (visible item count), `bookings` (count only), and `ratings` — whose raw value is **`AVG(rating) × ln(1 + count)`**, so a perfect rating from one review cannot outrank a strong rating earned across many.
**Date:** 2026-10-01
**Made by:** Implementer (per execute-feature directive — "primarily powered by referrals but extensible to other scoring factors")
**Supersedes:** None (implements engineering principle §2 for the leaderboard)
**Superseded by:** None

**Reason:**
A hardcoded formula makes every scoring change a code change + deploy, and hides the ranking logic from operators. The directive explicitly asked for extensibility; metadata-driven factors let the admin turn a factor off, retune a weight, or rewrite copy without touching ranking code. The `ratings` formula needed diminishing returns on count — `AVG × ln(1 + count)` rewards breadth of validation while staying bounded and computable in SQL/JS without per-row loops.

**Alternatives Considered:**
- A single fixed formula (e.g. referrals-only score) — rejected: F7 landed within the same sprint and would have required a rewrite.
- Storing precomputed scores on user rows (denormalised, cron-refreshed) — rejected: adds a consistency/refresh problem for no read-path benefit at current scale; the aggregates are cheap and cacheable.
- `AVG(rating) × count` (linear) — rejected: lets review volume alone dominate; the log damping keeps one 5-star review from beating a well-reviewed creator.
- Hiding raw factor values — partially adopted instead: `showRawValue` is per-factor config (hidden for `referrals`, shown for portfolio/bookings/ratings).

**Implications:**
- Adding a factor = one `LeaderboardFactor` implementation + one config entry; no changes to ranking, pagination, API shape, or the transparency panel (they all iterate config).
- The leaderboard renders only already-public profile fields (display name + avatar) and aggregate counts — invitee identities, booking amounts, counterparties and dates never appear.
- Any future factor must be expressible as an aggregate over existing tables without exposing private data, or it does not belong in the registry.

---

## Admin-Edited Config Lists Are Keyed Records — Arrays Only as a Single Atomic Key

**Decision:** Config collections that the admin edits field-by-field are stored as keyed records (`landingStats.items.{id}.*`, `leaderboard.factors.{key}.*`) so each leaf is addressable by a stable dotted key (`landingStats.items.creators.label`). A list that must stay an array (`countdown.widgets`) is written only as one whole-array value under a single key by its dedicated editor, never as indexed leaf paths.
**Date:** 2026-10-01
**Made by:** Implementer (execute-feature, Growth & Reliability sprint)
**Supersedes:** None (complements the "Deep-Merge Config Keys When Round-Tripping DB Rows" lesson)
**Superseded by:** None

**Reason:**
The config editor saves one dotted key per field, and `setNestedValue` in `PlatformConfigService` deep-sets that path on merge — but a path that walks *through* an array (`widgets.0.title`) cannot be reconstructed after a reorder/insert/delete (positional keys are not stable identities), so positional list edits get clobbered or land on the wrong item once the list changes. Keyed records give every item a stable identity that survives reordering, and make enable/disable/weight edits independent per item.

**Alternatives Considered:**
- Arrays with indexed dotted keys (`countdown.widgets.0.label`) — rejected: indices shift on reorder/remove, so a saved field can target a different widget; merging is order-dependent.
- Saving the whole config blob on every field edit — rejected: racy across concurrent admin edits and rewrites untouched keys.
- Custom list-editor API endpoints for every list — rejected: `countdown.widgets` proves the pattern where it *is* warranted (one atomic key from the dedicated `/admin/countdown` page), without inventing a second config write path elsewhere.

**Implications:**
- New admin-editable lists default to keyed records; reach for a single atomic array key only when a dedicated page owns the whole list and saves it at once.
- Consumers iterate `Object.values(...)` ordered by an explicit `orderIndex`, never by object key order.
- This is why `landingStats`/`leaderboard.factors` are objects while `countdown.widgets` is an array — the shape follows the write pattern, not preference.

---

## Platform-Name Copy Resolves From `config.name` With a `{{name}}` Token + Enforced Infrastructure Allowlist

**Decision:** Display copy never contains a literal platform name. It resolves from `config.name` at render time, or — where a constant cannot read config at module scope (fallback blog/mock bodies, static defaults) — carries the `PLATFORM_NAME_TOKEN` (`{{name}}`) and is filled via `fillPlatformName` from `lib/platform-copy.ts`. Infrastructure identifiers that are *not* display copy (config `name`/`fromName`/`fromEmail`, Better Auth `cookiePrefix`, payment references, demo emails, origin fallbacks, storage keys, the anonymous-mail domain) sit on an explicit allowlist, and `__tests__/platform-name-compliance.test.ts` fails the build on any `Crelab|CreLab|Crellab` outside that allowlist.
**Date:** 2026-10-01
**Made by:** Implementer (execute-feature F9 compliance run)
**Supersedes:** None (enforces the existing "Config-Driven Over Hardcoded" principle for the platform name specifically)
**Superseded by:** None

**Reason:**
The platform was renamed ("Crellab") but hardcoded name instances kept reappearing across landing, About, How It Works, blog fallback, mock data, email/payment copy — each one a silent divergence from `config.name` that an admin rename would not fix. A one-off grep cleans today's instances; a compliance test with an explicit allowlist keeps it enforced rather than aspirational, while the allowlist prevents the legitimate non-display identifiers (a cookie prefix or payment ref must not change when an operator renames the platform) from being "fixed" into breakage.

**Alternatives Considered:**
- A one-time search-and-replace with no guard — rejected: the drift returned within a few sprints last time.
- Failing on *any* occurrence — rejected: would forbid `cookiePrefix`, payment refs and `fromEmail`, which must stay stable across a rename.
- Resolving only in React components — rejected: metadata, fallback content and mock data are module-scope and have no config access; the token bridges them.

**Implications:**
- Any new hardcoded name instance fails `npm test` until it either resolves from config, uses the `{{name}}` token, or is deliberately added to the reviewed allowlist with a reason.
- A future platform rename is now a single `config.name` edit (plus email sender config) rather than a code sweep.

---

## Webinar Registration Dedupe: Unique Index + Upsert, Not a Pre-Read Check

**Decision:** Webinar registration is idempotent at the database: `webinar_registrations` carries a unique `(webinar_id, lower(email))` constraint plus a partial unique `(webinar_id, user_id)` where `user_id` is set, and `WebinarService.register` writes with an upsert that treats the conflict as "already registered". No "does this email exist?" read runs before the write.
**Date:** 2026-10-01
**Made by:** Implementer (execute-feature F8)
**Supersedes:** None (extends the project's idempotency posture — webhook `DuplicateWebhookError`, referral cookie claim — to form submissions)
**Superseded by:** None

**Reason:**
A pre-read check is a classic race: two concurrent submits both read "not registered" and both insert, either double-seating the registration or blowing up on the constraint with a 500 the user cannot interpret. The unique index is the only authoritative arbiter, so the conflict is handled where the truth lives — the second submit resolves to the existing row and returns the same "you're registered" state.

**Alternatives Considered:**
- SELECT-then-INSERT with an application-level check — rejected: TOCTOU race under concurrent submits (exactly what a "Reserve my seat" double-click produces).
- Advisory locks / serializable transactions per registration — rejected: heavier than a unique constraint for a two-row write with no secondary effects.
- Dropping the constraint and de-duplicating in a cron — rejected: leaves the duplicate visible to users and admins until the job runs.

**Implications:**
- `maxRegistrantsPerWebinar` capacity checks must be evaluated with the conflict path in mind (a losing upsert must not consume capacity twice).
- The same pattern applies to any future "one row per actor per entity" form: unique index first, upsert second, never a guarding read.
- Guest registrations key on `lower(email)`; signed-in users key on `user_id` — both constraints are part of the `0007` migration (currently **unapplied** — residual risk until it runs on Supabase).

---

## Portfolio Source Provenance (DIRECT/DRIVE) Is Portfolio-Context UI Only

**Decision:** The "Direct Upload" / "Google Drive" (synced) source tag is displayed only where the viewer is a provider managing/viewing their own portfolio content or an admin reviewing a provider's portfolio (e.g. `/profile/media` badges, dashboard `PortfolioGalleryGrid`, Drive portfolio section). It is NOT displayed on the public explore content view (gallery tiles or their lightbox).
**Date:** 2026-09-23
**Made by:** Product directive (via execute-feature)
**Supersedes:** None
**Superseded by:** None

**Reason:**
Source provenance is an internal/operational detail for portfolio management and admin review; on the public discovery feed it is noise and leaks upload plumbing to clients who only care about the work itself.

**Alternatives Considered:**
- Removing the tag everywhere — rejected: providers and admins still need it for portfolio management context.
- Gating on auth role alone in explore — rejected: even logged-in clients browsing explore have no need for it; the view (content feed) is the right gate, not the role.

**Implications:**
`AssetLightbox` takes `showSource?: boolean` (default `true` — portfolio callers unchanged); explore's internal lightbox passes `false`. Any new public-facing surface that renders portfolio items should pass `showSource={false}` (or omit source badges entirely); portfolio/admin surfaces keep the default.

---

## Payment Truthfulness: Verify, Don't Assume, on Paystack Returns

**Decision:** Wallet top-ups are never reported as successful based on the platform's own 200. Every Paystack `initTransaction` now carries `metadata` (`purpose`, `userId`) and a `callback_url` back to `/wallet/payment-status`, which verifies the charge via `GET /api/wallet/topup/verify` (Paystack `transaction/verify`) before crediting — idempotently — and then shows an honest success / not-completed / error state. The wallet page refreshes its balance on mount so the state reflects what actually happened.
**Date:** 2026-08-20
**Made by:** Agent (execute-feature)
**Supersedes:** None (extends the earlier "verify webhook before any mutation" invariant to the return path)
**Superseded by:** None

**Reason:**
Alpha feedback: after Paystack checkout there was no redirect and the wallet showed no trace of the transaction. Root cause found while fixing it — `initTransaction` never sent `metadata`, so the `charge.success` webhook's `purpose === "WALLET_TOPUP"` branch could never match and wallet top-ups were never credited. Payments are the one surface where a false positive is unacceptable, so the return path now verifies with Paystack directly and credits only on a confirmed `success`.

**Alternatives Considered:**
- Relying solely on the webhook and a plain "you'll be credited shortly" message — rejected: gives no immediate truthful reflection and hides webhook routing bugs like the missing-metadata one above.
- Crediting from the callback without verifying — rejected: the callback URL is reachable by anyone, so the charge must be verified + ownership-checked (reference prefix `WALLET-TOPUP-<userId>-` AND echoed `metadata.userId`) before any balance mutation.

**Implications:**
- `lib/paystack.ts` gained `InitTransactionOptions` (metadata/callbackUrl) and `verifyTransaction(reference)`; callers of `initTransaction` may now pass attribution metadata.
- The verify endpoint and the webhook both credit through `WalletService.topUpFromCard`, which is idempotent via `processed_webhook_events`; the webhook treats a `DuplicateWebhookError` as a 200 `duplicate`.
- Bank-transfer (DVA) top-up is no longer surfaced in the wallet UI; the route/service/columns remain for a future re-enable.
- Booking "Add Payment" (DIRECT mode) still routes through the wallet top-up init and `/api/bookings/*/pay` does not exist yet — a booking-payment flow remains to be built before real money moves (residual risk).

## Change-Email Confirmation Must Target the New Address Only

**Decision:** The change-email confirmation may only ever be addressed to the new address the user types; the platform must never claim success when the send was misaddressed, failed, or never attempted.
**Date:** 2026-08-20
**Made by:** Agent (execute-feature)
**Supersedes:** None (strengthens Session 31's removal of `sendChangeEmailConfirmation`)
**Superseded by:** None

**Reason:**
Alpha feedback reported the change-email confirmation reaching "both the old mail and the new mail". Better Auth 1.6.23 (lockfile-pinned) was reproduced in isolation: with no `sendChangeEmailConfirmation`, `changeEmail` fires `sendVerificationEmail` exactly once, addressed to the new email only, in both verified and unverified paths. The old-address receipts trace to stale deployed code or the separate "Send verification email" action. To guarantee correctness regardless of upstream behaviour, the send destination is now captured (`EmailSendResult.to`) and verified before any success is reported.

**Alternatives Considered:**
- Implementing `sendChangeEmailConfirmation` to send to `newEmail` — rejected: it triggers Better Auth's two-step confirmation flow (first click mints a second verification email, so the user receives two emails and must click twice).
- Trusting Better Auth's callback without verification — rejected: it made the app dependent on opaque callback semantics and allowed false positives (e.g. `status:true` with no send when the address already exists).

**Implications:**
- `EmailSendResult.to` is additive and backward-compatible.
- `/api/email/change` returns a hard 500 if any captured send is aimed at the old/current address, and an honest `sent:false` with a neutral reason when no send was attempted (preserving Better Auth's existing-address non-disclosure).
- `runWithEmailSendSink` now returns the full results array so all captured sends are checked, not just the last.

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

---

## Registry-Driven Media Asset Cleanup + Confirmed Destructive Actions

**Decision:** Orphan-cloudinary-upload cleanup is registry-driven: every upload is recorded in a local `media_assets` table, and the cleanup job deletes rows older than `mediaUpload.cleanupOrphanAfterHours` whose publicId is not referenced in `providers`/`portfolio_items` (no Cloudinary remote tag/list scanning). Deleting a media asset clears its references first (provider cover/avatar → null; portfolio rows removed) and then deletes the Cloudinary binary — irrevocable, so delete flows use `ClConfirmDialog`, while reversible admin deletes (team member, portfolio item) use `useUndoable` undo toasts. Cleanup is gated by `mediaUpload.cleanupEnabled` and surfaced in `/api/media/status`.
**Date:** 2026-08-11 (implemented, undocumented) 2026-08-12 (logged on close-out)
**Made by:** Implementer
**Supersedes:** None
**Superseded by:** None

**Reason:**
Remote API scanning for orphans is slow (pagination, rate limits, eventual consistency) and error-prone; a local registry makes cleanup a SQL query plus a bounded set of Cloudinary deletes. Reference-clearing + binary delete is irreversible, so confirmation UI is mandatory on user-triggered deletes.

**Alternatives Considered:**
- Cloudinary tag/list scanning — rejected: slow, rate-limited, eventual-consistency drift
- Soft-delete only (mark orphaned without deleting binary) — rejected: storage costs for orphaned binaries; delete is the point of the job

**Implications:**
Cleanup jobs and admin/user media managers depend on the `media_assets` registry staying consistent (uploads record synchronously; compensating delete on record insert failure). Env vars for signed deletes are server-only (`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET`) with `NEXT_PUBLIC_CLOUDINARY_*` fallbacks.

---

## Relative URLs Resolved at Render Time, Not Baked at Edit Time

**Decision:** Template-token `{{variable}}` values and raw relative paths (`/primary-logo.png`) are the interchange format stored in config/blocks/HTML. Relative `src`/`href` values are resolved to absolute — via the shared `lib/url` helpers (`resolveUrlForRender` for single values, `resolveRelativeUrlsInHtml` for rendered HTML blobs) — only at the final render boundary: the admin preview (client-side, `previewVarsFor(config)` + `substituteSampleVars`) and the real send (`EmailService.send`). The preview captures the DB-configured `logoPath`/name, not `DEFAULT_CONFIG`.
**Date:** 2026-08-13
**Made by:** Implementer
**Supersedes:** None
**Superseded by:** None

**Reason:**
Email clients can't resolve relative URLs, so logo/images added as `/primary-logo.png` in the visual builder never rendered in previews or sent mail. Resolving at save time bakes the editor's client origin (e.g. `localhost:3000`) into stored HTML; resolving at render time lets the preview use the client's build-time `NEXT_PUBLIC_APP_URL` and the server the runtime env, each correct for its context.

**Alternatives Considered:**
- Resolve inside `blocksToHtml()`/on save — rejected: bakes client origin into stored config; wrong when editing from a local dev box against a production DB
- Generic regex over all `src`/`href` — rejected: mangles `data:`/`mailto:`/`tel:`/`#`/`{{token}}` values; helpers skip scheme'd, protocol-relative, fragment, and template-token values

**Implications:**
The resolved absolute origin for email assets is `appOrigin()` (NEXT_PUBLIC_APP_URL → VERCEL_URL → localhost), so `NEXT_PUBLIC_APP_URL` must be set to a publicly reachable origin in the deployed runtime or the logo will still fail to load there. New render surfaces for email/blog content should route image/link URLs through the same `lib/url` helpers.

---

## ai-system Upgraded to Template v3.0.0 (pull-template-update)

**Decision:** Adopt the v3 ai-system template (`Sotonye0808/ai-system-template`, VERSION 3.0.0) via the pull-based update mechanism. New subsystems added: `skills/` (9 self-invoking expertise units), `tools/` (resource registry + integration docs), `design-references/` (pulled reference-design library + TEMPLATE). New commands added: `audit-sources.md`, `visual-review.md`, `generate-design-md.md`, `pull-template-update.md`. Existing commands/protocols/standards edited per `V2_TO_V3_MIGRATION.md` (mandatory `Chains to` rows, §11–§24 engineering principles, task-queue/checkpoint coupling, `last-synced` marker, `installed-ai-system-version: 3.0.0`). No local content files (session-log, task-queue data, memory, project docs, designs) were overwritten — only merged.
**Date:** 2026-08-13
**Made by:** Implementer (per issue update-ai-system directive)
**Supersedes:** None
**Superseded by:** None

**Reason:**
The project's ai-system predated v3 (no `installed-ai-system-version` baseline). v3 adds the skill layer, a persistent external-resource registry (so sessions stop re-litigating tools), design-reference capture, a verification CLI / rollback framework, and mechanical enforcement of task-queue/command-chain compliance — all of which the project benefits from given its config-driven, heavily-admin-managed architecture.

**Alternatives Considered:**
- Staying on v2 — rejected: no version baseline, no tool registry, no skills, no chain enforcement.
- Copying the whole v3 kit over the local `ai-system/` wholesale — rejected per `pull-template-update.md` ("never silently overwrite"); local content (Crelab docs, 21 design HTML screens, 911-line session log, real task queue/decisions) must be preserved.

**Implications:**
- `installed-ai-system-version: 3.0.0` is recorded in `ai-context.md` — `pull-template-update.md` now has a baseline for future comparisons.
- Every command now declares a `Chains to` row; `verify-work.md` / `audit-drift.md` mechanically check chain order and task-queue coupling.
- New v3 catalogs (`skills/`, `tools/registry.md`, `design-references/`) are live; agents consult `tools/registry.md` before doing by hand what a registered tool does.

---

## Persist Wired Email Templates Into the Config Row (Not Only at Read Time)

**Decision:** When wired templates are added to code after an operator has already saved the template set, repair the persisted `platform_config` row (`emailConfig.templates`) to include the full merged set — hardcoded defaults merged under DB/admin values — and log it as an `audit_log` `config.update` entry. The runtime resolver merge (`resolveEmailConfig` in `PlatformConfigService.get()`) stays as the read-time safety net, but the row is repaired so templates are visible/available even on deployments running code without the resolver.
**Date:** 2026-08-19
**Made by:** Implementer (per execute-feature directive)
**Supersedes:** The Session 28 note that "no DB migration is required — the merge re-adds defaults at read time".
**Superseded by:** None

**Reason:**
A DB-saved `emailConfig.templates` object replaces the whole template set. The DB held only 4 templates; `verifyEmail`, `emailChanged` and `passwordReset` (added to code in Sessions 27–28) were never saved back, so any deployment running pre-resolver code showed them as missing. Repairing the row makes the fix independent of deploy timing while the resolver keeps future additions safe.

**Alternatives Considered:**
- Rely solely on the read-time merge — rejected: depends on the fixed code being deployed before operators notice.
- Wiping the row so defaults apply wholesale — rejected: would drop admin-created templates (e.g. the "Tete" key) and any DB-saved customisation.

**Implications:**
- Admin edits re-save the full merged set via `/admin/email-templates` (the page already spreads the merged set before writing), so this repair is self-maintaining.
- Future wired templates added to code should either be merged into the row on deploy or rely on the resolver; prefer the resolver (code) + this repair pattern for existing rows.
- RLS policy migrations (0002_rls / 0003_wallet_rls) remain unapplied (residual risk): `auth.uid()` (uuid) vs text PKs is invalid here; the app uses the service role and never the Supabase client.

---

## Centralised AuditService for platform audit trails

**Decision:** All administrative mutations that change platform state write an audit
row through `services/AuditService.log(...)`, and every audit read goes through
`AuditService.list()/count()` which left-joins the acting user so UIs can display the
performer (name + email). The config "Recent Changes" table and the new `/admin/audit-log`
page render old/new values through `AuditValueCell`, which summarises long values (e.g.
full HTML template bodies) to a one-line preview with an expand-to-full action.
**Date:** 2026-08-19
**Made by:** Implementer (per issue execute-feature directive)
**Supersedes:** The ad-hoc `auditLog` inserts in individual routes.
**Superseded by:** None

**Reason:**
Alpha-testing feedback: (1) editing an email template showed the entire HTML body in the
change-log old/new columns; (2) the person who made a change was never shown; (3) audit
logging existed only for config updates, providers and account export/delete, so most
admin actions were invisible to history.

**Alternatives Considered:**
- Keep per-route `auditLog` inserts — rejected: inconsistent action/entity naming and no
  way to join the actor for display without duplicating the query everywhere.
- Store summaries at write time — rejected: losing the full old/new value makes future
  diff tooling impossible; summarising at render time preserves both.

**Implications:**
- New admin mutations should call `AuditService.log()` rather than inserting into
  `audit_log` directly.
- `AuditValueCell` is the single place that renders audit values; adopt it wherever
  audit history is shown so long values stay collapsed by default.

---

## Change-Email Verification Sent to the New Address (No Current-Email Approval)

**Decision:** Do not configure Better Auth's `sendChangeEmailConfirmation` handler. On a
change-email request, the verification link is sent to the NEW email address the user
enters (Better Auth default), and the current email does not receive an approval request.
**Date:** 2026-08-19
**Made by:** Implementer (per issue execute-feature directive)
**Supersedes:** The prior `sendChangeEmailConfirmation` wiring in `lib/auth.ts`.
**Superseded by:** None

**Reason:**
Alpha-testing feedback: the confirmation email went to the current (old) address, not the
new one the user typed. The profile UI copy already promises the confirmation goes to the
new inbox, so the code was out of sync with the intended behaviour.

**Alternatives Considered:**
- Keep `sendChangeEmailConfirmation` and rewrite its body to target the new email —
  rejected: the handler receives the current-user context; targeting the new address from
  it is not supported by the Better Auth API surface in use.
- Approve-from-old + verify-new two-step flow — rejected: adds a step with no product
  requirement and a current-email dependency the alpha testers explicitly flagged.

**Implications:**
- No approval email to the current inbox; a user must have access to the NEW inbox to
  complete the change (which they typed, so this is expected).
- `emailChanged` remains registered as a wired template but is not yet fired on a
  successful change — no dedicated Better Auth hook; candidate for a follow-up.

---

**Decision:** All Drizzle migrations are journal-driven and idempotent; destructive DB
scripts always back up first; seed rollback is seed-scoped by default.
**Date:** 2026-10-07
**Made by:** Implementer (per execute-feature directive: migration + script close-out)
**Supersedes:** The hand-applied standalone-SQL migration practice and the unscoped
`seed-rollback.ts` full-table deletes.
**Superseded by:** None

**Reason:**
The journal was stale at 0002 while schema.ts had 6+ tables of drift; standalone SQL files
were invisible to any migrate runner (0007 sat unapplied for a week). Worse, the rollback
script''s unscoped DELETEs wiped critical non-seed data on a deseed. Backup-before-
destructive is now enforced structurally, not by convention.

**Alternatives Considered:**
- Keep hand-applying SQL on Supabase � rejected: untracked, unrepeatable, caused this drift.
- `drizzle-kit push` as the workflow � rejected: no history/audit trail; kept as a
  prototyping escape hatch (`db:push`) only.
- Scoped rollback keyed on the `_seed_version` marker timestamp � rejected: marker only
  proves seeding happened, not which rows are seed; explicit seed-id allowlists are exact.

**Implications:**
- `npm run db:migrate` is the single apply path; `db:generate` after every schema.ts change.
- `db:baseline` is one-time-only for pre-journal DBs; never run it on a fresh DB.
- `backups/` is gitignored; operators must confirm `db:backup` works on their machine
  (needs `pg_dump` on PATH) before any destructive op.

---

## 2026-10-08 — Public UI naming + team social links + explore tile motion

**Decision:** Public-facing copy says "Direct Upload(s)" / "direct storage", never
"Cloudinary" (vendor name is an implementation detail). Admin-internal surfaces, API
codes, and code comments may keep the precise term.

**Decision:** Team social links use a fixed platform catalogue (X, LinkedIn, GitHub,
Dribbble, Instagram, YouTube, Facebook, TikTok, Website, Other-with-custom-text) with
per-platform icons on `/team` and a generic link icon fallback. Legacy free-typed values
(e.g. "Twitter") are normalised at read time (`lib/social-platforms.ts`), never migrated,
so pre-change rows keep their icons.

**Decision:** No `layout`/exit animations inside CSS-columns masonry grids (ExploreGrid,
PortfolioGallery). Mount-only fade with capped stagger; video overlays mount only while
in view. Rationale: layout animations re-run on every infinite-scroll append and read as
glitchy jumping; uncapped stagger left far-down tiles at opacity-0 while scrolling.

**Superseded by:** None

**Reason:** User-reported polish issues (blank/glitchy tiles, blank display-name input,
vendor name in UI tabs) plus SEO gaps on client-rendered routes.

---

## Leaderboard Lists Zero-Score Members (Ranked Last, Not Hidden)

**Decision:** Every registered member appears on the public leaderboard, including members whose weighted score is 0. Zero-score rows rank below all positive scores via the existing deterministic `userId` tie-break.
**Date:** 2026-10-08
**Made by:** Product directive (via execute-feature)
**Supersedes:** The former "rows with a score of 0 are not listed" rule in `scoreLeaderboard`.
**Superseded by:** None

**Reason:**
An empty-looking board punishes new members and makes the growth loop (referrals → leaderboard) look dead on arrival. Ranking newcomers last keeps the board populated from day one while preserving the incentive order.

**Alternatives Considered:**
- Providers-only candidate set — rejected: referrals are open to all roles (clients connect too), and the directive says "users".
- Hiding zeros behind a toggle — rejected: extra UI for a state that resolves itself once members gain activity.

**Implications:**
`getBoard()` selects all users (fine at MVP scale; revisit with keyset/counted pagination if membership grows past low-thousands). Privacy unchanged: display name + avatar only.

---

## Uploads Auto-Attach to the Uploader's Portfolio (Best-Effort, Idempotent)

**Decision:** Every successful direct upload (`/api/media/upload`, `/api/media/confirm`, per-file in `/api/media/batch-upload`) best-effort creates a visible `DIRECT` portfolio item for the uploader via `PortfolioService.attachUploadToProvider()` — skipped (returns `null`) when the uploader owns no provider profile, and never allowed to fail the already-recorded upload. Re-attaching the same URL returns the existing row (the `addItem` duplicate check), so neither portfolios nor the explore content view can show the same asset twice. `POST /api/portfolio/items` exposes the same attach for library assets (`mediaAssetId`) and raw links (`url` + `mimeType`, ownership-checked).
**Date:** 2026-10-08
**Made by:** Agent (execute-feature)
**Supersedes:** None (fills the gap where uploads only reached `media_assets` and sat Unlinked/Orphan).
**Superseded by:** None

**Reason:**
Uploads that never reach `portfolio_items` are invisible everywhere users look (provider portfolios, explore content view, dashboard gallery) while still consuming Cloudinary storage and tripping the orphan cleaner — the worst of both worlds.

**Alternatives Considered:**
- Explicit "Add to portfolio" button only (no auto-attach) — rejected: leaves the reported empty-portfolio bug in place for every existing flow; the POST endpoint covers the manual case instead.
- Backfilling pre-existing orphans automatically — rejected: ambiguous ownership intent; admins reconcile those deliberately via `/admin/media` (`reconcileAsset`).

**Implications:**
Admin uploads (no provider profile) still land orphan-by-design until reconciled. Pasted Drive/public links attached via POST keep `source: DIRECT` — source provenance stays portfolio-context UI only per the 2026-09-23 decision.
