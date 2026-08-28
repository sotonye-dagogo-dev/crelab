# Lessons Learned

> **Metadata**
> - last-updated-by: update-ai-system (Session 34)
> - last-verified-against-code: 2026-08-28
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

---

## Every Config Feature Flag Needs a Default in DEFAULT_CONFIG

**Context:** `DEFAULT_CONFIG.features` had `guestBrowse`, `googleDriveSync`, `blogEnabled` — but the admin editor and `/api/email/*` routes referenced `features.emailNotifications`, which had no default. The route's `if (!config.features?.emailNotifications)` guard made every email silently return "disabled", so even with a real `RESEND_API_KEY` the system could not send. This was only caught by reading the API routes against the config, not by any test.

**What We Learned:**
1. A feature flag referenced by code must have an explicit default in `DEFAULT_CONFIG` — a missing default makes the feature permanently off (or permanently on) until someone touches the DB, which reads like a broken integration rather than a config issue
2. Grep for every `config.features?.X` / `config.X?.Y` access and cross-check against `DEFAULT_CONFIG` + the `IFeatureFlags` interface — the type's `?` hides the gap
3. Health/status endpoints per integration (`/api/media/status`, `/api/email/status`) that report "configured = featureFlag AND envPresent" turn silent gaps into checkable state
4. Integration guards should be symmetric: `isCloudinaryConfigured()` / `isResendConfigured()` read env at call time so the same pattern applies to every external provider

**Apply When:** Adding any config flag, reviewing the admin config editor, or wiring a new external integration (env guard + status endpoint + default flag).

**Supersedes:** None
**Superseded by:** None

---

## `.env.example` Must Mirror Every Env Var Referenced in Code

**Context:** While making Resend operational, `RESEND_API_KEY` and `CRON_SECRET` were found referenced in `services/EmailService.ts` and `app/api/cron/*` but absent from `.env.example` — anyone following the template would plug in every listed var and still have email + cron silently unavailable.

**What We Learned:**
1. Derive `.env.example` by grepping `process.env.<NAME>` across `app/`, `lib/`, `services/`, `scripts/`, `sanity/`, `drizzle/`, `middleware.ts` — then diff against `.env.example`
2. Group by service with a one-line purpose comment (e.g. "Resend — welcome, booking confirmation, payment received") so keys are self-documenting
3. Note which features degrade without the var (e.g. "direct uploads only appear when both Cloudinary vars are set")

**Apply When:** Adding an env var, updating the deployment checklist, or reviewing `.env.example`.

**Supersedes:** None
**Superseded by:** None

---

## Media Asset Cleanup Should Be Registry-Driven, Not API-Scanned

**Context:** Implementing orphaned-Cloudinary-upload cleanup. Scanning Cloudinary's remote tag or resource-list API for "orphans" is slow and fragile (pagination, rate limits, eventual consistency). The shipped design instead records every upload in a local `media_assets` registry table.

**What We Learned:**
1. A local registry (`media_assets` with publicId/cloudName/assetId/uploaderId/metadata) is the single source of truth: cleanup = query rows older than `mediaUpload.cleanupOrphanAfterHours` whose publicId isn't referenced in `providers`/`portfolio_items`, then call Cloudinary delete for each
2. Record-then-delete is non-atomic — the upload route records the asset and deletes the Cloudinary binary if the DB insert fails (compensating delete), keeping the registry consistent
3. Delete is a two-step, irreversible operation (clear references first, then the binary), so destructive flows must use a confirmation dialog (`ClConfirmDialog`); reversible admin deletes get undo toasts (`useUndoable`)
4. Signed Cloudinary admin operations need server-only env vars (`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET`), read at call time with backward-compatible `NEXT_PUBLIC_CLOUDINARY_*` fallbacks, gated by `isCloudinaryConfigured()`
5. Config-gate the cleanup job (`mediaUpload.cleanupEnabled` + `cleanupOrphanAfterHours`) and expose in `/api/media/status` so ops can verify the pipeline without running it

**Apply When:** Building any external-object-storage cleanup, asset registry, or "am I still using this file?" reconciliation (Cloudinary, S3, Drive).

**Supersedes:** None
**Superseded by:** None

---

## Close Out Work in Docs When the Code Ships

**Context:** The Cloudinary asset-lifecycle implementation shipped (commit `2f927df`) with a full in-progress plan left behind. `ai-system/in-progress.md` stayed "active", and `session-log`/`task-queue`/`project-plan`/`dev-history` had no completion entries — so anyone reading the docs thought the work was unfinished while the code was complete and tested.

**What We Learned:**
1. "The QA gate passed" and "the docs are closed out" are separate steps. Shipping code without the close-out step (`execute-feature.md` Step 5) silently accumulates doc drift
2. Before starting work, check whether `in-progress.md` from a prior session describes work that already exists in code (`git log` for the listed files) — close it out instead of re-implementing
3. Completion for a feature is: session-log entry + task-queue/project-plan `[x]` + dev-history sprint + `in-progress.md` cleared + repo-map/dependency-graph/system-architecture reconciled

**Apply When:** Beginning any session that references a prior `in-progress.md`, or after any feature where close-out was skipped.

**Supersedes:** None
**Superseded by:** None

---

## Deep-Merge Config Keys When Round-Tripping DB Rows

**Context:** Admin edits to nested config (e.g. `emailConfig.templates.verifyEmail.subject`) appeared saved but never took effect — merged config rows used shallow assignment, so a DB row for a top-level key (e.g. `emailConfig`) overwrote the whole default subtree with only the edited branch.

**What We Learned:**
1. `PlatformConfigService.get()` must deep-merge DB rows into the defaults key-by-key: parse the dotted path (e.g. `emailConfig.templates`) and deep-set it on the merged object (`setNestedValue(target, path, value)`) instead of `merged[row.key] = row.value`
2. Skip null row values during the merge so defaults are never clobbered by an absent override
3. Export `setNestedValue` from the service so it can be unit-tested directly (it is the core round-trip primitive)
4. This class of bug is invisible to typecheckers — the shape is valid, only the merge strategy is wrong; a test that mutates a nested key, re-reads, and asserts the value survives is the only guard

**Apply When:** Any admin-editable nested config, "saved but didn't stick" reports, or extending `PlatformConfigService` merging.

**Supersedes:** None
**Superseded by:** None

---

## `??` Chained with `&&` Without Parens Is a Syntax Error in esbuild

**Context:** While writing code that used `cond && a ?? b`, the build failed with a parse error. esbuild treats `??` as requiring parentheses when combined with `&&`/`||` (the mixed logical-operator restriction), so bare `x && y ?? z` is a syntax error.

**What We Learned:**
1. `??` cannot be mixed with `&&`/`||` without explicit parentheses: `a && b ?? c` is invalid — write `(a && b) ?? c` or restructure into explicit `if/else`
2. The error appears at build/bundle time (esbuild), not necessarily at typecheck time — check the full build output when tests/types pass but the build fails
3. Prefer explicit `if/else` for mixed null-coalescing and boolean logic — it reads better and cannot trip the parser

**Apply When:** Writing expressions that combine `??` with `&&` or `||`, or triaging esbuild parse errors on otherwise-valid-looking TS.

**Supersedes:** None
**Superseded by:** None

---

## Hydration-Safe Client Components: No `typeof window` Branching in Render

**Context:** Building `ClBackButton` (history.back with fallback href) and client pages. Branching on `typeof window !== "undefined"` in a client component's render path produces a hydration mismatch — the server renders one branch, the client another.

**What We Learned:**
1. Never branch on `typeof window` inside the render path of a client component — server-rendered HTML and client hydration must agree
2. Instead, intercept the click: render the fallback href unconditionally and call `router.back()` / `window.history.back()` in an onClick handler (guard with a check that history exists), preventing navigation when it isn't available
3. Defer any window-dependent reads (e.g. `history.length`) into event handlers or `useEffect` after mount, not into the initial render

**Apply When:** Any client component that needs browser APIs (history, localStorage, matchMedia) — prefer click interception + effects over render-time branching.

**Supersedes:** None
**Superseded by:** None

---

## Drizzle Enum Columns Reject `as string` Casts — Use the Enum Literal Directly

**Context:** Writing code that cast a database enum value as `string` when passing it to a drizzle operation failed at runtime/type level — drizzle enum columns require the enum's literal type, not `string`.

**What We Learned:**
1. When a column is defined with `enum('consent_status', [...])` (or a ts enum), drizzle's types expect the literal union, not `string` — `value as string` does not satisfy it
2. Type the variable as the enum type (`typeof CONSENT_STATUS_ENUM` or the literal union) or use the enum literal directly instead of casting to `string`
3. This surfaces as a type error in strict drizzle typing — prefer the actual enum type over widening

**Apply When:** Passing values to drizzle enum columns, especially consent/status fields, or when an `as string` cast fails against a drizzle column type.

**Supersedes:** None
**Superseded by:** None

---

## OGImage Type Is `string | URL | object` — Tests Must Narrow It

**Context:** Writing tests for `lib/seo.ts` `buildSeoMetadata`. Next.js's `Metadata['openGraph']` images accept `string | URL | OGImage | array`, so asserting on `metadata.openGraph!.images` requires narrowing (e.g. `typeof img === "string"`) before string assertions.

**What We Learned:**
1. Next.js metadata `openGraph.images` / `twitter.images` values are a union (`string | URL | object | array`) — direct string access in tests fails the typecheck
2. In tests, narrow first: if it's a string, assert; otherwise `expect(...).toEqual(...)` the object/array form
3. Keep the helper's return type explicit so callers and tests can rely on the shape

**Apply When:** Testing any `generateMetadata`/`buildSeoMetadata` output, or consuming `openGraph`/`twitter` metadata values.

**Supersedes:** None
**Superseded by:** None

---

## Next Lint Flags Unescaped Apostrophes — Use `&apos;`

**Context:** ESLint (next) reported `react/no-unescaped-entities` on JSX text containing an apostrophe (e.g. "don't"). 

**What We Learned:**
1. Next.js's ESLint config flags unescaped `'` and `"` in JSX text — write `&apos;` (or wrap in a string expression) instead
2. Only applies to JSX text content, not attribute strings or code strings
3. Since it's a lint error (not just a warning) in the strict config, an unescaped apostrophe fails the lint gate — fix in the source, don't suppress

**Apply When:** Writing JSX text with apostrophes/quotes, or triaging `react/no-unescaped-entities` lint failures.

**Supersedes:** None
**Superseded by:** None

---

## Better Auth Verification: `sendOnSignUp:false` + Client-Side Welcome After Verification

**Context:** Wiring email verification with a custom `sendVerificationEmail`. Sending the welcome email from Better Auth's `afterEmailVerification` hook fires for BOTH verification-after-signup AND email-address-change verification — the latter would re-send a welcome email to an already-welcome'd user.

**What We Learned:**
1. Configure `emailVerification.sendOnSignUp: false` so verification is requested explicitly (client POSTs `/api/verify-email/send`) instead of Better Auth auto-sending on signup
2. Don't fire the welcome email from `afterEmailVerification` — that hook also runs when a user changes their email address, so the welcome email would be re-sent on an unrelated action
3. Instead, have the `/verify-email` page fire the welcome once client-side when the flow returns with `?done=1` (only for the verification-from-signup path), and keep Google signups (pre-verified emails) firing the welcome immediately from the register page
4. Guard the `/api/verify-email/welcome` route: only send when the session user's `emailVerified` is true

**Apply When:** Configuring Better Auth email verification, welcome emails, or email-change confirmation flows.

**Supersedes:** None
**Superseded by:** None

---

## Module-Level Constants Freeze Build-Time Env — `NEXT_PUBLIC_*` Is Inlined, Not Runtime-Read

**Context:** Debugging why a test couldn't override `NEXT_PUBLIC_APP_URL` after import: `SAMPLE_EMAIL_VARS` in `lib/email-blocks.ts` is a module-level constant computed once at import time. Setting `process.env.NEXT_PUBLIC_APP_URL` after the module loaded had no effect — the value had already been captured.

**What We Learned:**
1. A top-level `const X = compute(process.env.NEXT_PUBLIC_...)` in a module evaluates exactly once, at module load — later env writes are invisible to it
2. `NEXT_PUBLIC_*` vars are statically inlined at build time for the client bundle; for server code they're still read from `process.env` at request time. Module-level constants computed from them on the server freeze whatever the env was at first load (fine in production, misleading in tests)
3. For email previews, keep the sample vars as exported constants derived from `DEFAULT_CONFIG` (deterministic) rather than the live env — and if you must test env-dependent URL resolution, test `resolveAbsoluteUrl(appOrigin())` directly instead of a module-load-time constant
4. When a test needs a different env value, set it before the module is first imported (e.g. via `vi.stubEnv`/`beforeAll` in a setup file), not in the test body after import

**Apply When:** Deriving preview/display values from `NEXT_PUBLIC_*`/env at module scope; writing tests that need to vary the origin/URL.

**Supersedes:** None
**Superseded by:** None

---

## Better Auth Verification: `sendOnSignUp:false` + Client-Side Welcome After Verification

**Context:** Wiring email verification with a custom `sendVerificationEmail`. Sending the welcome email from Better Auth's `afterEmailVerification` hook fires for BOTH verification-after-signup AND email-address-change verification — the latter would re-send a welcome email to an already-welcome'd user.

**What We Learned:**
1. Configure `emailVerification.sendOnSignUp: false` so verification is requested explicitly (client POSTs `/api/verify-email/send`) instead of Better Auth auto-sending on signup
2. Don't fire the welcome email from `afterEmailVerification` — that hook also runs when a user changes their email address, so the welcome email would be re-sent on an unrelated action
3. Instead, have the `/verify-email` page fire the welcome once client-side when the flow returns with `?done=1` (only for the verification-from-signup path), and keep Google signups (pre-verified emails) firing the welcome immediately from the register page
4. Guard the `/api/verify-email/welcome` route: only send when the session user's `emailVerified` is true

**Apply When:** Configuring Better Auth email verification, welcome emails, or email-change confirmation flows.

**Supersedes:** None
**Superseded by:** None

---

## Relative URLs Must Be Resolved at Render Time — Never Baked at Edit Time

**Context:** The email logo (and any image added via the visual block builder as `/primary-logo.png`) didn't render in the admin preview or in recipients' emails. The builder emitted `src` verbatim, and the preview substituted `{{logoUrl}}` from `DEFAULT_CONFIG` rather than the DB-configured `logoPath`.

**What We Learned:**
1. Email clients cannot resolve relative URLs; the `srcdoc` preview iframe resolves them against the parent origin (unreliable). Every image/link destined for email must be absolute.
2. Do NOT resolve against the origin inside `blocksToHtml()`/at save time — that bakes the editor's client origin (e.g. `localhost:3000`) into stored HTML. Resolve at **render time**: the client preview computes `appOrigin()` from its build-time `NEXT_PUBLIC_APP_URL`, the server send path from the server env. `resolveRelativeUrlsInHtml()` is shared by both, run AFTER `{{variable}}` substitution.
3. `resolveUrlForRender()` must skip `{{token}}` values (resolving them mangles later substitution), and the HTML rewrite must skip scheme'd (`data:`/`mailto:`/`tel:`), protocol-relative (`//`), and `#` fragment URLs.
4. Preview sample vars should come from the actual platform config (`previewVarsFor(config)`) so the preview captures the configured logo/name — a preview tied to `DEFAULT_CONFIG` misleads admins.
5. Keep template tokens as the interchange format in stored blocks/HTML; resolve absolute only at the final render boundary (preview + send).

**Apply When:** Embedding images/links in email templates, building preview surfaces for config-driven content, or writing URL utilities that must not corrupt template placeholders.

**Supersedes:** None
**Superseded by:** None

---

## Code-Wired Transactional Emails Are Preview/Simulate-Only — Never Operator-Sendable

**Context:** Building the admin email-templates page, the welcome/verification/password-reset/booking/payment emails are triggered by code events (signup, email verification, password reset, booking lifecycle) — not by an operator. Letting the admin "Send Test" or "Broadcast" a wired template would fire emails at the wrong time or to the wrong segment (e.g. broadcasting a password-reset email), duplicating or mis-sequencing the code paths that own those sends.

**What We Learned:**
1. Keep a single registry of wired keys (`lib/email-templates.ts` `WIRED_EMAIL_TEMPLATES`), each with a `label` + `trigger` (the user event that fires it), plus `isWiredEmailTemplate(key)` — one source of truth for both the API guard and the UI.
2. Enforce the rule **server-side**, not just in the UI: `/api/admin/email/send` must reject wired keys for both test-send and broadcast. UI affordances (Simulate vs Send Test / Send to Subscribers) are the second layer.
3. Surface the "why" to the operator: a badge + the trigger description in the admin panel turns an opaque "can't send this" into self-documenting behaviour.
4. Wired templates still need a way to be validated → reuse the existing preview/simulation surface (`useEmailSimulation`) so operators can review content without sending.
5. A template that is triggered by code still needs its code path wired explicitly — e.g. `passwordReset` required adding the template to `DEFAULT_CONFIG` AND Better Auth `emailAndPassword.sendResetPassword` → `sendTransactionalEmail`; adding the template alone would have done nothing.

**Apply When:** Adding any transactional email triggered by a code event, or building admin surfaces over code-triggered content where "send" must be prevented.

**Supersedes:** None
**Superseded by:** None

---

## A New Drizzle Migration File Is Not Enough — The Journal Must Reference It

**Context:** Session 27 added `drizzle/migrations/0005_blog_posts.sql` by hand, but `drizzle/migrations/meta/_journal.json` only tracks `0000`–`0002` (it had already drifted). `drizzle-kit migrate` will not apply a migration that the journal doesn't list — the table silently never exists in any target DB unless someone applies the SQL manually.

**What We Learned:**
1. `drizzle-kit` generates migrations AND appends them to the `meta/_journal.json` snapshot in one step. Hand-written SQL files are invisible to the migration runner unless the journal (and ideally the snapshot) is also updated.
2. When the journal is already stale, don't silently rely on it — record the gap in the session log and in the delivery notes: "apply `0005_blog_posts.sql` manually to the target DB".
3. Verify schema-in-code matches the migration: `blog_posts` is defined in `drizzle/schema.ts` (single source of truth) AND mirrored in the SQL; keep them in sync so a future `drizzle-kit generate` doesn't produce a conflicting `0005`.
4. Prefer running `drizzle-kit generate` (or `drizzle-kit push`) for future schema changes so the journal and snapshot stay consistent.

**Apply When:** Writing or reviewing migrations, syncing schema to Supabase/other DBs, or triaging "table doesn't exist" after a deploy.

**Supersedes:** None
**Superseded by:** None

---

## Merge Strategy for Multi-Source Content: Prefer a Controlled Source, Fall Back Gracefully

**Context:** The public blog previously read only Sanity (or hardcoded fallback). Session 27 added DB-backed posts via `blog_posts`; the public pages now need Sanity posts, DB posts, and fallback posts to coexist without duplicates.

**What We Learned:**
1. Deduplicate by a stable key (`slug`) with a fixed precedence (DB/admin wins over Sanity, fallback last) — build the merge once in `BlogPostService` so pages, cards, sitemap, and related-posts all agree.
2. Detect content shape at render time instead of assuming one source: block-content posts use `type` (`EmailTemplateBlock[]` → `ContentBlocks`/`BlocksContent`), Sanity posts use `_type` (portable text → `ArticleBody`). A single post object can carry either — check for the discriminating field.
3. Keep legacy field shapes compatible: a DB hero URL is stored as a plain string but mapped to `heroImage.asset._ref`/`asset.url` so existing `BlogCard`/metadata code keeps working; a `lib/blog-hero.ts` `getPostHeroUrl` helper resolves both plain URLs and Sanity `image-` refs.
4. Dynamic-import the optional Sanity client inside the service (`await import("@/lib/sanity")` in try/catch) so an unconfigured CMS degrades to DB/fallback instead of crashing.

**Apply When:** Layering a new content source (DB, CMS, fallback) over existing reads, or unifying multiple post/page data sources.

**Supersedes:** None
**Superseded by:** None

---

## Media Upload Hardening: Generous Timeouts + Clear Error Messages + Format Extension

**Context:** Alpha testing revealed Cloudinary direct uploads failing silently or with generic "Internal server error" for large files (>50MB) and unsupported formats. Users had no guidance on what to do next.

**What We Learned:**
1. Set generous timeouts (10 minutes) for Cloudinary uploads using `AbortController` + `setTimeout` — large video files over slow connections need it.
2. Error messages must be actionable: "File too large (max 100MB). Try Google Drive integration for larger files" is infinitely better than "Upload failed".
3. Extend supported formats proactively: MKV, 3GP, 3G2, FLV, MPEG (video); GIF, AVIF, HEIC/HEIF (images). Cloudinary accepts them; the bottleneck was our validation allowlist.
4. Validate file extension matches MIME type (e.g., `.mov` for `video/quicktime`) to catch corrupted/mislabeled files early.
5. For formats Cloudinary doesn't support or files over the limit, surface Google Drive integration as the recommended alternative — it handles large uploads and transcoding better.

**Apply When:** Building or troubleshooting file upload flows, especially for media-heavy applications.

**Supersedes:** None
**Superseded by:** None

---

## Portfolio Gallery View: Reuse Existing Video Card Component

**Context:** The Explore page showed provider cards, but users needed to browse individual portfolio items (work samples) across all providers.

**What We Learned:**
1. The existing `ExploreVideoCard` component already supported both `provider` and `portfolioItem` props — extending it to render portfolio items in a gallery view required minimal changes.
2. New `PortfolioGallery` component reuses `ExploreVideoCard` with `portfolioItem` prop, sharing the same masonry grid, infinite scroll, and filter bar infrastructure.
3. API separation: `GET /api/explore` for provider cards, `GET /api/explore/portfolio` for individual work samples — both share the same filter/sort/pagination parameters.
4. Portfolio items carry provider context (name, slug, avatar, category, verified, rating) so clicking through lands on the provider profile.

**Apply When:** Adding a secondary "item-level" browse view to an existing "entity-level" listing page.

**Supersedes:** None
**Superseded by:** None

---

## Config-Driven Public Pages with Admin Management

**Context:** About and How It Works pages needed to be admin-editable without code changes, following the platform's config-first philosophy.

**What We Learned:**
1. Store content as JSONB in dedicated tables (`about_page`, `how_it_works_page`) with structured fields: hero (title/subtitle), sections (array of {id, title, content}), quickLinks (array of {label, href}), sandboxes (array of {id, title, description, type}), faqs (array of {question, answer, category}).
2. MockDataService provides fallback content when DB is unavailable — keeps pages working in demo mode.
3. Admin management UI can reuse existing patterns (ContentBlocksEditor for rich content, JSON editor for structured data) — to be built in a follow-up session.
4. SEO metadata generated via existing `lib/seo.ts` `buildSeoMetadata` helper.

**Apply When:** Adding any static/landing page that needs admin content management.

**Supersedes:** None
**Superseded by:** None
