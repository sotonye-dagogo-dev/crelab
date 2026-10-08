# Development Task Queue

> **Metadata**
> - last-updated-by: execute-feature (Session 2026-10-08 — email verification tightening, docs reconciled)
> - last-verified-against-code: 2026-10-08
> - last-synced: 2026-10-08 (email verification tightening: 452/452, docs reconciled)
> - staleness-policy: re-verify before each session

> **Overview:** Sprint-level task queue with complexity tagging. Agents execute tasks top to bottom within the current sprint. Each task is sized so it can be completed in a single session.

---

## Complexity Tags

| Tag | Meaning | Recommended Command |
|-----|---------|-------------------|
| `[XS]` | Trivial — single file, known pattern | dev-cycle.md |
| `[S]` | Small — 1-3 files, well-understood | dev-cycle.md |
| `[M]` | Medium — 3-8 files, some planning needed | dev-cycle.md with plan-feature pre-read |
| `[L]` | Large — feature spanning modules | execute-feature.md |
| `[XL]` | Very large — architecture-affecting | execute-feature.md, requires architect role |
| `[BUG]` | Bug fix | fix-build.md |

---

## Completed Sprint — MVP Core (Milestones 1.0-1.4)

All Milestones substantially complete. Blog system, sitemap/robots completed. Remaining: onboarding wizard UI, tests, Phase 2 features (dashboards, messaging, notifications).

---

## Current Tasks — Remaining Work

| Size | Task | Status |
|------|------|--------|
| [XL] | Payment System Expansion — Wallet, Milestone, Direct modes | [x] |
| [S] | Google OAuth sign-in UI (login) + sign-up/register wiring + onboarding handoff + role endpoint | [x] |
| [S] | Paystack env vars + production config | [x] |
| [S] | Light theme design system documentation | [x] |
| [S] | Logo & icon integration (config-driven, favicon, navbars, landing, auth pages) | [x] |
| [S] | Rename project to "Crellab" in config | [x] |
| [M] | Write tests for all services (incl. payment expansion) | [x] |
| [M] | Provider Dashboard (full) with earnings, kanban pipeline, availability calendar | [x] |
| [M] | Client Dashboard: active bookings, booking history, payment history | [x] |
| [L] | In-platform messaging (Phase 2) | [ ] |
| [M] | Email (Resend) made operational — default flag, health route, env, tests (in-app notification centre remains Phase 2, per Session 20 decision) | [x] |
| [M] | Provider Onboarding Wizard UI | [x] |
| [M] | Prototype interactivity: mock data, profile fallback, blog fallback | [x] |
| [S] | Seed team_members in seed script | [x] |
| [S] | Button loading states across auth/booking/admin flows + footer bug-report link | [x] |
| [M] | Collapsible admin sidebar (icon-only collapsed rail + mobile drawer via AdminShell) + responsive audit of admin/all pages | [x] |
| [M] | Reusable `ClDataTable` + `ClPagination` adopted across users/media/providers/team/categories/config | [x] |
| [S] | Email templates: h1 default `#E8FF47` + editable template name | [x] |
| [S] | `{{name}}` resolves to platform name (preview sample var fix) + `logoUrl` origin hardening (`appOrigin` trailing-slash normalisation) | [x] |
| [M] | Blog sections builder via shared `ContentBlocksEditor` + `ContentBlocks` renderer (blog page sections) | [x] |
| [S] | Email logo/preview image resolution — preview uses `previewVarsFor(config)` (configured logo/name) and `substituteSampleVars`/`EmailService.send`/blog `ContentBlocks` resolve relative `img src`/`a href` via `lib/url` (`resolveUrlForRender` + `resolveRelativeUrlsInHtml`) so the logo renders in previews and real emails | [x] |
| [M] | Wired email templates: `lib/email-templates.ts` marks the 6 code-triggered emails (welcome, verifyEmail, emailChanged, bookingConfirmation, paymentReceived, passwordReset) as preview/simulate-only; `/api/admin/email/send` rejects wired keys for test-send + broadcast; `/admin/email-templates` wired badge/Simulate/trigger banner; `passwordReset` template + Better Auth `sendResetPassword` wiring | [x] |
| [M] | Blog post management: `blog_posts` table (`0005_blog_posts.sql`) + `BlogPostService` (DB → Sanity → fallback, dedup by slug) + `/api/admin/blog-posts` CRUD + `/admin/blog-posts` page (modal editor, publish toggle) + `ImageUploadField` hero image upload (Cloudinary/paste) + public `/blog` + `/blog/[slug]` render DB posts | [x] |
| [S] | Admin responsive: sidebar collapse hidden on mobile (`hidden lg:block` — mobile = hamburger overlay only); `/admin/config` change log `formatChangeValue()` + `break-words`/`min-w-0`; `ConfigField` stacks on mobile | [x] |

---

## Current Sprint — Growth & Reliability (2026-09-30)

| Size | Task | Status |
|------|------|--------|
| [M] | Founding-100 badge: `EarlyMemberService` rank-over-`user.createdAt` (no schema change), `firstHundred` config, `/api/early-access`, `EarlyMemberBadge` in navbar + profile | [x] |
| [L] | Referral system: `referral_codes` + `referral_events` migration, `ReferralService` (cookie claim, degree-1 + degree-2 ACID write), `?ref=` capture, `/register` claim hook, `/api/referrals/*`, `/referrals` page | [x] |
| [M] | Leaderboard: `LeaderboardService` pluggable factor registry (referrals first), `leaderboard` config, `/api/leaderboard`, public `/leaderboard` page, nav/footer links | [x] |
| [M] | Countdown widget: `countdown` config + icon allowlist, `CountdownWidget`/`CountdownSlot` with framer-motion, landing + explore slots, `/admin/countdown` editor | [x] |
| [L] | Error-boundary bug reporting: `app/error.tsx` + `global-error.tsx`, global catcher, sanitised console/stack capture, popup → `/bug-report` with `errorContext`, `bug_reports.error_context` column, admin triage block, `bugReport` config | [x] |
| [S] | Platform docs + tests: How It Works referral section/FAQs, explainer copy, new test suite for the four features | [x] |
| [M] | Landing stats derived from the platform: `PlatformStatsService` aggregates + metadata-driven `landingStats` config replacing the hardcoded 1.2k/5k/4.9 figures | [x] |
| [S] | Platform-wide dynamic back-to-top button (`ScrollToTopButton` + `scrollToTop` config), replacing the explore page's inline FAB | [x] |
| [M] | Leaderboard activity factors: portfolio-items, bookings and ratings factors added to the pluggable factor registry + public "How scoring works" transparency panel | [x] |
| [L] | Webinars: `webinars` + `webinar_registrations` tables, `WebinarService`, public `/webinars` (upcoming registration for guests + members, past recordings/content), `/admin/webinars`, wired confirmation email, nav/footer links | [x] |
| [M] | Platform-name compliance run: `lib/platform-copy.ts`, all display-copy instances moved to `config.name`/`{{name}}`, infrastructure allowlist, `__tests__/platform-name-compliance.test.ts` guard | [x] |

---

## Backlog

| Size | Task |
|------|------|
| [M] | Reviews & ratings: mutual post-service, "Verified Booking" badge |
| [M] | Pricing guidance widget: anonymised aggregate rates by category |
| [L] | Identity verification: BVN/NIN check via Dojah or Smile Identity |
| [L] | Algorithm & personalisation: personalised Explore feed, saved searches |
| [M] | Promoted listings: paid featured placement, "Sponsored" label |
| [L] | Video analytics: per-video play counts, view duration, conversion rate |
| [S] | PWA as interim mobile experience |
| [XL] | API / white-label embed: booking widget, public provider discovery API |

---

## Completed

| Task | Completed |
|------|-----------|
| Email verification + wired delivery tightening: token-only verify links (dead `done=1&token=` fixed) + server-side signup hook (`databaseHooks.user.create.after`, single send) + register→verify routing (`?new=1&next=`) + hardened verify page + awaited OAuth welcome + recipients `verified` filter (picker verified-only default + toggle/notice/badges, batch reports `unverifiedIncluded`) + wired `bugReportReceived` ack on submission + config-driven `emailVerification.bannerEnabled` + `VerifyEmailBanner`. 452/452 vitest, tsc 0 errors, lint 0 errors, build green + full deep sync | 2026-10-08 |
| Email batch send: `lib/email-batch.ts` pure helpers (normalize/filter/invert/cap 500) + `GET /api/admin/email/recipients` (search/role/consent/limit/offset + marketing flag) + `POST /api/admin/email/send` `recipientIds` branch (wired guard, per-recipient send, `email.batch` audit) + `EmailBatchSendDialog` picker (checkboxes, select-all/invert/clear/10-deep undo, first-100/creators/brands/subscribers quick filters) on `/admin/email-templates`. 442/442 vitest, tsc 0 errors, lint 0 errors, build green + full `update-ai-system.md` deep sync | 2026-10-08 |
| Referral discovery + auth-agnostic claim + team hiring config: `/referrals` linked from navbar/footer/profile/dashboards/leaderboard (flag-gated); `ReferralClaimOnAuth` root-layout retry + claim JSON `{code}` fallback (`resolveClaimCode`) + login claim hook (OAuth + email both covered, logic untouched); `/team` hiring block config-driven (`teamPage`) + `/admin/team` Page-settings editor. 431/431 vitest, tsc 0 errors, lint 0 errors, build green + full `update-ai-system.md` deep sync | 2026-10-08 |
| Countdown first on home: `<CountdownSlot area="landing" />` moved to top of `LandingContent` (first child, mirroring explore page; fixes both `/` and `/home`). 424/424 vitest, tsc 0 errors, lint 0 errors, build green | 2026-10-08 |
| Public-pages team/webinars re-verification: empty `/team` fixed | 2026-10-08 | (static prerender → `force-dynamic` + `TeamService.listPublic` + `GET /api/team` + socialLinks normalisation + seed jsonb arrays); `force-dynamic` added to `/about`, `/how-it-works`, `/home`, `/`; webinars/blog/leaderboard/explore verified no-change. 424/424 vitest, tsc 0 errors, lint 0 errors, build green (all public routes `ƒ` dynamic) | 2026-10-08 |
| Nav/footer/leaderboard polish: scrollable mobile nav overlay (dedicated nav scroll region, smaller links on short screens); zero-duplication footer (Platform/Company/Support & Legal, each link once); leaderboard Score always visible on mobile (`ClDataTable.tableClassName` override → `min-w-0` below lg, `max-w-[38vw]` member truncation + tooltips, tabular-nums score). 408/408 vitest, tsc 0 errors, lint 0 errors, build green + full `update-ai-system.md` deep sync | 2026-10-08 |
| Countdown/leaderboard/tiles/content: centered countdown + full-URL CTAs (new-tab); leaderboard member truncation + pinned Score + narrower mobile table; provider name opaque pill (routing already via Link); setup-time cover→portfolio attach + orphan rescue; backfill cover-repair pass (dry-run aware). 408/408 vitest, tsc 0 errors, lint 0 errors | 2026-10-08 |
| Residual risks (pagination + orphan backfill): leaderboard 30s user-agnostic board cache + batched candidate load + per-request current-user rank/score + CDN cache headers + client page cache/prefetch/Your-rank banner; `MediaAssetService.backfillOrphans` (owner-matched one-click rescue, dry-run) + `POST /api/admin/media/backfill` + admin Backfill UI. 407/407 vitest, tsc 0 errors, lint 0 errors + full `update-ai-system.md` deep sync | 2026-10-08 |
| Leaderboard zero-scores + Explore content parity + Upload→portfolio attach: `scoreLeaderboard` keeps 0-score rows + `getBoard` scores all members; `/api/explore/portfolio` mock fallback mirroring `/api/explore`; `PortfolioService.attachUploadToProvider` wired best-effort into upload/confirm/batch-upload + new idempotent `POST /api/portfolio/items`; profile empty-portfolio state. 399/399 vitest, tsc 0 errors, lint 0 errors + full `update-ai-system.md` deep sync | 2026-10-08 |
| Verify-work test-green: 3 long-standing failures resolved non-breaking — `lib/media.ts` oversize message restores "too large" substring (keeps per-file detail); `BlogPostService.test.ts` adminList expectations reflect DB+fallback merge. 398/398 vitest, tsc 0 errors, lint 0 errors + full `update-ai-system.md` deep sync | 2026-10-08 |
| Auth cleanup + Explore tiles + Team + SEO: phone removed from auth UI; explore tiles de-glitched; "Cloudinary" → "Direct Uploads"; profile display-name backfill; team avatar direct-upload + platform select (`lib/social-platforms.ts`, `TeamSocialIcon.tsx`); 13 per-route SEO layouts; 6 new social-platform tests | 2026-10-08 |
| DB migration & script close-out: idempotent `0003_close-out-schema-drift` generated + applied live (baselined 0000–0002); `db:{generate,migrate,baseline,push,studio,backup,reset}` + `predb:seed:rollback` auto-backup scripts; `seed-rollback.ts` seed-scoped by default (`--all` full wipe backs up first) — fixes the live-data-loss bug; closes the 2026-10-01 unapplied-0007 open item | 2026-10-07 |
| Seed rollback + Book panel package wrap + nav Home removal + explore source tag removal: `npm run db:seed:rollback` (marker 2026-07-21-v1, all seed rows purged); `BookingSidebarDisplay` package rows rebuilt as native wrapping buttons (`min-w-0 break-words`, price `whitespace-nowrap` — ClButton's hardcoded nowrap/fixed height caused the overflow/overlap) + `BookingSidebar` hardened; Home link dropped from `Navbar` `navLinks` (logo + footer keep `/`); explore content-view source badge removed from `ExploreVideoCard` gallery mode (+ dead code/imports) and `AssetLightbox` gained additive `showSource` prop (default true; explore passes false). Typecheck + lint + build green, 255/258 tests (3 pre-existing). | 2026-09-23 |
| Public pages + Portfolio gallery + Media upload hardening: About page (`/about`) with mission/vision/values + quick links; How It Works page (`/how-it-works`) with creator/client/escrow guides, 4 interactive sandboxes (Booking Flow Simulator, Escrow Timeline Explorer, Pricing Calculator, Search & Discovery Simulator), SEO-friendly FAQ; Portfolio Gallery view on Explore (`/explore` toggle) showing individual work samples with source tags; Admin pages for About (`/admin/about-page`) and How It Works (`/admin/how-it-works-page`) with live preview; Media upload hardening — 10-min timeout, actionable error messages with Google Drive fallback, extended formats (MKV, 3GP, FLV, MPEG, GIF, AVIF, HEIC), extension+MIME validation. 256/258 tests pass, typecheck + lint clean. | 2026-08-28 |
| Wallet + Paystack tightening (alpha feedback): bank-transfer top-up tab removed from UI; TopUp/Withdraw modals migrated from full-height `ClSheet` to universal `ClModal` (dismissible, max-height) with honest `toast` error feedback; `initTransaction` now sends `metadata` (`purpose: WALLET_TOPUP`, userId) + `callback_url` → `/wallet/payment-status` (previously no metadata → webhook could never route/credit wallet top-ups); new `verifyTransaction()` + `GET /api/wallet/topup/verify` (idempotent credit, ownership check); new `/wallet/payment-status` result page; WalletClient refreshes balance on mount + `?topup=` banners; webhook treats `DuplicateWebhookError` as 200. 6 new paystack tests. 258 tests pass, build green. Residual risk logged: DIRECT-mode booking "Add Payment" still routes through wallet top-up (no `/api/bookings/*/pay` yet) | 2026-08-20 |
| Change-email confirmation targets the NEW address only + no false success: `EmailSendResult.to` records the recipient on every send; new `lib/email-change.ts` `resolveEmailChangeOutcome` surfaces a hard error if any captured send is addressed to the old/current address, an honest `sent:false` (neutral reason) when no send was attempted (e.g. address already in use), and the friendly label on failure; `/api/email/change` applies it and `runWithEmailSendSink` now returns all captured results. `better-auth@1.6.23` behaviour verified by live reproduction (fires `sendVerificationEmail` once, addressed to new email only). 9 new tests. 252 tests pass, build green | 2026-08-20 |
| Email accuracy + admin blog load fixes: change-email confirmation now goes to the NEW address entered (removed `sendChangeEmailConfirmation` so Better Auth verifies the new email); email feedback is no longer a false positive — request-scoped sink (`lib/email-send-sink.ts`) captures the real Resend result and `/api/verify-email/send`, `/api/email/change` (new), `/api/email/*`, `/api/admin/email/send` + profile/register/verify-email UI surface friendly reason labels (`emailNotSentLabel`); `BlogPostService.adminList()` hardened (createdAt → publishedAt → fallback) + admin blog-posts page shows `ClErrorState` with retry; padding added to email/blog template editor cards. `DEFAULT_FROM_EMAIL` synced to `mail@crellab.com`. 243 tests pass, build green | 2026-08-19 |
| DB migrations run + email template resolver verified on the real DB: applied `0003_explore.sql` (providers.search_vector + GIN index), `0004_media_assets.sql`, `0005_blog_posts.sql`; repaired stale `emailConfig.templates` config row to persist all 6 wired templates (audit-logged); verified `PlatformConfigService.get()` resolves all 6 wired templates against the live DB. RLS policies (0002/0003_wallet) left unapplied as residual risk (`uuid = text` type mismatch; app uses service role). 233 tests pass, typecheck + lint clean. No app code changed. | 2026-08-19 |
| Audit trails + config change-log summary: `AuditService` (log/list/count + actor join), `lib/audit` summarise helpers, `AuditValueCell`, config "Recent Changes" summarised old/new + "Performed By" column, `/api/admin/audit-log` + `/admin/audit-log` page (filters + pagination), sidebar entry, audit logging on every remaining admin mutation (team, users, media, email send/broadcast, blog-posts, bug-reports, disputes), PortfolioPerformanceTable migrated to ClDataTable. 233 tests pass, build green | 2026-08-19 |
| Wired email templates: `lib/email-templates.ts` (welcome/verifyEmail/emailChanged/bookingConfirmation/paymentReceived/passwordReset — label + trigger), `/api/admin/email/send` wired-key guard, `/admin/email-templates` wired badge/Simulate/banner, `passwordReset` template + Better Auth `sendResetPassword`. Tests: `__tests__/lib/email-templates.test.ts`. 206 tests pass, build green | 2026-08-13 |
| Blog post management: `blog_posts` table (`0005_blog_posts.sql`) + `BlogPostService` (DB→Sanity→fallback merge) + `/api/admin/blog-posts` CRUD + `/admin/blog-posts` page + `ImageUploadField` hero upload + public `/blog` + `/blog/[slug]` read via service | 2026-08-13 |
| Admin responsive: sidebar collapse hidden on mobile (hamburger overlay only), `/admin/config` change log `formatChangeValue()` + `break-words`, `ConfigField` responsive stacking | 2026-08-13 |
| Cloudinary asset lifecycle close-out: implementation (media_assets registry, MediaAssetService, admin/user media managers, ClConfirmDialog + useUndoable, cron cleanup) shipped 2026-08-11 but was never documented; session-log/dev-history/task-queue/project-plan entries added and in-progress.md cleared on close-out | 2026-08-12 |
| Cron auth alignment: all 4 `/api/cron/*` routes now verify `Authorization: Bearer <CRON_SECRET>` (matches Vercel Cron's auto header); `/api/cron/media-cleanup` registered in `vercel.json` at `10 0 * * *`. 169 tests pass, build green | 2026-08-12 |
| Integrations operational readiness: `emailNotifications` default (was silently off), `isResendConfigured()` + `getResendConfig()`, `/api/email/status` health route, subject `{{name}}` fill fix, 11 EmailService tests, `.env.example` mirrors all env vars (added RESEND_API_KEY + CRON_SECRET). 151 tests pass, build green | 2026-08-11 |
| In-app notification centre — confirmed Phase 2, NOT delivered in Phase 1 (decision logged in project-decisions.md) | 2026-08-11 |
| Dashboard Unauthorized fix: `lib/auth.ts` getSession forwards request headers via `next/headers` | 2026-08-11 |
| Provider & Client Dashboards: DashboardService, /api/dashboard, role-aware /dashboard page, mock fallback, 15 tests | 2026-08-09 |
| Alpha testing fixes: pricing display (×100), onboarding 404, media upload (Cloudinary) pipeline, Drive collect-mode onboarding | 2026-08-09 |
| Google OAuth sign-up flow: register-page button, `?oauth=done` finalize (role + consent), `/api/auth/role`, seamless `/profile/setup` handoff | 2026-08-05 |
| DB seed system (scripts/seed.ts, scripts/seed-rollback.ts) — working auth passwords via Better Auth API | 2026-07-22 |
| drizzle-kit push: schema synced to Supabase (14 tables, enums, relations) | 2026-07-21 |
| Better Auth Dash: root cause fix (empty DB) + `drizzle.config.ts` + explicit apiKey | 2026-07-21 |
| Better Auth Dash plugin setup + secret fix + env verification | 2026-07-21 |
| .ai-system bootstrap and project documentation population | 2026-07-04 |
| 20 HTML design system screens | 2026-07-04 |
| Init Next.js 15 with TypeScript strict + Tailwind v4 | 2026-07-05 |
| Platform config shell + PlatformConfigService + ConfigContext | 2026-07-05 |
| Global types: entity interfaces, enums, API wrappers, explore types | 2026-07-05 |
| Drizzle schema (329 lines, all tables/enums/relations) + migrations | 2026-07-05 |
| Better Auth: instance, API handler, middleware, client hook | 2026-07-05 |
| Cl* component wrappers (10 primitives) | 2026-07-05 |
| AuthGate shared component | 2026-07-05 |
| NDPR consent capture server action | 2026-07-05 |
| Provider Profile page + components (Hero, PortfolioGrid, ServicePackages, Reviews, WorkHistory) | 2026-07-05 |
| Portfolio service CRUD + reorder + hide | 2026-07-05 |
| Google Drive sync: URL validation, fetch files, ingest, cron, service | 2026-07-05 |
| Explore feed: service, API, filter bar, masonry grid, infinite scroll | 2026-07-05 |
| Category browse + search results pages | 2026-07-05 |
| Booking service + state machine + legal transitions | 2026-07-05 |
| Escrow service: initiate, webhook handler, setInProgress, release, dispute, resolution | 2026-07-05 |
| Payment service: init, split payout, refund | 2026-07-05 |
| BookingDrawer, EscrowTimeline, DisputeModal components | 2026-07-05 |
| Admin panel: layout, sidebar, config editor, category manager, provider queue, dispute dashboard | 2026-07-05 |
| OC-7: Wrapper compliance audit (all clean) | 2026-07-05 |
| OC-7: Config compliance — replaced hardcoded "Crelab"/"CreLab"/"#E8FF47" with config values | 2026-07-05 |
| OC-7: Money audit (all money arithmetic uses Math.round() on kobo) | 2026-07-05 |
| OC-7: Performance: N+1 audit, cursor pagination, IntersectionObserver verified | 2026-07-05 |
| OC-7: Accessibility: focus-visible rings, aria-labels, muted videos, reduced-motion support | 2026-07-05 |
| OC-7: NDPR compliance: created /privacy, /terms pages, CookieConsentBanner, consent recording on register | 2026-07-05 |
| OC-7: Production gate: build + tsc + lint pass with zero errors/warnings | 2026-07-05 |
| Sanity CMS blog system: schema, config, /blog, /blog/[slug], blog components | 2026-07-05 |
| sitemap.ts + robots.ts (Next.js generated SEO) | 2026-07-05 |
| Payment Expansion: types, enums, error classes | 2026-07-12 |
| Payment Expansion: DB schema, migration, RLS (wallets, transactions, milestones, webhook events) | 2026-07-12 |
| Payment Expansion: platform config (milestonePayments, wallet blocks) | 2026-07-12 |
| Payment Expansion: WalletService (9 methods, idempotency, atomic transactions) | 2026-07-12 |
| Payment Expansion: MilestoneService (create, fund, submit, approve, autoApprove, dispute) | 2026-07-12 |
| Payment Expansion: Paystack lib (initiateTransfer, DVA, getRecipient) | 2026-07-12 |
| Payment Expansion: Webhook handler (charge.success, transfer events, DVA assignment) | 2026-07-12 |
| Payment Expansion: Wallet API routes (topup/card, topup/bank, balance, withdraw, transactions) | 2026-07-12 |
| Payment Expansion: Milestones API route | 2026-07-12 |
| Payment Expansion: Milestones cron + vercel.json update | 2026-07-12 |
| Payment Expansion: UI components (WalletBalanceCard, TopUpModal, WithdrawModal) | 2026-07-12 |
| Payment Expansion: UI components (MilestoneBuilder, MilestoneTimeline) | 2026-07-12 |
| Payment Expansion: Wallet page + middleware update | 2026-07-12 |
| Payment Expansion: Booking detail updated for all payment modes | 2026-07-12 |

---

## Notes

- All monetary values must be stored as integers (kobo) — never floating point
- All UI must use Cl* wrappers, never raw shadcn/ui imports
- Config before code: define config structure before building features
- Paystack webhook uses raw-body + HMAC-SHA512 verification
- Booking state transitions validated by LEGAL_TRANSITIONS map
