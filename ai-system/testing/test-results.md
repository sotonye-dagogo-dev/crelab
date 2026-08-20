# Test Results

> **Metadata**
> - last-updated-by: update-ai-system (Session 33)
> - last-verified-against-code: 2026-08-20
> - staleness-policy: overwritten on every test run — always current

> **Overview:** Latest test run results. Updated by agents after running tests. Gives a quick snapshot of current project health.

---

## Last Run

**Date:** 2026-08-20
**Run by:** update-ai-system (Session 33)

**Results:**
| Suite | Passed | Failed | Skipped |
|-------|--------|--------|---------|
| Unit (vitest) | 258 | 0 | 0 |
| TypeScript (tsc --noEmit) | — | 0 errors (app code; `__tests__` require vitest/node types, excluded from CI gate) | — |
| Lint (next lint) | — | 0 errors (pre-existing warnings only) | — |
| Production build | 1 | 0 | 0 |

**Overall Status:** ✅ Typecheck clean, 258/258 tests pass, lint has no new warnings, production build passes.

---

## Active Failures

None.

---

## History

| Date | Passed | Failed | Notes |
|------|--------|--------|-------|
| 2026-08-18 | 218 | 0 | Email template fallback + Resend sender recommendations: `lib/email-templates.ts` resolveEmailTemplates/resolveEmailTemplate/resolveEmailConfig (hardcoded defaults apply when not saved in DB), PlatformConfigService merges emailConfig, EmailService.send defensive fallback, verify-email + admin email routes use resolver. Sender switched from no-reply root domain to subdomain (`hello@mail.crellab.com`) with RESEND_FROM_EMAIL/RESEND_FROM_NAME env overrides + admin hint. New tests: email-templates (+6), EmailService (+4: 3 sender + 1 hardcoded-fallback) |
| 2026-08-13 | 193 | 0 | Collapsible admin sidebar (AdminShell), ClDataTable + ClPagination across admin pages, email h1 #E8FF47 + editable template name, {{name}} preview fix, blog sections builder (ContentBlocksEditor/ContentBlocks), appOrigin trailing-slash hardening. New: `__tests__/lib/email-blocks.test.ts` (6 tests) |
| 2026-08-12 | — | — | Docs-only close-out session (Session 22): Cloudinary asset-lifecycle implementation (shipped 2026-08-11, incl. 220-line MediaAssetService test suite) documented. No code changed |
| 2026-08-12 | 169 | 0 | Cron auth alignment: all 4 cron routes verify `Authorization: Bearer <CRON_SECRET>`; media-cleanup registered in vercel.json; .env.example guidance updated |
| 2026-08-11 | 151 | 0 | Integrations readiness: emailNotifications default, isResendConfigured + /api/email/status, subject fix, 11 EmailService tests, .env.example (RESEND_API_KEY, CRON_SECRET) |
| 2026-08-11 | 140 | 0 | Fixed dashboard "Unauthorized" for authenticated users: `getSession()` now forwards request headers |
| 2026-08-09 | 140 | 0 | Dashboard added: DashboardService + MockDataService dashboard tests (15 new) |
