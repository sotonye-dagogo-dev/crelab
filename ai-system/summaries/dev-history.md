# Development History

> **Metadata**
> - last-updated-by: update-ai-system
> - last-verified-against-code: 2026-07-29

## 2026-07-28 — Prototype Interactivity & Fallback Content

### What
Enabled mock data mode, added profile page mock fallback, created blog fallback posts, and added team member seeding.

### Why
The prototype was not interactable — profile pages returned 404, blog showed empty, and mock data was disabled.

### Key Changes
- `.env`: `NEXT_PUBLIC_MOCK_DATA=true`
- Profile page: try/catch with MockDataService fallback for all data fetches
- Blog: 6 hardcoded fallback posts when Sanity is unavailable
- Seed script: 6 team member records added
- MockDataService: 3 new methods for profile fallback support

### Status
Conditional pass — type checks verify, build blocked by SWC platform issue on Windows.

## Sprint 2026-07-28 — Bug Fixes: Profile 404 & Blog PortableText

### Bug 1: Profile Page 404
- Root cause: `slug.split("-").pop()` extracted `"2"` instead of `"prov-2"` from slug `"femi-adeyemi-films-prov-2"`
- Fix: Changed slug delimiter from single hyphen `-` to double hyphen `--` in ExploreService.ts line 151
- Updated profile page (`app/(public)/profile/[slug]/page.tsx`) to split on `--` and try mock data first
- Updated setup API route (`app/api/profile/setup/route.ts`) to use `--` delimiter  
- Updated all 6 mock explore slugs in MockDataService.ts to use `--mock-pro` suffix matching production format

### Bug 2: Blog PortableText Unknown Block Type
- Root cause: Fallback blog data in `lib/blog-fallback.ts` was missing `_type: "span"` on all children objects
- Fix: Added `_type: "span"` to all 38 children entries across 6 fallback blog posts
- This caused `isPortableTextBlock()` validation to fail, triggering the "Unknown block type block" error

## Sprint 2026-07-28 — Service Tests & State Machine Verification

- Exported LEGAL_TRANSITIONS from BookingService and added LEGAL_ESCROW_TRANSITIONS to EscrowService for testability
- Wrote 80 tests across 7 test files:
  - MockDataService.test.ts — 20 tests (data gating, CRUD, filtering)
  - BookingService.test.ts — 10 tests (LEGAL_TRANSITIONS state machine, coverage of all 9 BookingStatus values)
  - EscrowService.test.ts — 9 tests (LEGAL_ESCROW_TRANSITIONS state machine, coverage of all 6 EscrowState values)
  - ExploreService.test.ts — 7 tests (cursor encode/decode round-trip, malformed input handling)
  - DriveService.test.ts — 12 tests (folder URL parsing, MIME type validation, error classes)
  - PlatformConfigService.test.ts — 11 tests (DEFAULT_CONFIG field assertions for all nested config blocks)
  - Errors.test.ts — 8 tests (all 6 business error classes: defaults, custom messages, instanceof checks)
- Updated vitest.config.ts (node environment)
- Marked "Write tests for all services" task as completed in task-queue.md

## Sprint 2026-07-29 — UI Consolidation & Email Infrastructure

### What
Consolidated UI components (ClLogo, ClErrorState, ClEmptyState, ClPasswordInput), added password visibility toggle, updated ThemeToggler with icon mode, and built end-to-end email infrastructure with admin-editable templates and simulation fallback.

### Why
Password inputs lacked visibility controls, error/empty states were duplicated inline, theme toggler was text-only, no email system existed for transactional notifications, and logo usage was inconsistent.

### Key Changes
- **ClLogo**: Config-driven component with `variant` (full/icon/auto) + `showName`, replaces all inline Image+name patterns
- **ClErrorState** / **ClEmptyState**: Global reusable components replacing inline definitions in ExploreGrid, BlogPageClient, TeamPage
- **ClPasswordInput**: Eye/EyeOff visibility toggle, used in login + register pages
- **ThemeToggler**: Now accepts `displayMode` with lucide icons (Monitor/Sun/Moon)
- **EmailService**: Resend-based with simulation fallback when RESEND_API_KEY is absent
- **Admin email templates**: `/admin/email-templates` page for editing template subjects/HTML/active status
- **Email API**: `POST /api/email/welcome`, `POST /api/email/send` endpoints
- **Welcome email**: Wired into signup flow via useAuth hook (fire-and-forget)
- **Config**: `emailConfig` added to platform config with template defaults
- **Admin Sidebar**: Added "Email Templates" nav item

### Status
Pass — type check passes, lint passes (no new warnings), all components follow Cl* conventions.
## Sprint 2026-08-05 — Google OAuth in Sign-Up + Onboarding Handoff

### What
Completed the OAuth story for registration: "Continue with Google" on the register page as an alternative to email/password (Google supplies name + email), with new users flowing seamlessly into the onboarding phase just like the email/password flow.

### Why
The server-side Google provider and a login-page button existed, but the register/sign-up process had no OAuth entry point, and new Google users had no path into role selection, NDPR consent, or the provider onboarding wizard.

### Key Changes
- **`lib/oauth.ts`** (new): OAuth callback URL constants, return detection, self-assignable role guard (CLIENT/PROVIDER, never ADMIN), open-redirect-safe route resolution
- **Register page**: Google button + divider; `?oauth=done` callback handling; new users complete role/consent then route to `/profile/setup` (provider) or `/explore` (client)
- **Login page**: new Google users routed to register finalize; existing users straight to `/explore`
- **`useAuth.signInWithGoogle`**: accepts `callbackURL` / `newUserCallbackURL` / `errorCallbackURL`
- **`POST /api/auth/role`** (new): self-assignable CLIENT/PROVIDER role; also wired into email signup so provider signups actually set `role = PROVIDER` in DB (pre-existing gap)
- **Tests**: 12 new tests in `__tests__/oauth.test.ts`

### Status
Pass — typecheck clean, 92 tests pass, lint has no new warnings, production build passes (55 pages).

## Sprint 2026-08-05 — Button Loading States + Footer Bug-Report Link

### What
Implemented the button states that existed in the design system but weren't wired into the app: loading spinners on every async action (sign-up, sign-in, password reset, milestone/escrow actions, payment, admin mutations, sign-out), plus an accessible footer link to the bug-report page.

### Why
Buttons running network/async operations gave no in-flight feedback and were re-clickable (double-submit risk). The design files define a `cl-btn-loading` spinner state that ClButton didn't actually render (its spinner was `border-transparent` = invisible).

### Key Changes
- **`ClSpinner`** (new ui primitive) + fixed **`ClButton`** loading rendering (centered `currentColor` ring spinner, label hidden, auto-disable)
- **Auth**: Google + email submit loading states on register, login, forgot-password
- **Booking**: per-milestone `loadingId` and escrow `releaseLoading` wired to Fund/Submit/Approve/Confirm Release; Add Payment loading
- **Admin**: categories Disable, team toggle/Delete, bug-reports Save, sidebar Sign out — all wired to mutation pending states
- **Footer**: "Report a Bug" link → `/bug-report` under Platform
- Public bug-report Submit now uses `loading` prop

### Status
Pass — typecheck clean, 92 tests pass, lint has no new warnings, production build passes.
