# Dependency Graph

> **Metadata**
> - last-updated-by: update-ai-system (Session 20)
> - last-verified-against-code: 2026-08-11
> - staleness-policy: auto-regenerable — can be derived from import analysis tools. Manual content only for conventions and rules that cannot be inferred from code.

> **Overview:** Maps how modules depend on each other. Agents use this to understand the impact of changes.

---

## Module Dependency Map

```
Page / Route Components
  → Feature Components (explore/, profile/, booking/, admin/, shared/)
  → UI Wrappers (components/ui/Cl*)
  → Hooks (useAuth, TanStack Query)
  → Services (via server components or API routes)
  → Config (via ConfigContext from lib/)

UI Wrappers (Cl*)
  → shadcn/ui primitives (isolated behind Cl* interface)
  → Tailwind CSS (design tokens via CSS custom properties)

Feature Components (explore, profile, booking, admin)
  → UI Wrappers (Cl*)
  → Types
  → lib/config-context.tsx (ConfigContext)

Services
  → lib/db.ts (Drizzle + postgres client)
  → Types (interfaces, enums)
  → Drizzle ORM (drizzle/schema.ts — database operations)
  → Lib wrappers (paystack, cloudinary, drive)
  → PlatformConfigService (config lookups)

API Routes
  → Services (business logic)
  → Lib (auth helpers)
  → Types (request/response types)

PlatformConfigService
  → lib/db.ts (DB client)
  → config/platform.config.ts (fallback default)
  → Drizzle schema (platform_config + audit_log tables)
  → Next.js unstable_cache / revalidateTag

DashboardService
  → lib/db.ts (Drizzle + postgres client)
  → drizzle/schema.ts (providers, bookings, portfolio_items, service_packages, user, wallets, payments)
  → drizzle-orm (eq, and, sql, gte)
  → PlatformConfigService (availabilityLookaheadDays config)
  → MockDataService (fallback mock dashboards when NEXT_PUBLIC_MOCK_DATA=true)
  → ExploreService (queryExploreCards for client discover rail)
  → lib/currency.ts (formatKobo for display values)
  → types/dashboard.ts (IProviderDashboard, IClientDashboard, pipeline/stats/availability types) + BookingStatus, ExploreSort

EmailService (+ isResendConfigured / getResendConfig)
  → config/platform.config.ts (DEFAULT_CONFIG email templates + fromName/fromEmail)
  → types/index.ts (IEmailTemplate, IPlatformConfig)
  → global fetch → https://api.resend.com/emails (raw HTTP, no SDK)
  → env RESEND_API_KEY (read at call time; preview fallback when absent)
  → consumed by app/api/email/send + app/api/email/welcome + app/api/email/status

Auth (Better Auth)
  → Better Auth standalone instance (lib/auth.ts)
  → Drizzle adapter → drizzle/schema.ts (user, session, account, verification)
  → next/headers (getSession forwards the current request headers — never an empty Headers())
  → hooks/useAuth.ts (client-side hook)
  → lib/oauth.ts (OAuth callback routing helpers + role guard)
  → app/api/auth/role (self-assignable role endpoint)
  → middleware.ts (route protection)

Lib Module
  → Third-party SDKs (Paystack, Cloudinary, Google Drive, postgres, Supabase)
  → Types (input/output types)
  → crypto (HMAC-SHA512 webhook verification)
  → blog-fallback.ts is a standalone leaf module — no dependencies beyond types/blog.ts
  → errors.ts is a leaf module — no dependencies beyond node's Error (imported by WalletService, MilestoneService, and integrations)

Drizzle
   → drizzle/schema.ts (463 lines, single source of truth — exports all tables, enums, relations)
  → postgres driver (lib/db.ts)
  → drizzle-kit (migrations)
```

---

## External Dependencies

| Package | Purpose | Used In |
|---------|---------|---------|
| next | Framework | app/, pages, middleware |
| postgres | PostgreSQL driver | lib/db.ts |
| drizzle-orm | ORM, schema, relations | drizzle/, services/ |
| tsx | TypeScript execution engine | scripts/ (seed, rollback) |
| dotenv | Environment variable loading | scripts/ (seed, rollback) |
| better-auth | Authentication + plugins | lib/auth.ts |
| @better-auth/infra | Dash dashboard plugin + sentinel security | lib/auth.ts |
| @tanstack/react-query | Client data fetching | hooks/useAuth.ts, app/page.tsx |
| framer-motion | Animation | components/ |
| tailwindcss | Styling | app/, components/ |
| shadcn/ui (via Cl* wrappers) | UI primitives (wrapped) | components/ui/ |
| zod | Schema validation (package.json) | — |
| Not yet wired: Paystack SDK, Cloudinary SDK, Mux SDK, googleapis, resend | — | — |
| bcryptjs | Password hashing (seed — replaced by Better Auth API calls) | scripts/seed.ts |
| @sanity/client, @sanity/image-url | Sanity CMS content fetching + image URL builder | lib/sanity.ts, sanity/, app/(public)/blog/ |

---

## Circular Dependency Warnings

[None detected]

---

## Dependency Rules

- Pages may depend on Components, Services, and Hooks — not the other way around
- Services may depend on Lib, Types, and Drizzle — not the other way around
- Components/ui (Cl* wrappers) must not depend on feature components
- Lib must not depend on Services or Components
- Types must have zero dependencies on application code
- Config must not depend on any application code (only used by it)
- Third-party SDKs must only be imported in lib/ — never directly in services or components
