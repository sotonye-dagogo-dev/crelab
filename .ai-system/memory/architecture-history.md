# Architecture History

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: 2026-07-04
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

[New entries added here as architecture evolves]
