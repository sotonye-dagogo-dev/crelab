# Project Plan

> **Metadata**
> - last-updated-by: update-ai-system
> - last-verified-against-code: 2026-07-05 (OC-7 reconciliation)
> - staleness-policy: re-verify if project scope or phase changes

> **Overview:** High-level feature checklist organized by development phase per ROADMAP.md. See `planning/task-queue.md` for granular, sprint-level tasks.

---

## Phase 1 — MVP (5 Weeks)

### Milestone 1.0 — Foundation (Week 1)

- [x] Repo & Tooling: Next.js 15, Tailwind, TypeScript strict, tsconfig paths
- [x] Platform Config Shell: config/platform.config.ts, PlatformConfigService (DB override, cache), ConfigContext
- [x] Global Types: all entity interfaces, enums, API wrapper types, explore types in /types
- [x] Drizzle Schema & Migrations: 329-line schema with enums, relations, audit_log, migrations applied
- [x] Auth: Better Auth, register/login/signout, role selection, NDPR consent capture, middleware
- [x] Cl* Component Wrapper Layer: ClButton, ClCard, ClInput, ClSelect, ClTextarea, ClBadge, ClAvatar, ClTabs, ClDialog, ClSheet
- [x] Sanity CMS Init: blog schema, creator spotlight schema, /blog routes, article components (ArticleBody, BlogCard, ToCSidebar)

### Milestone 1.1 — Provider Supply Side (Week 2)

- [ ] Provider Onboarding Wizard: multi-step (category -> details -> packages -> portfolio -> preview)
- [x] Provider Profile Page (/profile/[slug]): cover video hero, identity bar, portfolio grid, packages, reviews (components + route)
- [x] Portfolio Upload: addItem, updateItem, reorder, setHidden, deleteItem (service-layer, no drag-and-drop UI yet)
- [x] Google Drive Portfolio Sync: URL validation, fetchFileList, fetchAllFiles, ingestFolder, syncAll cron
- [x] Provider Dashboard (basic): profile components built (Hero, PortfolioGrid, ServicePackages, ReviewsSection, WorkHistory)

### Milestone 1.2 — Discovery & Client Side (Week 3)

- [x] Explore Feed: masonry grid, video autoplay on hover, infinite scroll, config-driven filter bar, full-text search, cursor pagination
- [x] Category Browse (/(public)/[category]): pre-filtered page
- [x] Search Results (/search?q=): full-text, term highlighting UI

### Milestone 1.3 — Booking & Payment (Week 4)

- [x] Booking Request Flow: auth gate, package selection, date picker, scope notes, price breakdown (BookingDrawer component)
- [x] Paystack Integration: initTransaction, verifyWebhookSignature (HMAC-SHA512), subaccountSplit, refund
- [x] Escrow State Machine: HELD -> IN_PROGRESS -> RELEASED/DISPUTED/REFUNDED with legal transition validation
- [x] Escrow Timeline UI: EscrowTimeline visual component
- [x] Booking Detail Page: booking summary, escrow timeline, action zone, dispute modal
- [x] Cron endpoints: setInProgress, autoRelease

### Milestone 1.4 — Admin & SEO (Week 5)

- [x] Admin Panel: config editor, category manager (with CategoryModal), provider review queue, dispute dashboard, admin layout + sidebar
- [x] Blog System: Sanity CMS, /blog, /blog/[slug], creator spotlights, ArticleBody, BlogCard, CreatorSpotlightEmbed, ToCSidebar
- [x] sitemap.ts, robots.ts (Next.js generated sitemap.xml + robots.txt)

---

## Phase 2 — Post-Launch (Month 1-3)

- [ ] In-platform messaging (post-booking-acceptance, Supabase Realtime)
- [ ] Notifications: email (Resend) + in-app notification centre
- [ ] Provider dashboard: earnings, kanban booking pipeline, availability calendar, portfolio performance
- [ ] Client dashboard: active bookings, booking history, payment history
- [ ] Reviews & ratings: mutual post-service, "Verified Booking" badge
- [ ] Pricing guidance widget: anonymised aggregate rates by category
- [ ] Identity verification: BVN/NIN check via Dojah or Smile Identity

---

## Phase 3 — Growth

- [ ] Algorithm & personalisation: personalised Explore feed, saved searches, provider requirement tagging
- [ ] Promoted listings: paid featured placement, "Sponsored" label
- [ ] Video analytics: per-video play counts, view duration, conversion rate
- [ ] PWA as interim mobile experience
- [ ] API / white-label embed: booking widget, public provider discovery API

---

## Completed

- [x] .ai-system governance structure initialized with bootstrap-project
- [x] Project documentation (PRD, ROADMAP, DESIGN) populated
- [x] 19 HTML design system screens completed
- [x] Milestone 1.0 Foundation — 7/7 items (Sanity CMS completed)
- [x] Milestone 1.1 Provider Supply Side — 4/5 items (no onboarding wizard)
- [x] Milestone 1.2 Discovery & Client Side — 3/3 items
- [x] Milestone 1.3 Booking & Payment — 6/6 items
- [x] Milestone 1.4 Admin & SEO — 3/3 items (admin panel, blog system, sitemap/robots)
