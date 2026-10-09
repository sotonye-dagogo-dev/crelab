# Test Results

> **Metadata**
> - last-updated-by: fix-build (Session 2026-10-09 — webinars Date param + dashboard client boundary)
> - last-verified-against-code: 2026-10-09
> - staleness-policy: overwritten on every test run — always current

> **Overview:** Latest test run results. Updated by agents after running tests. Gives a quick snapshot of current project health.

---

## Last Run

**Date:** 2026-10-09
**Run by:** fix-build (webinars Date param + dashboard client boundary)

**Results:**
| Suite | Passed | Failed | Skipped |
|-------|--------|--------|---------|
| Unit (vitest) | 457 | 0 | 0 |
| TypeScript (tsc --noEmit) | — | 0 errors | — |
| Lint (next lint) | — | 0 errors (pre-existing warnings only) | — |
| Production build | — | not re-run this session (2-file targeted fix; tsc + full vitest green) | — |

**Overall Status:** ✅ All 457/457 tests pass. Typecheck clean. Lint 0 errors. No new tests (minimal 2-file fix; existing WebinarService 21 + DashboardService 16 tests cover both areas).

---

## Active Failures

None. Previously-active failures (resolved 2026-10-08, non-breaking):
- `__tests__/media.test.ts:72` — resolved in code: `lib/media.ts` oversize message now reads `"File too large: …"` (keeps the detailed per-file-limit wording, restores the `"too large"` substring the test and downstream `raw.includes("too large")` branches match on).
- `__tests__/services/BlogPostService.test.ts:89,98` — resolved in test suite: `adminList()` intentionally merges DB rows with fallback posts (`mergeUnique(rows, fallbackPosts)` so the admin view never goes empty); expectations updated to `getFallbackPosts().length + 1` with the DB row first.

---

## History

| Date | Passed | Failed | Notes |
|------|--------|--------|-------|
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
