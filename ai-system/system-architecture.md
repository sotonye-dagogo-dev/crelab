# System Architecture

> **Metadata**
> - last-updated-by: update-ai-system (Session 27)
> - last-verified-against-code: 2026-08-13
> - staleness-policy: re-verify before trusting if any architecture-affecting commits have been made since last-verified-against-code

> **Overview:** Crelab is a metadata-driven, config-first creative services marketplace. Architecture follows a layered Next.js App Router pattern with OOP class-based services, interface-first TypeScript, and ConfigContext-driven runtime overrides.

---

## Architecture Diagram

```
Client (Browser)
    |
    v
Next.js App Router (app/)
    |-- (public)  -- Guest: Landing/Explore, Category Browse, Search, Profiles, Blog, Verify-email
    |-- (auth)    -- Authenticated: Dashboard, Bookings, Messages, Profile, Profile Edit
    |-- (admin)   -- ADMIN role: Config editor, Categories, Disputes, Media, Email Templates, Blog Templates, Blog Posts, Users
    |-- api/      -- Route handlers: Auth, Bookings, Portfolio, Webhooks, Cron, Admin
    |
    v
Service Layer (services/)
    |-- BookingService          -- Booking lifecycle (REQUESTED -> RELEASED/REFUNDED)
    |-- EscrowService           -- Escrow state machine (PENDING -> HELD -> IN_PROGRESS -> RELEASED/DISPUTED)
    |-- PortfolioService        -- Portfolio CRUD, reorder, hide/show
    |-- DriveService            -- Google Drive folder sync, validate, ingest
    |-- PaymentService          -- Paystack integration, subaccount split
    |-- PlatformConfigService   -- Config CRUD with DB override + cached reads
    |-- ExploreService          -- Provider search, filter, sort, cursor pagination
    |-- DashboardService        -- Role-aware Provider/Client dashboards (pipeline, stats, availability, payments)
    |-- WalletService           -- Wallet CRUD, topup, debit, credit, withdrawal, DVA
    |-- MilestoneService        -- Milestone lifecycle (create, fund, submit, approve, dispute)
    |-- MediaAssetService       -- Media asset registry: record uploads, list by owner/all, referenced-URL scan, orphan cleanup, delete, replace
    |-- MockDataService         -- Mock data fallback when DB unavailable
    |-- EmailService            -- Resend transactional emails (isResendConfigured guard + preview fallback + verify/email-changed/sendTemplate + password reset)
    |-- BlogPostService         -- Blog post CRUD + DB→Sanity→fallback merge (admin/DB posts win, dedup by slug)
    |
    v
Data Access Layer
    |-- Drizzle ORM (drizzle/schema.ts + migrations)
    |-- Supabase RLS (row-level security on all tables)
    |
    v
Data Stores
    |-- PostgreSQL (Supabase)     -- Primary DB: users, bookings, payments, etc.
    |-- Sanity CMS                -- Blog content, creator spotlights
    |-- Cloudinary                -- Video/image upload, thumbnails
    |-- Mux                       -- Video streaming
    |-- Paystack                  -- Payment processing, subaccount splits
```

---

## Module Breakdown

| Module | Responsibility | Key Files | Dependencies |
|--------|---------------|-----------|--------------|
| Public Routes | Guest-accessible pages: landing/explore, category browse, profile/[slug], search, blog, verify-email | `app/(public)/` | Components, Services |
| Auth Routes | Authenticated pages: dashboard, booking, profile (page/setup/media), register, login | `app/(auth)/` | AuthGate, Services |
| Admin Routes | ADMIN-only: config editor, category manager, provider queue, disputes, media, email templates, blog templates, users | `app/admin/` | requireRole('ADMIN'), Services |
| API Routes | Backend handlers: auth, explore, bookings, portfolio, profile, admin, verify-email, newsletter, webhooks, cron | `app/api/` | Services, Lib |
| UI Wrappers | Cl* wrappers around shadcn/ui primitives | `components/ui/` | shadcn/ui, Tailwind |
| Feature Components | Domain-specific UI: explore cards, profile sections, booking drawer, admin panels | `components/` | UI Wrappers, Types |
| Services | Business logic: booking, escrow, payment, portfolio, drive, media assets, config, explore, email | `services/` | Lib, Types, Drizzle |
| Types | Global TS interfaces: entities, API responses, enums, explore types, email template blocks | `types/` | None |
| Config | Platform config with DB override capability | `config/` | Types |
| Lib | Third-party wrappers + shared utilities: auth, db, paystack, cloudinary, drive, consent, config-context, toast, url, seo, email-blocks | `lib/` | SDK packages |
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
4. Email/password signup: emailVerification plugin with sendOnSignUp=false — signUp POSTs
   /api/verify-email/send (callbackURL "/verify-email?done=1") instead of the welcome email;
   welcome email is deferred until verification succeeds
5. Better Auth stores session in Supabase adapter (httpOnly cookies)
6. Next.js middleware checks session on protected routes (incl. /profile)
7. Server components use getSession() / requireAuth() / requireRole()
8. Client-side: useAuth() hook provides { user, role, isAuthenticated, signIn, signInWithGoogle, signOut, sendVerificationEmail, changeEmail }
```

### Email Verification Flow
```
1. Email/password signup -> useAuth.signUp() POSTs /api/verify-email/send
   -> auth.api.sendVerificationEmail({ callbackURL: "/verify-email?done=1" })
2. /api/verify-email/send invokes custom sendVerificationEmail -> sendTransactionalEmail("verifyEmail", ...)
   -> EmailService.sendVerifyEmail() (resolves logo absolute via lib/url resolveAbsoluteUrl)
3. User clicks link -> Better Auth marks user.emailVerified=true, auto-signs-in (autoSignInAfterVerification)
4. /verify-email page (public) shows verify/resend form with 60s cooldown
5. With ?done=1 -> page fires POST /api/verify-email/welcome, which reads the session user
   and — only when emailVerified — sends the welcome email exactly once
6. Google signups are pre-verified and fire the welcome email immediately from the register page
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
3. Wired (code-triggered) templates — welcome / verifyEmail / emailChanged / bookingConfirmation / paymentReceived / passwordReset (lib/email-templates.ts WIRED_EMAIL_TEMPLATES, each with a trigger description):
   -> preview + Simulate ONLY (useEmailSimulation) — badge + Zap icon + trigger banner in the admin
   -> /api/admin/email/send rejects wired keys for test-send AND broadcast (content/timing owned by code, not the operator)
   -> passwordReset fired by Better Auth emailAndPassword.sendResetPassword -> sendTransactionalEmail ({{resetUrl}} var)
4. Admin-created (non-wired) templates: test-send + "Send to Subscribers" broadcast to MARKETING-consented users -> POST /api/admin/email/send -> EmailService
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
3. Cloudinary unavailable: upload tab hidden, paste-link tab offered ("Direct upload is temporarily unavailable")
4. Pasted URLs (Drive link or any public link) validated with isValidMediaUrl()
5. Cover video / avatar URLs stored via onboarding state -> /api/profile/setup -> providers.coverVideoUrl / avatarUrl
6. Drive folder during onboarding is collect-only; DriveService.ingestFolder() runs server-side after provider creation
```

### Media Asset Lifecycle (Cleanup + Admin/User Management)
```
1. Every upload records a row in media_assets (publicId, cloudName, assetId, uploaderId, url, thumbnailUrl, mimeType, sizeBytes, status)
2. GET /api/media/assets (own list), DELETE /api/media/assets/[id], POST /api/media/assets/[id]/replace (swap references + delete old binary)
3. Admin: GET /api/admin/media (all assets) + manual "Run cleanup" + DELETE /api/admin/media/[id] (with ClConfirmDialog)
4. Daily cron: /api/cron/media-cleanup scans media_assets for rows older than mediaUpload.cleanupOrphanAfterHours whose publicId is not referenced in providers/portfolio_items -> Cloudinary deleteAsset() + row removal. Gated by mediaUpload.cleanupEnabled.
5. Delete clears references first (providers cover/avatar -> null; portfolio_items -> row removed) then deletes the Cloudinary binary. Irreversible at the binary level -> delete flows use ClConfirmDialog; reversible destructive actions (team member delete, portfolio removal) use useUndoable undo toasts
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
| EMAIL_CONFIG | emailConfig.templates (welcome, booking, payment, verifyEmail, emailChanged, passwordReset) + fromName/fromEmail | platform.config.ts | template defaults + from settings. Wired (code-triggered) templates are preview/simulate-only; admin-created templates can be sent/broadcast. Templates saved in DB are merged OVER hardcoded defaults (resolveEmailTemplates) so wired templates never silently drop. Sender defaults to a real address on a subdomain (`hello@mail.crellab.com`) — no no-reply; overridable via RESEND_FROM_NAME/RESEND_FROM_EMAIL |
| BLOG_CONFIG | blogConfig.heroTitle / heroSubtitle / newsletter / footerTagline — drives blog page hero + newsletter section, admin-editable at /admin/blog-templates | platform.config.ts | hero + newsletter defaults |
| NEXT_PUBLIC_APP_URL | Absolute origin for SEO canonical URLs + email logo links (falls back to VERCEL_URL, then http://localhost:3000) | .env | - |
| ENABLE_DESIGN_VIEWER | Mounts the dev-only design-asset viewer at `/__design/*`; must be false in production builds | .env | false |

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
