# Repair System — Error Knowledge Base

> **Metadata**
> - last-updated-by: update-ai-system (Session 21)
> - last-verified-against-code: 2026-08-12
> - staleness-policy: individual entries may be stale if the code has changed around them — verify fix still applies before reusing

> **Overview:** Living knowledge base of errors encountered during Crelab development. Agents must search this before diagnosing new errors and log every fixed bug to prevent recurrence.

---

## How to Use

- **Before debugging:** Search this file for patterns matching the current error
- **After fixing a bug:** Add an entry using the template below
- **If a fix no longer applies:** Mark the entry as `[SUPERSEDED]` and link to the new entry

---

## Error Log

### [TEMPLATE]

```
## [Error Title]

**Symptom:**
[What the developer or user sees]

**Root Cause:**
[The actual technical reason]

**Fix Applied:**
[What change was made]

**Prevention:**
[How to avoid this in future]

**Files Affected:**
[list of files]

**Date:** [YYYY-MM-DD]
**Status:** [Active / Superseded]
```

---

## Known Error Patterns

### Vercel Cron — Custom `x-cron-secret` Header Always Returns 401

**Symptom:**
Cron endpoints return `401 Unauthorized` in production even though `CRON_SECRET` is set. The jobs (`/api/cron/*`) never actually run their logic.

**Root Cause:**
Vercel Cron does not send a custom header. When `CRON_SECRET` is set as a project env var, Vercel automatically attaches `Authorization: Bearer <CRON_SECRET>` to the cron invocation. Handlers that read a different header (e.g. `x-cron-secret`) never match and reject every request. A handler that matches Vercel's format (e.g. `drive-sync` reads `authorization`) works, which makes the failure easy to miss.

**Fix Applied:**
Aligned `escrow`, `milestones`, and `media-cleanup` routes to read `authorization` and compare against `` `Bearer ${process.env.CRON_SECRET}` `` — the same guard `drive-sync` already used.

**Prevention:**
On Vercel Cron, always verify the `authorization` header as `Bearer <CRON_SECRET>`; there is no way to configure a custom header per job. Custom-header schemes (`x-cron-secret`) are only valid with self-hosted schedulers (GitHub Actions, cron-job.org, BetterStack) where you control the request. Keep `.env.example` guidance consistent with whichever scheduler is actually in use.

**Files Affected:**
- `app/api/cron/escrow/route.ts`
- `app/api/cron/milestones/route.ts`
- `app/api/cron/media-cleanup/route.ts`
- `vercel.json` (registered `/api/cron/media-cleanup`)
- `.env.example`

**Date:** 2026-08-12
**Status:** Active

---

## Known Error Patterns

### React / Next.js

**Hydration Mismatch**
- Symptom: `Hydration failed because the initial UI does not match what was rendered on the server`
- Cause: Browser-only logic (window, localStorage, Date.now()) running during server render
- Fix: Wrap in `useEffect` or use `dynamic(() => import(...), { ssr: false })`
- Prevention: Never access browser APIs outside useEffect in components

**Missing Key Prop**
- Symptom: `Each child in a list should have a unique "key" prop`
- Cause: `.map()` rendering without a stable unique key
- Fix: Add `key={item.id}` — use a stable unique ID, not the array index

**Video Autoplay Not Working on Mobile**
- Symptom: Video cards don't autoplay on iOS Safari
- Cause: Mobile browsers require `playsinline` attribute and user gesture for audio
- Fix: Always use `playsInline`, `muted`, `loop`, `autoPlay` attributes. Use IntersectionObserver with 50% threshold.
- Prevention: Test video autoplay on iOS Safari and Android Chrome during development

### Node.js / Backend

**Unhandled Promise Rejection**
- Symptom: Server crashes silently or logs `UnhandledPromiseRejectionWarning`
- Cause: async function missing try/catch or `.catch()` not attached to promise
- Fix: Wrap async route handlers in try/catch; use a global async error wrapper
- Prevention: Always release DB connections in finally, not just success path

**Database Connection Pool Exhausted**
- Symptom: Requests hang indefinitely under load
- Cause: Connection pool limit too low or connections not released
- Fix: Increase pool size; ensure `client.release()` in finally blocks
- Prevention: Always release connections in finally

### Paystack

**HMAC-SHA512 Verification Failure**
- Symptom: Webhook events rejected
- Cause: Signature mismatch — incorrect secret key or body format
- Fix: Verify using raw request body (not parsed JSON), compare against `x-paystack-signature` header
- Prevention: Always verify webhook signature before any state transition

**Subaccount Split Not Applied**
- Symptom: Provider receives full amount, platform fee not deducted
- Cause: `subaccount` and `transaction_charge` not set in Paystack transaction initialization
- Fix: Always pass `subaccount` code and `transaction_charge` (in kobo) when initializing payment
- Prevention: Integration test must verify subaccount split in Paystack test mode

### Drizzle / Supabase

**Migration Conflict**
- Symptom: `drizzle-kit` migration fails with "table already exists"
- Cause: Migration snapshot out of sync with actual DB state
- Fix: Drop migration snapshots that conflict, regenerate
- Prevention: Always run `drizzle-kit generate` after schema changes; never manually edit migration files

**RLS Policy Not Applied**
- Symptom: Users can access data that should be restricted
- Cause: RLS policy SQL applied but not enabled on the table
- Fix: `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;`
- Prevention: Include `ENABLE ROW LEVEL SECURITY` in every table creation migration

### Configuration / Environment

**Missing Environment Variable**
- Symptom: `undefined` values in production, features silently broken
- Cause: Variable defined in `.env.local` but not in production environment
- Fix: Add to deployment environment variables
- Prevention: Add a startup validation check that throws if required env vars are missing

### Better Auth — Missing Secret/BaseURL (Deployment Failure)

**Symptom:**
Build succeeds locally but Vercel deployment fails. During static page generation:
```
WARN [Better Auth]: Base URL is not set.
Error [BetterAuthError]: You are using the default secret.
```

**Root Cause:**
`lib/auth.ts` did not pass `secret` or `baseURL` to the Better Auth config. Better Auth generates a default secret but explicitly rejects it in production, throwing an error during static generation on Vercel.

**Fix Applied:**
1. Added `secret: process.env.BETTER_AUTH_SECRET` to read from env var with a dev fallback
2. Added `baseURL: process.env.BETTER_AUTH_URL` to read from env var with a dev fallback

**Prevention:**
Always pass `secret` and `baseURL` to Better Auth config when initializing. Ensure `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are set in Vercel environment variables. Keep `.env.example` updated as the source of truth for required env vars.

**Files Affected:**
- `lib/auth.ts`

**Date:** 2026-07-05
**Status:** Active

---

### Provider Profile 404 for Newly Onboarded Creators (UUID Slug Mismatch)

**Symptom:**
After completing onboarding, "Create Account" redirects to `/profile/{slug}` and the page returns 404 — Page Not Found. Seeded providers work, but newly registered providers always 404.

**Root Cause:**
The slug embeds only the first 8 characters of the provider id: `{name}--{id.slice(0,8)}`. Seeded providers use short ids (`prov-1`) so `eq(providers.id, 'prov-1')` matched. Real providers get a 36-char UUID, and the profile page compared `providers.id = 'abc12345'` (exact `eq`) against the full stored UUID → never matched → `notFound()`.

**Fix Applied:**
- Resolve slugs via prefix match: `like(providers.id, `${idPrefix}%`)`
- Parse slugs with `lastIndexOf("--")` so display names containing `--` still work
- Extracted `lib/slug.ts` (`buildProviderSlug` / `parseProviderSlug`) shared by the setup API, sitemap, ExploreService, and profile page
- Fixed `app/sitemap.ts` which used a single `-` separator instead of `--`

**Prevention:**
Never store a truncated id in a URL and then compare it with an exact `eq()`. Either store a dedicated slug column or resolve with a prefix query. Route all slug construction/parsing through `lib/slug.ts`.

**Files Affected:**
- `app/(public)/profile/[slug]/page.tsx`
- `app/sitemap.ts`
- `app/api/profile/setup/route.ts`
- `services/ExploreService.ts`
- `lib/slug.ts` (new)

**Date:** 2026-08-09
**Status:** Active

### Pricing Displayed ×100 Too High in Onboarding Review

**Symptom:**
Entering ₦75,000 shows ₦7,500,000 at the "Review Profile" step. The input retains the correct value; only the preview is wrong.

**Root Cause:**
`app/(auth)/profile/setup/page.tsx` step-5 preview computed `(parseFloat(pkg.price) * 100).toLocaleString()`. The input is naira, but the preview multiplied by 100 again (as if converting naira→kobo for display), inflating the value 100×.

**Fix Applied:**
Display the entered naira as-is via `formatNaira(parseFloat(pkg.price))`. Extracted `lib/currency.ts` (`nairaToKobo` converts once at submit; `formatNaira`/`formatKobo` render).

**Prevention:**
Convert naira→kobo exactly once, at the API boundary. Never multiply by 100 in a display path. Route all money formatting through `lib/currency.ts`.

**Files Affected:**
- `app/(auth)/profile/setup/page.tsx`
- `lib/currency.ts` (new)

**Date:** 2026-08-09
**Status:** Active

### Google Drive Connect Broken During Onboarding

**Symptom:**
The "Connect & Sync" Drive control during profile setup reports inactive/failure. Post-onboarding Drive works.

**Root Cause:**
The wizard's `DriveConnectSettings` called `POST /api/portfolio/drive` while `providerId="pending"` — before any provider row existed for the user. The API requires an existing provider (returns 404 "Provider profile not found"), so onboarding Drive sync always failed.

**Fix Applied:**
- Added `mode="collect"` to `DriveConnectSettings`: during onboarding it only validates and saves the folder URL (no server call)
- `app/api/profile/setup/route.ts` ingests the Drive folder server-side after creating the provider (non-fatal if sync fails; surfaced as an info toast)

**Prevention:**
Do not call endpoints that require a resource before that resource exists. Gate Drive sync behind an existing provider; collect-and-defer during onboarding.

**Files Affected:**
- `components/profile/DriveConnectSettings.tsx`
- `app/api/profile/setup/route.ts`
- `app/(auth)/profile/setup/page.tsx`

**Date:** 2026-08-09
**Status:** Active

### Cloudinary Upload Failures / Undefined URL When Env Missing

**Symptom:**
Upload features silently break or throw `undefined` errors when `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` are absent.

**Root Cause:**
`lib/cloudinary.ts` used non-null assertions on module-load env captures, so missing env vars produced `undefined` constants and cryptic failures.

**Fix Applied:**
- Env read at call time; `isCloudinaryConfigured()` returns false when either var is missing
- `assertCloudinaryConfigured()` throws `CloudinaryNotConfiguredError` (503)
- Upload capability gated by config (`mediaUpload.enabled` + `cloudinaryEnabled`) AND env presence, exposed via `GET /api/media/status`; UI falls back to paste-link mode

**Prevention:**
Always gate optional-integration features on an availability check that degrades gracefully; document required env vars in `.env.example` and the config (`config/platform.config.ts` `mediaUpload`).

**Files Affected:**
- `lib/cloudinary.ts`
- `app/api/media/upload/route.ts` (new)
- `app/api/media/status/route.ts` (new)
- `components/profile/MediaUpload.tsx` (new)

**Date:** 2026-08-09
**Status:** Active

### Dashboard Throws "Error: Unauthorized" for Authenticated Users

**Symptom:**
Opening `/dashboard` (or any `requireAuth()`-guarded page) throws `Error: Unauthorized` (digest `1369153800`) even after a successful sign-in. Trace shows the throw from `app/(auth)/dashboard/page.js`.

**Root Cause:**
`lib/auth.ts` `getSession()` called `auth.api.getSession({ headers: new Headers() })` — an empty `Headers` object with no cookies. Better Auth resolves the session from the incoming request cookies, so it always returned `null` and `requireAuth()` threw `Unauthorized`. This affected every server-side `requireAuth()` caller (dashboard page, wallet page, all wallet/milestone API routes). The correct request headers are available via `headers()` from `next/headers` (the pattern already used in `app/admin/layout.tsx` and the consent/export/delete API routes).

**Fix Applied:**
`lib/auth.ts` `getSession()` now reads the current request headers with `await headers()` and passes them to `auth.api.getSession({ headers: h })`.

**Prevention:**
Never construct `new Headers()` for Better Auth session lookups in request context — always forward `headers()` from `next/headers` (server components and route handlers) or `req.headers` (route handlers). Search for any remaining `getSession({ headers: new Headers()` usages during review.

**Files Affected:**
- `lib/auth.ts`

**Date:** 2026-08-11
**Status:** Active

---

### Next.js 15.3.1 — Vulnerable Version Blocking Vercel Deployment

**Symptom:**
Build succeeds structurally but Vercel deployment fails with:
```
Vulnerable version of Next.js detected, please update immediately.
```
During install:
```
npm warn deprecated next@15.3.1: This version has a security vulnerability.
```

**Root Cause:**
`next@15.3.1` is affected by CVE-2025-66478 — a critical (CVSS 10.0) remote code execution vulnerability in the React Server Components protocol. Vercel's pipeline now actively blocks deployments using vulnerable versions.

**Fix Applied:**
Updated `package.json` dependency from `"next": "^15.3.1"` to `"next": "^15.5.20"` (latest stable 15.x, fully patched).

**Prevention:**
Keep `next` dependency at the latest stable 15.x version. Run `npm outdated` regularly. Vercel's deployment gate will now enforce patched versions — any future vulnerability will be caught at deploy time.

**Files Affected:**
- `package.json`

**Date:** 2026-07-05
**Status:** Active

---

---

**Config Value Not Updating After Admin Change**
- Symptom: Frontend still shows old platform name/colour after admin update
- Cause: `ConfigContext` not re-fetching after DB update; stale cache
- Fix: Invalidate `platform-config` cache tag on config update; add re-fetch interval or revalidation trigger
- Prevention: Use `revalidateTag('platform-config')` in admin API; set reasonable `staleTimes` in TanStack Query

---

### rating.toFixed Is Not a Function — Numeric Rating Received as String from API/DB

**Symptom:**
`Uncaught TypeError: s.rating.toFixed is not a function` when the webapp loads. Rating values displayed as ★ NaN or crash entirely.

**Root Cause:**
PostgreSQL `numeric` type can be deserialized as a string by certain API layers (e.g., Supabase). The `IExploreCard.rating` field was typed as `number | null`, but the actual runtime value was a string, so `.toFixed()` threw a TypeError. The same issue existed in `CategoryClientPage` (`stats.avgRating`) and `ReviewsSection` (`avgRating`).

**Fix Applied:**
Wrapped all `.toFixed()` calls with `Number()` coercion:
- `provider.rating.toFixed(1)` → `Number(provider.rating).toFixed(1)` in `ExploreVideoCard.tsx`
- `stats.avgRating.toFixed(1)` → `Number(stats.avgRating).toFixed(1)` in `CategoryClientPage.tsx`
- `avgRating.toFixed(1)` → `Number(avgRating).toFixed(1)` in `ReviewsSection.tsx`

**Prevention:**
Always wrap API/DB-derived numeric values with `Number()` before calling `.toFixed()`, `.toLocaleString()`, or any `Number.prototype` method. Add a Zod schema on the API boundary to coerce `numeric` fields to actual JS numbers.

**Files Affected:**
- `components/explore/ExploreVideoCard.tsx`
- `app/(public)/[category]/CategoryClientPage.tsx`
- `components/profile/ReviewsSection.tsx`

**Date:** 2026-07-28
**Status:** Active

### Server Component Passing Event Handler to Client Component

**Symptom:**
Next.js build error: `Error: Event handlers cannot be passed to Client Component props. {selectedPackage: ..., onBook: function onBook}` on the profile page.

**Root Cause:**
`app/(public)/profile/[slug]/page.tsx` is a Server Component (default in Next.js App Router) but was passing `onBook={() => {}}` — a function — to `BookingBottomBar`, which is a Client Component (`"use client"`). Server Components cannot pass functions as props to Client Components because functions can't be serialized over the server/client boundary.

**Fix Applied:**
- Removed `onBook` from `BookingBottomBar`'s props interface
- Removed `onClick={onBook}` from the button inside `BookingBottomBar`
- Removed `onBook={() => {}}` from the `<BookingBottomBar>` usage in the profile page

**Prevention:**
Never pass function props from Server Components to Client Components. Either:
- Handle events entirely inside the Client Component
- Use Next.js Server Actions (`"use server"`) instead of event handlers
- If the entire page needs client interactivity, add `"use client"` to the page component

**Files Affected:**
- `components/profile/BookingBottomBar.tsx` — removed `onBook` prop and `onClick`
- `app/(public)/profile/[slug]/page.tsx` — removed `onBook={() => {}}` prop

**Date:** 2026-07-28
**Status:** Active
