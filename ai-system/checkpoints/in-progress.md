# In Progress

**Session 27 — 2026-08-13 (Wired Email Templates + Blog Post Management + Admin Responsive Fixes)**

## Directive

- Emails wired into code (welcome, verify email, password reset, etc.) must be marked as code-wired — preview and simulation only, never sendable/broadcastable. Admin-created templates CAN be sent/broadcast.
- Blog admin beyond templates: making/uploading blog posts with image uploads.
- Admin sidebar: mobile = hamburger-togglable overlay; collapsibility reserved for desktop.
- Admin/config pages responsive — padding fixes so text never escapes containers.

## DONE

1. ✅ `lib/email-templates.ts` — `WIRED_EMAIL_TEMPLATES` map (6 templates, each with `label` + `trigger`) + `isWiredEmailTemplate()`.
2. ✅ `/api/admin/email/send` blocks wired keys for test-send + broadcast.
3. ✅ `/admin/email-templates` — wired badge + Zap icon, Simulate button, trigger banner, sendDialog reset.
4. ✅ `passwordReset` template in `DEFAULT_CONFIG` + `sendResetPassword` wired in `lib/auth.ts`; `resetUrl` sample var added.
5. ✅ Blog posts: `blog_posts` table (`0005_blog_posts.sql`) + `BlogPostService` (DB → Sanity → fallback merge, dedup by slug) + admin API (GET/POST, PATCH/DELETE) + `/admin/blog-posts` page + `ImageUploadField` (Cloudinary upload + paste fallback) + public `/blog` + `/blog/[slug]` read via service + `BlogCard`/`sitemap` use `getAllSlugs`.
6. ✅ Admin sidebar: collapse toggle `hidden lg:block` (mobile = drawer only) + Blog Posts nav item.
7. ✅ Responsive fixes: `/admin/config` change log via `formatChangeValue()` + `break-words`/`min-w-0`; `ConfigField` fieldControl refactor (stacks on mobile).
8. ✅ Tests — `__tests__/lib/email-templates.test.ts`. QA gate: typecheck clean, 206/206 tests, build green.
9. ✅ `update-ai-system.md` — session-log, in-progress, repo-map, dependency-graph, system-architecture, project-plan, task-queue, dev-history, lessons-learned, ai-context reconciled.

## REMAINING

- None — closed out. Apply `drizzle/migrations/0005_blog_posts.sql` to the target DB (journal not regenerated — standalone SQL). Deploy via GitHub Action run.