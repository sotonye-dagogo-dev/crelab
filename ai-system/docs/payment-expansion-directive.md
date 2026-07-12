FEATURE: Payment System Expansion — Wallet, Milestone Payments, and One-Off Transactions
PRIORITY: P1 — Required before marketing push
CODEBASE: github.com/sotonye-dagogo-dev/crelab (Next.js 15, TypeScript 5, Drizzle ORM, Supabase, Paystack, Better Auth)

## CONTEXT

The current payment system supports a single mode: escrow per booking (PENDING → HELD → IN_PROGRESS → RELEASED). The meeting concluded that the payment architecture needs to expand to three modes while maintaining the existing escrow as the default:

1. WALLET — an internal Crelab balance per user, fundable via card or bank transfer, usable to pay bookings without entering card details each time. Providers accumulate earnings in their wallet before withdrawing to a bank account.

2. MILESTONE PAYMENTS — for larger or multi-deliverable bookings, clients and providers can agree to split a booking into up to 5 milestones. Each milestone has its own escrow lifecycle. The provider receives partial payment as each milestone is approved.

3. ONE-OFF / DIRECT PAYMENT — a lightweight payment mode for small add-ons, tips, or quick additional deliverables attached to an existing booking. No escrow hold; immediate credit to provider wallet on payment success.

All three modes must coexist. Existing single-escrow bookings are not removed — they become the DEFAULT mode. The wallet is the shared settlement layer that all three modes flow through.

## ARCHITECTURE INVARIANTS (read AGENTS.md and ROADMAP.md before starting)

- All money is integers in KOBO. No floating point anywhere in the payment layer.
- feeRate is always read from platformConfig, never hardcoded. Fee kobo = Math.round(amountKobo * platformConfig.feeRate).
- All Paystack webhook events must be verified via HMAC-SHA512 before any state transition or balance mutation.
- All balance mutations (debit + credit) must be wrapped in a Drizzle database transaction. A debit and its corresponding credit are atomic — partial updates are not permitted.
- WalletService is a class with a static interface exported from services/WalletService.ts. Same pattern as EscrowService and BookingService.
- No raw Paystack calls in API routes or components. All Paystack interactions go through lib/paystack.ts.
- Idempotency: webhook handlers must be idempotent. Use a processed_webhook_events table to deduplicate by Paystack reference. Re-processing a seen reference returns 200 without re-executing.

## DATABASE CHANGES

Add to drizzle/schema.ts and generate a new migration:

1. wallets table:
   - id (uuid pk default gen_random_uuid())
   - user_id (uuid, references users.id, onDelete cascade, UNIQUE — one wallet per user)
   - balance_kobo (integer, NOT NULL, default 0, CHECK balance_kobo >= 0)
   - escrow_kobo (integer, NOT NULL, default 0, CHECK escrow_kobo >= 0) — funds currently locked in active escrow across all this user's bookings
   - total_earned_kobo (integer, NOT NULL, default 0) — lifetime provider earnings (never decrements; for stats)
   - created_at (timestamp, defaultNow)
   - updated_at (timestamp, defaultNow)

2. wallet_transactions table (immutable ledger — never update or delete rows):
   - id (uuid pk)
   - wallet_id (uuid, references wallets.id)
   - type (text, CHECK IN: TOPUP_CARD, TOPUP_BANK, BOOKING_DEBIT, ESCROW_HOLD, ESCROW_RELEASE, MILESTONE_DEBIT, MILESTONE_RELEASE, DIRECT_PAYMENT_DEBIT, DIRECT_PAYMENT_CREDIT, WITHDRAWAL, FEE_DEBIT, REFUND)
   - amount_kobo (integer, NOT NULL) — always positive; direction determined by type
   - direction (text, CHECK IN: CREDIT, DEBIT)
   - balance_after_kobo (integer, NOT NULL) — snapshot of wallet balance immediately after this transaction
   - reference (text, UNIQUE) — internal reference; for Paystack-originated events, matches Paystack reference
   - related_booking_id (uuid, nullable, references bookings.id)
   - related_milestone_id (uuid, nullable, references booking_milestones.id)
   - paystack_ref (text, nullable)
   - metadata (jsonb, default {})
   - created_at (timestamp, defaultNow)

3. booking_milestones table:
   - id (uuid pk)
   - booking_id (uuid, references bookings.id, onDelete cascade)
   - index (integer, NOT NULL) — ordering (1-based)
   - title (text, NOT NULL)
   - description (text)
   - amount_kobo (integer, NOT NULL)
   - fee_kobo (integer, NOT NULL) — calculated at milestone creation, stored immutably
   - status (text, CHECK IN: PENDING, FUNDED, IN_PROGRESS, SUBMITTED, APPROVED, DISPUTED, RELEASED, REFUNDED, CANCELLED, default PENDING)
   - due_date (date, nullable)
   - funded_at (timestamp, nullable)
   - submitted_at (timestamp, nullable)
   - approved_at (timestamp, nullable)
   - released_at (timestamp, nullable)
   - created_at (timestamp)
   - UNIQUE constraint on (booking_id, index)

4. processed_webhook_events table (idempotency guard):
   - id (uuid pk)
   - paystack_ref (text, UNIQUE)
   - event_type (text)
   - processed_at (timestamp, defaultNow)

5. Add payment_mode column to bookings table:
   - payment_mode (text, CHECK IN: ESCROW, MILESTONE, DIRECT, default ESCROW)

6. Supabase RLS:
   - wallets: user can only read/update their own wallet
   - wallet_transactions: user can only read transactions on their own wallet (no user writes — all mutations are server-side only)
   - booking_milestones: client and provider on the booking can read; only server-side writes

## WALLET SERVICE (services/WalletService.ts)

Interface IWalletService must be exported before the class implementation.

Methods:

getOrCreate(userId: string): Promise<IWallet>
  - Finds wallet by user_id or creates one with balance_kobo=0 if not exists
  - Used as the entry point before any wallet operation

getBalance(userId: string): Promise<{ balanceKobo: number; escrowKobo: number; totalEarnedKobo: number }>

topUpFromCard(userId: string, amountKobo: number, paystackRef: string): Promise<IWalletTransaction>
  - Called from Paystack charge.success webhook handler after signature verification
  - Idempotency check: if paystackRef exists in processed_webhook_events, return existing transaction without re-crediting
  - Drizzle transaction: INSERT into processed_webhook_events + UPDATE wallets SET balance_kobo += amountKobo + INSERT wallet_transactions (TOPUP_CARD, CREDIT)
  - balance_after_kobo must be computed inside the transaction to avoid race conditions

topUpFromBankTransfer(userId: string, amountKobo: number, paystackRef: string): Promise<IWalletTransaction>
  - Same pattern as topUpFromCard but type=TOPUP_BANK
  - Triggered by DVA (Dedicated Virtual Account) charge.success webhook
  - Same idempotency guard

debitForBooking(userId: string, bookingId: string, amountKobo: number, feeKobo: number): Promise<IWalletTransaction>
  - Drizzle transaction:
    CHECK balance_kobo >= amountKobo (throw InsufficientBalanceError if not)
    UPDATE wallets SET balance_kobo -= amountKobo, escrow_kobo += (amountKobo - feeKobo) — net is held in escrow
    INSERT wallet_transactions (BOOKING_DEBIT, DEBIT, related_booking_id)
    INSERT wallet_transactions (FEE_DEBIT, DEBIT) for the fee portion

creditFromEscrowRelease(providerUserId: string, bookingId: string, netKobo: number): Promise<IWalletTransaction>
  - Drizzle transaction:
    UPDATE wallets (provider) SET balance_kobo += netKobo, total_earned_kobo += netKobo
    UPDATE wallets (client) SET escrow_kobo -= (netKobo + feeKobo) — releases the held amount from escrow tracking
    INSERT wallet_transactions (ESCROW_RELEASE, CREDIT, related_booking_id) for provider
  - This replaces the current Paystack subaccount split as the settlement mechanism when both parties are wallet users

requestWithdrawal(userId: string, amountKobo: number, bankRecipientCode: string): Promise<{ transferCode: string }>
  - Validate: balance_kobo >= amountKobo
  - Drizzle transaction: UPDATE wallets SET balance_kobo -= amountKobo + INSERT wallet_transactions (WITHDRAWAL, DEBIT)
  - Call lib/paystack.ts initiateTransfer(amountKobo, bankRecipientCode, reference)
  - If Paystack transfer fails: rollback the balance deduction (or mark transaction as FAILED and refund — prefer the refund pattern over rollback for auditability)

debitForMilestone(clientUserId: string, milestoneId: string): Promise<IWalletTransaction>
  - Funds a specific milestone from client wallet
  - UPDATE booking_milestones SET status=FUNDED, funded_at=NOW()
  - Debit client wallet (MILESTONE_DEBIT), increment escrow_kobo

creditMilestoneRelease(milestoneId: string): Promise<IWalletTransaction>
  - Release a funded+approved milestone to provider wallet
  - UPDATE booking_milestones SET status=RELEASED, released_at=NOW()
  - Credit provider wallet (MILESTONE_RELEASE), release client escrow_kobo
  - Check if all milestones on the booking are RELEASED; if so, set booking.status=RELEASED

debitForDirectPayment(clientUserId: string, providerUserId: string, amountKobo: number, feeKobo: number, bookingId: string): Promise<IWalletTransaction>
  - No escrow hold — immediate settlement
  - Drizzle transaction: debit client wallet (amountKobo), credit provider wallet (amountKobo - feeKobo), debit fee (feeKobo)
  - INSERT wallet_transactions for all three legs

## MILESTONE SERVICE (services/MilestoneService.ts)

Interface IMilestoneService exported before class.

createMilestones(bookingId: string, milestones: Array<{ title: string; description?: string; amountKobo: number; dueDate?: string }>): Promise<IBookingMilestone[]>
  - Validate: booking.payment_mode=MILESTONE; sum of milestone amounts equals booking.price_kobo (throw MilestoneAmountMismatchError if not)
  - Compute feeKobo per milestone: Math.round(amountKobo * platformConfig.feeRate)
  - Insert all milestones in a single Drizzle batch with sequential index values
  - Max 5 milestones per booking (throw MilestoneLimitError if exceeded)
  - Minimum 2 milestones required (throw MilestoneMinimumError if below)

fundMilestone(milestoneId: string, clientUserId: string): Promise<IBookingMilestone>
  - Validates: caller is the booking's client; milestone.status=PENDING; previous milestone is RELEASED or this is milestone index 1
  - Only milestone index 1 can be funded at booking creation; subsequent milestones funded after previous is approved
  - Calls WalletService.debitForMilestone(clientUserId, milestoneId)

submitMilestone(milestoneId: string, providerUserId: string, deliveryNote?: string): Promise<IBookingMilestone>
  - Validates: caller is booking's provider; milestone.status=FUNDED
  - UPDATE booking_milestones SET status=IN_PROGRESS ... then status=SUBMITTED, submitted_at=NOW()
  - Starts 8-day client review window (store in metadata or a separate review_deadline column)
  - Notify client

approveMilestone(milestoneId: string, clientUserId: string): Promise<IBookingMilestone>
  - Validates: caller is booking's client; milestone.status=SUBMITTED; within review window
  - UPDATE status=APPROVED
  - Calls WalletService.creditMilestoneRelease(milestoneId)
  - If last milestone: set booking.status=RELEASED
  - Trigger next milestone funding prompt to client (notification)

autoApproveMilestone(milestoneId: string): Promise<void>
  - Cron target: called when review window expires with no client action
  - Same as approveMilestone but initiated by server

disputeMilestone(milestoneId: string, clientUserId: string, reason: string): Promise<IBookingMilestone>
  - Validates: within review window; milestone.status=SUBMITTED
  - UPDATE status=DISPUTED; notify admin; pause booking

getMilestonesByBooking(bookingId: string): Promise<IBookingMilestone[]>
  - Ordered by index ascending

## UPDATED BOOKING FLOW

BookingService.createRequest must be updated to accept paymentMode: 'ESCROW' | 'MILESTONE' | 'DIRECT' (default: 'ESCROW').

For MILESTONE mode:
  - Booking is created with status=REQUESTED and payment_mode=MILESTONE
  - After provider accepts, client is shown the milestone builder UI before paying
  - MilestoneService.createMilestones() is called with client-proposed milestones
  - Client funds milestone 1 only; subsequent milestones funded one at a time

For DIRECT mode:
  - Booking created with payment_mode=DIRECT
  - On client payment, WalletService.debitForDirectPayment() is called immediately
  - No escrow hold; provider wallet credited instantly (minus fee)
  - EscrowService is not involved

For ESCROW mode (existing behaviour):
  - No change to existing state machine
  - Wallet may be the payment source (if client has sufficient balance) or Paystack card checkout
  - On RELEASED, if provider has a wallet, credit it via WalletService.creditFromEscrowRelease() instead of Paystack subaccount transfer

## WALLET TOP-UP API ROUTES

app/api/wallet/topup/card/route.ts (POST — authenticated):
  - Init Paystack transaction: amount=requested top-up, email=user.email, metadata={ purpose: 'WALLET_TOPUP', userId }
  - Return authorization_url for client-side redirect to Paystack checkout
  - On return: Paystack redirects back; verify via webhook (not callback URL)

app/api/wallet/topup/bank/route.ts (POST — authenticated):
  - Get or create Paystack Dedicated Virtual Account for the user
  - Return DVA account number and bank name for the user to initiate a bank transfer
  - Store DVA details on wallet record (dva_account_number, dva_bank_name columns — add to wallets table)

app/api/wallet/balance/route.ts (GET — authenticated):
  - Returns WalletService.getBalance(userId)

app/api/wallet/withdraw/route.ts (POST — authenticated, PROVIDER role only):
  - Body: { amountKobo: number; bankRecipientCode: string }
  - Calls WalletService.requestWithdrawal()
  - Minimum withdrawal: 1000 kobo (₦10) — admin-configurable via platformConfig

app/api/wallet/transactions/route.ts (GET — authenticated):
  - Paginated wallet transaction history for the authenticated user
  - Query params: type filter, direction filter, cursor, limit

## UPDATED PAYSTACK WEBHOOK HANDLER

app/api/webhooks/paystack/route.ts must handle new events:

charge.success (existing — extended):
  - Check metadata.purpose:
    - 'WALLET_TOPUP': call WalletService.topUpFromCard(metadata.userId, amount, reference)
    - 'BOOKING_PAYMENT' with booking.payment_mode=WALLET_ESCROW: WalletService.debitForBooking() already done at checkout — just update payment status
    - Existing escrow booking (no wallet): existing EscrowService.onPaystackSuccess() path unchanged

transfer.success:
  - Mark withdrawal transaction as COMPLETED
  - Notify provider "₦X has been sent to your bank account"

transfer.failed / transfer.reversed:
  - Refund the wallet balance (re-credit): WalletService credit transaction (REFUND type)
  - Notify provider of failure with reason

dedicatedaccount.assign.success (DVA assignment):
  - Update wallet record with confirmed DVA details

## CRON ADDITIONS

app/api/cron/milestones/route.ts:
  - Verify CRON_SECRET header
  - Find milestones where status=SUBMITTED and review_deadline < NOW() → MilestoneService.autoApproveMilestone()
  - Run each independently with try-catch
  - Return { processed, errors }

Add to vercel.json crons: /api/cron/milestones at 00:05 daily

## WALLET UI — NEW COMPONENTS & PAGES

app/(auth)/wallet/page.tsx — Wallet Dashboard:
  - Balance display: available balance (JetBrains Mono, large, accent colour) + escrow hold + total earned (for providers)
  - Top-up section: two tabs — "Card" (initiates Paystack checkout) and "Bank Transfer" (shows DVA account number + bank name with copy buttons)
  - Quick withdraw button (providers only, opens WithdrawModal)
  - Transaction history: paginated list using wallet_transactions. Each row: type badge, description, direction indicator (+ green or - red), amount in JetBrains Mono, timestamp. Filter by type.

components/wallet/WalletBalanceCard.tsx:
  - Available balance (Syne ExtraBold, JetBrains Mono for amount)
  - Escrow hold sub-label (Inter 12px var(--color-text-secondary))
  - "Top Up" and "Withdraw" (provider-only) ClButton pair
  - Shows in provider dashboard and client dashboard

components/wallet/TopUpModal.tsx:
  - ClSheet (mobile bottom, desktop right 480px)
  - Tab: Card — amount input + "Proceed to Paystack" Primary ClButton
  - Tab: Bank Transfer — copy-able DVA account number + bank name, "I've made the transfer" info note, refresh balance button

components/wallet/WithdrawModal.tsx (PROVIDER only):
  - Amount input (validate against available balance)
  - Bank account selector (shows saved recipient codes — add recipients via /api/wallet/recipients)
  - "Withdraw" Primary ClButton — disabled if amount > balance
  - Note: "Withdrawals typically arrive within 24 hours." Inter 12px var(--color-text-secondary)

components/booking/MilestoneBuilder.tsx (new — appears in booking flow for MILESTONE mode):
  - Shown after provider accepts a MILESTONE mode booking, before client pays
  - Allows client to define 2–5 milestones with title, description, amount, due date
  - Running total must equal booking.price_kobo exactly (live validation, error if not matching)
  - "Confirm & Fund Milestone 1" Primary ClButton submits all milestones and funds the first

components/booking/MilestoneTimeline.tsx (replaces EscrowTimeline for MILESTONE mode bookings):
  - Vertical timeline of all milestones for the booking
  - Each milestone node: index circle (accent when current, green when complete) + title + amount (JetBrains Mono) + status badge + due date
  - Current milestone: expanded card with submit/approve/dispute CTAs depending on viewer role
  - Progress indicator: "2 of 5 milestones released (₦X,XXX of ₦Y,YYY)"

## PAYMENT MODE SELECTION IN BOOKING FLOW

BookingDrawer.tsx (Step 1) should be updated to include a payment mode selector:

- Default: ESCROW (existing behaviour, no UI change for client)
- For bookings above a threshold (admin-configurable, suggest ₦100,000 default): show optional MILESTONE toggle
- DIRECT mode: available as an add-on to an existing completed booking (tip / additional deliverable)
- UI: below the package summary, a "Payment Structure" row with a subtle toggle (ESCROW default / MILESTONE for larger projects). Inter 13px var(--color-text-secondary) label. When MILESTONE selected: "You'll define milestones after the provider accepts your booking" Inter 12px var(--color-text-tertiary) note.
- DIRECT mode is not selected in the main booking flow — it appears as a separate "Add Payment" button on the booking detail page for completed or active bookings.

## TYPES TO ADD (/types/index.ts)

IWallet {
  id: string;
  userId: string;
  balanceKobo: number;  /** Available balance in kobo */
  escrowKobo: number;   /** Currently locked in active escrow in kobo */
  totalEarnedKobo: number; /** Lifetime provider earnings in kobo */
  dvaAccountNumber?: string;
  dvaBankName?: string;
  createdAt: string;
  updatedAt: string;
}

IWalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType; /** enum */
  amountKobo: number; /** Amount in kobo — always positive */
  direction: 'CREDIT' | 'DEBIT';
  balanceAfterKobo: number; /** Wallet balance snapshot after this transaction in kobo */
  reference: string;
  relatedBookingId?: string;
  relatedMilestoneId?: string;
  paystackRef?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

WalletTransactionType enum:
  TOPUP_CARD | TOPUP_BANK | BOOKING_DEBIT | ESCROW_HOLD | ESCROW_RELEASE |
  MILESTONE_DEBIT | MILESTONE_RELEASE | DIRECT_PAYMENT_DEBIT | DIRECT_PAYMENT_CREDIT |
  WITHDRAWAL | FEE_DEBIT | REFUND

IBookingMilestone {
  id: string;
  bookingId: string;
  index: number;
  title: string;
  description?: string;
  amountKobo: number; /** Amount in kobo */
  feeKobo: number; /** Platform fee in kobo — calculated at creation, immutable */
  status: MilestoneStatus; /** enum */
  dueDate?: string;
  fundedAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  releasedAt?: string;
  createdAt: string;
}

MilestoneStatus enum:
  PENDING | FUNDED | IN_PROGRESS | SUBMITTED | APPROVED | DISPUTED | RELEASED | REFUNDED | CANCELLED

PaymentMode enum (add to booking types):
  ESCROW | MILESTONE | DIRECT

## CUSTOM ERROR CLASSES (lib/errors.ts — add to existing if file exists, create if not)

InsufficientBalanceError extends Error { status = 400; code = 'INSUFFICIENT_BALANCE' }
MilestoneAmountMismatchError extends Error { status = 400; code = 'MILESTONE_AMOUNT_MISMATCH' }
MilestoneLimitError extends Error { status = 400; code = 'MILESTONE_LIMIT_EXCEEDED' }
MilestoneMinimumError extends Error { status = 400; code = 'MILESTONE_MINIMUM_REQUIRED' }
WebhookSignatureError extends Error { status = 401; code = 'INVALID_WEBHOOK_SIGNATURE' }
DuplicateWebhookError extends Error { status = 200; code = 'DUPLICATE_WEBHOOK' }

## PLATFORM CONFIG ADDITIONS

Add to DEFAULT_CONFIG in config/platform.config.ts (and therefore to IPlatformConfig in types/platform.ts):

milestonePayments: {
  enabled: true,
  minBookingAmountKobo: 10000000,  /** ₦100,000 minimum for milestone eligibility */
  maxMilestones: 5,
  minMilestones: 2,
  minMilestoneAmountKobo: 500000,  /** ₦5,000 minimum per milestone */
  reviewWindowDays: 8,             /** Days client has to review each submitted milestone */
}
wallet: {
  enabled: true,
  minTopUpKobo: 100000,      /** ₦1,000 minimum top-up */
  minWithdrawalKobo: 100000, /** ₦1,000 minimum withdrawal */
  maxDvaAccounts: 1000,      /** Paystack DVA limit */
}

## IMPLEMENTATION ORDER

Execute in this sequence. Run npx tsc --noEmit after each step. Do not proceed if TypeScript errors exist.

1. Add types to /types/index.ts (IWallet, IWalletTransaction, IBookingMilestone, enums)
2. Update drizzle/schema.ts (wallets, wallet_transactions, booking_milestones, processed_webhook_events, add payment_mode to bookings)
3. Generate and apply migration: npx drizzle-kit generate && npx drizzle-kit migrate
4. Add RLS policies for new tables (migration 000X_wallet_rls.sql)
5. Update config/platform.config.ts and types/platform.ts with milestonePayments and wallet config blocks
6. Implement services/WalletService.ts (interface first, then class)
7. Implement services/MilestoneService.ts (interface first, then class)
8. Update lib/paystack.ts — add initiateTransfer(), createDedicatedVirtualAccount(), getTransferRecipient()
9. Update app/api/webhooks/paystack/route.ts — add new event handlers with idempotency guard
10. Add app/api/wallet/ routes (topup/card, topup/bank, balance, withdraw, transactions)
11. Add app/api/milestones/ routes (create, fund, submit, approve, dispute)
12. Update app/api/cron/escrow/route.ts — add milestone auto-approval logic
13. Add app/api/cron/milestones/route.ts
14. Update vercel.json with new cron
15. Build UI components (WalletBalanceCard, TopUpModal, WithdrawModal, MilestoneBuilder, MilestoneTimeline)
16. Add app/(auth)/wallet/page.tsx
17. Update BookingDrawer.tsx — payment mode selector (Step 1)
18. Update booking detail page — show MilestoneTimeline for MILESTONE mode bookings, add "Add Payment" button for DIRECT mode
19. npm run build — fix all errors
20. npx next lint — fix all warnings
21. Update .ai-system/checkpoints/session-log.md: "Payment Expansion COMPLETE — Wallet, Milestone, Direct modes implemented."
22. Update .ai-system/planning/task-queue.md — mark all payment expansion tasks [x].