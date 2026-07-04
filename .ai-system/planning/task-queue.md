# Development Task Queue

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: 2026-07-04
> - staleness-policy: re-verify before each session

> **Overview:** Sprint-level task queue with complexity tagging. Agents execute tasks top to bottom within the current sprint. Each task is sized so it can be completed in a single session.

---

## Complexity Tags

| Tag | Meaning | Recommended Command |
|-----|---------|-------------------|
| `[XS]` | Trivial — single file, known pattern | dev-cycle.md |
| `[S]` | Small — 1-3 files, well-understood | dev-cycle.md |
| `[M]` | Medium — 3-8 files, some planning needed | dev-cycle.md with plan-feature pre-read |
| `[L]` | Large — feature spanning modules | execute-feature.md |
| `[XL]` | Very large — architecture-affecting | execute-feature.md, requires architect role |
| `[BUG]` | Bug fix | fix-build.md |

---

## Current Sprint — Milestone 1.0: Foundation (Week 1)

| Size | Task | Status |
|------|------|--------|
| [S] | Init Next.js 15 App Router with TypeScript strict mode + Tailwind CSS v4 | [ ] |
| [S] | Configure Vercel deployment (preview + production environments) | [ ] |
| [S] | Set up ESLint, Prettier, Husky pre-commit hooks | [ ] |
| [M] | Create config/platform.config.ts with all hardcoded fallback values | [ ] |
| [M] | Create PlatformConfigService (class, static methods) + ConfigContext | [ ] |
| [S] | Create Supabase table: platform_config (key TEXT UNIQUE, value JSONB, updated_at) | [ ] |
| [M] | Define all entity interfaces in /types (IUser, IProvider, IBooking, etc.) | [ ] |
| [M] | Define enums (BookingStatus, EscrowState, UserRole, ExperienceLevel) | [ ] |
| [S] | Create ApiResponse<T> and PaginatedResponse<T> wrapper types | [ ] |
| [M] | Define full Drizzle schema in drizzle/schema.ts | [ ] |
| [M] | Apply initial migration via drizzle-kit | [ ] |
| [M] | Enable Supabase RLS on all tables (policy migrations) | [ ] |
| [S] | Seed initial categories: content-creator, cinematographer | [ ] |
| [M] | Install and configure Better Auth v1.6 with Supabase adapter | [ ] |
| [S] | Create app/api/auth/[...all]/route.ts — Better Auth API handler | [ ] |
| [M] | Create lib/auth.ts: auth instance, getSession(), requireAuth(), requireRole() | [ ] |
| [S] | Create Next.js middleware — protect dashboard, bookings, admin routes | [ ] |
| [M] | Create hooks/useAuth.ts — client-side auth hook | [ ] |
| [M] | Implement registration flow: email + phone + role selection + consent | [ ] |
| [M] | Create Cl* wrappers for all shadcn/ui primitives (ClButton, ClCard, etc.) | [ ] |
| [S] | Create shared AuthGate.tsx component | [ ] |
| [M] | Init Sanity CMS project and Next.js integration | [ ] |
| [S] | Create blog post schema and creator spotlight schema in Sanity | [ ] |
| [S] | Create /blog and /blog/[slug] routes with ISR | [ ] |

---

## Up Next — Milestone 1.1: Provider Supply Side (Week 2)

| Size | Task |
|------|------|
| [XL] | Provider Onboarding Wizard: multi-step form with category-specific fields |
| [L] | Provider Profile Page: cover video hero, identity bar, portfolio, packages, reviews |
| [M] | Portfolio Upload: drag-and-drop, Cloudinary, thumbnails, reorder |
| [L] | Google Drive Portfolio Sync: URL validation, ingest, cron, UI |
| [M] | Provider Dashboard (basic) |

---

## Backlog

| Size | Task |
|------|------|
| [L] | Explore Feed: masonry grid, video autoplay, infinite scroll, filter bar, search |
| [M] | Category Browse page |
| [S] | Search Results page |
| [XL] | Booking Request Flow + Paystack Integration + Escrow State Machine |
| [M] | Admin Panel |
| [M] | Blog System from Sanity |

---

## Completed This Sprint

| Task | Completed |
|------|-----------|
| .ai-system bootstrap and project documentation population | 2026-07-04 |
| 19 HTML design system screens | Complete (pre-bootstrap) |

---

## Notes

- Greenfield project — no application code exists yet
- First task: npm init Next.js 15 with TypeScript strict mode
- All monetary values must be stored as integers (kobo) — never floating point
- All UI must use Cl* wrappers, never raw shadcn/ui imports
- Config before code: define config structure before building features
