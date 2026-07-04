# Dependency Graph

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: 2026-07-04
> - staleness-policy: auto-regenerable — can be derived from import analysis tools. Manual content only for conventions and rules that cannot be inferred from code.

> **Overview:** Maps how modules depend on each other. Agents use this to understand the impact of changes.

---

## Module Dependency Map

```
Page / Route Components
  → Feature Components (explore/, profile/, booking/, blog/)
  → UI Wrappers (components/ui/Cl*)
  → Services (via server components or API routes)
  → Hooks (useAuth, TanStack Query)

UI Wrappers (Cl*)
  → shadcn/ui primitives (isolated behind Cl* interface)
  → ConfigContext (platform config via React context)
  → Tailwind CSS (design tokens via CSS custom properties)

Services
  → Lib (DB client, third-party wrappers)
  → Types (interfaces, enums)
  → Drizzle ORM (database operations)

API Routes
  → Services (business logic)
  → Lib (auth helpers, third-party wrappers)
  → Types (request/response types)

Config Module
  → platform.config.ts (hardcoded fallback)
  → Supabase (DB override at runtime)
  → ConfigContext (React context for frontend consumption)

Auth (Better Auth)
  → Supabase adapter (session storage)
  → lib/auth.ts (auth instance, helpers)
  → hooks/useAuth.ts (client-side hook)

Lib Module
  → Third-party SDKs (Paystack, Cloudinary, Mux, Google Drive, Supabase, Sanity, Resend)
  → Types (input/output types)

Drizzle
  → drizzle/schema.ts (single source of truth)
  → Supabase (database connection)
  → Migrations (drizzle-kit)

Sanity CMS
  → Sanity client SDK
  → Blog schema, Creator spotlight schema
```

---

## External Dependencies

| Package | Purpose | Used In |
|---------|---------|---------|
| next | Framework | app/, pages |
| @supabase/supabase-js | Database, auth sessions | lib/db.ts, lib/auth.ts |
| drizzle-orm | ORM, schema, migrations | drizzle/, services/ |
| better-auth | Authentication | lib/auth.ts |
| paystack | Payment processing | lib/paystack.ts, services/PaymentService |
| @cloudinary/next | Image/video upload | lib/cloudinary.ts, components/ |
| @mux/mux-node | Video streaming | lib/mux.ts |
| googleapis | Google Drive File API | lib/drive.ts, services/DriveService |
| @sanity/client | CMS content | sanity/, components/blog/ |
| resend | Email delivery | lib/email.ts |
| framer-motion | Animation | components/ |
| @tanstack/react-query | Data fetching | hooks/ |
| tailwindcss | Styling | app/, components/ |
| shadcn/ui | UI primitives (wrapped) | components/ui/ |

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
