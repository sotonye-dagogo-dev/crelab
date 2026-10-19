# In Progress — Payments/emails well-roundedness + Vercel Hobby cron fix

Started: 2026-10-19
Directive: Ensure payment transactions/history accessible; wire lifecycle emails across
booking + payment flows; audit financial compliance (money-loss safety); resolve Vercel
Hobby "daily cron only" deployment block via DB-backed job queue (bulk daily drain).

## Plan

### A. Vercel Hobby cron block (deployment blocker)
1. New `scheduled_jobs` table (drizzle schema + hand migration `0008_scheduled_jobs.sql`):
   id, type, run_at, payload jsonb, status (PENDING/RUNNING/COMPLETED/FAILED/CANCELLED),
   attempts, max_attempts, last_error, dedupe_key UNIQUE, timestamps.
2. `services/JobQueueService.ts`: enqueue (idempotent via dedupe_key ON CONFLICT DO NOTHING),
   claimDue (UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING),
   complete/fail with retry backoff, `drainDueJobs()` handler registry (`escrow_sweep`).
3. Factor escrow sweep (reconcileStuckHolds + setInProgress + autoRelease) into a shared
   `runEscrowSweep()` so `/api/cron/escrow` and the queue handler reuse it.
4. `vercel.json`: escrow cron `1 */6 * * *` → `1 1 * * *` (daily — Hobby-compliant).
   The 6h cadence is preserved via: (a) `escrow_sweep` jobs enqueued at +6h/+12h when a
   hold lands, drained opportunistically on warm authenticated traffic (throttled, advisory
   locked) AND by the daily cron bulk drain; (b) existing per-view reconcile self-heal.

### B. Financial compliance (money-loss bug fixes)
1. WalletService guarded debits: `UPDATE wallets SET balance = balance - $x WHERE id AND balance >= $x RETURNING balance`
   → overdraft impossible; balanceAfter read back from returned row (fixes stale-ledger drift).
   Applies to debitForBooking / debitForMilestone / debitForDirectPayment / requestWithdrawal.
2. creditMilestoneRelease: deterministic ref `MILESTONE-RELEASE-{milestoneId}` (+ unique
   constraint = exactly-once); approve/autoApprove flip becomes conditional `WHERE status='SUBMITTED'`.
3. fundMilestone: conditional PENDING→FUNDED flip; on lost race, compensating
   `reverseMilestoneDebit` (deterministic `MILESTONE-DEBIT-REVERSAL-{milestoneId}`).
4. Webhook: timingSafeEqual length guard (401 not 500 on malformed signature);
   processed_webhook_events inserts use ON CONFLICT DO NOTHING (no noisy 23505 → 500).
5. Milestone `create` action: caller must be the booking's client or provider.
6. PaymentService.splitPayout: fix single-quoted template literal (literal `${...}` bug).
7. AuditService.log on money-in successes: holds, card/bank topups, withdrawals,
   milestone create/fund/approve/dispute.

### C. Lifecycle emails (currently zero fire on booking/payment flows)
1. New wired templates in `config/platform.config.ts` + `lib/email-templates.ts` registry:
   bookingRequestReceived, bookingAccepted, bookingDeclined, bookingCancelled,
   bookingStarted, paymentReleased, paymentRefunded, disputeOpened, disputeResolved,
   walletTopup, withdrawalRequested, milestoneFunded, milestoneSubmitted, milestoneApproved.
   (Existing `bookingConfirmation` + `paymentReceived` reused for booking-created and
   funds-held-to-escrow.)
2. `lib/lifecycle-emails.ts`: fire-and-forget `notify()` (never blocks/fails money paths),
   gated on features.emailNotifications; resolves recipient email/name from DB.
3. Wiring (post-commit only): BookingService create/accept/decline/cancel; EscrowService
   holdBookingFunds success → paymentReceived to client; startBooking → bookingStarted;
   settleRelease → paymentReleased to provider; refundBookingFunds → paymentRefunded;
   raiseDispute/resolveDispute → dispute emails to both parties; WalletService topUp +
   withdrawal; MilestoneService fund/submit/approve.

### D. Transaction visibility
1. Provider dashboard gains "Payments & Earnings" history (wallet credit ledger:
   ESCROW_RELEASE / MILESTONE_RELEASE / DIRECT_PAYMENT_CREDIT + related booking links),
   reusing the PaymentHistory presentation pattern. Types + DashboardService + UI card.

### E. QA
- New unit tests: JobQueueService claim/enqueue idempotency (logic-level), signature
  length guard, milestone deterministic ref, lifecycle-email registry completeness.
- Full gate: vitest, tsc, eslint, next build. Then update-ai-system.md deep sync.

## Architecture impact
Additive (new table + service + email templates + dashboard field). Non-breaking.

## Completion (2026-10-19)

All workstreams A–D delivered; QA gate green.

### Final state
- A: `scheduled_jobs` table (migration `0008_scheduled_jobs.sql`), `JobQueueService`
  (idempotent enqueue via dedupe_key, `FOR UPDATE SKIP LOCKED` claim, retry backoff,
  `escrow_sweep` handler with dynamic EscrowService import to avoid a cycle),
  `/api/cron/escrow` drains the queue (limit 50) before `runFullSweep()`,
  `vercel.json` escrow cron → daily `1 1 * * *`, opportunistic throttled drain
  (`maybeDrainOnRequest`, 10-min in-process throttle) on `GET /api/wallet/balance`,
  +6h/+12h follow-ups enqueued at hold time.
- B: guarded debits (balance-check UPDATE ... RETURNING) in WalletService all debit
  paths; read-back balanceAfter; deterministic `MILESTONE-RELEASE-{milestoneId}` ref +
  `reverseMilestoneDebit` compensation; conditional status flips (fund/submit/approve);
  webhook signature length guard; paystack webhook event inserts ON CONFLICT DO NOTHING;
  splitPayout template-literal fix; milestone create ownership check; audit logging on
  all money-in events; topup de-dupe race fixed via onConflictDoNothing + DuplicateWebhookError.
- C: 14 new wired email templates (config defaults + registry + triggers) and
  `lib/lifecycle-emails.ts` fire-and-forget dispatch wired post-commit across
  BookingService, EscrowService, WalletService, MilestoneService.
- D: provider dashboard "Payments & Earnings" — `IProviderPaymentRecord`,
  `DashboardService.queryPaymentsByProvider`, `ProviderPaymentHistory` component.
  Mock provider dashboard returns two sample rows (refs `mock-escrow-ref-*` to satisfy
  platform-name compliance).

### QA gate (all green)
- `npx vitest run` — 688/688 (55 files), including new tests:
  paystack-signature length guards, JobQueueService six-hour bucket determinism,
  lifecycle template registry completeness + enabled defaults.
- `npx tsc --noEmit` — clean. Required adding `@testing-library/dom@^10` devDependency
  (peer of @testing-library/react 16; its absence made screen/fireEvent untyped —
  pre-existing env issue, lockfile regenerated).
- `npm run lint` — warnings only, all pre-existing (unused vars in untouched files).
- `npm run build` — success; middleware + all routes compiled.

### ai-system deep sync note
`.ai-system/` index/dependency-graph tree does not exist in this repo; docs live under
`ai-system/docs/` as PRD/roadmap-level artifacts. Grepped for cron/escrow cadence claims —
none reference the old 6h `vercel.json` schedule, so no doc drift to fix. Session-log
entry written instead (sync-context.md lightweight pass).

### Residual risks
- Opportunistic drain is in-process throttled (per warm instance) — fine for Hobby; if
  traffic is very low between crons, +6h/+12h sweeps may lag until the daily cron bulk
  drain (self-heal reconcile also still runs on wallet views).
- Lifecycle emails fire-and-forget: failures are swallowed by design (never block money
  paths); monitoring via Resend dashboard.
- `db:migrate` must be run in the target environment before deploy (`0008_scheduled_jobs.sql`).
