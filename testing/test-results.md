# Test Results

## 2026-08-13 — Session 25 (Email logo/preview image resolution via the URL util)

**Scope:** `lib/url.ts` new helpers (`resolveUrlForRender`, `resolveRelativeUrlsInHtml`), `lib/email-blocks.ts` (`substituteSampleVars` relative-URL resolution + `previewVarsFor`), email preview config capture, `EmailService.send` relative-URL resolution, blog `ContentBlocks` URL resolution.

**Results:** 17 test files, **201/201 tests pass** (+8 new). Typecheck clean, lint 0 errors (pre-existing warnings only), production `next build` succeeds.

**Coverage added:** `__tests__/lib/email-blocks.test.ts` — `previewVarsFor` captures configured name/logoPath + falls back to sample vars; relative logo `<img src>` resolved to absolute; visual-builder image + absolute URL mixed; data/mailto/# untouched. `__tests__/lib/config-helpers.test.ts` — `resolveUrlForRender` (relative vs token vs absolute vs protocol-relative), `resolveRelativeUrlsInHtml` (img/a + ignores absolute/schemed/fragment), unresolved-token skip.

## 2026-07-28 — rating.toFixed TypeError Fix

**Error:** `Uncaught TypeError: s.rating.toFixed is not a function`

**Fix:** Wrapped `.toFixed()` calls with `Number()` coercion in 3 files.

**Verification:** Build could not complete (SWC platform issue on Windows), but TypeScript syntax verified via manual inspection of all 3 edited files.

**Status:** Fix applied, requires build verification on deployment.