# Repository Map

> **Metadata**
> - last-updated-by: update-ai-system
> - last-verified-against-code: 2026-07-28
> - staleness-policy: auto-regenerable — can be derived from `tree` command. Manual content only where intent cannot be derived from structure.

> **Overview:** Visual map of the Crelab project folder structure with purpose descriptions.

---

## Folder Structure

```
crelab/
├── __tests__/               # Vitest test files for all services
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
│   │   └── terms/          # Terms of service
│   ├── (auth)/              # Better Auth gated routes
│   │   ├── bookings/       # Booking detail + list
│   │   ├── forgot-password/ # Password reset page
│   │   ├── login/          # Sign in page (email/password + phone/OTP + Google OAuth)
│   │   ├── profile/        # Profile edit/setup
│   │   ├── register/       # Sign up page (multi-step)
│   │   └── wallet/         # Wallet page (balance, topup, withdraw, transactions)
│   ├── admin/               # ADMIN role only
│   │   ├── page.tsx        # Dashboard
│   │   ├── layout.tsx      # Admin layout + sidebar
│   │   ├── categories/     # Category manager
│   │   ├── config/         # Platform config editor
│   │   ├── disputes/       # Dispute resolution dashboard
│   │   ├── email-templates/ # Admin-editable email templates
│   │   └── providers/      # Provider review queue
│   └── api/                 # Route handlers
│       ├── account/        # User account (consent, delete, export)
│       ├── admin/          # Admin CRUD endpoints
│       ├── auth/           # Better Auth handler
│       ├── bug-report/     # Bug report submission
│       ├── cron/           # Escrow cron endpoints
│       ├── explore/        # Provider search/filter/sort
│       ├── milestones/     # Milestone CRUD
│       ├── email/          # Email sending endpoints (welcome, booking, payment)
│       ├── portfolio/      # Portfolio CRUD
│       ├── profile/        # Profile management (setup)
│       ├── wallet/         # Wallet: topup (card + bank DVA), withdraw, balance, transactions
│       └── webhooks/       # Paystack webhook handler
├── components/
│   ├── ui/                  # Cl* wrappers around shadcn/ui (ClLogo, ClErrorState, ClEmptyState, ClPasswordInput added)
│   ├── explore/            # ExploreFilterBar, ExploreGrid, ExploreVideoCard
│   ├── profile/            # ProviderHero, PortfolioGrid, ServicePackages, etc.
│   ├── booking/            # BookingDrawer, EscrowTimeline, DisputeModal
│   ├── blog/               # ArticleBody, BlogCard, CreatorSpotlightEmbed, ToCSidebar
│   ├── admin/              # AdminSidebar, CategoryModal, ConfigField, TeamMemberModal, BatchOperations
│   ├── wallet/             # WalletBalanceCard, TopUpModal, WithdrawModal
│   └── shared/             # AuthGate, MediaEmbed, CookieConsentBanner, ThemeToggler, EmailSimulation
├── sanity/                  # Sanity CMS config + schemas
│   ├── sanity.config.ts     # Sanity project configuration
│   └── schemas/             # Blog post + creator spotlight schemas
├── services/                # OOP class-based business logic
│   ├── BookingService.ts
│   ├── DriveService.ts
│   ├── EscrowService.ts
│   ├── EmailService.ts       # Resend transactional emails with simulation fallback
│   ├── ExploreService.ts
│   ├── MilestoneService.ts
│   ├── MockDataService.ts
│   ├── PaymentService.ts
│   ├── PlatformConfigService.ts
│   ├── PortfolioService.ts
│   └── WalletService.ts
├── types/                   # Global TypeScript interfaces
│   ├── index.ts            # Barrel export + all entity/config/API types
│   └── explore.ts          # IExploreCard, IExploreFilters, ExploreSort
├── config/
│   └── platform.config.ts   # Hardcoded fallback, DB overrides at runtime
├── lib/
│   ├── auth.ts             # Better Auth instance + getSession/requireAuth/requireRole
│   ├── blog-fallback.ts    # Hardcoded fallback blog posts when Sanity is unavailable
│   ├── cloudinary.ts       # Video/image upload, thumbnail generation
│   ├── config-context.tsx  # PlatformConfig React context provider
│   ├── consent.ts          # NDPR consent capture server action
│   ├── db.ts               # Drizzle + Supabase client
│   ├── drive.ts            # Google Drive API helpers + validation
│   ├── mux.ts              # Mux streaming (stub — not wired)
│   ├── paystack.ts         # Init transaction, verify webhook, split, refund, DVA, transfer
│   ├── sanity.ts           # Sanity CMS client + helpers
│   ├── theme-context.tsx   # Theme provider (System/Light/Dark) + useTheme hook
│   └── toast.tsx           # Toast notification component
├── drizzle/
│   ├── schema.ts           # Drizzle schema (single source of truth for DB shape)
│   └── migrations/         # Generated SQL migrations
├── hooks/
│   └── useAuth.ts          # Client-side auth hook (signIn, signOut, signUp)
├── scripts/                 # Database seeding + utility scripts
│   ├── seed.ts             # DB seed: creates users via Better Auth API + inserts all seed data
│   ├── seed-rollback.ts    # Rollback: deletes all seed data in FK-safe reverse order
│   └── _test-bcrypt.mjs    # Scratch: bcryptjs hash testing (can be removed)
├── checkpoints/             # Session logs (in-progress, session-log)
├── testing/                 # Test results
├── middleware.ts            # Route protection (auth + admin gate)
└── public/                 # Static assets (icon.png, primary-logo.png)
```

---

## Directory Descriptions

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `app/` | Next.js 15 App Router: route groups for public, auth, admin, and API | `layout.tsx`, `page.tsx`, `sitemap.ts`, `robots.ts`, route handlers |
| `checkpoints/` | Session tracking: in-progress and session logs | `in-progress.md`, `session-log.md` |
| `testing/` | Test results tracking | `test-results.md` |
| `app/admin/` | Admin panel: config editor, category manager, provider queue, disputes | `page.tsx`, `layout.tsx` |
| `components/ui/` | Cl* wrappers isolating shadcn/ui from feature code | `ClButton.tsx`, `ClCard.tsx`, `ClInput.tsx` |
| `components/explore/` | Explore feed: filter bar, masonry grid, video cards | ExploreFilterBar, ExploreGrid |
| `components/profile/` | Provider profile: hero, portfolio grid, packages, reviews, drive settings | ProviderHero, PortfolioGrid, ServicePackages |
| `components/booking/` | Booking flow: drawer, escrow timeline, dispute modal | BookingDrawer, EscrowTimeline |
| `components/blog/` | Blog article body, cards, creator spotlight embed, ToC sidebar | ArticleBody, BlogCard, CreatorSpotlightEmbed, ToCSidebar |
| `components/admin/` | Admin panel components | AdminSidebar, CategoryModal, ConfigField |
| `components/shared/` | Shared: Providers, AuthGate, MediaEmbed, CookieConsentBanner | Providers, AuthGate, CookieConsentBanner |
| `sanity/` | Sanity CMS project config + content schemas | `sanity.config.ts`, `schemas/` |
| `services/` | OOP class-based business logic with exported interfaces | BookingService, EscrowService, PlatformConfigService, ExploreService |
| `types/` | Global TypeScript interfaces and enums — single source of truth | `index.ts`, `explore.ts` |
| `config/` | Platform configuration with hardcoded fallback + DB override | `platform.config.ts` |
| `lib/` | Third-party SDK wrappers + shared utilities + blog fallback content | `auth.ts`, `db.ts`, `paystack.ts`, `sanity.ts`, `blog-fallback.ts`, `config-context.tsx`, `consent.ts` |
| `drizzle/` | Database schema, migrations, drizzle-kit config | `schema.ts` (463 lines, 14 tables + 6 enums + relations), `migrations/` |
| `hooks/` | Custom React hooks | `useAuth.ts` |
| `scripts/` | DB seeding: creates users via Better Auth API, inserts seed data, rollback | `seed.ts`, `seed-rollback.ts` |
| `__tests__/` | Vitest test files for all services | `services/BookingService.test.ts`, `services/EscrowService.test.ts`, `services/ExploreService.test.ts` |

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
| Blog index | `app/(public)/blog/page.tsx` |
| Admin layout | `app/admin/layout.tsx` |
| Sanity CMS config | `sanity/sanity.config.ts` |
