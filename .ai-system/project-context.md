# Project Context

> **Metadata**
> - last-updated-by: update-ai-system
> - last-verified-against-code: 2026-07-05 (OC-7 reconciliation)
> - staleness-policy: re-verify if >10 sessions old or after major scope changes

> **Overview:** Crelab is a standalone, video-first creative services marketplace for Nigeria that connects creative professionals (content creators, cinematographers) with brands and businesses. Providers win jobs based on the quality of their work, not follower count. Payments are protected by Paystack escrow with a hybrid auto-release mechanism.

---

## Project Purpose

Nigeria's $15B creative industry operates through informal, trust-deficit channels. Creators lose opportunities due to follower count bias, have no reliable payment protection, and lack professional portfolio tools. Crelab solves this by providing a video-first discovery feed, structured booking with transparent package pricing, and Paystack escrow that releases on verified completion.

---

## Target Users

| User Type | Needs | Key Interactions |
|-----------|-------|-----------------|
| Creative Professional (Provider) | Video portfolio showcase, intent-based client discovery, guaranteed payment, pricing guidance, repeat clients | Onboarding wizard, profile management, portfolio upload, Drive sync, booking pipeline, earnings dashboard |
| Brand / Business Client | Verified video portfolio browsing, transparent pricing, secure escrow payment, reviewable track record | Explore feed, search, profile browsing, booking request, payment, escrow timeline, reviews |
| Admin (Crelab) | Platform config management, category editor, provider verification, dispute resolution, analytics | Admin panel: config editor, category manager, provider queue, dispute dashboard |

---

## Business Constraints

- NGN-only at MVP (multi-currency requires additional CBN approval)
- Paystack subaccount model — Crelab never holds user funds directly
- NDPR-compliant from Day 1 (Nigeria Data Protection Regulation)
- Age-restricted platform (18+)
- Guest browse allowed; booking requires registration
- Provider profiles go live immediately with "New" badge; admin review within 48h

---

## Current Project Phase

Phase: Active Development — MVP Build Sprint

Active sprint focus: Testing, Provider Dashboard, Client Dashboard, and Phase 2 features (messaging, notifications).

---

## Tech Decisions Already Made

| Decision | Reason |
|----------|--------|
| Next.js 15 App Router | Full-stack framework, Vercel deployment, server components for SEO |
| TypeScript 5 strict | Type safety across entire codebase |
| Tailwind CSS 4.x | Utility-first, CSS custom properties for design tokens |
| shadcn/ui wrapped as Cl* | Isolate third-party UI, enable platform config overrides |
| Better Auth (standalone) | Fully self-contained auth, no third-party dependency |
| Drizzle ORM | Type-safe SQL, easy migrations, Supabase-compatible |
| Paystack (primary) + Flutterwave (fallback) | CBN-licensed Nigerian payment processor |
| All money in kobo (integer) | No floating point arithmetic on money values |
| Supabase RLS on all tables | Privacy by design from first migration |
| ConfigContext + DB overrides | Admin-configurable without code deploys |

---

## Out of Scope

- Multi-currency support at MVP
- Mobile native apps at MVP (PWA as interim)
- Pre-booking messaging (unlocked post-booking-acceptance only)
- Algorithm personalisation (MVP uses PostgreSQL full-text search)
- Promoted listings/sponsored content at MVP

---

## External Integrations

| Service | Purpose | Auth Method |
|---------|---------|------------|
| Supabase | PostgreSQL database, auth session storage, RLS | Service role key (server) / anon key (client with RLS) |
| Paystack | Payment processing, escrow subaccount splits | Secret key (server), public key (client) |
| Cloudinary | Video/image upload, thumbnail generation | API key + secret |
| Mux | Video streaming | Access token + secret key |
| Google Drive API | Portfolio file sync (public folders) | API key (no OAuth for public folders) |
| Sanity CMS | Blog content management | Project ID + API token |
| Resend | Transactional emails | API key |
