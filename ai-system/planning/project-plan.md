# Project Plan

> **Metadata**
> - last-updated-by: update-ai-system (Session 27)
> - last-verified-against-code: 2026-08-13
> - staleness-policy: re-verify if project scope or phase changes

> **Overview:** High-level feature checklist organized by development phase per ROADMAP.md. See `planning/task-queue.md` for granular, sprint-level tasks.

---

## Phase 1 — MVP (5 Weeks)

### Milestone 1.0 — Foundation (Week 1)

- [x] Repo & Tooling: Next.js 15, Tailwind, TypeScript strict, tsconfig paths
- [x] Platform Config Shell: config/platform.config.ts, PlatformConfigService (DB override, cache), ConfigContext
- [x] Global Types: all entity interfaces, enums, API wrapper types, explore types in /types
- [x] Drizzle Schema & Migrations: 329-line schema with enums, relations, audit_log, migrations applied
- [x] Auth: Better Auth, register/login/signout, role selection, NDPR consent capture, middleware
- [x] Cl* Component Wrapper Layer: ClButton, ClCard, ClInput, ClSelect, ClTextarea, ClBadge, ClAvatar, ClTabs, ClDialog, ClSheet
- [x] Sanity CMS Init: blog schema, creator spotlight schema, /blog routes, article components (ArticleBody, BlogCard, ToCSidebar)

### Milestone 1.1 — Provider Supply Side (Week 2)

- [x] Provider Onboarding Wizard: multi-step (category -> details -> packages -> portfolio -> preview)
- [x] Provider Profile Page (/profile/[slug]): cover video hero, identity bar, portfolio grid, packages, reviews (components + route)
- [x] Portfolio Upload: addItem, updateItem, reorder, setHidden, deleteItem (service-layer, no drag-and-drop UI yet)
- [x] Google Drive Portfolio Sync: URL validation, fetchFileList, fetchAllFiles, ingestFolder, syncAll cron
- [x] Provider Dashboard (basic): profile components built (Hero, PortfolioGrid, ServicePackages, ReviewsSection, WorkHistory)

### Milestone 1.2 — Discovery & Client Side (Week 3)

- [x] Explore Feed: masonry grid, video autoplay on hover, infinite scroll, config-driven filter bar, full-text search, cursor pagination
- [x] Category Browse (/(public)/[category]): pre-filtered page
- [x] Search Results (/search?q=): full-text, term highlighting UI

### Milestone 1.3 — Booking & Payment (Week 4)

- [x] Booking Request Flow: auth gate, package selection, date picker, scope notes, price breakdown (BookingDrawer component)
- [x] Paystack Integration: initTransaction, verifyWebhookSignature (HMAC-SHA512), subaccountSplit, refund
- [x] Escrow State Machine: HELD -> IN_PROGRESS -> RELEASED/DISPUTED/REFUNDED with legal transition validation
- [x] Escrow Timeline UI: EscrowTimeline visual component
- [x] Booking Detail Page: booking summary, escrow timeline, action zone, dispute modal
- [x] Cron endpoints: setInProgress, autoRelease

### Milestone 1.4 — Admin & SEO (Week 5)

- [x] Admin Panel: config editor, category manager (with CategoryModal), provider review queue, dispute dashboard, admin layout + sidebar
- [x] Blog System: Sanity CMS + DB-backed blog posts (`blog_posts`, `BlogPostService` — admin/DB posts merged over Sanity), /blog, /blog/[slug], creator spotlights, ArticleBody, BlogCard, CreatorSpotlightEmbed, ToCSidebar
- [x] sitemap.ts, robots.ts (Next.js generated sitemap.xml + robots.txt)

---

## Phase 2 — Post-Launch (Month 1-3)

- [ ] In-platform messaging (post-booking-acceptance, Supabase Realtime)
- [x] Notifications: email (Resend) made operational (Session 20); in-app notification centre still Phase 2
- [x] Provider dashboard: earnings, kanban booking pipeline, availability calendar, portfolio performance
- [x] Client dashboard: active bookings, booking history, payment history
- [ ] Reviews & ratings: mutual post-service, "Verified Booking" badge
- [ ] Pricing guidance widget: anonymised aggregate rates by category
- [ ] Identity verification: BVN/NIN check via Dojah or Smile Identity

---

## Phase 3 — Growth

- [ ] Algorithm & personalisation: personalised Explore feed, saved searches, provider requirement tagging
- [ ] Promoted listings: paid featured placement, "Sponsored" label
- [ ] Video analytics: per-video play counts, view duration, conversion rate
- [ ] PWA as interim mobile experience
- [ ] API / white-label embed: booking widget, public provider discovery API

---

## Completed

- [x] .ai-system governance structure initialized with bootstrap-project
- [x] Project documentation (PRD, ROADMAP, DESIGN) populated
- [x] 20 HTML design system screens completed (incl. 20-team.html light-theme refinement)
- [x] Milestone 1.0 Foundation — 7/7 items (Sanity CMS completed)
- [x] Milestone 1.1 Provider Supply Side — 5/5 items (onboarding wizard confirmed complete)
- [x] Milestone 1.2 Discovery & Client Side — 3/3 items
- [x] Milestone 1.3 Booking & Payment — 6/6 items
- [x] Milestone 1.4 Admin & SEO — 3/3 items (admin panel, blog system, sitemap/robots)
- [x] Better Auth Dash plugin + Supabase schema sync — DB tables applied, all auth endpoints verified
- [x] DB Seed System — 10 users via Better Auth API (working passwords), 100+ seed records, rollback with FK-safe cascade
- [x] Prototype Interactivity — mock data mode enabled, profile page mock fallback, 6 blog fallback posts, team member seeding
- [x] Alpha Testing Fixes (2026-08-09) — pricing display ×100 bug, post-signup 404 (slug prefix resolution), config-driven Cloudinary media upload pipeline with env availability guard, Drive collect-mode onboarding + post-create ingest
- [x] Provider & Client Dashboards (2026-08-09) — DashboardService + /api/dashboard + role-aware /dashboard page; provider earnings/kanban pipeline/availability/portfolio performance; client pipeline/payment history/discover rail; mock fallback + 15 tests
- [x] Dashboard Unauthorized Fix (2026-08-11) — `lib/auth.ts` `getSession()` now forwards request headers via `next/headers` instead of an empty `Headers()` (previously every authenticated `/dashboard` visit threw `Unauthorized`)
- [x] Integrations Operational Readiness (2026-08-11) — Cloudinary + Resend foundations verified functional: `emailNotifications` default added to config (was silently disabling all email), `isResendConfigured()` + `/api/email/status` health route, subject template `{{name}}` fix, 11 new EmailService tests, `.env.example` now mirrors every env var referenced in code (added `RESEND_API_KEY`, `CRON_SECRET`). In-app notification centre confirmed Phase 2 → NOT delivered (per directive's "if part of Phase 1 MVP" condition)
- [x] Cloudinary Asset Lifecycle (2026-08-11) — media asset registry (`media_assets` table, migration `0004`), `MediaAssetService` (record/list/referenced-URL scan/orphan cleanup/delete/replace), signed Cloudinary delete ops + env rename to `CLOUDINARY_*` (backward-compatible `NEXT_PUBLIC_*` fallbacks), `/api/media/upload` records assets, `/api/cron/media-cleanup` (registered in `vercel.json` 2026-08-12), `/api/admin/media` + `/api/media/assets` (list/delete/replace), `/admin/media` + `/profile/media` pages, `ClConfirmDialog` + `useUndoable` primitives, 220-line MediaAssetService test suite. Closed out (documented) 2026-08-12
- [x] Config Persistence + Email Verification + SEO + Admin Management (2026-08-13) — `setNestedValue` deep-merge fixes admin edits not round-tripping; `lib/url.ts` + `lib/seo.ts` + `lib/email-blocks.ts`; Better Auth `emailVerification` flow (sendOnSignUp false, welcome fires after verification via `/api/verify-email/welcome`), `/verify-email` public page, `useAuth.signUp` → `/api/verify-email/send`; email templates Visual/HTML/Preview tabs + block editor + broadcast via `/api/admin/email/send`; `blogConfig` + `/admin/blog-templates` + newsletter section + `/api/newsletter` (MARKETING consent); admin user management (`/api/admin/users`, `/admin/users`); `ClBackButton`, `/profile` page, Navbar Profile/Admin links; `generateMetadata` SEO wiring; `.env.example` documents `NEXT_PUBLIC_APP_URL`. Tests: `__tests__/lib/config-helpers.test.ts`, 187/187 passing
- [x] Admin UX + Email/Blog content editing (2026-08-13) — collapsible/expandable admin sidebar (`AdminShell` + `AdminSidebar` props, icon-only 72px collapsed rail, mobile drawer, localStorage persistence) + responsive audit of admin/all pages; universal reusable `ClDataTable` + `ClPagination` adopted across users/media/providers/team/categories/config; email templates h1 default `#E8FF47` + editable template name (`IEmailTemplate.name`); `{{name}}` preview fix (platform name, not username) + `appOrigin` trailing-slash hardening for email `logoUrl`; blog sections builder via shared `ContentBlocksEditor` (email + blog) + `ContentBlocks` blog renderer (`IBlogConfig.sections`). Tests: `__tests__/lib/email-blocks.test.ts`, 193/193 passing
- [x] Email logo/preview image resolution (2026-08-13) — `lib/url.ts` gains `resolveUrlForRender` + `resolveRelativeUrlsInHtml`; `substituteSampleVars()` resolves relative `img src`/`a href` after substitution and `previewVarsFor(config)` makes the admin preview capture the DB-configured logo/name; `EmailService.send` resolves relative URLs in the final HTML + `sendWelcome` exploreUrl via `resolveAbsoluteUrl`; blog `ContentBlocks` image/button URLs use the util. Tests: `__tests__/lib/email-blocks.test.ts` + `config-helpers.test.ts`, 201/201 passing
- [x] Wired email templates + blog post management + admin responsive fixes (2026-08-13) — `lib/email-templates.ts` marks the 6 code-triggered emails (welcome, verifyEmail, emailChanged, bookingConfirmation, paymentReceived, passwordReset) as preview/simulate-only; `/api/admin/email/send` rejects wired keys (test-send + broadcast); `/admin/email-templates` shows wired badge/Simulate/trigger banner; `passwordReset` template added + `sendResetPassword` wired in `lib/auth.ts`. Blog admin beyond templates: `blog_posts` table (`0005_blog_posts.sql`) + `BlogPostService` (DB → Sanity → fallback merge) + `/api/admin/blog-posts` CRUD + `/admin/blog-posts` page + `ImageUploadField` (Cloudinary/paste hero image) + public `/blog` + `/blog/[slug]` render DB posts. Admin sidebar collapse hidden on mobile (drawer only); `/admin/config` change log `formatChangeValue()` + `break-words`; `ConfigField` responsive. Tests: `__tests__/lib/email-templates.test.ts`, 206/206 passing
