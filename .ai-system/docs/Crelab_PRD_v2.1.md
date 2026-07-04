# Crelab — Product Requirements Document
**Version:** 2.1 — Locked  
**Metadata:** last-verified-against-code: 2026-07-04  
**Classification:** Confidential — Internal  
**Technical Lead:** Sotonye Adokiye Dagogo  
**Co-Founder:** Samson Afolabi  
**Date:** July 2026  
**Stack:** Next.js 15 · TypeScript 5 · PostgreSQL · Paystack · Cloudinary · Mux · Better Auth  
**Pipeline:** .ai-system · Open Design → Open Code  

> **Working name:** Crelab — fully metadata-driven. Platform name, colours, tagline, and fee rates live in admin-configurable config with hardcoded fallbacks. A name change requires one admin panel update and zero code changes.

---

## Document Overview

This is the locked PRD for Crelab, a standalone, independent video-first creative services marketplace for Nigeria. It supersedes all previous drafts and incorporates co-founder alignment decisions, primary survey data from 11 Nigerian content creators, and UX/product ideas from team discussions.

All previously open decisions (D1-D10) are resolved. This document is the authoritative input for ROADMAP, DESIGN, and PROMPTS.

---

## 1. Problem Statement

Nigeria's creative industry is a $15B economy operating through informal, trust-deficit channels. Primary survey data from 11 active Nigerian content creators confirms this at ground level.

### Survey Data Summary (11 Respondents, May 2026)

Discovery is broken: 9/11 respondents have lost or nearly lost paid opportunities due to follower count bias. Primary acquisition channels are referrals, brand outreach, and WhatsApp groups — zero reliable intent-based inbound.

Payment infrastructure does not exist: "Guaranteed payment after completing work" was selected as a top need by 9/11 respondents. Informal payment via bank transfer and WhatsApp agreement offers no protection and no recourse.

Portfolio tools are inadequate: "Better way to showcase my work" appeared in 7/11 responses. Respondents have strong creative work but lack a professional showcase vehicle.

Pricing is opaque: "Not knowing how to price my work" and "Transparent pricing" appeared in 8+ responses.

Critical survey insight: When asked what brands care about most, 8/11 respondents answered "Creativity / ideas" — not follower count. This validates the core thesis. Follower count is a proxy metric for brand awareness deals, not a criterion for content creation work. Crelab's quality-first discovery directly addresses this misalignment.

### Provider Pain Points
- Discovery ceiling: limited to existing follower base, no intent-based inbound
- Payment risk: informal bookings with no escrow and no dispute path
- Portfolio inadequacy: static photos and text bios cannot communicate creative skill
- Pricing opacity: no market rate reference, undercharging is endemic
- No professional tools: no booking, contract, or earnings management

### Client Pain Points
- Finding the right creator requires manual search, referral chains, or expensive agencies
- Quality uncertainty without verified portfolio and verifiable work history
- Full payment risk with no escrow
- No dispute resolution when creators no-show or under-deliver

### Structural Gap
No platform serves video-first, intent-driven creative talent discovery in Nigeria with native booking and escrow. Global platforms (Fiverr, Upwork) lack local payment rails and Nigerian creator context. Crelab fills this gap as a standalone, purpose-built product with no dependency on any external platform's infrastructure.

---

## 2. Market Opportunity

| Metric | Value |
|---|---|
| Nigeria creative industry (2025) | ~$15 Billion |
| Africa creator economy (2023) | ~$3 Billion |
| Africa creator economy projection (2030) | ~$18 Billion |
| Nigeria design industry (2022) | $1.8 Billion |
| Nigeria fashion industry | $4.7 Billion |
| Nigerian YouTube annual views (2024) | 20+ Billion |
| Nigerian YouTube channels (100k+ subs) | 1,500+ |

Demand for creative services is real and already funded. The broken element is the distribution infrastructure. 20B+ annual YouTube views from Nigeria validates video-first discovery as a natural fit for this market.

---

## 3. Vision & Product Concept

Crelab is a marketplace where Nigerian creative professionals win jobs based on the quality of their work, not the size of their following.

Brands and individuals discover creative talent through video portfolios, book with transparent pricing, and pay via protected escrow that releases on verified completion. Providers build a professional presence and gain access to brand clients that previously required agency mediation.

### Design Reference Points
| Platform | What Crelab Borrows |
|---|---|
| Instagram Explore | Discovery feed aesthetic, video autoplay, scroll-driven content grid |
| Upwork | Booking pipeline structure, escrow framework, provider profile depth |
| Fiverr | Package-based pricing clarity, category-first browse, review credibility |
| Hinge / Bumble | Profile as curated first impression; quality-over-quantity matching |

### Product Positioning
| Dimension | Crelab | Current Alternative |
|---|---|---|
| Discovery | Video-first, intent-driven, quality-ranked | Instagram DMs, referrals |
| Portfolio | Video + Google Drive sync + work history | Static bio + photos |
| Booking | Structured, in-platform | WhatsApp informal agreement |
| Payment | Paystack escrow with hybrid auto-release | Bank transfer, no protection |
| Selection criterion | Creativity and content quality | Follower count |
| Dispute resolution | Platform-mediated | None |
| Pricing | Transparent, package-based | Opaque, negotiated in DMs |

---

## 4. Target Users

### Persona A — Creative Professional (Provider)
Content creators, videographers, cinematographers, photographers, podcast hosts/producers, and UGC creators. Based in Nigeria. 6 months to 5+ years active. Follower counts from under 1k to 10k+ — the platform is explicitly designed to make follower count irrelevant to getting hired.

What they need: a video portfolio that shows actual work, access to brands actively hiring, guaranteed payment, market pricing guidance, and more repeat clients (top need, 5/11 survey respondents).

### Persona B — Brand / Business Client
SMBs, agency creative teams, brand marketing managers, and individual business owners commissioning UGC, ad content, event coverage, or podcast production.

What they need: verified video-first portfolio browsing, transparent pricing upfront, secure payment with escrow, and a reviewable track record.

---

## 5. Resolved Decisions

| # | Decision | Resolution |
|---|---|---|
| D1 | Launch categories | Content Creators + Cinematographers/Videographers. Category schema is admin-configurable JSONB — expansion requires zero code changes. |
| D2 | Payment release trigger | Hybrid. Auto-release 5 days post-service date unless client raises formal dispute. Client can also confirm and release early. |
| D3 | Platform fee | 5% on completed transactions. Funds escrow and dispute infrastructure. Admin-configurable rate. |
| D4 | Provider profile review | Soft launch: profiles go live immediately with a "New" badge. Manual review within 48h. Abuse reports trigger suspension. |
| D5 | Guest browse | Open browse, gate booking. Anyone browses Explore and views profiles. Registration required to book or message. |
| D6-D8 | Co-founder agreements | Resolved between co-founders — not reproduced here. |
| D9 | Competitive landscape | No direct video-first creative marketplace with escrow exists in Nigeria. Clear blue-ocean positioning. |
| D10 | Working name | Crelab. Fully config-driven — rename requires one admin update. |

---

## 6. Feature Requirements

### P0 — MVP Launch

#### 6.1 Platform Config Shell
Platform name, colours, tagline, fee rate, and category list are all configuration — not code.

```ts
// config/platform.config.ts — hardcoded fallback, overridden by DB at runtime
export const PLATFORM_CONFIG = {
  name: 'Crelab',
  tagline: 'Get hired for your creativity, not your follower count.',
  primaryColor: '#E8FF47',
  feeRate: 0.05,
  escrowReleaseDays: 5,
  categories: [ /* slugs + fieldSchemas */ ],
  features: { guestBrowse: true, googleDriveSync: true, blogEnabled: true }
}
```

All UI references to platform name, fee rate, and categories consume this config. Admin panel overrides without code deploy.

#### 6.2 Auth (Better Auth — Standalone)
Crelab runs its own fully self-contained authentication. No dependency on any external auth service or third-party identity platform.

- Email and phone sign-up/login with OTP verification via Better Auth v1.6
- Supabase adapter for session and user storage
- Role assignment at registration: PROVIDER | CLIENT
- Guest sessions for browse (no auth required)
- Auth gate triggers on booking initiation, messaging, Drive sync, profile creation
- NDPR-compliant consent capture at registration (see Section 10)
- httpOnly cookie sessions

#### 6.3 Provider Profile
- Display name, avatar, cover video (autoplay, muted) as hero
- Category badge, location, years active, experience level (EMERGING / ESTABLISHED / VETERAN)
- Bio (300 character limit)
- Video portfolio grid (min 1 item, recommended 3+)
- Service packages: 3 tiers (Basic / Standard / Premium) with price, deliverables, turnaround
- Availability indicator
- Work history: past engagements with deliverable type and date
- Reviews and ratings (post-service, mutual)
- Google Drive portfolio section

#### 6.4 Explore / Discovery Feed
- Masonry grid with video cards — varied heights, Instagram Explore aesthetic
- Cards autoplay (muted, looped) on viewport entry via IntersectionObserver
- Filter bar (admin-configurable schema): Category, Location, Budget, Availability, Sort
- Full-text search across provider bio, category, location, tags
- Guest users browse freely; booking CTA triggers auth gate

#### 6.5 Booking Flow
States: REQUESTED → ACCEPTED → PAYMENT_PENDING → HELD → IN_PROGRESS → RELEASED | DISPUTED | REFUNDED | CANCELLED

Booking request includes: selected package, service date, scope notes. Provider can accept, counter-propose, or decline. On acceptance, client is prompted to pay into escrow.

#### 6.6 Google Drive Portfolio Sync
- Provider pastes a publicly shared Google Drive folder URL
- Backend fetches file list via Google Drive Files API v3 (no OAuth required for public folders)
- Supported types: video (mp4, mov, avi), images (jpg, png), PDF
- Thumbnails generated via Cloudinary
- Rendered as portfolio cards on profile and Explore — identical visual treatment to native uploads, badged "Drive"
- Manual "Refresh from Drive" trigger + daily cron sync
- Fallback: if folder is private or empty, clear error state with CTA to upload directly

#### 6.7 Payment & Escrow (Paystack)
- Paystack as primary payment processor (CBN-licensed, Nigerian-native)
- Paystack subaccounts for split payment — platform fee deducted before provider payout
- Flutterwave as fallback and for West Africa expansion
- All Paystack webhooks verified via HMAC-SHA512 before processing
- Full escrow state machine — see Section 8

#### 6.8 Admin Panel
- Platform config editor (name, tagline, colours, fee rate, escrow days)
- Category manager (add/edit/disable + field schema editor)
- Provider review queue
- Dispute resolution dashboard
- Basic analytics: signups, bookings, payment volume, dispute rate

---

### P1 — Post-Launch (Month 1-3)

| Feature | Description |
|---|---|
| Messaging | In-platform, unlocked post-booking-acceptance. Thread attached to booking. No pre-booking cold messages. |
| Notifications | Email (Resend) + in-app: booking events, payment events, service reminders, dispute events. |
| Provider dashboard | Earnings summary, booking pipeline, availability calendar, portfolio performance stats. |
| Client dashboard | Active bookings, booking history, payment history. |
| Reviews & ratings | Mutual post-service ratings. Verified-booking badge on Crelab-originated reviews. |
| Pricing guidance widget | Anonymised aggregate rate ranges by category in provider dashboard. |
| SEO blog | Sanity CMS-powered. Creator spotlights link directly to provider profiles. |
| Provider verification | Portfolio verification (min 1 video required). Identity via BVN/NIN check (Dojah or Smile Identity) as optional P1 trust feature. |

---

### P2 — Growth Phase

| Feature | Description |
|---|---|
| Algorithm & personalisation | Personalised Explore feed, provider requirement tagging (experience level, brand type, location), saved searches. |
| Promoted listings | Paid featured placement in Explore. Admin-configurable slot count. Clear "Sponsored" label. |
| Video analytics | Per-video play counts, view duration, profile-to-booking conversion in provider dashboard. |
| Mobile apps | Post-funding. PWA as interim mobile experience at launch. |
| API / white-label embed | Booking widget embeddable by agencies. Public provider discovery API. |

---

## 7. Technical Architecture

### Stack — Current Stable Versions (July 2026)

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js (App Router) | 15.3.x |
| Language | TypeScript | 5.x strict |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui (wrapped as Cl* components) | 4.x (CLI) |
| Animation | Framer Motion | 12.x |
| Video | Cloudinary (upload/thumbnails) + Mux (streaming) | cloudinary@2.x / @mux/mux-node@14.x |
| Drive | Google Drive Files API v3 | googleapis@20.x |
| Auth | Better Auth | 1.6.x |
| Database | PostgreSQL via Supabase | @supabase/supabase-js@2.x |
| ORM | Drizzle ORM | latest stable |
| Payment | Paystack (primary) / Flutterwave (fallback) | paystack@2.x |
| CMS | Sanity CMS | @sanity/client@7.x |
| Email | Resend | resend@6.x |
| Data fetching | TanStack Query | 5.x |
| Search | PostgreSQL full-text (MVP) → Typesense (growth) | — |
| Deployment | Vercel + Supabase | — |
| AI Pipeline | .ai-system + Open Design → Open Code | — |

### Engineering Principles (Non-Negotiable)
1. Metadata-driven, admin-configurable. Categories, fees, feature flags, platform name — all in config with hardcoded fallbacks.
2. Config-driven over hardcoded. platform.config.ts is the single source of truth. DB overrides at runtime.
3. Universal component wrappers. All shadcn/ui consumed as Cl* wrappers. No raw library imports in feature code.
4. OOP class-based services. BookingService, EscrowService, PortfolioService, DriveService — interface-first, injectable, testable.
5. Interface-first TypeScript. All entities, API responses, and service inputs have typed interfaces before implementation. Types live in /types — single source.
6. SOLID principles. Single responsibility, open/closed on config extension, dependency inversion on service injection.
7. Privacy by design. Data minimisation, consent capture, and access controls are architectural requirements from Day 1.

### Core Data Model

```sql
users             (id, role: PROVIDER|CLIENT|ADMIN, email, phone, created_at)
consent_records   (id, user_id, consent_type, granted, ip_address, user_agent, timestamp)
provider_profiles (id, user_id, slug, display_name, category_slug,
                   bio, location, years_active, experience_level,
                   pricing_config JSONB, availability_config JSONB,
                   drive_folder_url, verified, active, rating, review_count)
portfolio_items   (id, provider_id, url, thumbnail_url,
                   type: VIDEO|IMAGE|PDF, source: UPLOAD|DRIVE,
                   drive_file_id, caption, order_index, hidden)
categories        (id, slug, label, field_schema JSONB, active)
service_packages  (id, provider_id, tier: BASIC|STANDARD|PREMIUM,
                   label, price_kobo, deliverables JSONB, turnaround_days)
bookings          (id, client_id, provider_id, package_id, service_date,
                   scope_notes, status, price_kobo, fee_kobo)
payments          (id, booking_id, amount_kobo, fee_kobo, net_kobo,
                   paystack_ref, subaccount_code,
                   escrow_state, release_deadline, released_at)
reviews           (id, booking_id, reviewer_id, reviewee_id, rating, comment)
disputes          (id, booking_id, raised_by, reason, status, admin_notes)
platform_config   (key TEXT UNIQUE, value JSONB, updated_at)
```

All monetary values stored in kobo (integer). No floating point arithmetic on money.

---

## 8. Escrow State Machine

```
PENDING
  ↓ (client pays via Paystack)
HELD  — release_deadline = service_date + escrowReleaseDays
  ↓ (service_date reached — cron)
IN_PROGRESS
  ├─→ DISPUTED  (client raises dispute before release_deadline)
  │     ├─→ RELEASED  (admin resolves in provider favour)
  │     └─→ REFUNDED  (admin resolves in client favour)
  ├─→ RELEASED  (client confirms early)
  └─→ RELEASED  (release_deadline passed, no dispute — auto-release cron)
```

- Release window: 5 days post-service date (admin-configurable)
- Platform fee: 5% deducted via Paystack subaccount split at RELEASED
- Cancellation: provider cancels → full refund. Client >48h → full refund. Client <48h → 50% held. All thresholds admin-configurable.
- Webhooks: all Paystack events verified via HMAC-SHA512 before state transitions

---

## 9. Compliance Framework

Crelab handles personal data and financial transactions in a regulated environment. Compliance is an architectural requirement built in from Day 1 — not a post-launch retrofit.

### 9.1 NDPR — Nigeria Data Protection Regulation (2023)

| Requirement | Implementation |
|---|---|
| Lawful basis | Contractual necessity (booking/payment), legitimate interest (platform safety), explicit consent (marketing). Documented per processing activity. |
| Consent capture | Explicit, granular consent at registration. Separate checkboxes for: Terms & Privacy, Marketing emails, Analytics. All consent events stored in consent_records table with timestamp, IP address, and user agent. |
| Privacy Policy | Comprehensive policy at /privacy. Plain-English summary. Versioned. |
| Data subject rights | Right to access, rectification, erasure, portability, and objection. Self-serve data export and account deletion in user settings. Requests actioned within 72 hours. |
| Data minimisation | Only data necessary for the stated purpose is collected. No phone numbers displayed publicly on profiles. |
| Retention | User data: active + 2 years post-closure. Payment records: 7 years (financial regulatory requirement). Retention schedule admin-configurable. |
| Data processor agreements | DPAs executed with all sub-processors (Supabase, Cloudinary, Mux, Paystack, Resend, Sanity, Dojah) before go-live. |
| NITDA registration | Register as Data Controller with NITDA before go-live. File annual Data Protection Audit via a NITDA-licensed DPCO. |
| Breach notification | Documented incident response plan. NITDA notification within 72 hours of discovery. User notification without undue delay where risk is high. |
| Age restriction | Platform is 18+. Age declaration required at registration. |

### 9.2 GDPR — General Data Protection Regulation (EU)

Applicable if any EU/EEA residents use the platform (diaspora, international brands). Architecture is GDPR-ready from Day 1.

| Requirement | Implementation |
|---|---|
| Legal basis | Same documented lawful bases as NDPR. Maintain a Record of Processing Activities (ROPA). |
| Cookie consent | Compliant cookie banner. Functional cookies need no consent. Analytics/tracking cookies require explicit opt-in. |
| Right to erasure | Account deletion removes personal data; booking financial records anonymised (preserves audit trail, removes personal identifiers). |
| Data transfers | Personal data on Supabase EU region or with Standard Contractual Clauses (SCCs) in place for any third-country transfers. |
| Privacy contact | Designated privacy contact identified and published in the privacy policy. Full DPO appointment assessed at Series A scale. |
| Privacy by design | Data minimisation, pseudonymisation where possible, least-privilege DB permissions via Supabase RLS. |

### 9.3 CBN Regulations

| Requirement | Implementation |
|---|---|
| Payment licence | Crelab operates under Paystack's existing CBN Payment Service Provider licence via the subaccount model. Crelab does not hold user funds directly — this is the critical architectural decision that keeps Crelab outside direct CBN licensing requirements at MVP. |
| AML / KYC | Paystack performs KYC on provider subaccounts. Reinforced by BVN/NIN verification via Dojah (P1 feature). |
| Transaction limits | Paystack regulatory limits on unverified accounts surfaced clearly in provider onboarding. |
| Escrow disclosure | Escrow mechanism, release triggers, and dispute process disclosed in Terms of Service and at the point of payment. |
| FX | MVP is NGN-only. Multi-currency requires additional CBN approval — deferred post-funding. |

> Legal counsel required: Confirm with a Nigerian fintech lawyer before real money flows that the Paystack subaccount model satisfies CBN requirements for Crelab's marketplace escrow structure.

### 9.4 PCI-DSS

Crelab never stores, transmits, or processes raw card data. All card handling is delegated to Paystack's PCI-DSS-certified infrastructure via Paystack inline checkout. This reduces Crelab's PCI scope to SAQ A (lowest complexity). Annual SAQ A self-assessment required. No QSA required at SAQ A level.

### 9.5 CAC — Corporate Affairs Commission

Business must be registered as a private limited liability company with the CAC, with a TIN obtained, before accepting user payments. FIRS obligations (CIT, VAT) apply once revenue thresholds are met — engage an accountant pre-launch.

### 9.6 Required Legal Documents (Before Launch)

| Document | URL | Purpose |
|---|---|---|
| Terms of Service | /terms | User agreement, booking terms, escrow rules, fees, termination |
| Privacy Policy | /privacy | NDPR/GDPR compliance statement, data rights, contact |
| Cookie Policy | /cookies | Cookie types, purposes, opt-out mechanism |
| Escrow Policy | /escrow | Plain-English escrow, timeline, disputes, refund conditions |
| Creator Agreement | /creator-terms | Provider-specific: identity, content standards, payment, IP |
| Acceptable Use Policy | /aup | Prohibited content, fraud, impersonation, reporting |

All documents must be drafted by a qualified lawyer before go-live.

### 9.7 Content Licensing & IP

- Providers retain copyright of all uploaded portfolio content. Upload grants Crelab a limited, non-exclusive, revocable licence to display and thumbnail content on the platform.
- IP ownership of commissioned work is between provider and client. Crelab is not a party to the commissioning agreement and makes no claim on commissioned content.
- Providers are responsible for ensuring uploaded content does not infringe third-party IP. Takedown process (DMCA-inspired) documented and staffed before launch.
- Google Drive sync terms explicitly prohibit syncing content the provider does not own or have rights to display.
- All third-party npm dependencies must be licence-compatible with commercial use. MIT, Apache 2.0, and BSD licences are acceptable. GPL dependencies must be individually evaluated — GPL code cannot be used in proprietary closed-source SaaS without careful legal review. Conduct a licence audit before launch.

---

## 10. Delivery Phases

### Phase 1 — MVP (AI-assisted pipeline, accelerated estimates)

| Week | Focus | Deliverables |
|---|---|---|
| 1 | Foundation | Repo, DB schema (Drizzle migrations), platform.config.ts, Better Auth setup, design tokens, Sanity CMS init |
| 2 | Supply side | Provider onboarding wizard, profile page, native video upload (Cloudinary), package builder, Google Drive sync |
| 3 | Discovery | Explore feed (masonry, video autoplay), filter bar, full-text search, category browse |
| 4 | Transactions | Paystack integration (real), escrow state machine, booking flow, payment UI |
| 5 | Admin + SEO | Blog (Sanity), admin panel (config editor, category manager, dispute dashboard), soft launch |

### Phase 2 — Post-Launch (Month 1-3)
Messaging, notifications, full dashboards, reviews, pricing guidance, identity verification.

### Phase 3 — Growth
Algorithm personalisation, promoted listings, video analytics, mobile apps.

---

## 11. Success Metrics

| Metric | Target (Month 3) |
|---|---|
| Provider profiles live | 50+ (each with 1+ video) |
| Completed bookings (real escrow) | 20+ |
| Dispute rate | <10% of completed bookings |
| Platform fee revenue | 500,000 NGN+ |
| Organic blog traffic | 500+ monthly visits |
| Provider retention | 60%+ active after first completed booking |

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Google Drive API rate limits or access issues | Medium | Medium | Native upload always available as fallback; cache Drive metadata aggressively |
| Cold start: no providers, no clients | High (early) | High | Pre-seed via Kali Zoi network. Invite-only beta. Launch with 10-20 seeded profiles. |
| CBN/Paystack escrow compliance gap | Medium | High | Paystack subaccount model (no direct fund holding). Confirm with fintech lawyer before real money flows. |
| Creator resistance to 5% fee | Medium | Medium | Frame fee as insurance: escrow + dispute resolution + guaranteed payment — not available in DMs. |
| Video performance on Nigerian mobile networks | High | High | Cloudinary CDN + chunked progressive upload. Drive link as low-bandwidth alternative. |
| Dispute abuse by clients | Medium | Medium | Admin dispute pattern dashboard. Per-client dispute rate limit (admin-configurable). |
| Data breach / NDPR violation | Low | Critical | Encryption at rest and in transit. Supabase RLS on all tables. NITDA registration + incident response plan pre-launch. |
| GPL licence in dependency chain | Low | Medium | Licence audit of all npm dependencies before launch. |

---

*PRD v2.1 Locked — Crelab — July 2026*
