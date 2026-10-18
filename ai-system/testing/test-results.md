# Test Results

> **Metadata**
> - last-updated-by: execute-feature (Session 2026-10-18 — Drive link quick preview)
> - last-verified-against-code: 2026-10-18
> - staleness-policy: overwritten on every test run — always current

> **Overview:** Latest test run results. Updated by agents after running tests. Gives a quick snapshot of current project health.

---

## Last Run

**Date:** 2026-10-18
**Run by:** execute-feature (Drive link quick preview)

**Results:**
| Suite | Passed | Failed | Skipped |
|-------|--------|--------|---------|
| Unit (vitest) | 575 | 0 | 0 |
| TypeScript (tsc --noEmit) | — | 0 errors | — |
| ESLint (`npm run lint` via next lint) | — | 0 errors | — |
| Production build (`npm run build`) | — | 0 errors (full route build green incl. /api/portfolio/drive/preview) | — |

**Overall Status:** ✅ All 575/575 tests pass (44 files). Typecheck clean. Lint 0 errors (pre-existing warnings only, none in changed files). Production build green. New: `__tests__/lib/rate-limit.test.ts` (8: under-limit allow + remaining, over-limit deny + retryAfter, denied attempts not recorded, window expiry, key isolation, disabled limits, countdown math, reset). DriveService suite 40 → 52 (+12: clamped pageSize passthrough, folder-metadata mapping incl. isFolder + 404/403/429, previewFolder zero-DB/no-portfolio contract + stable thumbs + unsupported split, sampled flag, env + hard-cap bounds, empty folder, invalid URL pre-API, non-folder id rejection before listing, private-vs-rate-limit propagation). Prior run: 555/555 (2026-10-18, Drive limits hardening). Note: `node_modules` was absent in this environment — ran `npm ci` first, then all gates.

---

## Active Failures

None. Previously-active failures (resolved 2026-10-08, non-breaking):
- `__tests__/media.test.ts:72` — resolved in code: `lib/media.ts` oversize message now reads `"File too large: …"` (keeps the detailed per-file-limit wording, restores the `"too large"` substring the test and downstream `raw.includes("too large")` branches match on).
- `__tests__/services/BlogPostService.test.ts:89,98` — resolved in test suite: `adminList()` intentionally merges DB rows with fallback posts (`mergeUnique(rows, fallbackPosts)` so the admin view never goes empty); expectations updated to `getFallbackPosts().length + 1` with the DB row first.

---

## History

| Date | Passed | Failed | Notes |
|------|--------|--------|-------|
| 2026-10-18 | 575 | 0 | execute-feature: Drive link quick preview (rate-limit window limiter, folder metadata + bounded sample, zero-DB preview route with per-user budget, UI card + cooldown) (+20 tests). tsc 0 errors, lint 0 errors, build green |
| 2026-10-18 | 555 | 0 | execute-feature: Google Drive limits/caveats hardening (rate-limit classification + backoff/Retry-After, per-process throttle, pagination cap/truncated, stable unsigned thumbnails, syncAll abort, 503 route mapping, client legacy-thumb heal) (+25 tests). tsc 0 errors, lint 0 errors, build green |
| 2026-10-16 | 530 | 0 | execute-feature: booking selection shared across grid/sidebar/bottom-bar; navbar overflow "More" dropdown + wallet links (profile + nav, config-driven) (+12 tests). tsc 0 errors, lint 0 errors, build green |
| 2026-10-15 | 498 | 0 | fix-build: masked cross-origin `Script error.` no longer pops the bug dialog (`isIgnorableCapture` + once-per-mount guard); bug-report form required/optional markers (+5 tests). tsc 0 errors, lint 0 errors, build green |
| 2026-10-14 | 493 | 0 | execute-feature: webinar count + public webinars layout + payment tightening (see prior Last Run). tsc 0 errors, lint 0 errors, build green |
|------|--------|--------|-------|
| 2026-10-12 | 463 | 0 | execute-feature: webinars rollback (`cancel`/`adminCancelRegistration`, user + admin DELETE), enriched attendees (account-vs-guest join), centered tight pagination, config cancel copy (+4 tests). tsc 0 errors, lint 0 errors, build green |
| 2026-10-12 | 459 | 0 | fix-build: WebinarService `grantMarketingConsent` explicit `{ id; granted }` annotation (was TS7006 implicit any off `tx: any`); compliance allowlist +3 webinar storage keys. tsc 0 errors, `npm run build` green |
| 2026-10-09 | 457 | 0 | fix-build: webinars `phaseCondition` binds ISO string + `::timestamptz` (was raw Date); PortfolioPerformanceTable → `"use client"`. tsc 0 errors, lint 0 errors |
| 2026-10-08 | 407 | 0 | execute-feature: leaderboard pagination optimisation (30s board cache, batched candidates, current-user rank; +5 tests) + orphan backfill service/API/admin UI (+3 tests). tsc 0 errors, lint 0 errors |
| 2026-10-08 | 399 | 0 | execute-feature: leaderboard keeps zero-score rows (+2 tests, 1 expectation updated); explore portfolio mock fallback; upload→portfolio auto-attach + POST /api/portfolio/items. tsc 0 errors, lint 0 errors |
| 2026-10-08 | 398 | 0 | verify-work: resolved the 3 long-standing failures non-breaking (media message restores "too large" substring; BlogPostService expectations reflect merge-with-fallback). tsc 0 errors, lint 0 errors |
| 2026-10-08 | 395 | 3 | Auth cleanup + Explore tiles + Team + SEO session (7 fixes; 6 new social-platform tests). 3 failures pre-existing (media message + BlogPostService mocks ×2) |
| 2026-08-20 | 258 | 0 | Wallet page + Paystack tightening: paystack metadata/callback_url, verify endpoint, payment-status page, wallet idempotent credit. New `__tests__/paystack.test.ts` (6 tests) |
| 2026-08-18 | 218 | 0 | Email template fallback + Resend sender recommendations: `lib/email-templates.ts` resolveEmailTemplates/resolveEmailTemplate/resolveEmailConfig (hardcoded defaults apply when not saved in DB), PlatformConfigService merges emailConfig, EmailService.send defensive fallback, verify-email + admin email routes use resolver. Sender switched from no-reply root domain to subdomain (`hello@mail.crellab.com`) with RESEND_FROM_EMAIL/RESEND_FROM_NAME env overrides + admin hint. New tests: email-templates (+6), EmailService (+4: 3 sender + 1 hardcoded-fallback) |
| 2026-08-13 | 193 | 0 | Collapsible admin sidebar (AdminShell), ClDataTable + ClPagination across admin pages, email h1 #E8FF47 + editable template name, {{name}} preview fix, blog sections builder (ContentBlocksEditor/ContentBlocks), appOrigin trailing-slash hardening. New: `__tests__/lib/email-blocks.test.ts` (6 tests) |
| 2026-08-12 | — | — | Docs-only close-out session (Session 22): Cloudinary asset-lifecycle implementation (shipped 2026-08-11, incl. 220-line MediaAssetService test suite) documented. No code changed |
| 2026-08-12 | 169 | 0 | Cron auth alignment: all 4 cron routes verify `Authorization: Bearer <CRON_SECRET>`; media-cleanup registered in vercel.json; .env.example guidance updated |
| 2026-08-11 | 151 | 0 | Integrations readiness: emailNotifications default, isResendConfigured + /api/email/status, subject fix, 11 EmailService tests, .env.example (RESEND_API_KEY, CRON_SECRET) |
| 2026-08-11 | 140 | 0 | Fixed dashboard "Unauthorized" for authenticated users: `getSession()` now forwards request headers |
| 2026-08-09 | 140 | 0 | Dashboard added: DashboardService + MockDataService dashboard tests (15 new) |
