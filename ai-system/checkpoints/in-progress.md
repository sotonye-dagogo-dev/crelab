# In Progress

> **Metadata**
> - last-updated-by: execute-feature (Session 2026-09-30)
> - last-verified-against-code: 2026-09-30
> - staleness-policy: update after each major sub-step; clear on close

**Session 2026-09-30 — execute-feature: Founding-100 badge + referrals/leaderboard + countdown widget + error-boundary bug reporting**

**Status:** Plan written. Awaiting go/no-go sign-off (architecture impact → plan-feature logic ran).

---

## Directive

Four non-breaking, config-driven, admin-manageable additions:

1. Track the first 100 users with a UI badge. No user-schema change — derive from the existing `user.createdAt` registration timestamp so existing users are counted, not skipped.
2. Referral system: unique invite links, points for direct referrals and for second-degree (referrals-of-referrals), plus a public leaderboard page primarily powered by referrals but extensible to other scoring factors.
3. Reusable countdown widget: admin-editable content, timeline and icon; placed as a widget on the landing page and explore page; decent animations.
4. Advanced bug reporting: an error boundary that intercepts errors, pops up an encouragement to report, carries the sanitised error (console logs, stack) into the bug-report form, shows it on the admin bug-reports page, and still lets the user keep using the platform.

---

## Step 1 — Decomposition

### F1 — Founding-100 badge (no schema change)

| # | Task | Files |
|---|------|-------|
| 1.1 | New service computing registration rank with a window function over `user.createdAt`, cached | `services/EarlyMemberService.ts` (new) |
| 1.2 | Config key `firstHundred` (enabled, limit, badgeLabel, title, description, showRank) + type | `config/platform.config.ts`, `types/index.ts` |
| 1.3 | Admin fields in a new "Growth" section of the config editor | `app/admin/config/page.tsx` |
| 1.4 | Authenticated status endpoint | `app/api/early-access/route.ts` (new) |
| 1.5 | Badge UI (`ClBadge` + Crown) used in Navbar (desktop + mobile), profile header, referrals page | `components/shared/EarlyMemberBadge.tsx` (new), `components/shared/Navbar.tsx`, `app/(auth)/profile/page.tsx` |

Design notes: rank = `ROW_NUMBER() OVER (ORDER BY created_at, id)`; `isTop100 = rank <= limit`. Deterministic tie-break on `id`. Counts every existing user (seeds included). `unstable_cache` tag `early-members` (revalidate 300). Flag off → no fetch, no badge.

### F2 — Referral system + leaderboard

| # | Task | Files |
|---|------|-------|
| 2.1 | Migration: `referral_codes`, `referral_events` | `drizzle/migrations/0007_referrals_and_error_context.sql` (new) |
| 2.2 | Schema tables + relations | `drizzle/schema.ts` |
| 2.3 | Types: `IReferralConfig`, `ILeaderboardConfig`, `IReferralCode`, `IReferralEvent`, `IReferralSummary`, `ILeaderboardRow` | `types/index.ts` |
| 2.4 | Config keys `referral`, `leaderboard` + `features.referralsEnabled` | `config/platform.config.ts` |
| 2.5 | `ReferralService` — code issue, cookie claim, ACID degree-1 + degree-2 event write, summary | `services/ReferralService.ts` (new) |
| 2.6 | `LeaderboardService` — pluggable factor registry (referral factor first), scoring + ranking | `services/LeaderboardService.ts` (new) |
| 2.7 | Referral cookie capture from `?ref=` on any entry point | `components/shared/ReferralCapture.tsx` (new), `app/layout.tsx` |
| 2.8 | APIs: `GET /api/referrals/me`, `POST /api/referrals/claim`, `GET /api/leaderboard` | `app/api/referrals/me/route.ts`, `app/api/referrals/claim/route.ts`, `app/api/leaderboard/route.ts` (new) |
| 2.9 | Claim hook after sign-up (password + Google branches) | `app/(auth)/register/page.tsx` |
| 2.10 | `/referrals` authenticated page (share link, copy, stats, degree breakdown, explainer) | `app/(auth)/referrals/page.tsx` + `ReferralsClient.tsx` (new) |
| 2.11 | `/leaderboard` public page (podium + paginated table + factor legend) | `app/(public)/leaderboard/page.tsx` + `LeaderboardClient.tsx` (new) |
| 2.12 | Nav + footer + profile links | `components/shared/Navbar.tsx`, `components/shared/Footer.tsx`, `app/(auth)/profile/page.tsx` |

Data flow: `?ref=CODE` → cookie `crelab_ref` → sign-up → `POST /api/referrals/claim` (reads cookie, idempotent) → `referral_events` row (degree 1) → look up the referrer's own invitee row → optional degree-2 row → cookie cleared → `GET /api/leaderboard` aggregates `SUM(points)` grouped by earner → weighted factor score → rank.

Extensibility: `LeaderboardService` takes an array of `LeaderboardFactor` objects (`key`, `label`, `weight`, `collect()`). Ranking/breakdown code never changes when a factor is added; `leaderboard.factors.*` config turns them on/off and sets weight.

Privacy: leaderboard renders display name + avatar only (already-public profile fields). No emails, no ids in the URL.

### F3 — Countdown widget

| # | Task | Files |
|---|------|-------|
| 3.1 | Config key `countdown` (enabled + widget array) + types | `config/platform.config.ts`, `types/index.ts` |
| 3.2 | Icon allowlist (curated lucide names — §15) | `lib/countdown-icons.ts` (new) |
| 3.3 | `CountdownWidget` client component with framer-motion digit roll + staggered entrance + reduced-motion gate | `components/shared/CountdownWidget.tsx` (new) |
| 3.4 | `CountdownSlot` — filters widgets by `enabled` + area, ordered by `orderIndex`, renders nothing when empty | `components/shared/CountdownSlot.tsx` (new) |
| 3.5 | Slot placement: landing after hero; explore above the filter bar | `components/landing/LandingContent.tsx`, `app/(public)/explore/page.tsx` |
| 3.6 | Admin editor (list add/remove/reorder, datetime-local, icon select, area checkboxes, live preview) saving through the existing audited config PATCH | `app/admin/countdown/page.tsx` (new), `components/admin/AdminSidebar.tsx` |

### F4 — Error boundary → bug report with captured error

| # | Task | Files |
|---|------|-------|
| 4.1 | Console ring buffer (last 60 entries, idempotent install) | `lib/error-log-buffer.ts` (new) |
| 4.2 | Sanitiser: redacts emails, bearer/JWT/session tokens, cookies, data URIs; truncates message/stack/logs; 8 KB cap | `lib/sanitize-error.ts` (new) |
| 4.3 | Popup dialog (report / continue) | `components/error/ErrorReportDialog.tsx` (new) |
| 4.4 | Global catcher — `window.onerror` + `unhandledrejection`, non-blocking (page keeps running) | `components/error/GlobalErrorCatcher.tsx` (new), `app/layout.tsx` |
| 4.5 | Route-segment boundary with Continue (`reset()`) + Reload | `app/error.tsx` (new) |
| 4.6 | Root-layout boundary | `app/global-error.tsx` (new) |
| 4.7 | Config key `bugReport` (popup copy, CTA labels, severity, includeConsoleLogs) | `config/platform.config.ts`, `types/index.ts`, `app/admin/config/page.tsx` |
| 4.8 | Bug-report page: read stashed payload (`sessionStorage` + `?e=1`), show attached-details panel, allow detach, send `errorContext` | `app/(public)/bug-report/page.tsx` |
| 4.9 | API: validate + re-sanitise + store `errorContext` | `app/api/bug-report/route.ts` |
| 4.10 | Schema column `bug_reports.error_context` (in 0007 migration) | `drizzle/schema.ts` |
| 4.11 | Admin triage block (message, stack, console logs, URL, timestamp) | `app/admin/bug-reports/page.tsx` |

Handoff between boundary and form uses `sessionStorage` (`crelab-error-context`), not a query string — stacks exceed URL limits.

### Documentation & platform copy

- How It Works fallback gains an "Invite & earn" section + referral/leaderboard/founding-100 FAQs (admin-editable as always).
- `/referrals` and `/leaderboard` carry config-driven explainer copy (`referral.*`, `leaderboard.*`).
- Navbar + Footer gain a Leaderboard link.
- `ai-system` docs: design-system, system-architecture, repo-map, dependency-graph, task-queue, session-log, dev-history, project-decisions, test-plan, test-results.

### Tests (per `agents/tester-qa.md`)

`__tests__/lib/sanitize-error.test.ts`, `__tests__/lib/error-log-buffer.test.ts`, `__tests__/lib/early-member.test.ts`, `__tests__/lib/countdown.test.ts`, `__tests__/services/ReferralService.test.ts`, `__tests__/services/LeaderboardService.test.ts` — pure helpers (ranking, degree resolution, scoring, area/expiry selection, redaction) so they run without a DB.

---

## Step 2 — Self-check

- **Scope (`project-context.md`):** consistent — guest browse kept, NDPR-safe (leaderboard shows only public profile fields), no new external integrations, no multi-currency. Additions are growth/loyalty + support tooling.
- **Conflicts (`memory/project-decisions.md`):** none found. Respects "Guest Browse, Gate Booking" (leaderboard public, `/referrals` gated), "PlatformConfigService: Config Context + DB Override + Cache" (all new content is config), "Centralised AuditService" (config PATCH already audits), "In-App Notification Centre = Phase 2" (not touched).
- **Engineering principles:** §1/§3 config with hardcoded fallbacks; §2 metadata-driven leaderboard factors; §4 extend `Cl*` (no new primitive — uses `ClBadge`, `ClCard`, `ClDialog`, `ClDataTable`, `ClPagination`); §11 one route per screen; §12 ACID on the two-table referral write; §13 catalog respected; §15 lucide only; §16 iterate config arrays; §21 paginated leaderboard; §23 audit via config PATCH.

## Risks / edge cases

- Migration must be applied to Supabase by hand (repo convention for 0003+; journal not updated past 0002). Residual risk noted at close.
- Seeded users occupy early ranks — intended per directive ("wouldn't want to skip them").
- Countdown hydration: initial render must not differ between server and client (mount-gated tick).
- Self-referral blocked server-side; no repo-wide rate limiter exists (same posture as `/api/bug-report`) — logged, not silently ignored.
- Error popup must never trap the user: dialog is dismissible and `app/error.tsx` offers `reset()`.

## Architecture impact: YES

New tables, new services, new routes, new admin page → `plan-feature.md` logic ran and sign-off requested before implementation.
