# Development History

> **Metadata**
> - last-updated-by: Session 33
> - last-verified-against-code: 2026-08-20

## Sprint 2026-08-20 (2) — Wallet Page + Paystack Tightening

### What
Alpha-testing feedback on the wallet page: (1) the bank-transfer top-up didn't feel like a supported feature; (2) the top-up/withdraw modal covered most of the screen with no obvious way to dismiss it; (3) Paystack checkout never redirected back after a transaction and the wallet showed no trace of what happened. Tightened the whole payment surface accordingly.

### Why
Payments are the one surface where assumptions are unacceptable. Investigation while fixing exposed the root cause of the "no reflection" report: `initTransaction` never sent `metadata`, so the `charge.success` webhook's `purpose === "WALLET_TOPUP"` branch could never match — wallet top-ups were never credited by the webhook, and the platform's own 200 gave no truthful signal either.

### Key Changes
- `lib/paystack.ts`: `initTransaction` accepts `InitTransactionOptions` (`metadata`, `callbackUrl`); new `verifyTransaction(reference)` returns final status/amount/metadata from Paystack.
- `POST /api/wallet/topup/card` now sends `metadata: { purpose: "WALLET_TOPUP", userId }` and `callback_url` → `/wallet/payment-status`.
- New `GET /api/wallet/topup/verify?reference=…` verifies the charge, enforces `WALLET-TOPUP-<userId>-` prefix + echoed-metadata ownership, and credits idempotently (`WalletService.topUpFromCard`).
- New `/wallet/payment-status` result page (success / not-completed / error with the credited amount).
- `TopUpModal` + `WithdrawModal` migrated from full-height `ClSheet` to the universal `ClModal` (dismissible, max-height, inner scroll); honest `toast` error feedback; bank-transfer tab removed from the UI.
- `WalletClient` refreshes the balance on mount and renders `?topup=success|failed` banners.
- Webhook treats `DuplicateWebhookError` on the wallet branch as a 200 `duplicate`.
- Tests: `__tests__/paystack.test.ts` (6 tests: init metadata/callback payload, verify status mapping, error propagation).

### Status
Pass — typecheck clean, `next build` green, lint no new warnings, 258/258 tests pass. Residual risk logged: DIRECT-mode booking "Add Payment" still routes through the wallet top-up init and `/api/bookings/*/pay` routes don't exist yet — a booking-payment flow remains to be built before real money moves.

## Sprint 2026-08-20 — Change-Email Confirmation Hardened to the New Address Only

### What
The change-email flow reported the confirmation going to "both the old mail and the new mail" instead of only the new mail. Verified Better Auth 1.6.23's `changeEmail` behaviour by live reproduction: with no `sendChangeEmailConfirmation`, the endpoint fires `sendVerificationEmail` exactly once and only ever addresses the NEW address (both verified and unverified old-email paths), and fires nothing when the link is clicked. The "old mail" receipt comes from stale deployed code (pre-Session-31) or from the profile page's separate "Send verification email" action against the current address. Hardened the flow so the app can never silently mail the old address or claim success when nothing was sent.

### Why
Accurate feedback and guaranteed delivery target were alpha-testing requirements: the confirmation must go to the new inbox the user typed, and the UI must never report "confirmation sent" when the send failed, was misaddressed, or was never attempted.

### Key Changes
- `EmailSendResult` gained `to?: string`; `EmailService.send` records the recipient on every return path so the destination is observable.
- New `lib/email-change.ts` — pure `resolveEmailChangeOutcome(results, requestedNewEmail)`: any send aimed at the old/current address → hard error; no send attempted (e.g. address already in use) → honest `sent: false` with a neutral reason instead of a false `sent: true`; failed send → friendly reason label.
- `/api/email/change` uses the resolver; `runWithEmailSendSink` now returns the full `results` array so every captured send is checked, not just the last.
- Tests: `__tests__/lib/email-change.test.ts` (9 tests); updated three `EmailService` assertions for the `to` field.

### Status
Pass — typecheck clean, `next build` green, lint no new warnings, 252/252 tests pass.

## Sprint 2026-08-19 (2) — Email Target/Feedback Fixes + Admin Blog Load + Template Padding

### What
Fixed three alpha findings in one pass: (1) the change-email confirmation was mailed to the current/old address instead of the new address the user types in; (2) the admin Blog Posts view silently failed to load while the public blog kept working; (3) nested divs in the email/blog template admin pages still lacked padding. Plus a correctness fix: email APIs could report "sent" success even when Resend rejected the mail.

### Why
For (1), Better Auth's `sendChangeEmailConfirmation` handler sends the approval email to the current email; removing it makes Better Auth verify the NEW address instead. For (3/false-positive), Better Auth runs email callbacks in a background task that swallows errors, so route handlers returned success regardless of Resend's actual outcome — feedback needed to reflect reality. For (2), `adminList()` ordered by `created_at`; tables created before that column made the whole list error (public list orders by `published_at`, so it kept working).

### Key Changes
- **Change-email target:** removed `sendChangeEmailConfirmation` from `lib/auth.ts` → `auth.api.changeEmail` now sends the verification link to the new email (matches profile UI copy). No approval email to the old inbox.
- **Accurate email feedback:** new `lib/email-send-sink.ts` (AsyncLocalStorage, request-scoped) — `sendTransactionalEmail` records the real `EmailSendResult`; `EmailService.emailNotSentLabel()` maps machine reasons to friendly text; `/api/verify-email/send`, `/api/verify-email/welcome`, `/api/email/send`, `/api/email/welcome`, `/api/admin/email/send` and the new `/api/email/change` return `{ sent: false, reason }` instead of a false `sent: true`. Profile, register, verify-email and admin email-template pages surface the friendly reason.
- **Admin blog load:** `BlogPostService.adminList()` now degrades gracefully (createdAt → publishedAt → fallback posts); `/admin/blog-posts` renders `ClErrorState` with a retry action on failure.
- **Padding:** `ClCard` in `/admin/email-templates` and the three cards in `/admin/blog-templates` got `p-5 sm:p-6`.
- **Config sync:** `DEFAULT_FROM_EMAIL` updated to `mail@crellab.com` (matches the repo's committed config default).
- **Tests:** new `__tests__/services/BlogPostService.test.ts` (adminList resilience) and `__tests__/lib/email-send-sink.test.ts`; `emailNotSentLabel` coverage; fixed two stale sender-identity assertions.

### Status
Pass — typecheck clean, `next build` green, lint no new warnings, 243/243 tests pass.

## Sprint 2026-08-19 — DB Migrations Applied + Email Template Resolver Verified on the Real Database

### What
Ran the pending DB migrations against the connected Supabase database and made the email-template resolver fix actually work on the platform. The persisted `platform_config.emailConfig.templates` row only contained 4 templates; the wired `verifyEmail`, `emailChanged` and `passwordReset` templates (added to code in Sessions 27–28) had never been saved back to the DB, so any deployment running pre-resolver code showed them as missing. Also confirmed the Session 28 resolver fix is sufficient by running the real config service against the DB.

### Why
"On the platform some templates aren't visible or available." Root cause confirmed as both (a) un-applied migrations and (b) a stale config row: the DB-saved `emailConfig.templates` object replaces the whole set, and only the Session 28 code merge (`resolveEmailConfig` in `PlatformConfigService.get()`) re-adds missing wired defaults at read time — which only works if that code is deployed.

### Key Changes
- **Migrations applied (idempotent):** `0003_explore.sql` (`providers.search_vector` + `providers_search_idx` GIN index; `featured` already present), `0004_media_assets.sql` (`media_assets` table + `media_asset_status` enum + indexes + FK), `0005_blog_posts.sql` (`blog_posts` table + slug/published/category indexes). Verified in the DB: `media_assets`/`blog_posts` tables and `search_vector` column now exist.
- **Stale config data repaired:** merged all 6 wired templates into the persisted `emailConfig.templates` row (DB/admin-created keys win; hardcoded defaults fill missing wired keys), with an `audit_log` `config.update` entry recording old → new. Row now holds: Tete, welcome, verifyEmail, emailChanged, passwordReset, paymentReceived, bookingConfirmation.
- **Resolver verified end-to-end:** `PlatformConfigService.get()` against the real DB resolves all 6 wired templates (bodyHtml + enabled); `/admin/email-templates` lists them; `/api/email/status` reports 6 enabled templates.
- **RLS policies (0002_rls / 0003_wallet_rls) not applied — residual risk:** policy files compare `auth.uid()` (uuid) to text PKs (`operator does not exist: uuid = text`); app uses the service role (RLS bypassed) and never the Supabase anon/authenticated client, so the layer is inapplicable here.

### Status
Pass — no application code changed; typecheck clean, 233/233 tests pass, lint no new warnings. DB migrations and the config-data repair are applied to the connected Supabase database.

## Sprint 2026-08-13 — Wired Email Templates + Blog Post Management + Admin Responsive Fixes

### What
Made the six code-triggered transactional emails (welcome, verify email, email changed, booking confirmation, payment received, password reset) explicitly "wired" in the admin — preview + simulate only, never sendable/broadcastable — while leaving admin-created templates fully sendable/broadcastable. Gave the blog admin real post management (create/edit/publish/delete with hero image uploads, content built with the existing visual block builder) backed by a new `blog_posts` table + `BlogPostService` that merges DB → Sanity → fallback sources. Then made the admin sidebar mobile-only-collapsible and fixed admin/config page responsiveness so text never escapes its containers.

### Why
Wired templates (e.g. password reset, verification) are owned by code paths — their content and timing are triggered by user events, so letting an operator "send" or "broadcast" them produces wrong/duplicate emails. Blog admin previously only edited page templates/sections; there was no way to publish posts or upload images. The admin sidebar showed a collapse toggle on mobile (where there's no room) and config/change-log cells let long or escaped text overflow their cards.

### Key Changes
- **Wired email templates** — `lib/email-templates.ts`: `WIRED_EMAIL_TEMPLATES` (6 keys, each `label` + `trigger`) + `isWiredEmailTemplate()`. `/api/admin/email/send` rejects wired keys (test + broadcast). `/admin/email-templates`: ClBadge + Zap on wired templates, Simulate button (`useEmailSimulation`) replacing Send Test / Send to Subscribers, trigger banner, sendDialog reset on select. `passwordReset` template added to `DEFAULT_CONFIG`; `lib/auth.ts` `emailAndPassword.sendResetPassword` → `sendTransactionalEmail`; `{{resetUrl}}` added to sample vars + editor list.
- **Blog post management** — `blog_posts` table (`drizzle/migrations/0005_blog_posts.sql`: slug unique index, `(published, published_at)` + `category` indexes, jsonb `content`/`tags`); `services/BlogPostService.ts` (adminList/list/getBySlug/getRelated/getAllSlugs/getById/create/update/remove; merge DB → Sanity → fallback, dedup by slug, admin/DB wins); `/api/admin/blog-posts` (GET/POST) + `[id]` (PATCH/DELETE); `/admin/blog-posts` page (ClDataTable + modal editor: live slugify, tags, meta description, publish toggle, confirm delete); `components/admin/ImageUploadField.tsx` (Cloudinary upload via `/api/media/upload` + paste-URL fallback) for the hero image.
- **Public blog via service** — `/blog` + `/blog/[slug]` read through `BlogPostService`; block content (`type` → `EmailTemplateBlock[]`) rendered by `ContentBlocks`/`BlocksContent` (ToC/readTime) vs Sanity portable text (`_type` → `ArticleBody`); `components/blog/BlogCard.tsx` + `app/sitemap.ts` use `getAllSlugs`; `lib/blog-hero.ts` `getPostHeroUrl` resolves plain URLs or Sanity `image-` refs.
- **Admin sidebar responsive** — collapse toggle `hidden lg:block` (mobile = hamburger overlay drawer only); new "Blog Posts" nav item (PenSquare).
- **Config/admin responsiveness** — `/admin/config` change log renders nested values via `formatChangeValue()` (JSON stringify) with `break-words`/`min-w-0` columns; `ConfigField` refactored to a `fieldControl` variable, stacks on mobile, `min-w-0`/`break-words`.
- **Tests** — `__tests__/lib/email-templates.test.ts` (wired map keys/labels/triggers + `isWiredEmailTemplate`). QA gate: typecheck clean, 206/206 tests pass, production build green.

### Status
Pass — typecheck clean, 206/206 tests pass, production build green. Note: `0005_blog_posts.sql` is standalone SQL (journal not regenerated) — must be applied manually to the target DB.

## Sprint 2026-08-13 — Email Logo / Preview Image Resolution via the URL Util

### What
Fixed the email logo (and any visual-builder image) not rendering in the admin preview — and in recipients' mailboxes — by making every render path resolve relative URLs to absolute through the shared URL util. The preview now also captures the *configured* platform logo/name instead of the code defaults.

### Why
The email preview and the `blocksToHtml`/blog block renderers emitted image `src` values verbatim: a `/primary-logo.png` (the editor's own placeholder example) cannot render in email clients and was unreliable in the `srcdoc` preview iframe. Additionally the preview substituted `{{logoUrl}}` from `DEFAULT_CONFIG` rather than the DB-configured `logoPath`, so even the token path didn't "capture" the real logo.

### Key Changes
- **`lib/url.ts`**: `resolveUrlForRender(value)` — resolves relative URLs while leaving `{{variable}}` tokens and absolute/protocol-relative/schemed/anchor URLs untouched; `resolveRelativeUrlsInHtml(html)` — rewrites relative `img src` / `a href` in a rendered HTML blob to absolute. Both run AFTER token substitution so the origin is resolved at render time (preview client-side, send server-side) rather than baked in at edit time.
- **`lib/email-blocks.ts`**: `substituteSampleVars()` now resolves relative URLs after substitution; new `previewVarsFor(config)` builds sample vars from the configured `name`/`logoPath`.
- **`app/admin/email-templates/page.tsx`**: Preview tab uses `previewVarsFor(loaded config)`.
- **`services/EmailService.ts`**: `send()` resolves relative URLs in the final HTML; `sendWelcome()` builds `exploreUrl` via `resolveAbsoluteUrl("/explore")` (previously a hand-rolled `${NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/explore` that skipped the Vercel fallback).
- **`components/blog/ContentBlocks.tsx`**: image `src` / button `href` go through `resolveUrlForRender()`.
- **Tests**: `__tests__/lib/email-blocks.test.ts` (+5) and `config-helpers.test.ts` (+3) cover the new helpers, configured-logo preview capture, and the "don't mangle data/mailto/#/tokens" guard.

### Status
Pass — typecheck clean, lint 0 errors (pre-existing warnings only), 201/201 tests pass, production build succeeds.

## Sprint 2026-08-13 — Collapsible Admin Sidebar, Reusable Table/Pagination, Email Template Fixes, Blog Sections Builder

### What
Made the admin sidebar collapsible/expandable (icon-only rail), built universal reusable `ClDataTable` + `ClPagination` components adopted across six admin pages, fixed email templates (h1 default `#E8FF47`, `{{name}}` resolving to the username in previews, editable template name), gave the blog builder addable content sections like the email visual builder, and investigated unresolvable `logoUrl` images in emails.

### Why
The admin sidebar was fixed-width and unusable on mobile; each admin page rolled its own bespoke table/pagination markup; email template previews substituted the sample recipient username into `{{name}}` (the delivery path already used the platform name); the blog admin had no way to add structural content; and email logo images didn't render for recipients.

### Key Changes
- **`components/ui/ClDataTable.tsx`** (new): config-driven `ClColumn<T>[]` (custom render, `hideOnMobile`, checkbox columns), client-side pagination with `useEffect` page-clamp when the dataset shrinks, horizontal scroll, zebra rows, empty state; **`components/ui/ClPagination.tsx`** (new): first/prev/next/last + ellipsis + "Showing x–y of z". Exported via `components/ui/index.ts` and adopted in `users`, `media`, `providers`, `team`, `categories`, `config` (change log) admin pages.
- **`components/admin/AdminShell.tsx`** (new) + **`AdminSidebar.tsx`** rewrite: `collapsed` (72px icon-only) / `mobileOpen` (drawer + backdrop) props; collapse persisted to localStorage `admin-sidebar-collapsed`; `app/admin/layout.tsx` renders the shell with `lg:ml-[240px]`/`lg:ml-[72px]` offset. Responsive headers (flex-wrap) across admin pages.
- **Email h1 colour**: all 5 default template h1s + the `heading` block serializer default to `#E8FF47`.
- **`{{name}}` fix**: root cause was preview-only — `SAMPLE_EMAIL_VARS.name` was hardcoded `"Ada Okafor"` (identical to `userName`); `EmailService.send` already forces `name: cfg.name`. `SAMPLE_EMAIL_VARS.name` now = `DEFAULT_CONFIG.name`; sample `logoUrl` = `resolveAbsoluteUrl(DEFAULT_CONFIG.logoPath)`.
- **`logoUrl` investigation**: `appOrigin()` in `lib/url.ts` normalises trailing slashes / `//`; emails render `{origin}/primary-logo.png`. Remaining production cause is almost certainly `NEXT_PUBLIC_APP_URL` set to `http://localhost:3000`/unset in the deployed Vercel runtime env (server reads it at runtime) — the admin preview previously used a fake Cloudinary `demo` URL that never rendered.
- **Editable template name**: `IEmailTemplate.name?` + defaults for all 5 templates; `/admin/email-templates` sidebar + inline editable name field; responsive flex-wrap header/editor/layout.
- **Blog sections builder**: generic `components/admin/ContentBlocksEditor.tsx` (add/remove/reorder heading/paragraph/list/button/image/divider) shared by the email `EmailTemplateBlocksEditor.tsx` (now a thin wrapper) and the new "Content Sections" card on `/admin/blog-templates` (writes `IBlogConfig.sections`); `components/blog/ContentBlocks.tsx` renders sections on the blog page.
- **Tests**: `__tests__/lib/email-blocks.test.ts` (6 tests) — `{{name}}` → platform name, sample logoUrl absolute, h1 `#E8FF47` in serializer + all default templates.

### Status
Pass — typecheck clean, lint 0 errors (pre-existing warnings only), 193/193 tests pass, production build succeeds (72 static pages).

## Sprint 2026-08-13 — Config Persistence, Email Verification, SEO Wiring, Admin User/Blog Management

### What
Fixed admin config edits not round-tripping (deep-merge dotted config keys), shipped a full email-verification lifecycle, config-driven blog templates + newsletter, admin user management, reusable back button + profile page, and config-driven SEO metadata. Pure feature session with docs closed out at the end.

### Why
Admin edits to nested config (e.g. `emailConfig.templates`) were clobbered by shallow merging of DB rows. Email/password signups had no verification path (only Google signups worked end-to-end). The blog page hero/newsletter were not config-driven, there was no way for admins to manage users or blog content, and SEO metadata (absolute logo og:image, canonical, twitter card, noindex) was not config-driven.

### Key Changes
- **`services/PlatformConfigService.ts`**: exported `setNestedValue(target, path, value)` — deep-sets dotted config keys when merging DB rows in `get()`; null values skipped so defaults are never clobbered (fixes admin edits not round-tripping)
- **`lib/url.ts`** (new): `appOrigin()` (NEXT_PUBLIC_APP_URL → VERCEL_URL → http://localhost:3000) + `resolveAbsoluteUrl()` (prefixes relative paths, leaves http/https/`//` unchanged)
- **`lib/seo.ts`** (new): `buildSeoMetadata(config, options)` — config-driven Next.js Metadata builder (absolute logo og:image + canonical + twitter card + noindex); wired into `app/layout.tsx` + per-page metadata (blog, blog/[slug], team, privacy, terms, search, [category], profile/[slug])
- **`lib/email-blocks.ts`** (new): `blocksToHtml()` serializes `EmailTemplateBlock[]` to inline-styled email HTML; `substituteSampleVars()` + `SAMPLE_EMAIL_VARS` for previews
- **`types/index.ts`**: `EmailTemplateBlock`, `IEmailTemplate.blocks?`, `IBlogConfig` + `IBlogNewsletterConfig`
- **`config/platform.config.ts`**: `blogConfig` (heroTitle, heroSubtitle, newsletter, footerTagline) + `verifyEmail` + `emailChanged` email templates
- **Email verification**: Better Auth `emailVerification` (sendOnSignUp false, autoSignInAfterVerification true, expiresIn 3600, custom sendVerificationEmail via `sendTransactionalEmail`) + `user.changeEmail.enabled`; `/api/verify-email/send` + `/api/verify-email/welcome`; `/verify-email` page (60s cooldown + `done=1` fires welcome POST); `useAuth.signUp` POSTs `/api/verify-email/send` instead of `/api/email/welcome` (Google signups pre-verified → welcome fires immediately from register page)
- **Email templates admin**: Visual/HTML/Preview tabs + `EmailTemplateBlocksEditor` (block builder) + create-new-template modal + test-send/"Send to Subscribers" broadcast via `/api/admin/email/send`
- **Blog**: config-driven hero title/subtitle + newsletter section; `/admin/blog-templates` page; `/api/newsletter` grants MARKETING consent to signed-in users
- **Admin user management**: `/api/admin/users` (GET) + `/api/admin/users/[id]` (PATCH/DELETE self-guard) + `/admin/users` page (search, role, verify, delete)
- **UI**: `ClBackButton` (hydration-safe history.back + fallback href) in profile/bookings/wallet pages; Navbar Profile + Admin links; `/app/(auth)/profile` page (avatar, name update, email verification status + resend, email change)
- **`.env.example`**: documents `NEXT_PUBLIC_APP_URL`
- **Tests**: `__tests__/lib/config-helpers.test.ts` — setNestedValue, lib/url, lib/email-blocks, lib/seo

### Status
Pass — typecheck clean, 187/187 tests pass, production build succeeds (only pre-existing lint warnings in unrelated files remain).

## Sprint 2026-08-12 — Cloudinary Asset Lifecycle Close-Out

### What
Confirmed the Cloudinary asset-lifecycle work (shipped 2026-08-11 in commit `2f927df`) was implemented but never closed out in docs, then performed the missing documentation reconciliation and ran a full `update-ai-system.md` deep sync.

### Why
`ai-system/in-progress.md` still showed an active "Cloudinary Asset Lifecycle" plan while the code was complete — no session-log entry, no task-queue/project-plan/dev-history completion, and `repo-map`/`dependency-graph`/`system-architecture` didn't mention `MediaAssetService` or the media routes. The docs had drifted because that session's close-out step was never run.

### Key Changes
- **Close-out documentation** — session-log (Session 22), dev-history sprint, task-queue + project-plan completions; `ai-system/in-progress.md` restored to cleared
- **`index/repo-map.md`** — added `/admin/media`, `/profile/media`, `mediaUpload` details, `MediaAssetService`, `ClConfirmDialog`, `use-undoable.ts`, `MediaAssetService.test.ts`
- **`index/dependency-graph.md`** — added `MediaAssetService` (db, media_assets, cloudinary signed ops, config, types) + Cloudinary/Drive/Resend raw-fetch dependency entries (no SDKs in package.json — all use global `fetch`)
- **`system-architecture.md`** — MediaAssetService in service layer, "Media Asset Lifecycle" data-flow section, `mediaUpload.cleanupEnabled`/`cleanupOrphanAfterHours` config table row, tech stack clarified (Cloudinary/Drive via raw fetch), recent-changes entries
- **`planning/project-plan.md`**, **`planning/task-queue.md`**, **`summaries/dev-history.md`**, **`memory/lessons-learned.md`**, **`testing/test-results.md`** — reconciled

### Status
Pass — docs-only session; no code changes. Tests verified at 169/169 (Session 21).

## Sprint 2026-08-12 — Cron Auth Header Alignment + media-cleanup Scheduling

### What
Aligned all four cron route handlers on the `Authorization: Bearer <CRON_SECRET>` verification scheme that Vercel Cron actually sends, and registered the previously-unwired `/api/cron/media-cleanup` job in `vercel.json`.

### Why
`escrow`, `milestones`, and `media-cleanup` cron routes read a custom `x-cron-secret` header. Vercel Cron never sends that header — when `CRON_SECRET` is set as a project env var, Vercel auto-attaches `Authorization: Bearer <secret>`. Only `drive-sync` matched Vercel's format, so those three jobs always returned 401 in production. `media-cleanup` was implemented but never added to the `crons` array in `vercel.json`, so it never ran at all.

### Key Changes
- **`app/api/cron/{escrow,milestones,media-cleanup}/route.ts`**: header check changed from `x-cron-secret` to `authorization` compared against `` `Bearer ${process.env.CRON_SECRET}` `` (identical to `drive-sync`)
- **`vercel.json`**: added `/api/cron/media-cleanup` at `10 0 * * *` (daily, 10 past midnight UTC)
- **`.env.example`**: `CRON_SECRET` guidance block now documents the unified Bearer scheme instead of two per-route conventions
- **`ai-system/repair-system.md`**: logged the cron-header mismatch as a known error pattern with prevention guidance

### Status
Pass — typecheck clean, 169 tests pass, lint has no new warnings, production build passes (all 4 `/api/cron/*` routes listed).

## 2026-07-28 — Prototype Interactivity & Fallback Content

### What
Enabled mock data mode, added profile page mock fallback, created blog fallback posts, and added team member seeding.

### Why
The prototype was not interactable — profile pages returned 404, blog showed empty, and mock data was disabled.

### Key Changes
- `.env`: `NEXT_PUBLIC_MOCK_DATA=true`
- Profile page: try/catch with MockDataService fallback for all data fetches
- Blog: 6 hardcoded fallback posts when Sanity is unavailable
- Seed script: 6 team member records added
- MockDataService: 3 new methods for profile fallback support

### Status
Conditional pass — type checks verify, build blocked by SWC platform issue on Windows.

## Sprint 2026-07-28 — Bug Fixes: Profile 404 & Blog PortableText

### Bug 1: Profile Page 404
- Root cause: `slug.split("-").pop()` extracted `"2"` instead of `"prov-2"` from slug `"femi-adeyemi-films-prov-2"`
- Fix: Changed slug delimiter from single hyphen `-` to double hyphen `--` in ExploreService.ts line 151
- Updated profile page (`app/(public)/profile/[slug]/page.tsx`) to split on `--` and try mock data first
- Updated setup API route (`app/api/profile/setup/route.ts`) to use `--` delimiter  
- Updated all 6 mock explore slugs in MockDataService.ts to use `--mock-pro` suffix matching production format

### Bug 2: Blog PortableText Unknown Block Type
- Root cause: Fallback blog data in `lib/blog-fallback.ts` was missing `_type: "span"` on all children objects
- Fix: Added `_type: "span"` to all 38 children entries across 6 fallback blog posts
- This caused `isPortableTextBlock()` validation to fail, triggering the "Unknown block type block" error

## Sprint 2026-07-28 — Service Tests & State Machine Verification

- Exported LEGAL_TRANSITIONS from BookingService and added LEGAL_ESCROW_TRANSITIONS to EscrowService for testability
- Wrote 80 tests across 7 test files:
  - MockDataService.test.ts — 20 tests (data gating, CRUD, filtering)
  - BookingService.test.ts — 10 tests (LEGAL_TRANSITIONS state machine, coverage of all 9 BookingStatus values)
  - EscrowService.test.ts — 9 tests (LEGAL_ESCROW_TRANSITIONS state machine, coverage of all 6 EscrowState values)
  - ExploreService.test.ts — 7 tests (cursor encode/decode round-trip, malformed input handling)
  - DriveService.test.ts — 12 tests (folder URL parsing, MIME type validation, error classes)
  - PlatformConfigService.test.ts — 11 tests (DEFAULT_CONFIG field assertions for all nested config blocks)
  - Errors.test.ts — 8 tests (all 6 business error classes: defaults, custom messages, instanceof checks)
- Updated vitest.config.ts (node environment)
- Marked "Write tests for all services" task as completed in task-queue.md

## Sprint 2026-07-29 — UI Consolidation & Email Infrastructure

### What
Consolidated UI components (ClLogo, ClErrorState, ClEmptyState, ClPasswordInput), added password visibility toggle, updated ThemeToggler with icon mode, and built end-to-end email infrastructure with admin-editable templates and simulation fallback.

### Why
Password inputs lacked visibility controls, error/empty states were duplicated inline, theme toggler was text-only, no email system existed for transactional notifications, and logo usage was inconsistent.

### Key Changes
- **ClLogo**: Config-driven component with `variant` (full/icon/auto) + `showName`, replaces all inline Image+name patterns
- **ClErrorState** / **ClEmptyState**: Global reusable components replacing inline definitions in ExploreGrid, BlogPageClient, TeamPage
- **ClPasswordInput**: Eye/EyeOff visibility toggle, used in login + register pages
- **ThemeToggler**: Now accepts `displayMode` with lucide icons (Monitor/Sun/Moon)
- **EmailService**: Resend-based with simulation fallback when RESEND_API_KEY is absent
- **Admin email templates**: `/admin/email-templates` page for editing template subjects/HTML/active status
- **Email API**: `POST /api/email/welcome`, `POST /api/email/send` endpoints
- **Welcome email**: Wired into signup flow via useAuth hook (fire-and-forget)
- **Config**: `emailConfig` added to platform config with template defaults
- **Admin Sidebar**: Added "Email Templates" nav item

### Status
Pass — type check passes, lint passes (no new warnings), all components follow Cl* conventions.
## Sprint 2026-08-05 — Google OAuth in Sign-Up + Onboarding Handoff

### What
Completed the OAuth story for registration: "Continue with Google" on the register page as an alternative to email/password (Google supplies name + email), with new users flowing seamlessly into the onboarding phase just like the email/password flow.

### Why
The server-side Google provider and a login-page button existed, but the register/sign-up process had no OAuth entry point, and new Google users had no path into role selection, NDPR consent, or the provider onboarding wizard.

### Key Changes
- **`lib/oauth.ts`** (new): OAuth callback URL constants, return detection, self-assignable role guard (CLIENT/PROVIDER, never ADMIN), open-redirect-safe route resolution
- **Register page**: Google button + divider; `?oauth=done` callback handling; new users complete role/consent then route to `/profile/setup` (provider) or `/explore` (client)
- **Login page**: new Google users routed to register finalize; existing users straight to `/explore`
- **`useAuth.signInWithGoogle`**: accepts `callbackURL` / `newUserCallbackURL` / `errorCallbackURL`
- **`POST /api/auth/role`** (new): self-assignable CLIENT/PROVIDER role; also wired into email signup so provider signups actually set `role = PROVIDER` in DB (pre-existing gap)
- **Tests**: 12 new tests in `__tests__/oauth.test.ts`

### Status
Pass — typecheck clean, 92 tests pass, lint has no new warnings, production build passes (55 pages).

## Sprint 2026-08-05 — Button Loading States + Footer Bug-Report Link

### What
Implemented the button states that existed in the design system but weren't wired into the app: loading spinners on every async action (sign-up, sign-in, password reset, milestone/escrow actions, payment, admin mutations, sign-out), plus an accessible footer link to the bug-report page.

### Why
Buttons running network/async operations gave no in-flight feedback and were re-clickable (double-submit risk). The design files define a `cl-btn-loading` spinner state that ClButton didn't actually render (its spinner was `border-transparent` = invisible).

### Key Changes
- **`ClSpinner`** (new ui primitive) + fixed **`ClButton`** loading rendering (centered `currentColor` ring spinner, label hidden, auto-disable)
- **Auth**: Google + email submit loading states on register, login, forgot-password
- **Booking**: per-milestone `loadingId` and escrow `releaseLoading` wired to Fund/Submit/Approve/Confirm Release; Add Payment loading
- **Admin**: categories Disable, team toggle/Delete, bug-reports Save, sidebar Sign out — all wired to mutation pending states
- **Footer**: "Report a Bug" link → `/bug-report` under Platform
- Public bug-report Submit now uses `loading` prop

### Status
Pass — typecheck clean, 92 tests pass, lint has no new warnings, production build passes.

## Sprint 2026-08-09 — Alpha Testing Feedback Fixes

### What
Addressed the four concerns from the first-time alpha tester: no direct media upload option, broken Google Drive connect during onboarding, prices displaying ×100 too high at the review step (₦75,000 → ₦7,500,000), and a 404 after the final Create Account action.

### Why
The onboarding wizard only offered raw "Cloudinary URL" text inputs (no upload affordance), the Drive sync call ran before a provider row existed (→ 404 "Provider profile not found"), the step-5 preview double-converted naira→kobo, and provider slugs truncated UUIDs to 8 chars which the profile page then compared with an exact `eq()` — never matching → `notFound()`.

### Key Changes
- **Pricing**: new `lib/currency.ts` (`nairaToKobo`, `formatNaira`, `formatKobo`); review preview displays entered naira correctly
- **Slug/404**: new `lib/slug.ts` (`buildProviderSlug`, `parseProviderSlug`); profile page resolves with prefix `LIKE` + last-`--` parsing; sitemap/ExploreService/setup API share the builder
- **Cloudinary pipeline**: `mediaUpload` config block; `lib/cloudinary.ts` reads env at call time + `isCloudinaryConfigured()`; `POST /api/media/upload` (auth/config/env/type-size checks) and `GET /api/media/status`
- **MediaUpload component**: "Upload your work or provide a link" — Cloudinary upload tab + paste-link tab; link-only fallback when Cloudinary unavailable
- **Drive onboarding**: `DriveConnectSettings` `mode="collect"` (validate + save URL only); setup API ingests Drive server-side post-creation (non-fatal)
- **Feedback**: success toast on publish; Drive-sync warning toast; redirect lands on live profile
- **Tests**: 12 new (`media`, `slug`, `currency`, `cloudinary`)

### Status
Pass — typecheck clean, 124 tests pass, lint has no new warnings, production build passes.

## Sprint 2026-08-09 — Provider & Client Dashboards

### What
Built the role-aware authenticated dashboard: a single `/dashboard` route served by one API endpoint that returns a provider or client payload depending on the signed-in user's role, with full mock fallback.

### Why
Phase 2 dashboard work was unstarted — providers had no earnings/pipeline/availability view and clients had no booking/payment history surface, despite the design files (12-provider-dashboard, 14-client-dashboard).

### Key Changes
- **`types/dashboard.ts`** (new): `IProviderDashboard`, `IClientDashboard`, `IDashboardStat`, `IDashboardPipelineColumn`, `IDashboardAvailabilitySlot`, `IPortfolioPerformanceRow`, `IClientPaymentRecord`, `IProfileCompleteness` — re-exported through `types/index.ts`
- **`services/DashboardService.ts`** (new): role-aware queries — provider stats/earnings (kobo ints), 4-column booking pipeline (static `PROVIDER_COLUMNS` / `CLIENT_COLUMNS` map stages → statuses), profile completeness (same rounding as the real service), availability slots (config-driven `availabilityLookaheadDays`), client payment history (newest-first, `netAmount = amount - fee`), discover rail via ExploreService; graceful MockDataService fallback
- **`services/MockDataService.ts`**: `getMockProviderDashboard`, `getMockClientDashboard`, `getMockAvailability`, `getMockPortfolioPerformance`, `getMockWorkHistoryForProvider` — empty-safe shapes when mock mode off
- **`app/api/dashboard/route.ts`** (new): single `GET` serving either role, 401 unauthenticated
- **`app/(auth)/dashboard/`** (new): server page + `DashboardClient` (role switch via `useRole`, refetch on change) + components (`ProviderDashboardView`, `ClientDashboardView`, `PipelineColumn`, `StatCard`, `ProfileCompleteness`, `AvailabilityCalendar`, `PaymentHistoryList`, `DiscoverRail`)
- **`Navbar`**: brand + Dashboard link now shown to authenticated users in both nav variants
- **`config/platform.config.ts`**: `dashboard.availabilityLookaheadDays` (30) + `dashboard.quickActions` config keys (DB-overridable)
- **Tests**: 15 new in `__tests__/services/DashboardService.test.ts` — every provider status maps to exactly one pipeline stage, active client statuses covered, mock shapes, kobo invariants, sorted payments, empty-safe fallbacks
- **`tsconfig.json`**: dropped `baseUrl` (removed in TypeScript 7) — paths already resolve relative to tsconfig

### Status
Pass — typecheck clean, 140 tests pass, lint has no new warnings, production build passes (incl. `/dashboard` route).

## Sprint 2026-08-11 — Fix: Dashboard "Unauthorized" for Authenticated Users

### What
Fixed a runtime error where a successfully authenticated user opening `/dashboard` (or any `requireAuth()`-guarded page) hit `Error: Unauthorized` (digest `1369153800`).

### Why
`lib/auth.ts` `getSession()` called `auth.api.getSession({ headers: new Headers() })`. Better Auth resolves the session from the incoming request's cookies, so with an empty `Headers` object the session was always `null` and `requireAuth()` threw `Unauthorized`. The bug affected every server-side auth guard — dashboard page, wallet page, and the wallet/milestone API routes.

### Key Changes
- **`lib/auth.ts`**: `getSession()` now reads the current request headers via `await headers()` from `next/headers` and forwards them to `auth.api.getSession({ headers: h })` — the same pattern already used in `app/admin/layout.tsx` and the consent/export/delete API routes.

### Status
Pass — typecheck clean, 140 tests pass, lint has no new warnings, production build passes (incl. `/dashboard`).

## Sprint 2026-08-11 — Integrations Operational Readiness (Cloudinary + Resend)

### What
Made the Cloudinary and Resend foundations genuinely operational once env vars are plugged in: fixed the email flag that silently disabled every email, added a Resend availability guard + health endpoint mirroring the Cloudinary pattern, fixed subject template substitution, and brought `.env.example` fully in line with every env var the code references.

### Why
The user obtained real Cloudinary + Resend API keys and needs the systems to work as soon as the keys are set. Auditing the routes against the config surfaced three real blockers: `DEFAULT_CONFIG.features.emailNotifications` had no default (so `/api/email/*` always returned "Email notifications disabled"), the welcome subject's `{{name}}` never resolved (subject fill didn't receive config vars), and `.env.example` was missing `RESEND_API_KEY` + `CRON_SECRET`.

### Key Changes
- **`config/platform.config.ts`**: `features.emailNotifications: true` default added (was undefined → all transactional email disabled)
- **`services/EmailService.ts`**: added `isResendConfigured()` / `getResendConfig()` (call-time env read, mirrors `isCloudinaryConfigured()`); subject now filled with the same base vars (name/logoUrl) as the HTML body
- **`app/api/email/status/route.ts`** (new): public health route — `enabled`, `resendConfigured` (feature flag AND `RESEND_API_KEY`), from address/name, enabled template subjects (mirrors `/api/media/status`)
- **`__tests__/services/EmailService.test.ts`** (new): 11 tests — guard, preview fallback, var substitution, unknown/disabled template, Resend success/error/throw paths
- **`.env.example`**: added `RESEND_API_KEY` and `CRON_SECRET` (verified against every `process.env.*` reference in `app/`, `lib/`, `services/`, `scripts/`, `sanity/`, `drizzle/`, `middleware.ts`)
- **Scope check**: in-app notification centre confirmed Phase 2 (per `project-plan.md` + `task-queue.md`) → NOT delivered, per the directive's condition. Decision logged in `memory/project-decisions.md`.

### Status
Pass — typecheck clean, 151 tests pass (11 new), lint has no new warnings, production build passes.

## Sprint 2026-08-19 — Audit trails across the platform + config change-log summary + table wrapper polish

### What
Applied audit trails everywhere an admin mutates platform state, made the config
"Recent Changes" table summarise/serialise old/new values (no more full HTML template
dumps), captured the performer on every audit entry, and routed the last raw table
(portfolio performance) through the universal `ClDataTable` wrapper.

### Why
Alpha-testing feedback: editing an email template produced a change-log row whose
old/new columns contained the entire HTML body; the person who made the change was
never shown; and audit logging only existed for config updates, providers and account
export/delete — every other admin mutation (team, users, media, email sends, blog
posts, bug reports, dispute resolution) was invisible to history.

### Key Changes
- **`services/AuditService.ts`** (new): centralised `log()` + `list()`/`count()`.
  `list()` left-joins the actor so entries carry `actorName`/`actorEmail`.
- **`lib/audit.ts`** (new): pure helpers that serialise any value and collapse long
  values (HTML bodies) to a one-line summary with an expand-to-full action.
- **`components/admin/AuditValueCell.tsx`** (new): reusable collapsed↔expanded value
  cell used by both the config change log and the audit-log page.
- **`app/api/admin/config/route.ts`**: `?log=true` now returns actor info via
  AuditService.
- **`app/admin/config/page.tsx`**: summarised old/new values + "Performed By" column.
- **`app/api/admin/audit-log/route.ts` + `app/admin/audit-log/page.tsx`** (new):
  paginated, filterable full audit-trail view (entity/action filters, actor, values).
- **`components/admin/AdminSidebar.tsx`**: "Audit Log" nav item added.
- **Audit logging added to** all remaining admin mutations: team create/update/delete/
  batch, user update/delete, media cleanup + delete, email test + broadcast sends,
  blog post create/update/delete, bug-report updates, dispute resolution.
- **`app/(auth)/dashboard/components/PortfolioPerformanceTable.tsx`**: migrated from
  raw `<table>` to `ClDataTable` (pagination + horizontal overflow + empty state).
- **Tests**: `__tests__/services/AuditService.test.ts` (4), `__tests__/lib/audit.test.ts`
  (11) — 233 total, all pass.

### Status
Pass — typecheck clean, 233 tests pass, lint has no new warnings, production build passes.
