# System Architecture

> **Metadata**
> - last-updated-by: update-ai-system
> - last-verified-against-code: 2026-07-05 (OC-7 audit)
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
| Admin Routes | ADMIN-only: config editor, category manager, provider queue, disputes | `app/admin/` | requireRole('ADMIN'), Services |
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
1. User signs up/logs in via Better Auth (email/phone + OTP)
2. Better Auth stores session in Supabase adapter (httpOnly cookies)
3. Next.js middleware checks session on protected routes
4. Server components use getSession() / requireAuth() / requireRole()
5. Client-side: useAuth() hook provides { user, role, isAuthenticated, signIn, signOut }
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

## Configuration Points

| Config Key | Purpose | Location | Default |
|-----------|---------|----------|---------|
| PLATFORM_NAME | Public-facing platform name | platform.config.ts | 'Crelab' |
| PLATFORM_TAGLINE | Hero section tagline | platform.config.ts | 'Get hired for your creativity, not your follower count.' |
| PRIMARY_COLOR | Accent colour (hex) | platform.config.ts | '#E8FF47' |
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

Files not yet implemented despite being in the planned architecture:
- `services/ReviewService.ts` (interface exists but no implementation)
- `lib/mux.ts` (Mux streaming integration stubbed but not wired)
- Messages/notifications (Phase 2)
- Provider Dashboard
- Client Dashboard
