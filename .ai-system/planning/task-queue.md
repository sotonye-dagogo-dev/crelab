# Development Task Queue

> **Metadata**
> - last-updated-by: update-ai-system
> - last-verified-against-code: 2026-07-05
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

## Completed Sprint — Milestone 1.0: Foundation

All items completed except Provider Dashboard and Client Dashboard (deferred). All Milestones substantially complete.

---

## Current Tasks — Remaining Work

| Size | Task | Status |
|------|------|--------|
| [M] | Write tests for all services | [ ] |
| [M] | Provider Dashboard (full) with earnings, kanban pipeline, availability calendar | [ ] |
| [L] | In-platform messaging (Phase 2) | [ ] |
| [M] | Notifications: email (Resend) + in-app notification centre | [ ] |
| [M] | Client Dashboard: active bookings, booking history, payment history | [ ] |

---

## Backlog

| Size | Task |
|------|------|
| [M] | Client Dashboard: active bookings, booking history, payment history |
| [M] | Reviews & ratings: mutual post-service, "Verified Booking" badge |
| [M] | Pricing guidance widget: anonymised aggregate rates by category |
| [L] | Identity verification: BVN/NIN check via Dojah or Smile Identity |
| [L] | Algorithm & personalisation: personalised Explore feed, saved searches |
| [M] | Promoted listings: paid featured placement, "Sponsored" label |
| [L] | Video analytics: per-video play counts, view duration, conversion rate |
| [S] | PWA as interim mobile experience |
| [XL] | API / white-label embed: booking widget, public provider discovery API |

---

## Completed

| Task | Completed |
|------|-----------|
| .ai-system bootstrap and project documentation population | 2026-07-04 |
| 19 HTML design system screens | 2026-07-04 |
| Init Next.js 15 with TypeScript strict + Tailwind v4 | 2026-07-05 |
| Platform config shell + PlatformConfigService + ConfigContext | 2026-07-05 |
| Global types: entity interfaces, enums, API wrappers, explore types | 2026-07-05 |
| Drizzle schema (329 lines, all tables/enums/relations) + migrations | 2026-07-05 |
| Better Auth: instance, API handler, middleware, client hook | 2026-07-05 |
| Cl* component wrappers (10 primitives) | 2026-07-05 |
| AuthGate shared component | 2026-07-05 |
| NDPR consent capture server action | 2026-07-05 |
| Provider Profile page + components (Hero, PortfolioGrid, ServicePackages, Reviews, WorkHistory) | 2026-07-05 |
| Portfolio service CRUD + reorder + hide | 2026-07-05 |
| Google Drive sync: URL validation, fetch files, ingest, cron, service | 2026-07-05 |
| Explore feed: service, API, filter bar, masonry grid, infinite scroll | 2026-07-05 |
| Category browse + search results pages | 2026-07-05 |
| Booking service + state machine + legal transitions | 2026-07-05 |
| Escrow service: initiate, webhook handler, setInProgress, release, dispute, resolution | 2026-07-05 |
| Payment service: init, split payout, refund | 2026-07-05 |
| BookingDrawer, EscrowTimeline, DisputeModal components | 2026-07-05 |
| Admin panel: layout, sidebar, config editor, category manager, provider queue, dispute dashboard | 2026-07-05 |
| OC-7: Wrapper compliance audit (all clean) | 2026-07-05 |
| OC-7: Config compliance — replaced hardcoded "Crelab"/"CreLab"/"#E8FF47" with config values | 2026-07-05 |
| OC-7: Money audit (all money arithmetic uses Math.round() on kobo) | 2026-07-05 |
| OC-7: Performance: N+1 audit, cursor pagination, IntersectionObserver verified | 2026-07-05 |
| OC-7: Accessibility: focus-visible rings, aria-labels, muted videos, reduced-motion support | 2026-07-05 |
| OC-7: NDPR compliance: created /privacy, /terms pages, CookieConsentBanner, consent recording on register | 2026-07-05 |
| OC-7: Production gate: build + tsc + lint pass with zero errors/warnings | 2026-07-05 |

---

## Notes

- All monetary values must be stored as integers (kobo) — never floating point
- All UI must use Cl* wrappers, never raw shadcn/ui imports
- Config before code: define config structure before building features
- Paystack webhook uses raw-body + HMAC-SHA512 verification
- Booking state transitions validated by LEGAL_TRANSITIONS map
