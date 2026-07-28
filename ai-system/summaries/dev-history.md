# Development History

> **Metadata**
> - last-updated-by: update-ai-system
> - last-verified-against-code: 2026-07-28

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