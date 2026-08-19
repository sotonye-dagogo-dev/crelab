# Development Task Queue

> **Metadata**
> - last-updated-by: update-ai-system (Session 27)
> - last-verified-against-code: 2026-08-13
> - last-synced: 2026-08-13 (session-log entry — Session 27, wired email templates + blog posts + admin responsive)
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
