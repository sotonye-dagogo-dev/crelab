# Repository Map

> **Metadata**
> - last-updated-by: update-ai-system
> - last-verified-against-code: 2026-07-05 (OC-7 reconciliation)
> - staleness-policy: auto-regenerable — can be derived from `tree` command. Manual content only where intent cannot be derived from structure.

> **Overview:** Visual map of the Crelab project folder structure with purpose descriptions.

---

## Folder Structure

```
crelab/
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
│   │   ├── explore/        # Explore page
│   │   ├── privacy/        # NDPR-compliant privacy policy
│   │   ├── profile/[slug]/ # Provider public profile
│   │   ├── search/         # Search results
│   │   └── terms/          # Terms of service
│   ├── (auth)/              # Better Auth gated routes
│   │   ├── bookings/       # Booking detail + list
│   │   ├── login/          # Sign in page
│   │   ├── profile/        # Profile edit/setup
│   │   └── register/       # Sign up page
│   ├── admin/               # ADMIN role only
│   │   ├── page.tsx        # Dashboard
│   │   ├── layout.tsx      # Admin layout + sidebar
│   │   ├── categories/     # Category manager
│   │   ├── config/         # Platform config editor
│   │   ├── disputes/       # Dispute resolution dashboard
│   │   └── providers/      # Provider review queue
│   └── api/                 # Route handlers
│       ├── account/        # User account (consent, delete, export)
│       ├── admin/          # Admin CRUD endpoints
│       ├── auth/           # Better Auth handler
│       ├── cron/           # Escrow cron endpoints
│       ├── explore/        # Provider search/filter/sort
│       ├── portfolio/      # Portfolio CRUD
│       ├── profile/        # Profile management (setup)
│       └── webhooks/       # Paystack webhook handler
├── components/
│   ├── ui/                  # Cl* wrappers around shadcn/ui
│   ├── explore/            # ExploreFilterBar, ExploreGrid, ExploreVideoCard
│   ├── profile/            # ProviderHero, PortfolioGrid, ServicePackages, etc.
│   ├── booking/            # BookingDrawer, EscrowTimeline, DisputeModal
│   ├── blog/               # ArticleBody, BlogCard, CreatorSpotlightEmbed, ToCSidebar
│   ├── admin/              # AdminSidebar, CategoryModal, ConfigField
│   └── shared/             # Providers, AuthGate, MediaEmbed, CookieConsentBanner
├── sanity/                  # Sanity CMS config + schemas
│   ├── sanity.config.ts     # Sanity project configuration
│   └── schemas/             # Blog post + creator spotlight schemas
├── services/                # OOP class-based business logic
│   ├── BookingService.ts
│   ├── DriveService.ts
│   ├── EscrowService.ts
│   ├── ExploreService.ts
│   ├── PaymentService.ts
│   ├── PlatformConfigService.ts
│   └── PortfolioService.ts
├── types/                   # Global TypeScript interfaces
│   ├── index.ts            # Barrel export + all entity/config/API types
│   └── explore.ts          # IExploreCard, IExploreFilters, ExploreSort
├── config/
│   └── platform.config.ts   # Hardcoded fallback, DB overrides at runtime
├── lib/
│   ├── auth.ts             # Better Auth instance + getSession/requireAuth/requireRole
│   ├── cloudinary.ts       # Video/image upload, thumbnail generation
│   ├── config-context.tsx  # PlatformConfig React context provider
│   ├── consent.ts          # NDPR consent capture server action
│   ├── db.ts               # Drizzle + Supabase client
│   ├── drive.ts            # Google Drive API helpers + validation
│   ├── mux.ts              # Mux streaming (stub — not wired)
│   ├── paystack.ts         # Init transaction, verify webhook, split, refund
│   ├── sanity.ts           # Sanity CMS client + helpers
│   └── toast.tsx           # Toast notification component
├── drizzle/
│   ├── schema.ts           # Drizzle schema (single source of truth for DB shape)
│   └── migrations/         # Generated SQL migrations
├── hooks/
│   └── useAuth.ts          # Client-side auth hook (signIn, signOut, signUp)
├── middleware.ts            # Route protection (auth + admin gate)
└── public/                 # Static assets
```

---

## Directory Descriptions

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `app/` | Next.js 15 App Router: route groups for public, auth, admin, and API | `layout.tsx`, `page.tsx`, `sitemap.ts`, `robots.ts`, route handlers |
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
| `lib/` | Third-party SDK wrappers + shared utilities | `auth.ts`, `db.ts`, `paystack.ts`, `sanity.ts`, `config-context.tsx`, `consent.ts` |
| `drizzle/` | Database schema, migrations, drizzle-kit config | `schema.ts`, `migrations/` |
| `hooks/` | Custom React hooks | `useAuth.ts` |

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
