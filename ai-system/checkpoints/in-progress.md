# In Progress

**Session 25 — execute-feature: email logo/preview image resolution via the URL util**

## Directive

For the image in email (the logo in particular), ensure the preview also captures
it and uses the `resolveAbsoluteUrl` url util — the suspected reason the image is
not rendering in previews. Correct the same raw-relative-URL pattern anywhere else
it is used or observed.

## Root cause

- `blocksToHtml`/`ContentBlocks` emit image `src` (and button `href`) verbatim —
  a relative `/primary-logo.png` is not resolvable in email clients and unreliable
  in the srcdoc preview iframe.
- The email preview substitutes `{{logoUrl}}` from `SAMPLE_EMAIL_VARS`, which uses
  `DEFAULT_CONFIG.logoPath` rather than the admin-configured (DB) `logoPath`, so the
  preview does not "capture" the actual configured logo.
- `EmailService.send` resolves the `{{logoUrl}}` token but leaves any other relative
  image/link URLs in raw or visual-builder HTML untouched.

## Plan

1. `lib/url.ts` — add `resolveUrlForRender(value)` (resolves relative URLs, leaves
   `{{template tokens}}` + absolute/protocol-relative/data/mailto/# untouched) and
   `resolveRelativeUrlsInHtml(html)` (resolves relative `img src` / `a href` in a
   rendered HTML blob — used at preview + send time so no origin is baked at edit time).
2. `lib/email-blocks.ts` — `substituteSampleVars` resolves relative URLs after token
   substitution; new `previewVarsFor(config)` builds sample vars from the actual
   platform config (name + logoPath via `resolveAbsoluteUrl`).
3. `app/admin/email-templates/page.tsx` — preview uses `previewVarsFor(loaded config)`
   so it captures the configured logo/name.
4. `services/EmailService.ts` — run `resolveRelativeUrlsInHtml` on the final filled
   HTML before handing to Resend / returning preview.
5. `components/blog/ContentBlocks.tsx` — apply `resolveUrlForRender` to image/button
   URLs (same pattern elsewhere).
6. Tests — cover new helpers + preview config capture.
7. QA gate — typecheck, lint, tests, `next build`.
8. Run `update-ai-system.md` to reconcile docs.

## DONE

1. ✅ `lib/url.ts` — `resolveUrlForRender` + `resolveRelativeUrlsInHtml` helpers.
2. ✅ `lib/email-blocks.ts` — `substituteSampleVars` resolves relative URLs; `previewVarsFor(config)` added.
3. ✅ `app/admin/email-templates/page.tsx` — preview uses `previewVarsFor(loaded config)`.
4. ✅ `services/EmailService.ts` — `send()` resolves relative URLs; `sendWelcome` exploreUrl via `resolveAbsoluteUrl`.
5. ✅ `components/blog/ContentBlocks.tsx` — image/button URLs via `resolveUrlForRender`.
6. ✅ Tests — `email-blocks.test.ts` (+5) + `config-helpers.test.ts` (+3).
7. ✅ QA gate — typecheck clean, lint 0 errors (pre-existing warnings only), 201/201 tests, `next build` green.
8. ✅ `update-ai-system.md` — repo-map, dependency-graph, system-architecture, project-plan, task-queue, dev-history, lessons-learned, project-decisions, test-results, session-log reconciled.

## REMAINING

- None — closed out. Deploy so the email/preview image fixes go live. Remaining production
  cause for logo rendering (if still broken in a real send): `NEXT_PUBLIC_APP_URL` unset or
  `http://localhost:3000` in the deployed Vercel runtime env — the resolved URL must be public.
