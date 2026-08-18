# In Progress

**Session 28 — 2026-08-18 (Fix Build — Email Template Fallback + Resend Sender Recommendations)**

## Directive

- Vercel logs show `template_missing` for the verify-email flow despite a hardcoded `verifyEmail` template existing → apply hardcoded templates whenever not saved in the DB.
- Apply Resend recommendations: no "no-reply" sender (decreases trust), and use a subdomain instead of the root domain to segment sending by purpose.

## DONE

1. ✅ `lib/email-templates.ts` — `resolveEmailTemplates` / `resolveEmailTemplate` / `resolveEmailConfig` (hardcoded defaults merged under DB values; DB wins, defaults fill missing keys, admin-created keys preserved).
2. ✅ `PlatformConfigService.get()` — re-merges `emailConfig` through `resolveEmailConfig()` so a DB-saved `emailConfig.templates` can't silently drop wired templates.
3. ✅ `EmailService.send()` — resolves templates via `resolveEmailTemplate()` (defensive fallback); `/api/verify-email/send` + `/api/admin/email/send` use the resolver.
4. ✅ Sender identity — default `noreply@crellab.com` → `Crellab <hello@mail.crellab.com>` (subdomain, real address). `RESEND_FROM_EMAIL`/`RESEND_FROM_NAME` env overrides via `getResendSender()`; `/api/email/status` reports resolved sender; `/admin/config` hint; `.env.example` updated.
5. ✅ Tests — email-templates (+6), EmailService (+4). QA gate: typecheck clean, 218/218 tests, lint 0 new warnings, build green.

## REMAINING

- Verify the `mail.` subdomain + sender in the Resend dashboard; set `RESEND_FROM_EMAIL`/`RESEND_FROM_NAME` in Vercel env. Re-test verify-email flow. (Deploy via GitHub Action run.)