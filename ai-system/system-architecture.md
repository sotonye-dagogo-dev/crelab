# System Architecture

> **Metadata**
> - last-updated-by: execute-feature (Session 2026-10-08 — verified-status hardening)
> - last-verified-against-code: 2026-10-08
> - staleness-policy: re-verify before trusting if any architecture-affecting commits have been made since last-verified-against-code

> **Overview:** Crelab is a metadata-driven, config-first creative services marketplace. Architecture follows a layered Next.js App Router pattern with OOP class-based services, interface-first TypeScript, and ConfigContext-driven runtime overrides.

---

## Architecture Diagram

```
Client (Browser)
    |
    v
Next.js App Router (app/)
    |-- (public)  -- Guest: Landing/Explore, Category Browse, Search, Profiles, Blog, Verify-email, About, How It Works, Portfolio Gallery, Leaderboard, Webinars, Bug Report
    |-- (auth)    -- Authenticated: Dashboard, Bookings, Messages, Profile, Profile Edit, Referrals
    |-- (admin)   -- ADMIN role: Config editor, Categories, Disputes, Media, Email Templates, Blog Templates, Blog Posts, Users, Countdown, Webinars, Bug Reports
    |-- api/      -- Route handlers: Auth, Bookings, Portfolio, Webhooks, Cron, Admin, Leaderboard, Referrals, Webinars, Early-access
    |-- error.tsx / global-error.tsx + components/error/GlobalErrorCatcher (window.onerror + unhandledrejection)
    |
    v
Service Layer (services/)
    |-- BookingService          -- Booking lifecycle (REQUESTED -> RELEASED/REFUNDED, now stores paymentMode + validates milestone config)
    |-- EscrowService           -- Escrow state machine (PENDING -> HELD -> IN_PROGRESS -> RELEASED/DISPUTED, now uses real client email + BOOKING_PAYMENT metadata)
    |-- PortfolioService        -- Portfolio CRUD, reorder, hide/show + attachUploadToProvider (best-effort portfolio attach on every media upload/confirm, idempotent)
    |-- DriveService            -- Google Drive folder sync, validate, ingest
    |-- PaymentService          -- Paystack integration, subaccount split
    |-- PlatformConfigService   -- Config CRUD with DB override + cached reads
    |-- ExploreService          -- Provider search, filter, sort, cursor pagination + portfolio thumbnails for tile carousel
    |-- DashboardService        -- Role-aware Provider/Client dashboards (pipeline, stats, availability, payments, portfolio gallery)
    |-- WalletService           -- Wallet CRUD, topup, debit, credit, withdrawal, DVA (escrowKobo cleared atomically on release)
    |-- MilestoneService        -- Milestone lifecycle (create, fund, submit, approve, dispute — approve now credits provider, not client)
    |-- MediaAssetService       -- Media asset registry: record uploads, list by owner/all, referenced-URL scan (providers/portfolio/blog/team), orphan cleanup, delete, replace, reconcile, backfillOrphans (bulk owner-matched rescue)
    |-- MockDataService         -- Mock data fallback when DB unavailable
    |-- EmailService            -- Resend transactional emails (isResendConfigured guard + preview fallback + verify/email-changed/sendTemplate + password reset)
    |-- BlogPostService         -- Blog post CRUD + DB→Sanity→fallback merge (admin/DB posts win, dedup by slug)
    |-- EarlyMemberService      -- Founding-100 rank via ROW_NUMBER() over user.createdAt (cached, no schema change)
    |-- ReferralService         -- Invite codes + ACID degree-1/degree-2 referral events, idempotent cookie claim (cookie-first + JSON body fallback) + auth-agnostic claim retry (ReferralClaimOnAuth) + discovery links (navbar/footer/profile/dashboards/leaderboard)
    |-- LeaderboardService      -- Pluggable factor registry (referrals/portfolio/bookings/ratings) + weighted ranking over ALL members (zero-score rows kept, ranked last) + 30s user-agnostic board cache + batched candidate load + per-request current-user rank
     |-- WebinarService          -- Webinar CRUD, upcoming/past lists, idempotent registration (unique-index upsert)
     |-- TeamService             -- Public team listing (active-only, display order) + socialLinks normalisation (array | legacy JSON-string | null)
    |-- PlatformStatsService    -- Cached landing aggregates with null → fallbackValue degradation
    |
    v
Data Access Layer
    |-- Drizzle ORM (drizzle/schema.ts + migrations)
    |-- Supabase RLS (row-level security on all tables)
    |
    v
Data Stores
    |-- PostgreSQL (Supabase)     -- Primary DB: users, bookings, payments, about_page, how_it_works_page, media_assets, portfolio_items, referral_codes, referral_events, webinars, webinar_registrations, bug_reports.error_context, etc.
    |-- Sanity CMS                -- Blog content, creator spotlights
    |-- Cloudinary                -- Video/image upload, thumbnails
    |-- Mux                       -- Video streaming
    |-- Paystack                  -- Payment processing, subaccount splits
```

---

## Module Breakdown

| Module | Responsibility | Key Files | Dependencies |
|--------|---------------|-----------|--------------|
| Public Routes | Guest-accessible pages: landing/explore, category browse, profile/[slug], search, blog, verify-email, about, how-it-works, portfolio gallery, leaderboard, webinars, bug-report | `app/(public)/` | Components, Services |
| Auth Routes | Authenticated pages: dashboard, booking, profile (page/setup/media), register, login, referrals | `app/(auth)/` | AuthGate, Services |
| Admin Routes | ADMIN-only: config editor, category manager, provider queue, disputes, media, email templates, blog templates, users, countdown, webinars | `app/admin/` | requireRole('ADMIN'), Services |
| API Routes | Backend handlers: auth, explore, bookings, portfolio, profile, admin, verify-email, newsletter, webhooks, cron, leaderboard, referrals, webinars, early-access, bug-report | `app/api/` | Services, Lib |
| Error Boundaries | Route-segment (`app/error.tsx`), root (`app/global-error.tsx`) and global window catcher (sanitised console/stack capture → `/bug-report`) | `components/error/`, `app/error.tsx`, `app/global-error.tsx` | Lib (sanitize-error, error-log-buffer) |
| UI Wrappers | Cl* wrappers around shadcn/ui primitives | `components/ui/` | shadcn/ui, Tailwind |
| Feature Components | Domain-specific UI: explore cards, profile sections, booking drawer, admin panels | `components/` | UI Wrappers, Types |
| Services | Business logic: booking, escrow, payment, portfolio, drive, media assets, config, explore, email + growth (early-member, referral, leaderboard, webinar, platform stats) | `services/` | Lib, Types, Drizzle |
| Types | Global TS interfaces: entities, API responses, enums, explore types, email template blocks | `types/` | None |
| Config | Platform config with DB override capability | `config/` | Types |
| Lib | Third-party wrappers + shared utilities: auth, db, paystack, cloudinary, drive, consent, config-context, toast, url, seo, email-blocks, platform-copy, sanitize-error, error-log-buffer, countdown, referral-cookie, landing-stats, webinars, social-platforms | `lib/` | SDK packages |
| Drizzle | Database schema, migrations, RLS policies | `drizzle/` | Supabase, postgres |

---

## Data Flow

### Standard Request Flow
```
1. Browser -> Next.js App Router (server component/page)
2. Server component fetches data via Service (server-side)
3. Service queries DB via Drizzle ORM with Supabase RLS
4. Data returned to component -> rendered HTML sent to client
5. Client-side interactivity via TanStack Query for mutations
```

### Authentication Flow
```
1. User signs up/logs in via Better Auth (email/password, phone OTP, or Google OAuth)
2. Google OAuth (signup): "Continue with Google" -> Google consent -> callback
   -> new users land on /register?oauth=done&new=1 (role + NDPR consent)
   -> existing users land on /explore (login) or returnTo (register)
3. OAuth finalize: capture consent, self-assign PROVIDER role via POST /api/auth/role,
   send welcome email immediately (Google emails are already verified), then route
   to /profile/setup (provider) or /explore (client)
4. Email/password signup: `databaseHooks.user.create.after` (lib/auth.ts) sends the
   verification mail server-side for unverified creations (OAuth arrivals are
   pre-verified and skip); the register page lands email signups on
   `/verify-email?email=…&new=1&next=…` (verify-first, Continue CTA back to
   setup/explore); the welcome email is deferred until verification succeeds.
   Signed-in unverified users see a dismissible `VerifyEmailBanner`
   (`emailVerification.bannerEnabled`) with resend — verification is never a hard gate.
5. Better Auth stores session in Supabase adapter (httpOnly cookies)
6. Next.js middleware checks session on protected routes (incl. /profile)
7. Server components use getSession() / requireAuth() / requireRole()
8. Client-side: useAuth() hook provides { user, role, isAuthenticated, signIn, signInWithGoogle, signOut, sendVerificationEmail, changeEmail }
```

### Email Verification Flow
```
1. Email/password signup -> Better Auth `databaseHooks.user.create.after` calls
   `sendVerificationEmailTo()` (lib/verify-email.ts: 1h token + `normalizeEmail`
   trim/lowercase identifier + case-insensitive display-name lookup + dead-token
   cleanup) -> EmailService.sendVerifyEmail()
2. Register page routes the new account to /verify-email?email=…&new=1&next=…
   (fresh-signup mode: check-inbox copy + resend + Continue CTA back to `next`)
3. User clicks the token-only link (/verify-email?token=…) -> page verifies on
   load via POST /api/verify-email/verify (even for legacy done=1&token= links)
   -> refreshes the Better Auth session -> redirects to ?done=1
4. Verify endpoint matches the user case-insensitively (`ilike(user.email,
   identifier)`), checks the affected row (honest 404 + token retained when no
   user matched; idempotent success when already verified), then deletes the
   used token. Better Auth marks user.emailVerified=true, auto-signs-in
   (autoSignInAfterVerification)
5. /verify-email?done=1 fires POST /api/verify-email/welcome, which sends the
   welcome email exactly once, only when emailVerified (public resend form at
   POST /api/verify-email/send shares the same helper)
6. Google signups are pre-verified (hook skips) and fire the welcome email from
   the register finalize step (awaited, 20s bound, honest failure toast)
7. Persistent VerifyEmailBanner (root layout, session-dismissible, resend +
   cooldown) nudges any signed-in unverified user while bannerEnabled.
   `useAuth.refresh()` refetches the session wherever the flag is rendered
   (profile "I've verified — refresh status"); admin /admin/users pins
   staleTime 0 + manual Refresh so the badge always reflects the live DB row.
   Verification is never a hard gate.
```

### Email Template Management Flow
```
1. /admin/email-templates: Visual/HTML/Preview tabs; editable template name (sidebar + header field, saved to emailConfig.templates.*.name)
   -> Visual uses EmailTemplateBlocksEditor (thin email wrapper over the shared ContentBlocksEditor: heading/paragraph/list/button/image/divider, reorder, delete, per-block variable insert)
   -> blocks serialized via lib/email-blocks blocksToHtml() -> inline-styled email HTML (h1 defaults to #E8FF47)
   -> previews use substituteSampleVars() + previewVarsFor(config)/SAMPLE_EMAIL_VARS ({{name}} = platform name, {{logoUrl}} = configured logo resolved absolute) — relative img/link URLs resolved via lib/url resolveRelativeUrlsInHtml
   -> real sends resolve relative URLs too (EmailService.send runs resolveRelativeUrlsInHtml on the filled HTML)
    -> template lookup is resilient: resolveEmailTemplate/resolveEmailTemplates (lib/email-templates.ts) merge hardcoded DEFAULT_CONFIG templates under DB-saved ones, so a wired template (e.g. verifyEmail) still applies when it was never saved to the DB (PlatformConfigService re-merges emailConfig on every get)
2. New templates created via create-new-template modal (added to emailConfig.templates)
3. Wired (code-triggered) templates — welcome / verifyEmail / emailChanged / bookingConfirmation / paymentReceived / passwordReset / bugReportUnderReview / bugReportResolved / bugReportReceived / webinarRegistration (lib/email-templates.ts WIRED_EMAIL_TEMPLATES, each with a trigger description):
   -> preview + Simulate ONLY (useEmailSimulation) — badge + Zap icon + trigger banner in the admin
   -> /api/admin/email/send rejects wired keys for test-send AND broadcast (content/timing owned by code, not the operator)
   -> passwordReset fired by Better Auth emailAndPassword.sendResetPassword -> sendTransactionalEmail ({{resetUrl}} var)
4. Admin-created (non-wired) templates: test-send + "Send to Subscribers" broadcast to MARKETING-consented users + "Send to Selected…" batch send to an explicit admin-picked set -> POST /api/admin/email/send -> EmailService. Batch recipients come from GET /api/admin/email/recipients (search/role/consent/verified/limit/offset + hasMarketingConsent + emailVerified flags; picker defaults to verified-only with an opt-in unverified toggle + bounce notice); picker logic (normalize/filter/invert/cap 500 + partitionByVerification) lives in pure `lib/email-batch.ts`; batch sends are audit-logged as `email.batch` (incl. `unverifiedIncluded` count — explicit selections are always honoured). Wired-key guard applies identically to all three paths.
```

### Blog Content Sections Flow
```
1. /admin/blog-templates: "Content Sections" card uses the shared ContentBlocksEditor (same block builder as email templates)
2. Sections saved to blogConfig.sections (EmailTemplateBlock[]); optional preview vars for placeholders
3. app/(public)/blog renders cfg.sections via components/blog/ContentBlocks.tsx (BlogPageClient) alongside the config-driven hero + newsletter
```

### Blog Posts Flow
```
1. /admin/blog-posts: ClDataTable list + modal editor — live slugify, tags, meta description, publish toggle, confirm delete; hero image via ImageUploadField (Cloudinary upload or paste URL)
2. Content is EmailTemplateBlock[] (reuses the visual-builder block types) stored in the blog_posts table (0005_blog_posts.sql)
3. CRUD -> /api/admin/blog-posts (GET/POST) + /api/admin/blog-posts/[id] (PATCH/DELETE) -> BlogPostService
4. Public reads via BlogPostService: blog_posts (DB) -> Sanity posts -> fallback posts, deduped by slug (admin/DB wins)
5. app/(public)/blog + /blog/[slug] detect content shape: `type` = EmailTemplateBlock[] (renders BlocksContent via ContentBlocks, ToC/readTime), `_type` = Sanity portable text (renders ArticleBody); hero via lib/blog-hero getPostHeroUrl (plain URL or image- ref)
6. app/sitemap.ts + components/blog/BlogCard.tsx use BlogPostService.getAllSlugs
```

### Admin User Management Flow
```
1. /admin/users: search + list via GET /api/admin/users (search/list)
2. Role change / emailVerified toggle -> PATCH /api/admin/users/[id]
3. Delete -> DELETE /api/admin/users/[id] with self-guard (cannot delete own admin account)
```

### Booking & Payment Flow
```
1. Client selects package -> booking request (REQUESTED)
2. Provider accepts/counter-proposes/declines (ACCEPTED / DECLINED)
3. Client pays via Paystack inline checkout (PAYMENT_PENDING -> HELD)
4. Paystack webhook -> EscrowService.onPaystackSuccess()
5. Service date reached (cron) -> EscrowService.setInProgress() (IN_PROGRESS)
6. Client confirms OR auto-release after deadline -> EscrowService.release() (RELEASED)
7. Paystack subaccount split: platform fee deducted, provider receives net
```

### Google Drive Portfolio Sync Flow
```
1. Provider pastes public Drive folder URL
2. POST /api/portfolio/drive -> DriveService.ingestFolder()
3. Parse folder ID from URL, fetch file list via Google Drive Files API v3
4. Filter supported mimeTypes (mp4, jpg, png, pdf)
5. Generate Cloudinary thumbnails for video files
6. Upsert into portfolio_items with source=DRIVE, drive_file_id
7. Previously synced items not in current list -> hidden (not deleted)
8. Daily cron: DriveService.syncAll() for all providers with drive_folder_url
```

### Media Upload (Cloudinary) Flow
```
1. MediaUpload component fetches GET /api/media/status -> { enabled, cloudinaryConfigured, maxFileSizeMb, videoTypes, imageTypes, cleanupEnabled, cleanupOrphanAfterHours }
2. Cloudinary available (config mediaUpload.enabled+cloudinaryEnabled AND CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET set):
   -> Upload tab shown; file POSTed to /api/media/upload (auth + config + env + type/size validation)
   -> uploadFile() uploads via unsigned preset -> { url, thumbnailUrl, mimeType, resourceType, publicId }
   -> MediaAssetService records the asset in media_assets (deletes the Cloudinary binary if the record insert fails)
   -> PortfolioService.attachUploadToProvider() best-effort attaches the asset to the uploader's provider portfolio as a visible DIRECT item (idempotent by URL; no provider profile — e.g. admin uploads — means no attach, asset stays orphan until reconciled). Same attach runs in /api/media/confirm (direct browser uploads) and per-file in /api/media/batch-upload. Manual attach of library assets via POST /api/portfolio/items (mediaAssetId or raw url+mimeType, idempotent).
3. Cloudinary unavailable: upload tab hidden, paste-link tab offered ("Direct upload is temporarily unavailable")
4. Pasted URLs (Drive link or any public link) validated with isValidMediaUrl()
5. Cover video / avatar URLs stored via onboarding state -> /api/profile/setup -> providers.coverVideoUrl / avatarUrl. Setup also persists the cover (video OR photo) as a visible DIRECT portfolio item + rescues the owner's other recent orphans (avatar excluded — display pictures never become content). Admin reconcile-to-cover likewise ensures the portfolio row; reconcile-to-avatar never does.
6. Drive folder during onboarding is collect-only; DriveService.ingestFolder() runs server-side after provider creation
```

### Media Asset Lifecycle (Cleanup + Admin/User Management + Reconcile)
```
1. Every upload records a row in media_assets (publicId, cloudName, assetId, uploaderId, url, thumbnailUrl, mimeType, sizeBytes, status)
2. GET /api/media/assets (own list), DELETE /api/media/assets/[id], POST /api/media/assets/[id]/replace (swap references + delete old binary)
3. Admin: GET /api/admin/media (all assets with referenced/grace/orphan filters, preview, search, dry-run) + POST /api/admin/media (Run cleanup) + POST /api/admin/media/reconcile (attach orphan to provider as portfolio/avatar/cover, audit-logged) + POST /api/admin/media/backfill (bulk owner-matched rescue → DIRECT portfolio items, dry-run preview, audit-logged; explicit admin action only) + DELETE /api/admin/media/[id] (with ClConfirmDialog) + inline admin upload via MediaUpload (records with admin ownerId; shows Unlinked · grace until reconciled/backfilled)
4. Daily cron: /api/cron/media-cleanup scans media_assets for rows older than mediaUpload.cleanupOrphanAfterHours whose publicId is not referenced in providers/portfolio_items/blog_posts/team_members -> Cloudinary deleteAsset() + row removal. Gated by mediaUpload.cleanupEnabled. Recent uploads (<24h) show as Unlinked · grace, not Orphan, so the scheduled job never deletes fresh uploads even if the UI marks them unlinked.
5. Delete clears references first (providers cover/avatar -> null; portfolio_items -> row removed; blog hero/team avatar like-checks in isReferenced) then deletes the Cloudinary binary. Irreversible at the binary level -> delete flows use ClConfirmDialog; reversible destructive actions (team member delete, portfolio removal) use useUndoable undo toasts
6. Explore tiles avoid blank state: ExploreService supplies portfolioThumbnails (up to 4 visible thumbnails, cover-derived fallback when empty) + avatarUrl + coverVideoUrl per provider, and counts a lone cover in portfolioCount; ExploreVideoCard renders provider tiles by ordered preference — display photo (avatarUrl) alone if present, else cycles portfolioThumbnails on a 3.5s interval (dotted indicator), else initials avatar fallback when neither exists; video preview (previewVideoUrl/coverVideoUrl) overlays the tile when in view. Tiles (provider/content toggle) are available on both `/` (home) and `/explore` regardless of authentication (filter bar + toggle + grid are public; hero is guest-only).
7. Covers surface as content everywhere (`lib/portfolio.ts` `withCoverFallback`/`buildCoverFallbackItem`, deterministic `cover-<providerId>` ids): the public portfolio page and `GET /api/explore/portfolio` (filter-aware first-page fill) merge a missing cover — video OR photo, never the avatar — so cover-only providers show content on read even before setup/reconcile/backfill materialises the real row.
7. Provider dashboard gallery restored: DashboardService.queryPortfolioByProvider now returns full gallery (url/thumbnail/source/orderIndex) as portfolioGallery, rendered in ProviderDashboard via PortfolioGalleryGrid (2-4 col grid, 8-item cap, hidden badge, empty-state CTA), separate from the existing Portfolio Performance table.
```

### Provider Slug Resolution
Provider slugs are `{name-slugified}--{first-8-chars-of-provider-id}` (`lib/slug.ts`). Because the id prefix is NOT the full stored id, the public profile page resolves with a prefix `LIKE` query (`providers.id LIKE 'prefix%'`), never an exact `eq()`. Consumers: profile page, ExploreService, sitemap, profile setup API.

---

### Database Seeding Flow
```
1. npm run db:seed (tsx scripts/seed.ts)
2. Checks _seed_version marker in platform_config — exits if already seeded
3. Creates 10 users via POST /api/auth/sign-up/email (Better Auth API)
   - Proper password hashing via Better Auth's native bcrypt
   - Captures returned user IDs
4. Inserts seed data via Drizzle ORM (providers, packages, portfolio, bookings, etc.)
5. Writes _seed_version marker for idempotency
6. npm run db:seed:rollback (tsx scripts/seed-rollback.ts --force)
   - Deletes all rows in reverse FK dependency order
   - Removes _seed_version marker
   - --force flag for partial/no-marker states
```

---

## Configuration Points

| Config Key | Purpose | Location | Default |
|-----------|---------|----------|---------|
| PLATFORM_NAME | Public-facing platform name | platform.config.ts | 'Crellab' |
| PLATFORM_TAGLINE | Hero section tagline | platform.config.ts | 'Get hired for your creativity, not your follower count.' |
| PRIMARY_COLOR | Accent colour (hex) | platform.config.ts | '#E8FF47' |
| LOGO_PATH | Full logo image path (expanded navbars, hero) | platform.config.ts | '/primary-logo.png' |
| ICON_PATH | Icon image path (favicon, collapsed nav, auth pages) | platform.config.ts | '/icon.png' |
| FEE_RATE | Platform commission (decimal) | platform.config.ts | 0.05 |
| ESCROW_RELEASE_DAYS | Days after service date for auto-release | platform.config.ts | 5 |
| CATEGORIES | Category slugs + field schema JSONB | platform.config.ts | ['content-creator', 'cinematographer'] |
| FEATURES | Feature flags (guest browse, Drive sync, blog) | platform.config.ts | { guestBrowse: true, googleDriveSync: true, blogEnabled: true } |
| MEDIA_UPLOAD | mediaUpload.enabled / cloudinaryEnabled / maxFileSizeMb / videoTypes / imageTypes / cleanupEnabled / cleanupOrphanAfterHours | platform.config.ts | { enabled: true, cloudinaryEnabled: true, maxFileSizeMb: 100, cleanupEnabled: true, cleanupOrphanAfterHours: 24 } |
| EMAIL_CONFIG | emailConfig.templates (welcome, booking, payment, verifyEmail, emailChanged, passwordReset, bugReportReceived/underReview/resolved, webinarRegistration) + fromName/fromEmail | platform.config.ts | template defaults + from settings. Wired (code-triggered) templates are preview/simulate-only; admin-created templates can be sent/broadcast. Templates saved in DB are merged OVER hardcoded defaults (resolveEmailTemplates) so wired templates never silently drop. Sender defaults to a real address on a subdomain (`hello@mail.crellab.com`) — no no-reply; overridable via RESEND_FROM_NAME/RESEND_FROM_EMAIL |
| BLOG_CONFIG | blogConfig.heroTitle / heroSubtitle / newsletter / footerTagline — drives blog page hero + newsletter section, admin-editable at /admin/blog-templates | platform.config.ts | hero + newsletter defaults |
| NEXT_PUBLIC_APP_URL | Absolute origin for SEO canonical URLs + email logo links (falls back to VERCEL_URL, then http://localhost:3000) | .env | - |
| ENABLE_DESIGN_VIEWER | Mounts the dev-only design-asset viewer at `/__design/*`; must be false in production builds | .env | false |
| FIRST_HUNDRED | `firstHundred` — Founding-100 badge (enabled, limit, badgeLabel, title, description, showRank); admin fields in the config editor "Growth" section | platform.config.ts | { enabled: true, limit: 100, badgeLabel: 'Founding 100' } |
| REFERRAL | `referral` — invite copy + points (`directPoints` 100, `secondDegreePoints` 25, explainer items) | platform.config.ts | { enabled: true, directPoints: 100, secondDegreePoints: 25 } |
| LEADERBOARD | `leaderboard` — page copy, `pageSize`, and `factors.{referrals,portfolio,bookings,ratings}` (enabled/label/description/weight/showRawValue) driving the pluggable factor registry | platform.config.ts | weights 1 / 0.5 / 0.75 / 0.5, all enabled |
| COUNTDOWN | `countdown` — `enabled`, `iconAllowlist` (curated lucide names), `widgets[]` (edited on `/admin/countdown`, saved atomically as the single key `countdown.widgets`) | platform.config.ts | { enabled: true, widgets: [] } |
| BUG_REPORT | `bugReport` — error popup copy, CTA labels, severity, includeConsoleLogs | platform.config.ts | { enabled: true, severity: 'MEDIUM', includeConsoleLogs: true } |
| LANDING_STATS | `landingStats.items.{id}` — keyed record of stat items (key, label, format, orderIndex, enabled, fallbackValue) feeding the landing stats | platform.config.ts | creators/bookings/avgRating enabled; portfolio/members/team disabled |
| SCROLL_TO_TOP | `scrollToTop` — enabled / thresholdPx / label for the platform-wide `ScrollToTopButton` | platform.config.ts | { enabled: true, thresholdPx: 400 } |
| WEBINARS | `webinars` — page copy, `maxRegistrantsPerWebinar`, guest prompt + registration CTA + marketing-consent label | platform.config.ts | { maxRegistrantsPerWebinar: 500 } |
| TEAM_PAGE | `teamPage` — public `/team` hiring block (hiringEnabled/hiringTitle/hiringSubtitle/hiringCtaLabel/hiringCtaHref, relative or full URL); admin-editable from the `/admin/team` Page-settings card (PATCH `teamPage.*` dotted keys) | platform.config.ts | { hiringEnabled: true, hiringCtaHref: '/about' } |
| EMAIL_VERIFICATION | `emailVerification.bannerEnabled` — dismissible verify nudge with resend for signed-in unverified users (`VerifyEmailBanner`, root layout); never a hard gate | platform.config.ts | { bannerEnabled: true } |
| FEATURES (growth flags) | `features.referralsEnabled` + `features.webinarsEnabled` — gate the Navbar/Footer Referrals/Leaderboard & Webinars links and the referral/webinar surfaces (referral discovery: navbar, footer, profile card, dashboard `ReferralBanner`, leaderboard CTA) | platform.config.ts | both `true` |

All config points have hardcoded fallback values in `config/platform.config.ts` with DB override capability via `PlatformConfigService`. UI references consume these through `ConfigContext`.

---

## Verification CLI (agent-verifiable behavior)

Engineering principle §24 requires a CLI the agent can invoke to observe and verify application behavior end-to-end. Crelab's verification surface is the Node/npm test + typecheck + lint + build stack, invoked per the quality gate in `protocols/quality-gate.md` and `commands/verify-work.md`:

| Command | What it proves | When to use |
|---------|---------------|-------------|
| `npm test` (Vitest) | Unit + integration contract coverage for services/lib | Before a quality-gate close, after any code change |
| `npm run typecheck` (tsc --noEmit) | TypeScript strict compile of the whole app | After any code change |
| `npm run lint` (eslint) | Static rule adherence (0 errors) | After any code change |
| `npm run build` (next build) | Production build compiles + static pages generate | Before deploy / QA close |
| `npm run db:seed` / `db:seed:rollback` | Reproducible test data with working auth | When integration tests need seeded state |

An agent may extend this CLI (new script/command) when a change creates a new verification need — see §24.

---

## Rollback & Undo (deployment level)

This is the "undo" instinct applied one layer up from data (§22 covers user-facing undo; this covers deployments). `commands/fix-build.md` treats this as an escalation option, not just "fix forward":

- **Previous-build promotion** — Vercel allows redeploying a previous deployment; `vercel rollback` / the Vercel dashboard promotes the last-good build.
- **DB migration reversibility** — Drizzle migrations are down-migratable (`npm run db:generate` produces reversible migrations; see `scripts/seed-rollback.ts` for the seed data rollback path).
- **Feature-flag kill switch** — `platformConfig.features.*` (config-driven, DB-overridable) disables a bad feature without a deploy (e.g. `features.googleDriveSync`, `features.blogEnabled`).

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 15.3.x |
| Language | TypeScript | 5.x strict |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui (Cl* wrappers) | 4.x (CLI) |
| Animation | Framer Motion | 12.x |
| Auth | Better Auth | 1.6.x |
| Database | PostgreSQL (Supabase) | - |
| ORM | Drizzle ORM | latest stable |
| Payment | Paystack (primary) / Flutterwave (fallback) | 2.x |
| Video | Cloudinary (upload/thumbnails/signed delete via raw fetch) + Mux (streaming) | cloudinary@2.x / @mux/mux-node@14.x |
| Drive | Google Drive Files API v3 (raw fetch) | googleapis@20.x |
| CMS | Sanity CMS | @sanity/client@7.x |
| Email | Resend | resend@6.x |
| Data Fetching | TanStack Query | 5.x |
| Search | PostgreSQL full-text (MVP) -> Typesense (growth) | - |
| Deployment | Vercel + Supabase | - |

---

## Known Constraints & Technical Debt

- All monetary values stored in kobo (integer) — no floating point arithmetic on money
- Privacy by design: consent records, data minimisation, Supabase RLS from first migration
- NDPR compliance required for Nigerian market
- Paystack subaccount model for escrow (Crelab never holds funds directly)

---

## Architecture History

See `memory/architecture-history.md` for full chronology.

DB seeding via `scripts/seed.ts` + `scripts/seed-rollback.ts` provides reproducible test data with working authentication (users created via Better Auth API, not pre-hashed passwords).

Files not yet implemented despite being in the planned architecture:
- `services/ReviewService.ts` (interface exists but no implementation)
- `lib/mux.ts` (Mux streaming integration planned but NOT stubbed — file does not exist and `@mux/mux-node` is not in package.json)
- Messages (Phase 2) + in-app notification centre (Phase 2; deliberately NOT part of Phase 1 MVP — see Session 20 decision)

---

## Recent Changes

### 2026-10-08 — Verified-Status Hardening (DB-not-updated + stale session)
- **Root cause of "received the email but still unverified everywhere"** — `POST /api/verify-email/verify` matched with exact `eq(user.email, identifier)` while the token identifier is stored lowercased: mixed-case addresses updated 0 rows, yet the route returned success and deleted the token (false success, no retry). Fixed with shared `normalizeEmail()` + case-insensitive `ilike` match + `.returning()` affected-row check (honest 404, token retained; idempotent when already verified).
- **Stale-session half** — the custom verify writes the DB bypassing Better Auth while `useAuth` caches the session in state. `useAuth.refresh()` added; verify page refreshes the session post-verify; profile gains an "I've verified — refresh status" affordance; admin users page pins `staleTime: 0` + manual Refresh (rules out the caching hypothesis visibly). Verification stays optional — no hard gates.
- **QA:** `vitest` 453/453 (39 files; +1 normalizeEmail contract), `tsc --noEmit` clean, `next lint` 0 errors, `next build` green.

### 2026-10-08 — Email Verification + Wired Delivery Tightening
- **Dead verify link fixed** — links are token-only (`lib/verify-email.ts` `buildVerifyUrl`); the verify page verifies tokens even on legacy `done=1&token=` links (spinner + invalid-link hint, no false success).
- **Server-side verification send** — `databaseHooks.user.create.after` (lib/auth.ts) mails unverified creations exactly once (OAuth pre-verified skip; never fails signup); `useAuth` client duplicate removed; shared `sendVerificationEmailTo()` (1h token, real display name, dead-token cleanup) backs both the hook and `POST /api/verify-email/send`.
- **Signup routes through verify** — register lands email signups on `/verify-email?email=…&new=1&next=…` (check-inbox copy + resend + Continue CTA); OAuth finalize awaits `/api/email/welcome` (20s bound, honest toast).
- **Unverified filtering** — recipients API gains `emailVerified` + `verified` param (default `all`); picker defaults verified-only with opt-in toggle + bounce notice + badges; batch send reports `unverifiedIncluded` (explicit selection honoured); `partitionByVerification()` in `lib/email-batch.ts`.
- **Bug-report ack** — wired `bugReportReceived` template (editable, preview/simulate-only) fired best-effort on `POST /api/bug-report`, completing the received/under-review/resolved trio.
- **Verify nudge** — `emailVerification.bannerEnabled` config (admin Email section) + `VerifyEmailBanner` in root layout (session-dismissible, resend + cooldown). Verification is never a hard gate.
- **QA:** `vitest` 452/452 (39 files; +10 new), `tsc --noEmit` clean, `next lint` 0 errors, `next build` green.

### 2026-10-08 — Email Batch Send (selectable recipients)
- **Batch send** — `POST /api/admin/email/send` gains a `{ templateKey, recipientIds: string[] }` branch alongside single `to` and `segment:"marketing"`: ids normalised (trim/dedupe/cap 500 via pure `lib/email-batch.ts`), wired-key guard identical to the other paths, per-recipient `EmailService.sendTemplate`, unresolvable ids counted as skipped, audit-logged as `email.batch`.
- **Recipient picker source** — new `GET /api/admin/email/recipients` (ADMIN): `search` (name/email ilike), `role` (CLIENT/PROVIDER/ADMIN/ALL), `consent` (all/marketing via MARKETING-consent join, chunked `inArray` to respect the 500-parameter bound), `limit` 1–500 (default 100) + `offset`; returns id/name/email/role/hasMarketingConsent/createdAt + total.
- **Picker UI** — new `components/admin/EmailBatchSendDialog.tsx` (ClModal + ClButton only, no custom overlays): debounced search, role/consent selects, First-100 / Only-creators / Only-brands / Only-subscribers quick filters, checkbox list with select-visible toggle, Select-all-visible / Invert / Clear / 10-deep Undo, showing-X-of-Y, live send count. "Send to Selected…" button on `/admin/email-templates` (non-wired templates only).
- **QA:** `vitest` 442/442 (38 files; +11 new `email-batch` tests), `tsc --noEmit` clean, `next lint` 0 errors, `next build` green.

### 2026-10-08 — Referral discovery links + auth-agnostic claim + config-driven team hiring block
- **Referral discovery** — `/referrals` was reachable only by direct URL. It is now linked (all flag-gated on `features.referralsEnabled` + `referral.enabled`) from the Navbar, the Footer Platform section, an "Invite & earn" card on `/profile`, a shared `ReferralBanner` on both provider and client dashboards (`app/(auth)/dashboard/components/ReferralBanner.tsx`), and an invite CTA on `/leaderboard` (the referrals page already linked back to the leaderboard).
- **Auth-agnostic attribution** — the claim previously fired only from the `/register` step-2 submit, so OAuth sign-ins starting at `/login`, abandoned step-2 screens, cross-tab links, or a failed first request lost attribution. New `components/shared/ReferralClaimOnAuth.tsx` (mounted in `app/layout.tsx`) retries the idempotent claim once authenticated while the `crellab_ref` cookie survives; `POST /api/referrals/claim` additionally accepts a JSON `{ code }` fallback resolved by pure `resolveClaimCode()` in `lib/referral-cookie.ts` (cookie-first); `/login` fires a non-blocking claim after email sign-in. Points logic, self-referral block, and ACID degree-1/degree-2 writes are untouched.
- **Team hiring block** — the hardcoded "Want to be part of the team? … View Open Positions (href=#)" div on `/team` is now driven by the new `teamPage` config (`ITeamPageConfig` in `types/index.ts`, defaults in `config/platform.config.ts`, default CTA `/about` so it never dead-links) and editable from the `/admin/team` "Page settings" card (PATCH `teamPage.*` dotted keys via `PlatformConfigService`). Full URLs (`https://…`, `mailto:…`) open externally; backward compatible (defaults apply when no DB override exists).
- **QA:** `vitest` 431/431 (37 files; +7 new: `resolveClaimCode` + `teamPage` defaults; +1 platform-name-compliance allowlist entry for the new component's cookie doc comment), `tsc --noEmit` clean, `next lint` 0 errors, `next build` green.

### 2026-10-08 — Public-Pages Team/Webinars Re-verification (team empty-state fix)
- **Root cause of the empty `/team` page** — the page ran its `team_members` query inline in a server component with no `force-dynamic` flag, so Next statically prerendered the build-time (empty) result and admin additions never appeared until the next deploy. The `catch` fallback (`MockDataService.getTeamMembers()`) returns `[]` unless mock mode is on, so production showed the "Coming Soon" empty state even with rows in the table.
- **Fix** — new `services/TeamService.ts` (`listPublic` active-only + `normalizeSocialLinks` handling legacy `JSON.stringify`-stored rows + `serializeTeamMember`); `/team` now reads via the service with `export const dynamic = "force-dynamic"` and logs DB errors; new public `GET /api/team` (same read path, mock fallback only in mock mode). `force-dynamic` also added to `/about`, `/how-it-works`, `/home`, and `/` (all do direct-DB reads in server components — same stale-prerender hazard; about/how-it-works were masked by their hardcoded fallbacks). `scripts/seed.ts` now stores `socialLinks` as native jsonb arrays. Webinars/blog/leaderboard/explore re-verified with no change needed (already `force-dynamic` or client-fetched; `WebinarService.listPublic` correctly gates `active=true` + derived phase).
- **QA:** `vitest` 424/424 (35 files; +6 TeamService tests), `tsc --noEmit` exit 0, `next lint` 0 errors, `next build` green with `/`, `/home`, `/about`, `/how-it-works`, `/team`, `/blog`, `/leaderboard`, `/webinars`, `/api/team` all `ƒ` (dynamic).

### 2026-10-08 — Cover-Visible-Everywhere (content views + portfolios)
- **Covers surface as content, avatars never do** — `lib/portfolio.ts` gains pure `isImageCoverUrl` / `coverMimeType` / `buildCoverFallbackItem` (deterministic `cover-<providerId>`, `orderIndex: -1`) / `withCoverFallback` (blank/already-present → no-op). Write path: `reconcileAsset(cover)` also ensures the visible DIRECT portfolio item (advisory); `/api/profile/setup` orphan-rescue skips `avatarUrl`; setup + backfill cover-repair are photo-aware (correct image mime, self-thumbnail). Read path: public portfolio page + `GET /api/explore/portfolio` (filter-aware first-page fill) merge a missing cover; `ExploreService` counts a lone cover in `portfolioCount` and falls back to a cover-derived tile thumbnail. No schema/migration/route changes.
- **QA:** `vitest` 418/418 (34 files; +8 cover-fallback, +2 backfill photo/already-attached), `tsc --noEmit` exit 0, `next lint` 0 errors.

### 2026-10-08 — Residual Risks: Leaderboard Pagination + Orphan Backfill
- **Leaderboard pagination optimisation** — `services/LeaderboardService.ts`: neutral (user-agnostic) ranking cached 30s (`BOARD_CACHE_TTL_MS`, keyed by `buildBoardCacheSignature` so admin factor/weight changes bust it); candidates loaded in `CANDIDATE_BATCH_SIZE` (1000) chunks; `applyCurrentUserContext()` stamps `isCurrentUser` + `currentUserRank`/`currentUserScore` per request so the shared cache never leaks identity. `GET /api/leaderboard` sends `Cache-Control: public, s-maxage=30, stale-while-revalidate=60` + `?refresh=true` bypass. `LeaderboardClient` keeps a per-page cache (instant revisit + background revalidate), prefetches the next page, and shows a "You are ranked #N of M" banner with jump-to-rank when signed in. Additive fields only — existing consumers unaffected.
- **Orphan backfill (explicit admin action)** — `MediaAssetService.backfillOrphans({limit, dryRun})` + pure `partitionBackfillCandidates()` attach every unreferenced ACTIVE asset whose owner still owns a provider profile as a visible DIRECT portfolio item (idempotent by URL; provider-less/ownerless rows counted as skipped, never guessed). `POST /api/admin/media/backfill` (ADMIN, audit-logged) + "Backfill orphans" button with dry-run preview dialog on `/admin/media`. Never automatic — per-asset `reconcileAsset` remains the path for ambiguous rows. Resolves the "pre-existing orphans don't auto-backfill" residual risk without violating the deliberate-reconcile decision.
- **QA:** `vitest` 407/407 (33 files; +5 leaderboard cache/context tests, +3 backfill tests), `tsc --noEmit` exit 0, `next lint` 0 errors.

### 2026-10-08 — Leaderboard Zero-Scores + Explore Content Parity + Upload→Portfolio Attach
- **Leaderboard keeps zero-score members** — `services/LeaderboardService.ts`: `scoreLeaderboard()` no longer drops `score <= 0` rows (newcomers rank below positive scores by the deterministic `userId` tie-break) and `getBoard()` scores **all** registered members via `loadAllCandidates()` instead of unioning only users with positive factor raws. Board stays populated from day one.
- **Explore content view mock parity** — `app/api/explore/portfolio/route.ts` now serves `MockDataService` gallery items (mock providers × `getMockPortfolioItems`, enriched with provider name/slug/avatar/category/location/verified/featured) when `NEXT_PUBLIC_MOCK_DATA=true`, mirroring `GET /api/explore`. Previously providers view showed mock providers with `portfolioCount > 0` while content view returned `[]` — the impossible empty state. DB errors are now logged (`console.error`) instead of failing silently.
- **Uploads attach to portfolios** — new `PortfolioService.attachUploadToProvider(ownerUserId, asset)` (provider lookup + idempotent `addItem`, `null` when the uploader owns no provider); called best-effort (never fails the upload) from `/api/media/upload`, `/api/media/confirm`, and per-file in `/api/media/batch-upload`. Uploads previously landed only in `media_assets` as unlinked rows, so portfolios and the explore content view stayed empty. New `POST /api/portfolio/items` (provider/admin, `mediaAssetId` or raw `url`+`mimeType`, idempotent, ownership-checked) for manual library→portfolio attaches. `/profile/media` invalidates `my-portfolio` after upload; public profile shows an honest "No work published yet" block instead of a silent gap when the portfolio is empty.
- **QA:** `vitest` 399/399 (33 files; +2 leaderboard zero-score tests, 1 expectation updated), `tsc --noEmit` exit 0, `next lint` 0 errors.

### 2026-10-08 — Verify-Work Test-Green (non-breaking)
- **`lib/media.ts`** — oversize-file reason restored to `"File too large: …"` (keeps per-file-limit detail). The `"too large"` substring is a de-facto contract: `__tests__/media.test.ts` asserts it and `app/api/media/*` + `MediaUpload.tsx` branch on it.
- **`__tests__/services/BlogPostService.test.ts`** — `adminList` expectations now `getFallbackPosts().length + 1`: the service intentionally merges DB rows over fallback posts, so a length-1 expectation was stale, not a code bug. No production change.
- **QA:** `vitest` 398/398, `tsc --noEmit` exit 0, `next lint` 0 errors. No architecture drift — docs deep-synced (`repo-map`, `dependency-graph`, `project-plan`, `dev-history`, `lessons-learned`, `test-results`).

### 2026-10-08 — Auth Cleanup + Explore Tiles + Team Management + SEO
- Phone removed from auth UI (login phone tab commented out; register already clean — phone was never wired to a backend).
- Explore tiles de-glitched (no img remount on carousel tick, scroll-stable timer, mount-on-view video with thumbnail underneath, no layout animations in masonry, capped stagger); "Cloudinary" sanitised from public UI/config ("Direct Uploads").
- Profile display-name backfilled after auth resolves; team admin gains direct avatar upload + platform select with custom option and icon rendering (`lib/social-platforms.ts` normalisation, backward compatible; `components/team/TeamSocialIcon.tsx`).
- 13 per-route `layout.tsx` SEO files (`lib/seo.ts buildSeoMetadata`); 6 new `social-platforms` tests. QA at the time: 395/398 (the 3 failures resolved in the test-green session above).

### 2026-10-01 — Growth & Reliability Sprint (F1–F9)
- **F1 Founding-100 badge** — `services/EarlyMemberService.ts` computes registration rank with `ROW_NUMBER() OVER (ORDER BY created_at, id)` (window function, no schema change, `unstable_cache` tag `early-members`); `components/shared/EarlyMemberBadge.tsx` in Navbar + profile; `GET /api/early-access`; `firstHundred` config.
- **F2 Referrals + leaderboard** — new tables `referral_codes`, `referral_events` (migration `0007_referrals_and_error_context.sql`); `services/ReferralService.ts` issues codes and writes degree-1/degree-2 events in one ACID transaction with an idempotent cookie claim (`lib/referral-cookie.ts`, `components/shared/ReferralCapture.tsx` mounted in the root layout, claim hook on `/register`); routes `GET /api/referrals/me`, `POST /api/referrals/claim`, authed `/referrals` page.
- **F2/F7 Public leaderboard** — `services/LeaderboardService.ts` factor registry (`LeaderboardFactor` = key/label/weight/collect) with four factors: `referrals` (SUM points), `portfolio` (visible item count), `bookings` (count), `ratings` (`AVG(rating) × ln(1 + count)`); `leaderboard.factors.*` config toggles/weights them; `GET /api/leaderboard`; public `/leaderboard` with a "How scoring works" transparency panel (labels, descriptions, weights — no private data; display name + avatar only).
- **F3 Countdown widget** — `lib/countdown.ts` + `lib/countdown-icons.ts` (curated lucide allowlist), `components/shared/CountdownWidget.tsx` + `CountdownSlot.tsx` (framer-motion, `prefers-reduced-motion` gate, mount-gated tick for hydration safety), slots on landing + explore, admin editor at `/admin/countdown` (saved as the single atomic key `countdown.widgets`).
- **F4 Error-boundary bug reporting** — `lib/error-log-buffer.ts` (console ring buffer) + `lib/sanitize-error.ts` (redaction + 8 KB cap); `components/error/ErrorReportDialog.tsx` + `GlobalErrorCatcher.tsx` (`window.onerror` + `unhandledrejection`, non-blocking), route boundary `app/error.tsx` (Continue via `reset()`) and root `app/global-error.tsx`; handoff to `/bug-report` via `sessionStorage` (not query strings — stacks exceed URL limits); `POST /api/bug-report` re-sanitises and stores `error_context` on `bug_reports`; admin triage block on `/admin/bug-reports`.
- **F5 Landing stats** — `services/PlatformStatsService.ts` cached aggregates with a null → `fallbackValue` degradation path; `landingStats.items.{id}` keyed-record config; `LandingContent` iterates config instead of the hardcoded 1.2k/5k/4.9 figures.
- **F6 Back-to-top** — `components/shared/ScrollToTopButton.tsx` mounted once in the root layout (`scrollToTop` config); the explore page's inline FAB removed.
- **F8 Webinars** — new tables `webinars`, `webinar_registrations` (unique `(webinar_id, lower(email))` + partial unique `(webinar_id, user_id)`); `services/WebinarService.ts` registers via unique-index **upsert** (dedupe without a pre-read race); `GET /api/webinars`, `POST /api/webinars/[id]/register` (guest + auth, zod, marketing consent stored on the row), admin CRUD at `/api/admin/webinars` (+`[id]`) and `/admin/webinars`; public `/webinars` (upcoming registration, past recordings/content blocks); wired `webinarRegistration` confirmation email.
- **F9 Platform-name compliance** — `lib/platform-copy.ts` (`PLATFORM_NAME_TOKEN`, `fillPlatformName`) resolves display copy from `config.name`; module-scope constants carry the `{{name}}` token; explicit infrastructure allowlist; `__tests__/platform-name-compliance.test.ts` fails the build on any `Crelab|CreLab|Crellab` outside the allowlist.
- **Shared foundation** — 8 config keys + `features.referralsEnabled`/`features.webinarsEnabled` in `config/platform.config.ts`, types in `types/index.ts`, "Growth" section in `app/admin/config/page.tsx`, Navbar/Footer flag-gated links, AdminSidebar countdown/webinars entries, three root-layout mounts (`ReferralCapture`, `GlobalErrorCatcher`, `ScrollToTopButton`).
- **QA gate:** `npx tsc --noEmit` 0 errors; `npm run lint` 0 errors; `npm run build` exit 0 (routes: `/leaderboard`, `/referrals`, `/webinars`, `/admin/countdown`, `/admin/webinars`, `/bug-report`, `/api/webinars`); `npx vitest run` 389/392 (3 pre-existing failures at HEAD: `media.test.ts` file-size case + 2 `BlogPostService.test.ts` adminList resilience cases).
- **Residual risk:** migration `drizzle/migrations/0007_referrals_and_error_context.sql` is written but **not applied** (journal untouched past `0002`; repo convention is manual application on Supabase). Until applied, referral/webinar code fails at runtime against a live DB. Nothing committed — all changes are uncommitted in the working tree.

### 2026-08-13 — Wired Email Templates + Blog Post Management + Admin Responsive Fixes
- `lib/email-templates.ts` (new): `WIRED_EMAIL_TEMPLATES` registry — welcome / verifyEmail / emailChanged / bookingConfirmation / paymentReceived / passwordReset, each with `label` + `trigger` (the user event that fires it) + `isWiredEmailTemplate(key)`. These emails are owned by code paths, so they are preview + simulate ONLY.
- `/api/admin/email/send`: wired keys rejected for test-send AND broadcast. `/admin/email-templates`: wired badge + Zap icon, Simulate button (`useEmailSimulation`) in place of Send Test / Send to Subscribers, trigger info banner, sendDialog reset on template select.
- Password reset wired: `passwordReset` template in `DEFAULT_CONFIG`; Better Auth `emailAndPassword.sendResetPassword` → `sendTransactionalEmail`; `{{resetUrl}}` added to sample vars + editor variable list.
- Blog post management: `blog_posts` table (`0005_blog_posts.sql` — slug unique index, `(published, published_at)` + `category` indexes, jsonb content/tags), `services/BlogPostService.ts` (list/getBySlug/getRelated/getAllSlugs/adminList/getById/create/update/remove; merges DB → Sanity → fallback, deduped by slug, admin/DB wins), `/api/admin/blog-posts` (+`/[id]`), `/admin/blog-posts` page (ClDataTable + modal editor: live slugify, tags, meta description, publish toggle, confirm delete), `components/admin/ImageUploadField.tsx` (Cloudinary upload + paste-URL fallback) for the hero image.
- Public blog now reads via `BlogPostService`; `/blog/[slug]` renders `EmailTemplateBlock[]` content (blocks) or Sanity portable text (ArticleBody) by shape detection; `components/blog/BlogCard.tsx` + `app/sitemap.ts` use `getAllSlugs`; `lib/blog-hero.ts` `getPostHeroUrl` resolves plain URLs or Sanity `image-` refs.
- Admin sidebar: collapse toggle hidden on mobile (`hidden lg:block`) — mobile uses the hamburger overlay drawer only; "Blog Posts" nav item (PenSquare).
- Responsive fixes: `/admin/config` change log renders nested values via `formatChangeValue()` (JSON) with `break-words`/`min-w-0` columns; `ConfigField` refactored to a `fieldControl` variable, stacks on mobile, `min-w-0`/`break-words`.
- Tests: `__tests__/lib/email-templates.test.ts`. QA gate: typecheck clean, 206/206 tests, build green.

### 2026-08-13 — Email Logo/Preview Image Resolution via the URL Util
- `lib/url.ts`: `resolveUrlForRender(value)` (relative → absolute, leaves `{{tokens}}` + absolute/protocol-relative/data/mailto/# untouched) + `resolveRelativeUrlsInHtml(html)` (rewrites relative `img src`/`a href` in a rendered HTML blob). Both run AFTER token substitution so the origin is resolved at render time — preview client-side, send server-side — never baked at edit time.
- `lib/email-blocks.ts`: `substituteSampleVars()` resolves relative URLs after substitution; new `previewVarsFor(config)` builds preview vars from the configured `name`/`logoPath`.
- `app/admin/email-templates`: Preview tab uses `previewVarsFor(loaded config)` — the preview now captures the admin-configured logo.
- `services/EmailService.ts`: `send()` resolves relative URLs in the final HTML; `sendWelcome()` uses `resolveAbsoluteUrl("/explore")` for exploreUrl (was `${NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/explore`).
- `components/blog/ContentBlocks.tsx`: image/button URLs via `resolveUrlForRender`.
- Tests: `email-blocks.test.ts` (+5) + `config-helpers.test.ts` (+3). QA gate: typecheck clean, lint 0 errors, 201/201 tests, build green.

### 2026-08-13 — Admin UX (Collapsible Sidebar + Reusable Table/Pagination) + Email/Blog Content Editing
- `components/ui/ClDataTable.tsx` + `ClPagination.tsx` (new): config-driven reusable table (`ClColumn<T>[]` — custom render, `hideOnMobile`, checkbox columns; client-side pagination with `useEffect` page-clamp when the dataset shrinks; horizontal scroll; zebra rows; empty state) + pagination control (first/prev/next/last, ellipsis, "Showing x–y of z"). Adopted by `users`, `media` (batch select), `providers`, `team`, `categories`, `config` (change log) admin pages.
- `components/admin/AdminShell.tsx` (new) + `AdminSidebar.tsx` rewrite: collapsible sidebar — `collapsed` prop gives a 72px icon-only rail, `mobileOpen` gives a drawer with backdrop; collapse persisted to localStorage `admin-sidebar-collapsed`; `app/admin/layout.tsx` renders the shell with `lg:ml-[240px]`/`lg:ml-[72px]` main offset. Responsive page headers (flex-wrap) across admin pages.
- Email h1 colour: all 5 default template h1s in `config/platform.config.ts` + the `heading` block serializer default to `#E8FF47`.
- `{{name}}` fix: preview-only root cause — `SAMPLE_EMAIL_VARS.name` was hardcoded `"Ada Okafor"` (identical to `userName`); `EmailService.send` already forces `name: cfg.name`. `SAMPLE_EMAIL_VARS.name` = `DEFAULT_CONFIG.name`, sample `logoUrl` = `resolveAbsoluteUrl(DEFAULT_CONFIG.logoPath)`.
- `logoUrl` hardening: `appOrigin()` in `lib/url.ts` now normalises trailing slashes / `//`. Production cause is most likely `NEXT_PUBLIC_APP_URL` set to `http://localhost:3000` (or unset) in the deployed Vercel runtime env — server code reads it at runtime.
- `types/index.ts`: `IEmailTemplate.name?` + `IBlogConfig.sections?` (`EmailTemplateBlock[]`). `/admin/email-templates` now shows an editable template name in the sidebar + header.
- Blog sections builder: generic `components/admin/ContentBlocksEditor.tsx` (shared add/remove/reorder block UI) reused by `EmailTemplateBlocksEditor.tsx` (thin email wrapper) and a new "Content Sections" card on `/admin/blog-templates` (writes `IBlogConfig.sections`); `components/blog/ContentBlocks.tsx` renders sections on the blog page via `BlogPageClient`.
- Tests: `__tests__/lib/email-blocks.test.ts` (6 tests). QA gate: typecheck clean, lint 0 errors (pre-existing warnings only), 193/193 tests, production build (72 static pages).

### 2026-08-13 — Config Persistence, Email Verification, SEO Wiring, Admin User/Blog Management
- `services/PlatformConfigService.ts`: exported `setNestedValue(target, path, value)` — deep-sets dotted config keys (e.g. `emailConfig.templates`, `features.guestBrowse`) when merging DB rows in `get()`; null values skipped so defaults never clobbered (fixes admin edits not round-tripping)
- `lib/url.ts` (new): `appOrigin()` (NEXT_PUBLIC_APP_URL → VERCEL_URL → http://localhost:3000) + `resolveAbsoluteUrl()` (prefixes relative paths with origin, leaves http/https/`//` unchanged)
- `lib/seo.ts` (new): `buildSeoMetadata(config, options)` — config-driven Next.js Metadata builder with absolute logo og:image + canonical URL + twitter card + noindex; used by `app/layout.tsx` + per-page metadata (blog, blog/[slug], team, privacy, terms, search, [category], profile/[slug])
- `lib/email-blocks.ts` (new): `blocksToHtml(blocks)` serializes `EmailTemplateBlock[]` to inline-styled email HTML; `substituteSampleVars()` + `SAMPLE_EMAIL_VARS` for previews
- `types/index.ts`: added `EmailTemplateBlock`, `IEmailTemplate.blocks?`, `IBlogConfig` + `IBlogNewsletterConfig`
- `config/platform.config.ts`: added `blogConfig` (heroTitle, heroSubtitle, newsletter, footerTagline) + `verifyEmail` + `emailChanged` email templates
- Email verification architecture: Better Auth `emailVerification` (sendOnSignUp false, autoSignInAfterVerification true, expiresIn 3600, custom sendVerificationEmail via `sendTransactionalEmail`) + `user.changeEmail.enabled`; `/api/verify-email/send` + `/api/verify-email/welcome`; `/verify-email` public page with 60s cooldown; `useAuth.signUp` now POSTs `/api/verify-email/send` (Google signups pre-verified → welcome fires immediately from register page)
- Admin email templates: Visual/HTML/Preview tabs + `EmailTemplateBlocksEditor` block builder + create-new-template modal + test-send/"Send to Subscribers" via `/api/admin/email/send`
- Blog: config-driven hero title/subtitle + newsletter section on blog page; `/admin/blog-templates` editor; `/api/newsletter` grants MARKETING consent
- Admin user management: `/api/admin/users` + `/api/admin/users/[id]`, `/admin/users` page
- UI: `ClBackButton` (hydration-safe history.back + fallback href) placed across profile/bookings/wallet pages; Navbar Profile + Admin links; profile page at `/app/(auth)/profile/`

### 2026-08-12 — Cloudinary Asset Lifecycle (Close-Out Documentation)

N/A — no code changes this session. Close-out only: the asset-lifecycle implementation (shipped 2026-08-11 in commit `2f927df`) had never been documented. Documented `services/MediaAssetService.ts` (registry-driven lifecycle), the `media_assets` table (`0004_media_assets.sql`), `/admin/media` + `/profile/media` pages, admin/user media API routes, `ClConfirmDialog` + `lib/use-undoable.ts` reusable destructive-action primitives, and the `mediaUpload.cleanupEnabled`/`cleanupOrphanAfterHours` config keys. `repo-map.md`, `dependency-graph.md`, `project-plan.md`, `task-queue.md`, `dev-history.md`, `lessons-learned.md`, `test-results.md` reconciled; `ai-system/in-progress.md` cleared.

### 2026-08-12 — Cron Auth Header Alignment + media-cleanup Scheduling
- `app/api/cron/{escrow,milestones,media-cleanup}/route.ts`: header verification changed from custom `x-cron-secret` to `Authorization: Bearer <CRON_SECRET>` — matching what Vercel Cron actually sends when `CRON_SECRET` is set (previously only `drive-sync` matched, so the other three jobs always returned 401)
- `vercel.json`: `/api/cron/media-cleanup` added at `10 0 * * *` (was implemented but never scheduled)
- `.env.example`: `CRON_SECRET` guidance now documents the single Bearer scheme
- Also updated `repair-system.md`, `testing/test-results.md`, `planning/task-queue.md`, `summaries/dev-history.md`

### 2026-08-11 — Integrations Operational Readiness (Cloudinary + Resend)
- `config/platform.config.ts`: added `features.emailNotifications: true` default — previously `/api/email/*` short-circuited "Email notifications disabled" even with `RESEND_API_KEY` set
- `services/EmailService.ts`: added `isResendConfigured()` / `getResendConfig()` (mirrors `lib/cloudinary.ts` `isCloudinaryConfigured()`); subject now also receives `name`/`logoUrl` so `{{name}}` in subjects resolves
- `app/api/email/status/route.ts` (new): public health route mirroring `/api/media/status` — enabled flag, `resendConfigured` (feature flag AND `RESEND_API_KEY`), from address/name, enabled template list
- `__tests__/services/EmailService.test.ts` (new): 11 tests — configure guard, preview fallback, variable substitution, disabled/unknown template, Resend API success/error/throw paths
- `.env.example`: added `RESEND_API_KEY` and `CRON_SECRET` (the only env vars referenced in code that were missing)

### 2026-08-11 — Dashboard "Unauthorized" for Authenticated Users (Fix Build)
- `lib/auth.ts`: `getSession()` previously called `auth.api.getSession({ headers: new Headers() })` — an empty Headers object meant Better Auth never saw the request cookies, so every `requireAuth()` guard (dashboard, wallet, wallet/milestone API routes) threw `Unauthorized` even for signed-in users. Now reads the current request headers via `await headers()` from `next/headers` and forwards them (same pattern as `app/admin/layout.tsx` and consent/export/delete API routes).

### 2026-08-09 — Provider & Client Dashboards
- `types/dashboard.ts` (new): `IProviderDashboard`, `IClientDashboard`, `IDashboardStat`, `IDashboardPipelineColumn`, `IDashboardAvailabilitySlot`, `IPortfolioPerformanceRow`, `IClientPaymentRecord`, `IProfileCompleteness` — re-exported from `types/index.ts`
- `services/DashboardService.ts` (new): role-aware dashboard query layer — provider stats/earnings (kobo), 4-column booking pipeline, completeness profile, availability slots (config-driven lookahead), client payment history, discover rail; static `PROVIDER_COLUMNS` / `CLIENT_COLUMNS` hold the pipeline stage→status mappings; MockDataService fallback when DB unavailable
- `services/MockDataService.ts`: added `getMockProviderDashboard`, `getMockClientDashboard`, `getMockAvailability`, `getMockPortfolioPerformance`, `getMockWorkHistoryForProvider`
- `app/api/dashboard/route.ts` (new): single authenticated endpoint serving either role's dashboard payload
- `app/(auth)/dashboard/page.tsx` (new) + `DashboardClient.tsx` + `components/` (ProviderDashboardView, ClientDashboardView, PipelineColumn, StatCard, ProfileCompleteness, AvailabilityCalendar, PaymentHistoryList, DiscoverRail): role-switching via `useRole`, refetch on role change
- `components/shared/Navbar.tsx`: brand + Dashboard link now render for authenticated users in both nav variants
- `config/platform.config.ts`: `dashboard.availabilityLookaheadDays` + `dashboard.quickActions` config keys (DB-overridable)
- `__tests__/services/DashboardService.test.ts` (new): 15 tests — column definitions (each status maps to exactly one provider stage, active statuses covered on client side), mock dashboard shapes, kobo integer invariants, sorted payment history, empty-safe fallback shapes
- `tsconfig.json`: removed removed-in-TS7 `baseUrl` (paths already resolve relative to tsconfig)

### 2026-08-09 — Alpha Testing Feedback Fixes
- `lib/currency.ts` (new): `nairaToKobo` / `formatNaira` / `formatKobo` — single money conversion point; onboarding review preview no longer ×100's entered naira
- `lib/slug.ts` (new): `buildProviderSlug` / `parseProviderSlug`; profile page resolves slugs with prefix `LIKE` + last-`--` parsing (fixes 404 for real UUID providers); sitemap separator corrected
- `lib/cloudinary.ts`: env read at call time, `isCloudinaryConfigured()`, `CloudinaryNotConfiguredError`, server-side `uploadFile()`; `lib/media.ts` (new): type/size/URL validation helpers
- `app/api/media/upload/route.ts` (new): authenticated, config- and env-gated upload; `app/api/media/status/route.ts` (new): public upload capability status
- `components/profile/MediaUpload.tsx` (new): "Upload your work or provide a link" — Cloudinary upload tab + paste-link tab with graceful fallback
- `components/profile/DriveConnectSettings.tsx`: `mode="collect"` for onboarding (validate + save URL only; live sync needs an existing provider)
- `app/api/profile/setup/route.ts`: server-side Drive ingest after provider creation (non-fatal), package validation, uses shared slug builder
- `app/(auth)/profile/setup/page.tsx`: step 4 uses MediaUpload + collect Drive; success/warning toasts on publish

### 2026-08-05 — Google OAuth in Sign-Up + Onboarding Handoff
- `lib/oauth.ts` (new): callback URL constants, OAuth return detection, self-assignable role guard (CLIENT/PROVIDER only), open-redirect-safe post-signup route resolution
- `app/(auth)/register/page.tsx`: "Continue with Google" button + divider; `?oauth=done` callback handling; new Google users finish role/consent step then move to `/profile/setup` (provider) or `/explore` (client) — matching the email/password flow
- `app/(auth)/login/page.tsx`: Google button now sends new users to the register finalize screen and existing users straight to `/explore`
- `hooks/useAuth.ts`: `signInWithGoogle()` accepts `{ callbackURL, newUserCallbackURL, errorCallbackURL }`
- `app/api/auth/role/route.ts` (new): authenticated users may self-assign CLIENT/PROVIDER (ADMIN blocked); also wired into the email/password register flow so providers get `role = PROVIDER` in DB
- `__tests__/oauth.test.ts` (new): 12 tests for oauth helpers

### 2026-07-28 — Mock Fallback & Blog Fallback
- `NEXT_PUBLIC_MOCK_DATA=true` in `.env` — explore, profile, team, and bookings pages now use mock data when DB is unavailable
- `lib/blog-fallback.ts` — hardcoded blog posts that render when Sanity CMS is unavailable (Sanity env vars not yet configured)
- Profile page (`app/(public)/profile/[slug]/page.tsx`) — all DB queries wrapped in try/catch with MockDataService fallback
- Seed script expanded to include `team_members` table

### 2026-07-29 — UI Consolidation & Email Infrastructure
- `ClLogo` component: config-driven logo rendering (full/icon/auto variants, optional name display), replaced all inline Image+name patterns
- `ClErrorState` / `ClEmptyState`: reusable global error and empty state components, replaced inline definitions in ExploreGrid, BlogPageClient, TeamPage
- `ClPasswordInput`: password input with visibility toggle (Eye/EyeOff icons), used in login + register pages
- `ThemeToggler`: now accepts `displayMode` prop (`text`/`icon`/`both`) with lucide icons (Monitor/Sun/Moon)
- `EmailService`: Resend-based transactional email service with simulation fallback when `RESEND_API_KEY` is absent
- Email templates: config-driven via `platformConfig.emailConfig.templates`, admin-editable at `/admin/email-templates`
- API endpoints: `POST /api/email/welcome`, `POST /api/email/send` for transactional emails
- Welcome email wired into signup flow via `useAuth` hook
