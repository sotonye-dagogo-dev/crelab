# Project Plan

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: 2026-07-04
> - staleness-policy: re-verify if project scope or phase changes

> **Overview:** High-level feature checklist organized by development phase per ROADMAP.md. See `planning/task-queue.md` for granular, sprint-level tasks.

---

## Phase 1 — MVP (5 Weeks)

### Milestone 1.0 — Foundation (Week 1)

- [ ] Repo & Tooling: Next.js 15, Tailwind, Vercel, ESLint, Prettier, Husky
- [ ] Platform Config Shell: config/platform.config.ts, PlatformConfigService, ConfigContext
- [ ] Global Types: all entity interfaces, enums, API wrapper types in /types
- [ ] Drizzle Schema & Migrations: full schema, RLS policies, seed categories
- [ ] Auth: Better Auth, register/login, role selection, NDPR consent capture
- [ ] Cl* Component Wrapper Layer: shadcn/ui wrapped as ClButton, ClCard, etc.
- [ ] Sanity CMS Init: blog schema, creator spotlight schema, /blog routes

### Milestone 1.1 — Provider Supply Side (Week 2)

- [ ] Provider Onboarding Wizard: multi-step (category -> details -> packages -> portfolio -> preview)
- [ ] Provider Profile Page (/profile/[slug]): cover video hero, identity bar, portfolio, packages, reviews
- [ ] Portfolio Upload: drag-and-drop, Cloudinary, thumbnails, reorder, max 20 items
- [ ] Google Drive Portfolio Sync: URL ingest, file fetch, thumbnails, upsert, daily cron
- [ ] Provider Dashboard (basic): profile completeness, booking pipeline counts, quick stats

### Milestone 1.2 — Discovery & Client Side (Week 3)

- [ ] Explore Feed: masonry grid, video autoplay, infinite scroll, config-driven filter bar, full-text search
- [ ] Category Browse (/[category]): pre-filtered, category hero with stats
- [ ] Search Results (/search?q=): full-text, term highlighting, filter pills

### Milestone 1.3 — Booking & Payment (Week 4)

- [ ] Booking Request Flow: auth gate, package selection, date picker, scope notes, price breakdown
- [ ] Paystack Integration: inline checkout, webhook handler with HMAC-SHA512 verification
- [ ] Escrow State Machine: HELD -> IN_PROGRESS -> RELEASED/DISPUTED/REFUNDED
- [ ] Escrow Timeline UI: visual state machine with live countdown
- [ ] Booking Detail Page (/bookings/[id]): booking summary, escrow timeline, action zone
- [ ] Cron endpoints: service date setInProgress, autoRelease

### Milestone 1.4 — Admin & SEO (Week 5)

- [ ] Admin Panel: config editor, category manager, provider review queue, dispute dashboard, analytics
- [ ] Blog System: Sanity CMS, /blog, /blog/[slug], creator spotlights, SEO meta
- [ ] sitemap.xml, robots.txt

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
