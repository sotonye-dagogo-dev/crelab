# Repair System — Error Knowledge Base

> **Metadata**
> - last-updated-by: update-ai-system
> - last-verified-against-code: 2026-07-28
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
