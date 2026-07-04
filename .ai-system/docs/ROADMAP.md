# Crelab — ROADMAP.md
**Version:** 1.1  
**Metadata:** last-verified-against-code: 2026-07-04  
**Pipeline Stage:** PRD -> ROADMAP -> DESIGN -> PROMPTS -> Open Design -> Open Code  
**Stack:** Next.js 15.3.x · TypeScript 5 · PostgreSQL (Supabase) · Paystack · Cloudinary · Mux · Better Auth · Sanity · Drizzle ORM  
**Architecture:** Metadata-driven · Config-first · Standalone · .ai-system governed  

---

## Architecture Invariants

These are non-negotiable across every phase. Every prompt, component, and service must respect these.

1. Config before code. Platform name, fee rate, escrow days, category list, feature flags — always in platform.config.ts with DB override capability. Never hardcode.
2. Wrapper components. All shadcn/ui consumed via Cl* wrappers (ClButton, ClCard, ClInput, ClBadge, etc.). No raw shadcn in feature code.
3. OOP services. BookingService, EscrowService, PortfolioService, DriveService, PaymentService — all class-based, interface-first, injectable.
4. Interface-first TypeScript. All entities, API responses, service inputs/outputs typed before implementation. Types in /types — single source. Barrel export via /types/index.ts.
5. Metadata-driven categories. Category field schemas in JSONB. Adding a new category = admin panel entry only, zero code.
6. Role-aware components. Components adapt to role via context — not separate provider/client trees.
7. Money in kobo. All monetary values are integers (kobo). No floating point arithmetic on money values anywhere in the codebase.
8. Privacy by design. Consent records, data minimisation, and RLS on all Supabase tables from the first migration.

---

## Repository Structure

```
crelab/
├── .ai-system/              # AI-assisted development governance
├── app/                     # Next.js 15 App Router
│   ├── (public)/            # Guest-accessible
│   │   ├── page.tsx         # Landing / Explore
│   │   ├── explore/
│   │   ├── [category]/
│   │   ├── profile/[slug]/
│   │   └── blog/
│   ├── (auth)/              # Better Auth gated routes
│   │   ├── dashboard/
│   │   ├── bookings/
│   │   ├── profile/edit/
│   │   └── messages/
│   ├── (admin)/             # ADMIN role only
│   └── api/
│       ├── auth/            # Better Auth API handler
│       ├── explore/
│       ├── bookings/
│       ├── portfolio/
│       ├── webhooks/paystack/
│       ├── cron/escrow/
│       └── admin/
├── components/
│   ├── ui/                  # Cl* wrappers
│   ├── explore/
│   ├── profile/
│   ├── booking/
│   ├── blog/
│   └── shared/
├── services/                # OOP service classes
│   ├── BookingService.ts
│   ├── EscrowService.ts
│   ├── PortfolioService.ts
│   ├── DriveService.ts
│   ├── PaymentService.ts
│   └── ReviewService.ts
├── types/                   # Global TypeScript interfaces
│   ├── platform.ts
│   ├── booking.ts
│   ├── provider.ts
│   ├── payment.ts
│   ├── portfolio.ts
│   └── index.ts             # barrel
├── config/
│   └── platform.config.ts   # Hardcoded fallback (DB overrides at runtime)
├── lib/
│   ├── auth.ts              # Better Auth instance + helpers
│   ├── db.ts                # Drizzle + Supabase client
│   ├── paystack.ts
│   ├── cloudinary.ts
│   ├── mux.ts
│   └── drive.ts
├── drizzle/
│   ├── schema.ts            # Drizzle schema (single source of truth for DB shape)
│   └── migrations/
├── sanity/                  # Sanity CMS config + schemas
└── public/
```

---

## Phase 1 — MVP

### Milestone 1.0 — Foundation (Week 1)

#### 1.0.1 Repo & Tooling
- [ ] Init Next.js 15 App Router with TypeScript strict mode
- [ ] Configure Tailwind CSS v4 with CSS custom properties for design tokens
- [ ] Set up Vercel deployment (preview + production environments)
- [ ] Configure .ai-system directory from template
- [ ] ESLint, Prettier, Husky pre-commit hooks

#### 1.0.2 Platform Config Shell
- [ ] Create config/platform.config.ts with all hardcoded fallback values
  - Platform name, tagline, primaryColor
  - feeRate (0.05), escrowReleaseDays (5), cancellation policy config
  - Initial category definitions with fieldSchema JSONB shapes
  - Feature flags: guestBrowse, googleDriveSync, blogEnabled
- [ ] Create PlatformConfigService (class, static methods) — loads from DB, falls back to file config
- [ ] Create ConfigContext — wraps app, exposes config to all components
- [ ] Supabase table: platform_config (key TEXT UNIQUE, value JSONB, updated_at)

#### 1.0.3 Global Types
- [ ] Define all entity interfaces in /types before any service or component
  - IUser, IProvider, IPortfolioItem, IBooking, IPayment, IReview, IDispute, IConsentRecord
  - IPlatformConfig, ICategoryConfig, IServicePackage
  - BookingStatus, EscrowState, PortfolioItemSource, UserRole, ExperienceLevel enums
  - ApiResponse<T>, PaginatedResponse<T> wrapper types
- [ ] Barrel export in /types/index.ts

#### 1.0.4 Drizzle Schema & Migrations
- [ ] Define full Drizzle schema in drizzle/schema.ts (mirrors PRD data model)
  - All money columns as integer (kobo), with JSDoc comment
  - status columns as text with check constraints (not pg enums — easier to extend)
- [ ] Apply initial migration via drizzle-kit
- [ ] Enable Supabase RLS on all tables (policy migrations in 002_rls.sql)
- [ ] Seed initial categories: content-creator, cinematographer

#### 1.0.5 Auth — Better Auth
- [ ] Install and configure Better Auth v1.6 with Supabase adapter
- [ ] app/api/auth/[...all]/route.ts — Better Auth API handler
- [ ] lib/auth.ts — auth instance, getSession(), requireAuth(), requireRole()
- [ ] Next.js middleware — protect /dashboard, /bookings, /profile/edit, /admin
- [ ] hooks/useAuth.ts — client-side: { user, role, isAuthenticated, signIn, signOut }
- [ ] Registration flow: email + phone + role selection (Provider / Client)
- [ ] Consent capture at registration: separate checkboxes, stored in consent_records
- [ ] After register: Provider → /profile/setup, Client → returnTo or /explore
- [ ] components/shared/AuthGate.tsx — wrapper that checks auth and triggers modal on protected actions

#### 1.0.6 Component Wrapper Layer
- [ ] Cl* wrappers for all shadcn/ui primitives: ClButton, ClInput, ClTextarea, ClSelect, ClCard, ClBadge, ClDialog, ClSheet, ClTabs, ClAvatar, ClSkeleton
- [ ] Each wrapper accepts all native props + optional platform config injection
- [ ] Document wrapper contract in .ai-system

#### 1.0.7 Sanity CMS Init
- [ ] Sanity project creation and Next.js integration
- [ ] Blog post schema: title, slug, content (portable text), metaDescription, tags, publishedAt
- [ ] Creator spotlight schema: providerSlug (links to DB), body, publishedAt
- [ ] /blog and /blog/[slug] routes (static generation with ISR)

---

### Milestone 1.1 — Provider Supply Side (Week 2)

#### 1.1.1 Provider Onboarding Wizard
- [ ] Multi-step wizard: Category → Profile Details → Packages → Portfolio → Preview
- [ ] Step 1: Category selection — rendered from platformConfig.categories, not hardcoded
- [ ] Step 2: Category-specific fields rendered dynamically from fieldSchema JSONB
  - Content Creator: niche tags, content style, active platforms
  - Cinematographer: equipment, shooting style, coverage type (events/commercial/narrative)
- [ ] Step 3: Bio (300 char limit), location, years active, experience level
- [ ] Step 4: Service packages — 3 tiers, each with label, price (NGN), deliverables list, turnaround days
- [ ] Step 5: Portfolio (see 1.1.3)
- [ ] Wizard state persists if user exits mid-flow
- [ ] Profile goes live on wizard completion (New badge; admin review within 48h)

#### 1.1.2 Provider Profile Page (/profile/[slug])
- [ ] Cover video hero: full-width 16:9, autoplay muted looped, no visible controls
- [ ] Identity bar: avatar (72px), display name, category badge, location, years active, experience level, star rating + review count, availability badge, primary CTA (Request Booking) + secondary (View Packages)
- [ ] Portfolio grid: masonry, 3-col desktop — same ExploreVideoCard component
- [ ] Service packages: 3 cards; Standard highlighted with accent border + "Most Popular" badge; price in JetBrains Mono; deliverables checklist; Book CTA per card
- [ ] Work history list: client name (or "Confidential"), deliverable type, date, "Verified on Crelab" badge for platform bookings
- [ ] Reviews: aggregate star + individual review cards with "Verified Booking" badge
- [ ] Google Drive portfolio section (if Drive linked — see 1.1.4)
- [ ] Mobile: sticky bottom booking bar. Desktop: sticky right-sidebar booking widget.
- [ ] Platform name in <title>: "{providerName} — {platformConfig.name}" (from config, not hardcoded)

#### 1.1.3 Portfolio Upload
- [ ] Drag-and-drop + file picker; mp4, mov, avi, jpg, png, pdf
- [ ] Cloudinary upload widget
- [ ] Video thumbnail auto-generated via Cloudinary video thumbnail API
- [ ] Reorder via drag-and-drop (updates order_index)
- [ ] Per-item caption/title, hide/show toggle
- [ ] Max 20 items (platformConfig-driven)

#### 1.1.4 Google Drive Portfolio Sync
- [ ] Provider settings: paste public Google Drive share URL
- [ ] DriveService.ingestFolder(providerProfileId, driveShareUrl):
  - Parse folder ID from URL (extract from /folders/[ID] pattern)
  - Fetch file list: Google Drive Files API v3, q="[folderId] in parents", key=GOOGLE_API_KEY, fields=files(id,name,mimeType,thumbnailLink,modifiedTime)
  - Filter mimeTypes: video/mp4, video/quicktime, image/jpeg, image/png, application/pdf
  - Generate Cloudinary thumbnails for video files
  - Upsert into portfolio_items with source=DRIVE, drive_file_id
  - Mark previously synced items not in current file list as hidden (not deleted)
  - Return: { added, updated, removed, errors }
- [ ] DriveService.validateFolderUrl(url): boolean
- [ ] DriveService.syncAll(): cron-callable, syncs all providers with drive_folder_url
- [ ] Drive section on profile page: same card UI, "Drive" badge, media embed modal on click
- [ ] Error states: folder not public / empty / API failure → clear UI message
- [ ] app/api/portfolio/drive/route.ts — POST: trigger sync for authenticated provider
- [ ] Vercel cron: daily Drive sync for all providers with Drive connected

#### 1.1.5 Provider Dashboard (Basic)
- [ ] /dashboard for PROVIDER role
- [ ] Profile completeness indicator
- [ ] Booking pipeline: Requested / Confirmed / In Progress / Completed counts
- [ ] Quick stats: profile views this week, portfolio plays this week

---

### Milestone 1.2 — Discovery & Client Side (Week 3)

#### 1.2.1 Explore Feed (/ and /explore)
- [ ] Masonry grid — CSS columns; 2-col mobile, 3-col tablet, 4-5-col desktop
- [ ] ExploreVideoCard:
  - Thumbnail (static) → autoplay muted looped video on 50% viewport entry (IntersectionObserver)
  - Smooth fade thumbnail → video (300ms)
  - Overlay: gradient from bottom; provider name (Syne), category badge (accent), star rating, price-from (JetBrains Mono)
  - Hover: scale 1.02, accent border glow, "View Profile" CTA
  - prefers-reduced-motion: static thumbnail always
- [ ] Infinite scroll — cursor-based pagination
- [ ] Filter bar (sticky): filter schema from platformConfig, not hardcoded
- [ ] Full-text search via PostgreSQL ts_vector
- [ ] Empty state with "Broaden filters" CTA

#### 1.2.2 Category Browse (/[category])
- [ ] Slugs from platformConfig.categories — not hardcoded routes
- [ ] Same grid as Explore, pre-filtered by category
- [ ] Category hero: name, description, active provider count
- [ ] SEO meta from category config

#### 1.2.3 Search Results (/search?q=)
- [ ] Full-text results in Explore grid layout
- [ ] Highlight matching terms

---

### Milestone 1.3 — Booking & Payment (Week 4)

#### 1.3.1 Booking Request Flow
- [ ] "Book This Package" → auth gate (guest) → booking request form
- [ ] Form: package pre-selected, service date picker, scope notes textarea, price breakdown (subtotal, fee % from platformConfig.feeRate, total)
- [ ] "How does escrow work?" collapsible explainer
- [ ] Submit → BookingService.createRequest()
- [ ] Provider notification (email via Resend + in-app)
- [ ] Provider response: Accept | Counter-propose (new date/price) | Decline with reason
- [ ] Client notification on provider response

#### 1.3.2 Escrow & Payment
- [ ] PaymentService wrapping Paystack API
- [ ] On booking acceptance → client payment prompt
- [ ] Paystack inline checkout (card data never touches Crelab servers — PCI SAQ A scope)
- [ ] Paystack webhook handler (app/api/webhooks/paystack/route.ts):
  - Verify HMAC-SHA512 signature before any processing
  - charge.success → EscrowService.onPaystackSuccess()
  - Return 200 immediately, process async
- [ ] EscrowService methods:
  - onPaystackSuccess(paystackRef): PENDING → HELD, set release_deadline
  - setInProgress(bookingId): HELD → IN_PROGRESS (cron, service date reached)
  - clientConfirmRelease(bookingId, clientId): IN_PROGRESS → RELEASED
  - autoRelease(bookingId): IN_PROGRESS → RELEASED (cron, deadline passed, no dispute)
  - raiseDispute(bookingId, clientId, reason): IN_PROGRESS → DISPUTED
  - resolveDispute(disputeId, outcome, adminNotes): admin only → RELEASED or REFUNDED
- [ ] Paystack subaccount split on RELEASED: fee deducted, provider receives net amount
- [ ] Cron (app/api/cron/escrow/route.ts):
  - Service dates reached today → setInProgress()
  - Release deadlines passed → autoRelease()
- [ ] Booking detail page (/bookings/[id]): booking summary, escrow timeline UI, scope notes, action zone (Confirm / Dispute / status)

#### 1.3.3 Escrow Timeline UI
- [ ] Visual state machine: HELD → IN_PROGRESS → RELEASE IN Nd → RELEASED
- [ ] Each node: empty circle (future), pulsing accent dot (current), green checkmark (complete), red exclamation (DISPUTED)
- [ ] Live countdown when IN_PROGRESS: "Auto-releases in X days Y hours" (updates every minute)
- [ ] Client CTAs: "Confirm Completion" (early release) + "Raise Dispute" (opens modal)
- [ ] Provider view: same timeline read-only, shows "You'll receive NGN X on release" (net of fee)

---

### Milestone 1.4 — Admin & SEO (Week 5)

#### 1.4.1 Admin Panel (/admin)
- [ ] Layout: fixed left sidebar, scrollable content area
- [ ] Platform Config Editor: form for each platform_config key, type-aware inputs (colour picker, number, toggle, text), save → PATCH /api/admin/config → revalidateTag('platform-config')
- [ ] Category Manager: table of categories; add/edit modal with slug, label, field schema builder; disable toggle
- [ ] Provider Review Queue: profiles where active=true and verified=false; approve/flag actions
- [ ] Dispute Dashboard: open disputes with booking summary; resolve modal (outcome + admin notes)
- [ ] Basic Analytics: total providers, total bookings, payment volume, dispute count, dispute rate
- [ ] Admin auth guard: requireRole('ADMIN') on all /admin routes and /api/admin/* routes

#### 1.4.2 Blog System
- [ ] Sanity CMS: publish posts without developer involvement
- [ ] /blog: index page, card grid, category filter tabs
- [ ] /blog/[slug]: article page, portable text renderer, related posts, "Find a Creator" CTA at end of every post
- [ ] Creator spotlight post type: embeds mini provider card (avatar, name, category, rating, "View Profile" CTA)
- [ ] SEO: title, metaDescription, OG image, Twitter card from Sanity fields
- [ ] sitemap.xml and robots.txt auto-generated (includes blog slugs and provider profile slugs)

---

## Phase 2 — Post-Launch (Month 1-3)

### Milestone 2.0 — Messaging
- [ ] In-platform messaging unlocked post-booking-acceptance
- [ ] Message thread keyed to booking_id
- [ ] Supabase Realtime for live message delivery
- [ ] File attachment support (share briefs, references)

### Milestone 2.1 — Notifications
- [ ] Email via Resend (booking request, acceptance/decline, payment captured, service reminder 48h, release countdown 24h, payment released, dispute raised)
- [ ] In-app notification centre (bell icon, list)
- [ ] Admin-configurable email templates stored in Sanity

### Milestone 2.2 — Full Provider Dashboard
- [ ] Earnings: total, pending in escrow, released this month
- [ ] Booking pipeline: kanban-style
- [ ] Availability calendar management
- [ ] Portfolio performance: views, video plays, profile-to-booking conversion rate
- [ ] Pricing guidance: anonymised aggregate rates for similar category + experience level

### Milestone 2.3 — Reviews & Trust
- [ ] Post-booking mutual review prompt (both parties)
- [ ] Review display: chronological, "Verified Booking" badge on Crelab-originated reviews
- [ ] Provider aggregate star rating (on Explore cards)
- [ ] Client trust score (visible to providers reviewing booking requests)

### Milestone 2.4 — Identity Verification
- [ ] BVN or NIN check via Dojah or Smile Identity API
- [ ] "Verified Identity" badge on profile (separate from portfolio verification)
- [ ] Configurable: required vs. optional at launch

---

## Phase 3 — Growth

### Milestone 3.0 — Algorithm & Personalisation
- [ ] Client preference profile from booking history
- [ ] Personalised Explore feed: category weight, budget range fit, style tags
- [ ] Provider requirement tagging: "FMCG experience", "Lagos on-site only", "Min 2 years"
- [ ] Saved searches + alerts
- [ ] Experience level filter: EMERGING / ESTABLISHED / VETERAN

### Milestone 3.1 — Promoted Listings
- [ ] Provider pays for featured placement
- [ ] Admin-configurable featured slot count per page
- [ ] "Sponsored" label (non-deceptive, clearly visible)

### Milestone 3.2 — Mobile Apps
- [ ] PWA as interim: add-to-home-screen, offline browse
- [ ] Post-funding: iOS + Android (assess React Native vs. native at that point)

### Milestone 3.3 — Video Analytics
- [ ] Per-video: play count, view duration, profile conversion rate
- [ ] Informs recommendation algorithm

### Milestone 3.4 — API & Embed
- [ ] Booking widget embeddable by agencies
- [ ] Public provider discovery API (authenticated, rate-limited)

---

## Engineering Checkpoints (End of Each Milestone)

- [ ] No raw shadcn imports in feature code (only Cl* wrappers)
- [ ] No hardcoded platform name, fee, or category in UI code — all from config
- [ ] All new entities have typed interfaces in /types before implementation
- [ ] All new services are class-based with exported interface
- [ ] All money arithmetic is integer kobo (no floating point)
- [ ] Consent capture in place for any new data collection
- [ ] Supabase RLS policies in place for any new tables
- [ ] Drizzle migrations committed and applied to staging
- [ ] .ai-system AGENT state updated to reflect current milestone

---

*ROADMAP v1.1 — Crelab — July 2026*
