# Repository Map

> **Metadata**
> - last-updated-by: update-ai-system (Session 2026-10-08 — residual-risks: pagination + backfill)
> - last-verified-against-code: 2026-10-08
> - staleness-policy: auto-regenerable — can be derived from `tree` command. Manual content only where intent cannot be derived from structure.

> **Overview:** Visual map of the Crelab project folder structure with purpose descriptions.

---

## Folder Structure

```
crelab/
├── __tests__/               # Vitest test files for all services + lib helpers
├── .env                    # Environment variables (DB, auth, Paystack keys, mock data toggle)
├── .env.example            # Template with all required vars (recommended defaults)
├── .github/                 # GitHub Actions workflows
├── .ai-system/              # AI-assisted development governance
├── app/                     # Next.js 15 App Router
│   ├── globals.css          # Global styles + CSS custom properties
│   ├── layout.tsx           # Root layout with PlatformConfigProvider + TanStack Query + 3 growth mounts (ReferralCapture, GlobalErrorCatcher, ScrollToTopButton)
│   ├── error.tsx            # Route-segment error boundary (Continue via reset() + Reload)
│   ├── global-error.tsx     # Root-layout error boundary
│   ├── page.tsx             # Landing / Explore (guest hero + filter bar + provider/content view toggle + infinite scroll grids; toggle + grids public, hero guest-only)
│   ├── robots.ts            # robots.txt generation
│   ├── sitemap.ts           # sitemap.xml generation
│   ├── (public)/            # Guest-accessible routes
│   │   ├── [category]/     # Category browse page
│   │   ├── about/          # About page (config-driven, admin manageable)
│   │   ├── blog/           # Blog index + [slug] article pages
│   │   ├── bug-report/     # Bug report form page (+ per-route SEO layout.tsx)
│   │   ├── explore/        # Explore page (creators + portfolio gallery views) (+ per-route SEO layout.tsx)
│   │   ├── how-it-works/   # How It Works page (config-driven with sandboxes/FAQ)
│   │   ├── leaderboard/    # Public leaderboard (podium + paginated table + "How scoring works" panel)
│   │   ├── privacy/        # NDPR-compliant privacy policy
│   │   ├── profile/[slug]/ # Provider public profile
│   │   ├── search/         # Search results
│   │   ├── team/           # Team members page (config-driven)
│   │   ├── terms/          # Terms of service
│   │   ├── verify-email/   # Email verification (verify/resend form + done state) (+ per-route SEO layout.tsx)
│   │   └── webinars/       # Public webinars (upcoming registration for guests + members, past recordings)
│   ├── (auth)/              # Better Auth gated routes
│   │   ├── bookings/       # Booking detail + list (+ per-route SEO layout.tsx)
│   │   ├── dashboard/      # Role-aware Provider/Client dashboard (+ per-route SEO layout.tsx)
│   │   ├── forgot-password/ # Password reset page (+ per-route SEO layout.tsx)
│   │   ├── login/          # Sign in page (email/password + Google OAuth; phone tab commented out) (+ per-route SEO layout.tsx)
│   │   ├── profile/        # Profile page, edit/setup + media asset manager (+ per-route SEO layout.tsx incl. media/setup)
│   │   ├── register/       # Sign up page (multi-step email/password + Google OAuth; referral cookie claim hook; no phone field) (+ per-route SEO layout.tsx)
│   │   ├── referrals/      # Authenticated referrals page (invite link, stats, degree breakdown)
│   │   └── wallet/         # Wallet page (balance, topup, withdraw, transactions) + payment-status callback (+ per-route SEO layout.tsx)
│   ├── admin/               # ADMIN role only
│   │   ├── page.tsx        # Dashboard
│   │   ├── layout.tsx      # Admin layout + collapsible sidebar shell (AdminShell) + per-route SEO metadata
│   │   ├── blog-templates/ # Blog config editor (hero/newsletter/footer tagline)
│   │   ├── blog-posts/     # Blog post manager (create/edit/publish/delete + hero image upload)
│   │   ├── categories/     # Category manager
│   │   ├── config/         # Platform config editor (incl. "Growth" section: firstHundred, referral, leaderboard, countdown toggle, landingStats, bugReport, scrollToTop, webinars)
│   │   ├── countdown/      # Countdown widget editor (list add/remove/reorder, datetime, icon allowlist, areas, live preview)
│   │   ├── disputes/       # Dispute resolution dashboard
│   │   ├── email-templates/ # Admin-editable email templates (Visual/HTML/Preview tabs)
  │   │   ├── media/          # Media asset manager (filters, preview, upload, reconcile orphan → portfolio/avatar/cover, backfill orphans bulk + dry-run, cleanup dry-run)
│   │   ├── providers/      # Provider review queue
│   │   ├── users/          # User management (search, role, verify, delete)
│   │   └── webinars/       # Webinar manager (CRUD, status/publish toggle, registration counts)
│   └── api/                 # Route handlers
│       ├── account/        # User account (consent, delete, export)
  │       ├── admin/          # Admin CRUD endpoints (+ /admin/media, /admin/media/[id], /admin/media/reconcile, /admin/media/backfill (bulk owner-matched rescue + dry-run), /admin/email/send, /admin/users, /admin/users/[id], /admin/blog-posts, /admin/blog-posts/[id], /admin/webinars, /admin/webinars/[id], /admin/providers?all)
│       ├── auth/           # Better Auth handler + self-assignable role endpoint
│       ├── bug-report/     # Bug report submission (re-sanitises + stores error_context)
│       ├── cron/           # Cron endpoints (drive-sync, escrow, milestones, media-cleanup)
│       ├── dashboard/      # Provider/Client dashboard payload
│       ├── early-access/   # Founding-100 status (rank + isTop100)
│       ├── explore/        # Provider search/filter/sort + portfolio gallery
│       ├── leaderboard/    # Public leaderboard rows (weighted factor scores + breakdown)
│       ├── milestones/     # Milestone CRUD
│       ├── media/          # Media upload (Cloudinary) + status + asset registry (list/delete/replace)
│       ├── email/          # Email send (welcome, booking, payment) + status health route
│       ├── newsletter/     # Newsletter subscribe (grants MARKETING consent for signed-in users)
│       ├── portfolio/      # Portfolio CRUD (+ items list, reorder, individual item PATCH/DELETE)
│       ├── profile/        # Profile management (setup)
│       ├── referrals/      # GET /referrals/me + POST /referrals/claim (idempotent cookie claim)
│       ├── verify-email/   # Verify-email: /send (sendVerificationEmail) + /welcome (fires welcome once verified)
│       ├── wallet/         # Wallet: topup (card + verify callback), withdraw, balance, transactions
│       ├── webinars/       # GET /webinars + POST /webinars/[id]/register (unique-index upsert)
│       ├── bookings/[id]/pay # Booking payment: wallet debit (atomic) or Paystack initiate with real client email + metadata
│       └── webhooks/       # Paystack webhook handler
├── components/
│   ├── ui/                  # Cl* wrappers around shadcn/ui (ClLogo, ClErrorState, ClEmptyState, ClPasswordInput, ClConfirmDialog, ClBackButton, ClDataTable, ClPagination)
│   ├── explore/            # ExploreFilterBar, ExploreGrid (scroll-stable, no layout anim), ExploreVideoCard (persistent VIDEO tag + halo, ordered display: avatar → portfolioThumbnails carousel on 3.5s interval → initials fallback; no img remount on tick; mount-on-view video), PortfolioGallery (scroll-stable)
│   ├── profile/            # ProviderHero, PortfolioGrid (with dedup + AssetLightbox video/pdf playback), ServicePackages, MediaUpload, DrivePortfolioSection, AssetLightbox, etc.
│   ├── booking/            # BookingDrawer, EscrowTimeline, DisputeModal
│   ├── blog/               # ArticleBody, BlogCard, CreatorSpotlightEmbed, ToCSidebar, ContentBlocks
│   ├── admin/              # AdminSidebar, AdminShell, CategoryModal, ConfigField, TeamMemberModal (avatar direct-upload + platform select w/ custom option), BatchOperations, EmailTemplateBlocksEditor, ContentBlocksEditor, ImageUploadField
│   ├── team/               # TeamSocialIcon (brand SVG + lucide fallback per normalized platform kind)
│   ├── error/              # ErrorReportDialog (report/continue popup), GlobalErrorCatcher (window.onerror + unhandledrejection, non-blocking)
│   ├── wallet/             # WalletBalanceCard, TopUpModal, WithdrawModal
│   └── shared/             # AuthGate, MediaEmbed, CookieConsentBanner, ThemeToggler, EmailSimulation, EarlyMemberBadge, ReferralCapture, CountdownWidget, CountdownSlot, ScrollToTopButton
├── sanity/                  # Sanity CMS config + schemas
│   ├── sanity.config.ts     # Sanity project configuration
│   └── schemas/             # Blog post + creator spotlight schemas
├── services/                # OOP class-based business logic
│   ├── BookingService.ts
│   ├── BlogPostService.ts  # Blog post CRUD + DB→Sanity→fallback merge, deduped by slug (admin/DB wins)
│   ├── DashboardService.ts   # Role-aware dashboard queries + pipeline column defs
│   ├── DriveService.ts
│   ├── EarlyMemberService.ts # Founding-100 rank (ROW_NUMBER over user.createdAt, cached)
│   ├── EscrowService.ts
│   ├── EmailService.ts       # Resend transactional emails (isResendConfigured guard + preview fallback + verify/email-changed/sendTemplate)
│   ├── ExploreService.ts   # Provider search + portfolioThumbnails (carousel payload)
│   ├── LeaderboardService.ts # Pluggable factor registry (referrals/portfolio/bookings/ratings) + weighted ranking
  │   ├── MediaAssetService.ts  # Media asset registry: record, list, referenced-URL scan (providers/portfolio/blog/team), orphan cleanup, delete, replace, reconcile, backfillOrphans (bulk owner-matched rescue)
│   ├── MilestoneService.ts
│   ├── MockDataService.ts
│   ├── PaymentService.ts
│   ├── PlatformConfigService.ts # Config CRUD with DB override + setNestedValue deep-merge of dotted keys
│   ├── PlatformStatsService.ts # Cached landing aggregates with null → fallbackValue degradation
│   ├── PortfolioService.ts
│   ├── ReferralService.ts    # Invite codes + ACID degree-1/degree-2 events + idempotent cookie claim
│   ├── WalletService.ts
│   └── WebinarService.ts     # Webinar CRUD + unique-index-upsert registration (idempotent)
├── types/                   # Global TypeScript interfaces
│   ├── index.ts            # Barrel export + all entity/config/API types
│   ├── dashboard.ts        # IDashboard* types
│   └── portfolio.ts        # (re-export not needed — lib/portfolio is the source) (pipeline, stats, availability, payments, portfolioGallery)
│   └── explore.ts          # IExploreCard, IExploreFilters, ExploreSort (+ portfolioThumbnails, coverVideoUrl)
│   └── explore.ts          # IExploreCard, IExploreFilters, ExploreSort
├── config/
│   └── platform.config.ts   # Hardcoded fallback, DB overrides at runtime
├── lib/
│   ├── auth.ts             # Better Auth instance + getSession/requireAuth/requireRole (getSession forwards request headers)
│   ├── blog-fallback.ts    # Hardcoded fallback blog posts when Sanity is unavailable
│   ├── blog-hero.ts        # getPostHeroUrl: plain URL or Sanity image- ref → absolute hero URL
│   ├── cloudinary.ts       # Video/image upload, thumbnail generation, signed admin ops (deleteAsset) + env availability guard
│   ├── config-context.tsx  # PlatformConfig React context provider
│   ├── consent.ts          # NDPR consent capture server action│   ├── countdown.ts        # Countdown math + expiry/area selection (pure, hydration-safe inputs)
│   ├── countdown-icons.ts  # Curated lucide icon allowlist for countdown widgets (§15)
│   ├── currency.ts         # Money helpers: nairaToKobo, formatNaira, formatKobo
│   ├── error-log-buffer.ts # Console ring buffer (last 60 entries) captured for error reports
│   ├── landing-stats.ts    # Ordered stat items + format helpers (compact/rating/count) with fallbackValue
│   ├── portfolio.ts        # dedupePortfolioItems, formatAssetLabel (sanitized provider# + date), isVideoItem, assetSerialKey
│   ├── db.ts               # Drizzle + Supabase client
│   ├── drive.ts            # Google Drive API helpers + validation
│   ├── email-blocks.ts     # EmailTemplateBlock[] → inline-styled HTML + substituteSampleVars/SAMPLE_EMAIL_VARS/previewVarsFor (platform name + resolved logoUrl; relative URLs resolved via lib/url)
│   ├── email-templates.ts  # WIRED_EMAIL_TEMPLATES registry (welcome/verifyEmail/emailChanged/bookingConfirmation/paymentReceived/passwordReset: label + trigger) + isWiredEmailTemplate — code-wired emails are preview/simulate only, never sendable/broadcastable; resolveEmailTemplates/resolveEmailTemplate/resolveEmailConfig merge hardcoded defaults under DB-saved templates (defaults apply when a template was never saved to DB)
│   ├── errors.ts           # Business error classes (BookingError, EscrowError, CloudinaryNotConfiguredError, etc.)
│   ├── media.ts            # Media file/URL validation helpers (type, size, link; oversize reason keeps "too large" substring + per-file-limit detail)
│   ├── oauth.ts            # Google OAuth callback helpers (register finalize routing, role guard)
│   ├── paystack.ts         # Init transaction, verify webhook, split, refund, DVA, transfer
│   ├── platform-copy.ts    # PLATFORM_NAME_TOKEN ({{name}}) + fillPlatformName — display copy resolves from config.name
│   ├── referral-cookie.ts  # crelab_ref cookie read/clear helpers for ?ref= capture + claim
│   ├── sanitize-error.ts   # Redacts emails/tokens/cookies/data-URIs, truncates message/stack/logs, 8 KB cap
│   ├── social-platforms.ts # Team social-link catalogue: SOCIAL_PLATFORM_OPTIONS + normalizeSocialPlatform (legacy alias → canonical kind, "other" keeps raw label)
│   ├── seo.ts              # buildSeoMetadata: config-driven Next.js Metadata (logo og:image, canonical, twitter, noindex) — consumed by root layout + 13 per-route layout.tsx files
│   ├── slug.ts             # Provider slug build/parse helpers (`name--id-prefix`)
│   ├── sanity.ts           # Sanity CMS client + helpers
│   ├── url.ts              # appOrigin (NEXT_PUBLIC_APP_URL → VERCEL_URL → localhost, trailing-slash normalised) + resolveAbsoluteUrl + resolveUrlForRender + resolveRelativeUrlsInHtml (email/blog relative URL resolution)
│   ├── webinars.ts         # Shared webinar copy/status helpers (server + client safe, no DB)
│   ├── theme-context.tsx   # Theme provider (System/Light/Dark) + useTheme hook
│   ├── toast.tsx           # Toast notification component
│   └── use-undoable.ts      # useUndoable hook (undo toasts for reversible admin destructive actions)
├── drizzle/
│   ├── schema.ts           # Drizzle schema (single source of truth for DB shape)
│   └── migrations/         # Generated SQL migrations
├── hooks/
│   └── useAuth.ts          # Client-side auth hook (signIn, signInWithGoogle, signOut, signUp + verify-email send)
├── scripts/                 # Database seeding + utility scripts
│   ├── seed.ts             # DB seed: creates users via Better Auth API + inserts all seed data
│   ├── seed-rollback.ts    # Rollback: deletes all seed data in FK-safe reverse order
│   └── _test-bcrypt.mjs    # Scratch: bcryptjs hash testing (can be removed)
├── checkpoints/             # Session logs (in-progress, session-log)
├── testing/                 # Test results
├── middleware.ts            # Route protection (auth + admin gate + /profile)
└── public/                 # Static assets (icon.png, primary-logo.png)
```

---

## Directory Descriptions

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `app/` | Next.js 15 App Router: route groups for public, auth, admin, and API | `layout.tsx`, `page.tsx`, `sitemap.ts`, `robots.ts`, route handlers |
| `checkpoints/` | Session tracking: in-progress and session logs | `in-progress.md`, `session-log.md` |
| `testing/` | Test results tracking | `test-results.md` |
| `app/admin/` | Admin panel: config editor, category manager, provider queue, disputes, media asset manager, email templates, blog templates, blog posts, user management, countdown widgets, webinars, bug-report triage | `page.tsx`, `layout.tsx`, `media/page.tsx`, `users/page.tsx`, `blog-templates/page.tsx`, `blog-posts/page.tsx`, `countdown/page.tsx`, `webinars/page.tsx`, `bug-reports/page.tsx` |
| `components/ui/` | Cl* wrappers isolating shadcn/ui from feature code | `ClButton.tsx`, `ClCard.tsx`, `ClInput.tsx`, `ClConfirmDialog.tsx`, `ClBackButton.tsx`, `ClDataTable.tsx`, `ClPagination.tsx` |
| `components/explore/` | Explore feed: filter bar, masonry grid, video cards (ordered display: avatar → carousel → initials), portfolio gallery | ExploreFilterBar, ExploreGrid, ExploreVideoCard, PortfolioGallery |
| `components/profile/` | Provider profile: hero, portfolio grid, packages, reviews, drive settings, media upload | ProviderHero, PortfolioGrid, ServicePackages, MediaUpload |
| `components/booking/` | Booking flow: drawer, escrow timeline, dispute modal | BookingDrawer, EscrowTimeline |
| `components/blog/` | Blog article body, cards, creator spotlight embed, ToC sidebar, content section renderer | ArticleBody, BlogCard, CreatorSpotlightEmbed, ToCSidebar, ContentBlocks |
| `components/admin/` | Admin panel components | AdminSidebar, AdminShell, CategoryModal, ConfigField, ContentBlocksEditor, EmailTemplateBlocksEditor, ImageUploadField |
| `components/error/` | Error-boundary UX: report/continue popup + global window catcher | ErrorReportDialog, GlobalErrorCatcher |
| `components/shared/` | Shared: Providers, AuthGate, MediaEmbed, CookieConsentBanner, EarlyMemberBadge, ReferralCapture, CountdownWidget/Slot, ScrollToTopButton | Providers, AuthGate, CookieConsentBanner, EarlyMemberBadge, ReferralCapture, CountdownWidget, ScrollToTopButton |
| `components/team/` | Team page social icons | `TeamSocialIcon.tsx` |
| `sanity/` | Sanity CMS project config + content schemas | `sanity.config.ts`, `schemas/` |
| `services/` | OOP class-based business logic with exported interfaces | BookingService, EscrowService, PlatformConfigService, ExploreService, DashboardService, MediaAssetService, EmailService, BlogPostService, EarlyMemberService, ReferralService, LeaderboardService, WebinarService, PlatformStatsService |
| `types/` | Global TypeScript interfaces and enums — single source of truth | `index.ts`, `explore.ts`, `dashboard.ts` |
| `config/` | Platform configuration with hardcoded fallback + DB override | `platform.config.ts` |
| `lib/` | Third-party SDK wrappers + shared utilities + blog fallback content | `auth.ts`, `db.ts`, `paystack.ts`, `sanity.ts`, `cloudinary.ts`, `media.ts`, `errors.ts`, `slug.ts`, `currency.ts`, `use-undoable.ts`, `blog-fallback.ts`, `blog-hero.ts`, `config-context.tsx`, `consent.ts`, `oauth.ts`, `url.ts`, `seo.ts`, `email-blocks.ts`, `email-templates.ts`, `drive.ts`, `platform-copy.ts`, `sanitize-error.ts`, `error-log-buffer.ts`, `countdown.ts`, `countdown-icons.ts`, `referral-cookie.ts`, `landing-stats.ts`, `webinars.ts`, `social-platforms.ts` |
| `drizzle/` | Database schema, migrations, drizzle-kit config | `schema.ts` (tables incl. `referral_codes`, `referral_events`, `webinars`, `webinar_registrations`, `bug_reports.error_context`), `migrations/` (journal tracks 0000–0002; 0003+ are standalone SQL applied by hand — incl. `0007_referrals_and_error_context.sql`, NOT yet applied) |
| `hooks/` | Custom React hooks | `useAuth.ts` |
| `scripts/` | DB seeding: creates users via Better Auth API, inserts seed data, rollback | `seed.ts`, `seed-rollback.ts` |
| `__tests__/` | Vitest test files for all services + lib helpers | `services/BookingService.test.ts`, `services/EscrowService.test.ts`, `services/ExploreService.test.ts`, `services/DashboardService.test.ts`, `services/EmailService.test.ts`, `services/MediaAssetService.test.ts`, `services/ReferralService.test.ts`, `services/LeaderboardService.test.ts`, `services/WebinarService.test.ts`, `services/BlogPostService.test.ts` (adminList expects DB + fallback merge), `oauth.test.ts`, `media.test.ts`, `slug.test.ts`, `currency.test.ts`, `cloudinary.test.ts`, `platform-name-compliance.test.ts`, `lib/config-helpers.test.ts`, `lib/email-blocks.test.ts`, `lib/email-templates.test.ts`, `lib/countdown.test.ts`, `lib/early-member.test.ts`, `lib/error-log-buffer.test.ts`, `lib/sanitize-error.test.ts`, `lib/social-platforms.test.ts` |

---

## Entry Points

| Purpose | File |
|---------|------|
| App layout and providers | `app/layout.tsx` |
| Landing / Explore page | `app/page.tsx` |
| Better Auth API handler | `app/api/auth/[...all]/route.ts` |
| Config loading | `config/platform.config.ts` |
| DB client init | `lib/db.ts` |
| Route protection middleware | `middleware.ts` |
| Platform config React context | `lib/config-context.tsx` |
| Explore feed API | `app/api/explore/route.ts` |
| Dashboard API | `app/api/dashboard/route.ts` |
| Blog index | `app/(public)/blog/page.tsx` |
| Admin layout | `app/admin/layout.tsx` |
| Sanity CMS config | `sanity/sanity.config.ts` |
