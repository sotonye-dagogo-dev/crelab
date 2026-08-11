# Lessons Learned

> **Metadata**
> - last-updated-by: update-ai-system (Session 19)
> - last-verified-against-code: 2026-08-11
> - staleness-policy: each entry has its own staleness — check supersedes links

> **Overview:** Practical knowledge accumulated during Crelab development. Tracks development process insights and architectural wisdom. Uses supersedes/superseded-by links for evolving practices.

---

## Entry Format

```
## [Lesson Title]

**Context:**
[What situation this came from]

**What We Learned:**
[The insight or pattern discovered]

**Apply When:**
[When future agents/developers should use this knowledge]

**Supersedes:** [link to any prior lesson this replaces, or None]
**Superseded by:** [link to any newer lesson that replaces this, or None]
```

---

## Lessons

## Cursor Pagination with Composite Keys

**Context:** Explore feed needed stable pagination that doesn't drift when new providers are added.

**What We Learned:** Composite cursor using `(createdAt, id)` encoded in base64url works well. Fetch `limit+1` rows — if you get `limit+1`, there are more pages. The cursor encodes the last item's values for the pagination `WHERE` clause.

**Apply When:** Any infinite scroll or cursor-paginated list (explore, search results, admin tables).

**Supersedes:** None
**Superseded by:** None

---

## raw-body for Paystack Webhook HMAC Verification

**Context:** Paystack sends webhook payloads that must be verified with HMAC-SHA512 before processing.

**What We Learned:** Next.js API routes parse JSON body automatically, but HMAC needs the raw body string. Must use route handler config `export const config = { api: { bodyParser: false } }` or re-stringify. Using `crypto.timingSafeEqual` prevents timing attacks on signature comparison.

**Apply When:** Implementing Paystack webhook handlers or any HMAC-signed webhook.

**Supersedes:** None
**Superseded by:** None

---

## Drizzle ORM: Relations After Tables

**Context:** Creating 14 tables with relations in a single schema file.

**What We Learned:** Drizzle requires all referenced tables to be defined before `relations()` calls. The `relations()` function must come after all `pgTable()` calls. Each relation explicitly declares `fields` and `references` — no magic inference.

**Apply When:** Any Drizzle schema with foreign key relations.

**Supersedes:** None
**Superseded by:** None

---

## Next.js App Router: Server Components Need Async Data

**Context:** Root layout needs PlatformConfig from DB before rendering children.

**What We Learned:** Server components can `await` data fetching directly (no `useEffect`). Root layout `layout.tsx` uses `async function RootLayout` with `PlatformConfigService.getCached()`. Falls back to `DEFAULT_CONFIG` if DB fails so the app doesn't crash on cold start.

**Apply When:** Any server component or layout that needs async data.

**Supersedes:** None
**Superseded by:** None

## Better Auth Dash Plugin Setup

**Context:** Dash ownership verification failed on the Better Auth dashboard because the `dash()` plugin wasn't registered and the `BETTER_AUTH_SECRET` was a placeholder.

**What We Learned:**
1. The `@better-auth/infra` package exports `{ dash }` from its main entry (`import { dash } from "@better-auth/infra"`), not from a plugins subpath
2. The `BETTER_AUTH_SECRET` must be a real generated secret, not a placeholder
3. After adding the Dash plugin, the app must be redeployed for ownership verification to pass
4. `.env.example` should include `BETTER_AUTH_API_KEY` so it's documented

**Apply When:** Setting up or troubleshooting Better Auth Dash dashboard integration.

**Supersedes:** None
**Superseded by:** None

## DB Seed: Users Must Be Created via Better Auth API — Pre-Hashing Fails

**Context:** Seed script initially used bcryptjs to pre-hash passwords and inserted user + account records directly into the DB. Login always returned 401 "Invalid email or password" even though the hashes were standard `$2b$10$` format.

**What We Learned:**
1. Better Auth's native bcrypt verification does not accept pre-computed bcryptjs `$2b$` hashes — the hash format or salt rounds don't match what Better Auth expects
2. Users must be created through Better Auth's `signUp` flow (via HTTP `POST /api/auth/sign-up/email` or server-side `auth.api.signUp()`) for login to work
3. After creating via the API, you can update the user record (role, phone, etc.) and the password still works
4. Vercel's production deployment rate-limits aggressive seeding — add 3s delay + exponential backoff retry for 429s
5. All FK constraints use `ON DELETE CASCADE` but NOT `ON UPDATE CASCADE` — user IDs cannot be reassigned after creation

**Apply When:** Writing seed scripts or any code that creates user accounts programmatically in a Better Auth project.

**Supersedes:** None
**Superseded by:** None

---

## Dash Ownership Verification — DB Schema Must Exist

**Context:** Even after installing the Dash plugin and setting env vars, ownership verification still failed. The sign-up endpoint was returning 500 errors.

**What We Learned:**
1. An empty Supabase database (no tables applied) causes all auth DB operations to fail silently with 500
2. The 500 errors prevent Dash ownership verification from completing — the cloud service can't confirm the server works
3. `drizzle-kit push` syncs the schema directly without needing migration journal alignment
4. The `drizzle.config.ts` must have `dbCredentials.url` set (or `DATABASE_URL` env var) for drizzle-kit to connect
5. After pushing schema, verify by hitting `POST /api/auth/sign-up/email` — should return 200, not 500

**Apply When:** Setting up a new Supabase project or troubleshooting 500 errors on auth endpoints.

**Supersedes:** None
**Superseded by:** None

---

## PostgreSQL Numeric Type Returns String via Supabase API

**Context:** `rating.toFixed is not a function` error — PostgreSQL `numeric` columns were deserialized as strings through the Supabase REST API layer, causing `.toFixed()` to throw.

**What We Learned:**
1. PostgreSQL `numeric` type values can arrive as strings in the browser through certain API layers (Supabase REST, postgres.js edge cases)
2. Always wrap API-derived numeric values with `Number()` before calling `.toFixed()`, `.toLocaleString()`, or any `Number.prototype` method
3. TypeScript's `number` type annotation does not guarantee a runtime number value
4. The safest pattern: `Number(value).toFixed(1)` instead of `value.toFixed(1)`

**Apply When:** Rendering any numeric value that originates from a DB query (ratings, prices, percentages). Coerce with `Number()` before calling number methods.

**Supersedes:** None
**Superseded by:** None

---

## Naira/Kobo Conversion Must Happen Exactly Once, at the API Boundary

**Context:** The onboarding review step displayed ₦75,000 as ₦7,500,000 because the preview multiplied entered naira by 100 (as if converting to kobo) during display.

**What We Learned:**
1. Users enter money in naira; the DB stores kobo (integer). Convert exactly once — at the API boundary — via `nairaToKobo(parseFloat(input))`
2. Display paths must NEVER multiply by 100. Stored kobo divides by 100 (`kobo / 100`); entered naira renders as-is
3. Centralize conversions in `lib/currency.ts` (`nairaToKobo`, `formatNaira`, `formatKobo`) so the double-conversion class of bug cannot recur
4. The seed data (`scripts/seed.ts`) confirms the convention: package `price: 75000` means ₦75,000 (kobo), and display uses `price / 100`

**Apply When:** Any form collecting money, any price display, or any kobo/naira conversion.

**Supersedes:** None
**Superseded by:** None

---

## Optional Integrations Need an Availability Guard + Graceful Degradation

**Context:** Cloudinary uploads were only reachable by pasting a "Cloudinary URL", and silently broke when `NEXT_PUBLIC_CLOUDINARY_*` env vars were absent. The Drive connect failed during onboarding because it called a sync endpoint before a provider row existed.

**What We Learned:**
1. For any third-party integration, gate the feature on a capability check: config flags AND env-presence (`isCloudinaryConfigured()` reads env at call time, not module load — module-load captures are untestable)
2. Expose capability to the client (`GET /api/media/status`) so the UI can hide/offer alternatives instead of failing at submit time
3. Present storage-agnostic UX: "Upload your work or provide a link" — users should never need to know the underlying provider (Cloudinary vs Drive)
4. Don't call endpoints that require a resource before it exists (Drive sync needs a provider row → use collect-mode during onboarding and ingest after creation)

**Apply When:** Adding any external service (Cloudinary, Drive, Paystack, Resend, Mux) or any upload/link flow.

**Supersedes:** None
**Superseded by:** None

---

## Mock Fallback Pattern for Profile Pages

**Context:** Profile pages returned 404 when the DB had no matching provider because the slug-to-ID extraction didn't match mock provider slugs.

**What We Learned:**
1. When the DB query returns null, check `MockDataService.isEnabled()` and fall back to `getMockProviderBySlug(slug)` — the slug is matched against explore card slugs (not the raw ID extraction logic)
2. All data fetches on the profile page (portfolio, packages, reviews, work history) should also have try/catch with mock fallback
3. The mock reviews need metadata (`reviewerName`, `reviewerAvatar`, `verifiedBooking`) to match the `ReviewWithMeta` interface expected by the ReviewsSection component
4. The team page pattern (DB → catch → MockDataService) is the canonical pattern to copy

**Apply When:** Adding mock/fallback support to any page that currently queries the DB directly.

**Supersedes:** None
**Superseded by:** None

---

## Blog Fallback Content When CMS Is Unavailable

**Context:** Sanity CMS env vars were not configured, causing both blog listing and detail pages to show empty/404.

**What We Learned:**
1. Create a separate `lib/blog-fallback.ts` file with hardcoded posts matching the `IBlogPost` interface
2. Blog pages should try the CMS first, then fall back to hardcoded content (try/catch pattern)
3. Fallback blog posts need simple `{_type: "block"}` content structure that the existing `ArticleBody` component can render — no Sanity-specific block types
4. The `slug` in fallback posts uses `{ current: string }` format matching Sanity's slug type
5. `generateMetadata` also needs the fallback path so meta tags work when CMS is down

**Apply When:** Implementing any CMS-dependent page that needs to work without the CMS being configured.

**Supersedes:** None
**Superseded by:** None

---

## Pipeline Columns Live in One Place — Shared by Mock and Real Services

**Context:** The dashboard renders a kanban pipeline (Requested → Confirmed → In Progress → Completed) for both providers and clients, with different status→stage mappings per role. Duplicating the status lists in the UI, mock data, and query layer risks drift (a status added to one but not the other).

**What We Learned:**
1. Define the column→status mapping once as `static readonly` arrays on the service (`DashboardService.PROVIDER_COLUMNS` / `CLIENT_COLUMNS`) and reuse it from every build path — real query and mock fallback both feed the same column defs, so shapes can't diverge
2. Every `BookingStatus` must map to exactly one provider column (RELEASED is the only "completed" provider stage); clients additionally see REFUNDED under completed. Exception/terminal states (DECLINED, CANCELLED, DISPUTED) intentionally do not appear in the active pipeline — assert that explicitly in tests rather than asserting "all statuses covered"
3. Derive mock "percent" values the same way the real service does (`Math.round(completed/total*100)`) so tests can assert consistency instead of hardcoded values
4. Keep money in the mock layer as integer kobo and assert `Number.isInteger(rawValue)` + `value.match(/^₦/)` — the same invariants the real service guarantees

**Apply When:** Adding any new pipeline/column UI, new booking statuses, or a new role dashboard.

**Supersedes:** None
**Superseded by:** None

---

## TypeScript 7 Removed `baseUrl`

**Context:** `npx tsc --noEmit` failed with `Option 'baseUrl' has been removed` after the toolchain picked up TypeScript 7, blocking the QA gate.

**What We Learned:**
1. TypeScript 7 removes the `baseUrl` compiler option entirely; `paths` entries that are relative (e.g. `"@/*": ["./*"]`) resolve against the tsconfig directory without it
2. When a bare `npx tsc` reports module-not-found errors for every package (vitest, next, lucide-react), the project's `node_modules` is missing — install first (`npm install`) before diagnosing TS config
3. Verify the actual compiler version with `npx tsc --version` — a global/pinned newer tsc can surface errors the project's own toolchain would not

**Apply When:** Upgrading TypeScript, triaging bulk "module not found" typecheck noise, or editing tsconfig.

**Supersedes:** None
**Superseded by:** None

---

## Better Auth Session Lookups Need the Request Headers — Never `new Headers()`

**Context:** A signed-in user opening `/dashboard` got `Error: Unauthorized` (digest `1369153800`). The trace pointed at the dashboard page, but the user's session cookie was valid.

**What We Learned:**
1. `auth.api.getSession({ headers: new Headers() })` always returns `null` — Better Auth reads the session cookie from the request headers, and an empty `Headers` object contains no cookies
2. In server components and route handlers, obtain the current request headers with `await headers()` from `next/headers` and forward them: `auth.api.getSession({ headers: h })` (route handlers may also use `req.headers`)
3. A shared `getSession()`/`requireAuth()` helper hides the bug from every caller — one wrong headers source breaks all protected pages and API routes at once
4. The app already had the correct pattern (`app/admin/layout.tsx`, consent/export/delete API routes); grep for `getSession({ headers: new Headers()` during review to catch regressions

**Apply When:** Writing or reviewing any Better Auth session lookup, auth guard, or protected server page/route.

**Supersedes:** None
**Superseded by:** None
