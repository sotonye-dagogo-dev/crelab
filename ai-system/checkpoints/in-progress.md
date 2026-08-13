# In Progress

**Session 23 — execute-feature: email/blog templates + verification + navigation + user management + SEO**

## DONE

1. ✅ Config persistence fix — `setNestedValue()` deep-sets dotted keys in `PlatformConfigService.get()` (admin edits to `emailConfig.*`, `features.*`, `dashboard.*`, `mediaUpload.*` now round-trip; null values skipped so defaults are never clobbered).
2. ✅ `lib/url.ts` (`appOrigin` + `resolveAbsoluteUrl`) + EmailService logoUrl origin capture + `verifyEmail`/`emailChanged` templates (config + types).
3. ✅ Verify-email flow — Better Auth `emailVerification` + `user.changeEmail` config; `/api/verify-email/send`, `/api/verify-email/welcome`; `/verify-email` page with 60s resend timer + `done=1` success (fires welcome once); `useAuth.signUp` now sends verification instead of welcome (Google users welcome immediately from register page).
4. ✅ Admin email templates — `components/admin/EmailTemplateBlocksEditor.tsx` (Visual/HTML/Preview tabs, block builder, create-new template, sample-var preview via `substituteSampleVars`) + `/api/admin/email/send` (test send + marketing broadcast to MARKETING-consented users, config/template-gated).
5. ✅ Blog template viewer/editor — `blogConfig` (hero, newsletter, footer tagline) added to config/types, wired into `BlogPageClient` + newsletter subscribe endpoint `/api/newsletter`; `/admin/blog-templates` page with live preview.
6. ✅ Reusable `ClBackButton` (hydration-safe, history.back w/ fallback href) exported from `components/ui/index.ts`; placed in bookings list/detail, wallet, profile, profile/media, profile/setup.
7. ✅ Navbar + dashboard quick links → Profile (`/profile`) + Admin (`/admin/config`, role-gated).
8. ✅ Admin user management — `/api/admin/users` (GET search/list) + `/api/admin/users/[id]` (PATCH role/emailVerified, DELETE w/ self-guard); `/admin/users` page (search, role select, verify toggle, delete confirm); sidebar entry.
9. ✅ Profile page (`/profile`) — avatar, name update, email verification status + send, email change via better-auth `changeEmail` (confirmation to new inbox); `middleware.ts` now protects `/profile`.
10. ✅ SEO service `lib/seo.ts` (`buildSeoMetadata` with absolute logo og:image + canonical) wired into root layout + blog, blog/[slug], team, privacy, terms, search, [category], profile/[slug].
11. ✅ Middleware `/profile` protection + `.env.example` documents `NEXT_PUBLIC_APP_URL`.
12. ✅ Tests: `__tests__/lib/config-helpers.test.ts` (setNestedValue, url, email-blocks, seo). QA gate: typecheck ✅, 187/187 tests ✅, `next build` ✅ (only pre-existing lint warnings remain).

## REMAINING

- Run `update-ai-system.md` (update DESIGN.md / docs / README as it prescribes).
