# System Architecture

> **Metadata**
> - last-updated-by: update-ai-system
> - last-verified-against-code: 2026-08-05
> - staleness-policy: re-verify before trusting if any architecture-affecting commits have been made since last-verified-against-code

> **Overview:** Crelab is a metadata-driven, config-first creative services marketplace. Architecture follows a layered Next.js App Router pattern with OOP class-based services, interface-first TypeScript, and ConfigContext-driven runtime overrides.

---

## Architecture Diagram

```
Client (Browser)
    |
    v
Next.js App Router (app/)
    |-- (public)  -- Guest: Landing/Explore, Category Browse, Search, Profiles, Blog
    |-- (auth)    -- Authenticated: Dashboard, Bookings, Messages, Profile Edit
    |-- (admin)   -- ADMIN role: Config editor, Categories, Disputes, Analytics
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
    |-- WalletService           -- Wallet CRUD, topup, debit, credit, withdrawal, DVA
    |-- MilestoneService        -- Milestone lifecycle (create, fund, submit, approve, dispute)
    |-- MockDataService         -- Mock data fallback when DB unavailable
    |-- EmailService            -- Resend transactional emails with simulation fallback
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
| Public Routes | Guest-accessible pages: landing/explore, category browse, profile/[slug], search | `app/(public)/` | Components, Services |
| Auth Routes | Authenticated pages: booking, profile/edit, register, login | `app/(auth)/` | AuthGate, Services |
| Admin Routes | ADMIN-only: config editor, category manager, provider queue, disputes, email templates | `app/admin/` | requireRole('ADMIN'), Services |
| API Routes | Backend handlers: auth, explore, bookings, portfolio, profile, admin, webhooks, cron | `app/api/` | Services, Lib |
| UI Wrappers | Cl* wrappers around shadcn/ui primitives | `components/ui/` | shadcn/ui, Tailwind |
| Feature Components | Domain-specific UI: explore cards, profile sections, booking drawer, admin panels | `components/` | UI Wrappers, Types |
| Services | Business logic: booking, escrow, payment, portfolio, drive, config, explore | `services/` | Lib, Types, Drizzle |
| Types | Global TS interfaces: entities, API responses, enums, explore types | `types/` | None |
| Config | Platform config with DB override capability | `config/` | Types |
| Lib | Third-party wrappers + shared utilities: auth, db, paystack, cloudinary, mux, drive, consent, config-context, toast | `lib/` | SDK packages |
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
   send welcome email, then route to /profile/setup (provider) or /explore (client)
4. Better Auth stores session in Supabase adapter (httpOnly cookies)
5. Next.js middleware checks session on protected routes
6. Server components use getSession() / requireAuth() / requireRole()
7. Client-side: useAuth() hook provides { user, role, isAuthenticated, signIn, signInWithGoogle, signOut }
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

All config points have hardcoded fallback values in `config/platform.config.ts` with DB override capability via `PlatformConfigService`. UI references consume these through `ConfigContext`.

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
| Video | Cloudinary (upload/thumbnails) + Mux (streaming) | cloudinary@2.x / @mux/mux-node@14.x |
| Drive | Google Drive Files API v3 | googleapis@20.x |
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
- `lib/mux.ts` (Mux streaming integration stubbed but not wired)
- Provider Dashboard (Phase 2)
- Client Dashboard (Phase 2)
- Messages/notifications (Phase 2)

---

## Recent Changes

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
