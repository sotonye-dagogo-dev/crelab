# Dependency Graph

> **Metadata**
> - last-updated-by: update-ai-system
> - last-verified-against-code: 2026-07-05
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

Auth (Better Auth)
  → Better Auth standalone instance (lib/auth.ts)
  → Drizzle adapter → drizzle/schema.ts (user, session, account, verification)
  → hooks/useAuth.ts (client-side hook)
  → middleware.ts (route protection)

Lib Module
  → Third-party SDKs (Paystack, Cloudinary, Google Drive, postgres, Supabase)
  → Types (input/output types)
  → crypto (HMAC-SHA512 webhook verification)

Drizzle
  → drizzle/schema.ts (329 lines, single source of truth — exports all tables, enums, relations)
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
| better-auth | Authentication + plugins | lib/auth.ts |
| @tanstack/react-query | Client data fetching | hooks/useAuth.ts, app/page.tsx |
| framer-motion | Animation | components/ |
| tailwindcss | Styling | app/, components/ |
| shadcn/ui (via Cl* wrappers) | UI primitives (wrapped) | components/ui/ |
| zod | Schema validation (package.json) | — |
| Not yet wired: Paystack SDK, Cloudinary SDK, Mux SDK, googleapis, @sanity/client, resend | — | — |

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
