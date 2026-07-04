# Repository Map

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: 2026-07-04
> - staleness-policy: auto-regenerable — can be derived from `tree` command. Manual content only where intent cannot be derived from structure.

> **Overview:** Visual map of the Crelab project folder structure with purpose descriptions.

---

## Folder Structure

```
crelab/
├── .ai-system/              # AI-assisted development governance
├── app/                     # Next.js 15 App Router
│   ├── (public)/            # Guest-accessible routes
│   │   ├── page.tsx         # Landing / Explore
│   │   ├── explore/
│   │   ├── [category]/
│   │   ├── profile/[slug]/
│   │   └── blog/
│   ├── (auth)/              # Better Auth gated routes
│   │   ├── dashboard/
│   │   ├── bookings/
│   │   ├── profile/edit/
│   │   └── messages/
│   ├── (admin)/             # ADMIN role only
│   └── api/                 # Route handlers
│       ├── auth/
│       ├── explore/
│       ├── bookings/
│       ├── portfolio/
│       ├── webhooks/paystack/
│       ├── cron/escrow/
│       └── admin/
├── components/
│   ├── ui/                  # Cl* wrappers around shadcn/ui
│   ├── explore/
│   ├── profile/
│   ├── booking/
│   ├── blog/
│   └── shared/
├── services/                # OOP class-based business logic
│   ├── BookingService.ts
│   ├── EscrowService.ts
│   ├── PortfolioService.ts
│   ├── DriveService.ts
│   ├── PaymentService.ts
│   └── ReviewService.ts
├── types/                   # Global TypeScript interfaces
│   ├── platform.ts
│   ├── booking.ts
│   ├── provider.ts
│   ├── payment.ts
│   ├── portfolio.ts
│   └── index.ts             # barrel export
├── config/
│   └── platform.config.ts   # Hardcoded fallback, DB overrides at runtime
├── lib/
│   ├── auth.ts             # Better Auth instance + helpers
│   ├── db.ts               # Drizzle + Supabase client
│   ├── paystack.ts
│   ├── cloudinary.ts
│   ├── mux.ts
│   └── drive.ts
├── drizzle/
│   ├── schema.ts           # Drizzle schema (single source of truth for DB shape)
│   └── migrations/
├── sanity/                 # Sanity CMS config + schemas
├── hooks/                  # Custom React hooks
└── public/                 # Static assets
```

---

## Directory Descriptions

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `app/` | Next.js 15 App Router: route groups for public, auth, admin, and API | `layout.tsx`, `page.tsx`, route handlers |
| `components/ui/` | Cl* wrappers isolating shadcn/ui from feature code | `ClButton.tsx`, `ClCard.tsx`, `ClInput.tsx` |
| `components/` | Domain-specific feature components | ExploreVideoCard, ServicePackageCard, AuthGate |
| `services/` | OOP class-based business logic with exported interfaces | BookingService, EscrowService, DriveService |
| `types/` | Global TypeScript interfaces and enums — single source of truth | `booking.ts`, `provider.ts`, `platform.ts` |
| `config/` | Platform configuration with hardcoded fallback + DB override | `platform.config.ts` |
| `lib/` | Third-party SDK wrappers isolating external APIs | `auth.ts`, `db.ts`, `paystack.ts` |
| `drizzle/` | Database schema definition and migrations | `schema.ts`, `migrations/` |
| `sanity/` | Sanity CMS project configuration | schema definitions |
| `hooks/` | Custom React hooks | `useAuth.ts` |

---

## Entry Points

| Purpose | File |
|---------|------|
| App layout and providers | `app/layout.tsx` |
| Landing / Explore page | `app/(public)/page.tsx` |
| Better Auth API handler | `app/api/auth/[...all]/route.ts` |
| Config loading | `config/platform.config.ts` |
| DB client init | `lib/db.ts` |
