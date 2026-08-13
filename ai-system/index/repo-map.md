# Repository Map

> **Metadata**
> - last-updated-by: update-ai-system (Session 25)
> - last-verified-against-code: 2026-08-13
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
│   ├── layout.tsx           # Root layout with PlatformConfigProvider + TanStack Query
│   ├── page.tsx             # Landing / Explore (hero + infinite scroll grid)
│   ├── robots.ts            # robots.txt generation
│   ├── sitemap.ts           # sitemap.xml generation
│   ├── (public)/            # Guest-accessible routes
│   │   ├── [category]/     # Category browse page
│   │   ├── blog/           # Blog index + [slug] article pages
│   │   ├── bug-report/     # Bug report form page
│   │   ├── explore/        # Explore page
│   │   ├── privacy/        # NDPR-compliant privacy policy
│   │   ├── profile/[slug]/ # Provider public profile
│   │   ├── search/         # Search results
│   │   ├── team/           # Team members page (config-driven)
│   │   ├── terms/          # Terms of service
│   │   └── verify-email/   # Email verification (verify/resend form + done state)
│   ├── (auth)/              # Better Auth gated routes
│   │   ├── bookings/       # Booking detail + list
│   │   ├── dashboard/      # Role-aware Provider/Client dashboard
│   │   ├── forgot-password/ # Password reset page
│   │   ├── login/          # Sign in page (email/password + phone/OTP + Google OAuth)
│   │   ├── profile/        # Profile page, edit/setup + media asset manager
│   │   ├── register/       # Sign up page (multi-step email/password + Google OAuth)
│   │   └── wallet/         # Wallet page (balance, topup, withdraw, transactions)
│   ├── admin/               # ADMIN role only
│   │   ├── page.tsx        # Dashboard
│   │   ├── layout.tsx      # Admin layout + collapsible sidebar shell (AdminShell)
│   │   ├── blog-templates/ # Blog config editor (hero/newsletter/footer tagline)
│   │   ├── categories/     # Category manager
│   │   ├── config/         # Platform config editor
│   │   ├── disputes/       # Dispute resolution dashboard
│   │   ├── email-templates/ # Admin-editable email templates (Visual/HTML/Preview tabs)
│   │   ├── media/          # Media asset manager (list, preview, delete, cleanup)
│   │   ├── providers/      # Provider review queue
│   │   └── users/          # User management (search, role, verify, delete)
│   └── api/                 # Route handlers
│       ├── account/        # User account (consent, delete, export)
│       ├── admin/          # Admin CRUD endpoints (+ /admin/media/[id], /admin/email/send, /admin/users, /admin/users/[id])
│       ├── auth/           # Better Auth handler + self-assignable role endpoint
│       ├── bug-report/     # Bug report submission
│       ├── cron/           # Cron endpoints (drive-sync, escrow, milestones, media-cleanup)
│       ├── dashboard/      # Provider/Client dashboard payload
│       ├── explore/        # Provider search/filter/sort
│       ├── milestones/     # Milestone CRUD
│       ├── media/          # Media upload (Cloudinary) + status + asset registry (list/delete/replace)
│       ├── email/          # Email send (welcome, booking, payment) + status health route
│       ├── newsletter/     # Newsletter subscribe (grants MARKETING consent for signed-in users)
│       ├── portfolio/      # Portfolio CRUD
│       ├── profile/        # Profile management (setup)
│       ├── verify-email/   # Verify-email: /send (sendVerificationEmail) + /welcome (fires welcome once verified)
│       ├── wallet/         # Wallet: topup (card + bank DVA), withdraw, balance, transactions
│       └── webhooks/       # Paystack webhook handler
├── components/
│   ├── ui/                  # Cl* wrappers around shadcn/ui (ClLogo, ClErrorState, ClEmptyState, ClPasswordInput, ClConfirmDialog, ClBackButton, ClDataTable, ClPagination)
│   ├── explore/            # ExploreFilterBar, ExploreGrid, ExploreVideoCard
│   ├── profile/            # ProviderHero, PortfolioGrid, ServicePackages, MediaUpload, etc.
│   ├── booking/            # BookingDrawer, EscrowTimeline, DisputeModal
│   ├── blog/               # ArticleBody, BlogCard, CreatorSpotlightEmbed, ToCSidebar, ContentBlocks
│   ├── admin/              # AdminSidebar, AdminShell, CategoryModal, ConfigField, TeamMemberModal, BatchOperations, EmailTemplateBlocksEditor, ContentBlocksEditor
│   ├── wallet/             # WalletBalanceCard, TopUpModal, WithdrawModal
│   └── shared/             # AuthGate, MediaEmbed, CookieConsentBanner, ThemeToggler, EmailSimulation
├── sanity/                  # Sanity CMS config + schemas
│   ├── sanity.config.ts     # Sanity project configuration
│   └── schemas/             # Blog post + creator spotlight schemas
├── services/                # OOP class-based business logic
│   ├── BookingService.ts
│   ├── DashboardService.ts   # Role-aware dashboard queries + pipeline column defs
│   ├── DriveService.ts
│   ├── EscrowService.ts
│   ├── EmailService.ts       # Resend transactional emails (isResendConfigured guard + preview fallback + verify/email-changed/sendTemplate)
│   ├── ExploreService.ts
│   ├── MediaAssetService.ts  # Media asset registry: record, list, referenced-URL scan, orphan cleanup, delete, replace
│   ├── MilestoneService.ts
│   ├── MockDataService.ts
│   ├── PaymentService.ts
│   ├── PlatformConfigService.ts # Config CRUD with DB override + setNestedValue deep-merge of dotted keys
│   ├── PortfolioService.ts
│   └── WalletService.ts
├── types/                   # Global TypeScript interfaces
│   ├── index.ts            # Barrel export + all entity/config/API types
│   ├── dashboard.ts        # IDashboard* types (pipeline, stats, availability, payments)
│   └── explore.ts          # IExploreCard, IExploreFilters, ExploreSort
├── config/
│   └── platform.config.ts   # Hardcoded fallback, DB overrides at runtime
├── lib/
│   ├── auth.ts             # Better Auth instance + getSession/requireAuth/requireRole (getSession forwards request headers)
│   ├── blog-fallback.ts    # Hardcoded fallback blog posts when Sanity is unavailable
│   ├── cloudinary.ts       # Video/image upload, thumbnail generation, signed admin ops (deleteAsset) + env availability guard
│   ├── config-context.tsx  # PlatformConfig React context provider
│   ├── consent.ts          # NDPR consent capture server action
│   ├── currency.ts         # Money helpers: nairaToKobo, formatNaira, formatKobo
│   ├── db.ts               # Drizzle + Supabase client
│   ├── drive.ts            # Google Drive API helpers + validation
│   ├── email-blocks.ts     # EmailTemplateBlock[] → inline-styled HTML + substituteSampleVars/SAMPLE_EMAIL_VARS/previewVarsFor (platform name + resolved logoUrl; relative URLs resolved via lib/url)
│   ├── errors.ts           # Business error classes (BookingError, EscrowError, CloudinaryNotConfiguredError, etc.)
│   ├── media.ts            # Media file/URL validation helpers (type, size, link)
│   ├── oauth.ts            # Google OAuth callback helpers (register finalize routing, role guard)
│   ├── paystack.ts         # Init transaction, verify webhook, split, refund, DVA, transfer
│   ├── seo.ts              # buildSeoMetadata: config-driven Next.js Metadata (logo og:image, canonical, twitter, noindex)
│   ├── slug.ts             # Provider slug build/parse helpers (`name--id-prefix`)
│   ├── sanity.ts           # Sanity CMS client + helpers
│   ├── url.ts              # appOrigin (NEXT_PUBLIC_APP_URL → VERCEL_URL → localhost, trailing-slash normalised) + resolveAbsoluteUrl + resolveUrlForRender + resolveRelativeUrlsInHtml (email/blog relative URL resolution)
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
| `app/admin/` | Admin panel: config editor, category manager, provider queue, disputes, media asset manager, email templates, blog templates, user management | `page.tsx`, `layout.tsx`, `media/page.tsx`, `users/page.tsx`, `blog-templates/page.tsx` |
| `components/ui/` | Cl* wrappers isolating shadcn/ui from feature code | `ClButton.tsx`, `ClCard.tsx`, `ClInput.tsx`, `ClConfirmDialog.tsx`, `ClBackButton.tsx`, `ClDataTable.tsx`, `ClPagination.tsx` |
| `components/explore/` | Explore feed: filter bar, masonry grid, video cards | ExploreFilterBar, ExploreGrid |
| `components/profile/` | Provider profile: hero, portfolio grid, packages, reviews, drive settings, media upload | ProviderHero, PortfolioGrid, ServicePackages, MediaUpload |
| `components/booking/` | Booking flow: drawer, escrow timeline, dispute modal | BookingDrawer, EscrowTimeline |
| `components/blog/` | Blog article body, cards, creator spotlight embed, ToC sidebar, content section renderer | ArticleBody, BlogCard, CreatorSpotlightEmbed, ToCSidebar, ContentBlocks |
| `components/admin/` | Admin panel components | AdminSidebar, AdminShell, CategoryModal, ConfigField, ContentBlocksEditor, EmailTemplateBlocksEditor |
| `components/shared/` | Shared: Providers, AuthGate, MediaEmbed, CookieConsentBanner | Providers, AuthGate, CookieConsentBanner |
| `sanity/` | Sanity CMS project config + content schemas | `sanity.config.ts`, `schemas/` |
| `services/` | OOP class-based business logic with exported interfaces | BookingService, EscrowService, PlatformConfigService, ExploreService, DashboardService, MediaAssetService, EmailService |
| `types/` | Global TypeScript interfaces and enums — single source of truth | `index.ts`, `explore.ts`, `dashboard.ts` |
| `config/` | Platform configuration with hardcoded fallback + DB override | `platform.config.ts` |
| `lib/` | Third-party SDK wrappers + shared utilities + blog fallback content | `auth.ts`, `db.ts`, `paystack.ts`, `sanity.ts`, `cloudinary.ts`, `media.ts`, `errors.ts`, `slug.ts`, `currency.ts`, `use-undoable.ts`, `blog-fallback.ts`, `config-context.tsx`, `consent.ts`, `oauth.ts`, `url.ts`, `seo.ts`, `email-blocks.ts` |
| `drizzle/` | Database schema, migrations, drizzle-kit config | `schema.ts` (441 lines, 21 tables + 12 enums + relations), `migrations/` |
| `hooks/` | Custom React hooks | `useAuth.ts` |
| `scripts/` | DB seeding: creates users via Better Auth API, inserts seed data, rollback | `seed.ts`, `seed-rollback.ts` |
| `__tests__/` | Vitest test files for all services + lib helpers | `services/BookingService.test.ts`, `services/EscrowService.test.ts`, `services/ExploreService.test.ts`, `services/DashboardService.test.ts`, `services/EmailService.test.ts`, `services/MediaAssetService.test.ts`, `oauth.test.ts`, `media.test.ts`, `slug.test.ts`, `currency.test.ts`, `cloudinary.test.ts`, `lib/config-helpers.test.ts`, `lib/email-blocks.test.ts` |

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
