# Project AI Context

> **Metadata**
> - last-updated-by: feature-plan-execution
> - last-verified-against-code: 2026-07-06 (Navbar, Footer, Theme System, Mock Data)
> - staleness-policy: re-verify before trusting if project structure has changed

> **Overview:** Crelab is a dark, cinematic, video-first creative services marketplace for Nigeria. Providers (content creators, cinematographers) showcase video portfolios and get hired based on quality — not follower count. Clients book with transparent pricing and pay via Paystack escrow.

---

## Quick Reference

| Field | Value |
|-------|-------|
| Project Name | Crelab |
| Type | Web App — Video-First Creative Marketplace |
| Primary Language | TypeScript 5 (strict) |
| Frontend | Next.js 15.3.x (App Router) |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Supabase) + Drizzle ORM |
| Styling | Tailwind CSS 4.x + shadcn/ui (wrapped as Cl* components) |
| Animation | Framer Motion 12.x |
| Auth | Better Auth 1.6.x (standalone, Supabase adapter) |
| Payment | Paystack (primary) + Flutterwave (fallback) |
| Video | Cloudinary (upload/thumbnails) + Mux (streaming) |
| CMS | Sanity CMS (blog + creator spotlights) |
| File Sync | Google Drive Files API v3 |
| Deployment | Vercel + Supabase |
| AI Pipeline | .ai-system + Open Design -> Open Code |

---

## Key Modules

| Module | Location | Purpose |
|--------|----------|---------|
| App Router | `app/` | Next.js 15 route groups: (public), (auth), admin, api |
| UI Wrappers | `components/ui/` | Cl* wrappers around shadcn/ui primitives |
| Feature Components | `components/explore/`, `components/profile/`, `components/booking/`, `components/blog/`, `components/shared/` | Domain-specific UI |
| Layout Components | `components/shared/Navbar.tsx`, `components/shared/Footer.tsx` | Fixed navbar + footer on all public pages |
| Theme System | `lib/theme-context.tsx`, `components/shared/ThemeToggler.tsx` | system/light/dark toggle via CSS custom properties |
| Services | `services/` | OOP class-based: BookingService, DriveService, EscrowService, ExploreService, MockDataService, PaymentService, PlatformConfigService, PortfolioService |
| Types | `types/` | Global TypeScript interfaces, barrel export via index.ts |
| Config | `config/platform.config.ts` | Hardcoded fallback config (DB overrides at runtime) |
| Database | `drizzle/schema.ts` | Drizzle schema — single source of truth for DB shape + migrations |
| Auth | `lib/auth.ts` | Better Auth instance + helpers |
| Third-party | `lib/paystack.ts`, `lib/cloudinary.ts`, `lib/mux.ts`, `lib/drive.ts`, `lib/db.ts` | Isolated third-party wrappers |
| Mock Data | `services/MockDataService.ts` | Simulated data for exploration without DB (enable via `NEXT_PUBLIC_MOCK_DATA=true`) |
| AI System | `.ai-system/` | AI-assisted development governance + design system docs |

---

## Entry Point

The AI system documentation lives in `.ai-system/`.

Start with: `.ai-system/protocols/entry-protocol.md`

---

## Active Development Focus

Active development — Milestones 1.0-1.4 substantially complete. See `.ai-system/summaries/dev-history.md` for sprint log.

**Recently completed:**
- Navbar (fixed, all public pages) with config-driven platform name and auth-aware actions
- Footer (all public pages) with config-driven dev credit ("built by S.D." → sotonye-dagogo.is-a.dev)
- Theme system (system/light/dark) with CSS custom properties in `app/globals.css`
- ThemeToggler component (tabbed UI) available in Navbar
- Light theme token set (`.light` class in globals.css)
- MockDataService for simulation without DB (`NEXT_PUBLIC_MOCK_DATA=true`)
- Team page fallback: renders mock data when DB unavailable
- Design system docs in `.ai-system/` (DESIGN.md, tokens/components/team-page HTML specs)

**Next:** onboarding wizard UI, tests. Phase 2: dashboards, messaging, notifications.
