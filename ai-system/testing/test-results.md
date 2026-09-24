# Test Results

> **Metadata**
> - last-updated-by: Session 2026-09-23
> - last-verified-against-code: 2026-09-23
> - staleness-policy: overwritten on every test run — always current

> **Overview:** Latest test run results. Updated by agents after running tests. Gives a quick snapshot of current project health.

---

## Last Run

**Date:** 2026-09-23
**Run by:** execute-feature (Session 2026-09-23)

**Results:**
| Suite | Passed | Failed | Skipped |
|-------|--------|--------|---------|
| Unit (vitest) | 255 | 3 | 0 |
| TypeScript (tsc --noEmit) | — | 0 errors | — |
| Lint (next lint) | — | 0 errors (pre-existing warnings only) | — |
| Production build | 1 | 0 | 0 |

**Overall Status:** ✅ Typecheck clean, lint no new warnings, production build passes (95 static pages). 255/258 tests pass — 3 failures are pre-existing and unrelated (see Active Failures).

---

## Active Failures

Pre-existing, unrelated to recent changes (open since ≥2026-09-22):
- `__tests__/media.test.ts:72` — expects `"too large"`, current message is `"File is 101.0 MB — exceeds the 100 MB per-file limit…"`
- `__tests__/services/BlogPostService.test.ts:89` — adminList mock returns 7 rows vs expected 1
- `__tests__/services/BlogPostService.test.ts:98` — same mock length issue on ordering-fallback test

---

## History

| Date | Passed | Failed | Notes |
|------|--------|--------|-------|
| 2026-09-23 | 255 | 3 | Seed rollback + BookingSidebarDisplay/BookingSidebar package-row wrap + Navbar Home removal + explore source tag removal (`AssetLightbox` `showSource` prop). 3 failures pre-existing (media message + BlogPostService mocks ×2) |
| 2026-08-20 | 258 | 0 | Wallet page + Paystack tightening: paystack metadata/callback_url, verify endpoint, payment-status page, wallet idempotent credit. New `__tests__/paystack.test.ts` (6 tests) |
| 2026-08-18 | 218 | 0 | Email template fallback + Resend sender recommendations: `lib/email-templates.ts` resolveEmailTemplates/resolveEmailTemplate/resolveEmailConfig (hardcoded defaults apply when not saved in DB), PlatformConfigService merges emailConfig, EmailService.send defensive fallback, verify-email + admin email routes use resolver. Sender switched from no-reply root domain to subdomain (`hello@mail.crellab.com`) with RESEND_FROM_EMAIL/RESEND_FROM_NAME env overrides + admin hint. New tests: email-templates (+6), EmailService (+4: 3 sender + 1 hardcoded-fallback) |
| 2026-08-13 | 193 | 0 | Collapsible admin sidebar (AdminShell), ClDataTable + ClPagination across admin pages, email h1 #E8FF47 + editable template name, {{name}} preview fix, blog sections builder (ContentBlocksEditor/ContentBlocks), appOrigin trailing-slash hardening. New: `__tests__/lib/email-blocks.test.ts` (6 tests) |
| 2026-08-12 | — | — | Docs-only close-out session (Session 22): Cloudinary asset-lifecycle implementation (shipped 2026-08-11, incl. 220-line MediaAssetService test suite) documented. No code changed |
| 2026-08-12 | 169 | 0 | Cron auth alignment: all 4 cron routes verify `Authorization: Bearer <CRON_SECRET>`; media-cleanup registered in vercel.json; .env.example guidance updated |
| 2026-08-11 | 151 | 0 | Integrations readiness: emailNotifications default, isResendConfigured + /api/email/status, subject fix, 11 EmailService tests, .env.example (RESEND_API_KEY, CRON_SECRET) |
| 2026-08-11 | 140 | 0 | Fixed dashboard "Unauthorized" for authenticated users: `getSession()` now forwards request headers |
| 2026-08-09 | 140 | 0 | Dashboard added: DashboardService + MockDataService dashboard tests (15 new) |
