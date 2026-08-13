# Test Results

> **Metadata**
> - last-updated-by: update-ai-system (Session 25)
> - last-verified-against-code: 2026-08-13
> - staleness-policy: overwritten on every test run — always current

> **Overview:** Latest test run results. Updated by agents after running tests. Gives a quick snapshot of current project health.

---

## Last Run

**Date:** 2026-08-13
**Run by:** update-ai-system (Session 25)

**Results:**
| Suite | Passed | Failed | Skipped |
|-------|--------|--------|---------|
| Unit (vitest) | 201 | 0 | 0 |
| TypeScript (tsc --noEmit) | — | 0 errors | — |
| Lint (next lint) | — | 0 errors (pre-existing warnings only) | — |
| Production build | 1 | 0 | 0 |

**Overall Status:** ✅ Typecheck clean, 201/201 tests pass, lint has no new warnings, production build passes.

---

## Active Failures

None.

---

## History

| Date | Passed | Failed | Notes |
|------|--------|--------|-------|
| 2026-08-13 | 201 | 0 | Email logo/preview image resolution: `lib/url.ts` resolveUrlForRender + resolveRelativeUrlsInHtml, `lib/email-blocks.ts` substituteSampleVars relative-URL resolution + previewVarsFor(config), email preview captures configured logo/name, EmailService.send resolves relative URLs (sendWelcome exploreUrl via util), blog ContentBlocks URL resolution. New tests: email-blocks (+5), config-helpers (+3) |
| 2026-08-13 | 193 | 0 | Collapsible admin sidebar (AdminShell), ClDataTable + ClPagination across admin pages, email h1 #E8FF47 + editable template name, {{name}} preview fix, blog sections builder (ContentBlocksEditor/ContentBlocks), appOrigin trailing-slash hardening. New: `__tests__/lib/email-blocks.test.ts` (6 tests) |
| 2026-08-12 | — | — | Docs-only close-out session (Session 22): Cloudinary asset-lifecycle implementation (shipped 2026-08-11, incl. 220-line MediaAssetService test suite) documented. No code changed |
| 2026-08-12 | 169 | 0 | Cron auth alignment: all 4 cron routes verify `Authorization: Bearer <CRON_SECRET>`; media-cleanup registered in vercel.json; .env.example guidance updated |
| 2026-08-11 | 151 | 0 | Integrations readiness: emailNotifications default, isResendConfigured + /api/email/status, subject fix, 11 EmailService tests, .env.example (RESEND_API_KEY, CRON_SECRET) |
| 2026-08-11 | 140 | 0 | Fixed dashboard "Unauthorized" for authenticated users: `getSession()` now forwards request headers |
| 2026-08-09 | 140 | 0 | Dashboard added: DashboardService + MockDataService dashboard tests (15 new) |
