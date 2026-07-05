# Architecture History

> **Metadata**
> - last-updated-by: update-ai-system
> - last-verified-against-code: 2026-07-05
> - staleness-policy: historical entries do not go stale — only the current architecture (in system-architecture.md) needs re-verification

> **Overview:** Chronological record of how Crelab's system architecture has evolved.

---

## History

### 2026-07-04 — Initial Architecture

**State:**
Greenfield project. No application code yet. .ai-system governance structure initialized via bootstrap-project command. Full PRD (v2.1), ROADMAP (v1.1), and DESIGN (v1.1) documented. 19 HTML design screens completed in `.ai-system/designs/`.

Planned architecture: Next.js 15 App Router with route groups ((public), (auth), (admin), api/), OOP class-based services, interface-first TypeScript types, Drizzle ORM on Supabase PostgreSQL, Better Auth for standalone authentication, Paystack for payments with escrow state machine.

**Rationale:**
Metadata-driven, config-first architecture chosen so platform name, colours, fee rates, and categories are admin-configurable without code changes. Cl* wrappers around shadcn/ui isolate third-party UI dependencies. Service layer provides testable, injectable business logic. Supabase RLS ensures privacy by design from first migration.

---

### 2026-07-05 — Full MVP Build Sprint

**State:**
Milestones 1.0-1.4 substantially built in a single sprint. Application code now exists across the full stack: Next.js routes (public, auth, admin, API), 7 OOP services, 329-line Drizzle schema with migrations, Better Auth integration, 30+ React components, 8 lib wrappers, middleware route protection, and admin panel.

**Key architectural decisions realized in code:**
- PlatformConfigService with DB override + `unstable_cache` + `revalidateTag` pattern
- BookingService with LEGAL_TRANSITIONS map for state validation
- EscrowService with `setInProgress`/`autoRelease` cron endpoints and Paystack webhook HMAC-SHA512 verification
- ExploreService with cursor-based pagination via composite `(createdAt, id)` keys encoded in base64url
- DriveService with folder URL validation, paginated file fetch, supported MIME type filtering
- All monetary values in kobo (integer) — no float arithmetic

**Drift from original architecture:**
- `app/admin/` not `app/(admin)/` — no route group wrapping for admin
- No `sanity/` directory or Sanity CMS integration yet
- `services/ReviewService.ts` not implemented (reviews handled inline in schema)
- `lib/mux.ts` stub only
- `components/blog/` directory present but empty

---
