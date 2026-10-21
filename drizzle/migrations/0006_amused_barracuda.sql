-- These columns are also covered by 0009_payment_providers. Keep this
-- migration idempotent because it may be present in databases whose journal
-- was generated before the consolidated payment-provider migration.
ALTER TABLE IF EXISTS "bookings" ADD COLUMN IF NOT EXISTS "payment_provider" text DEFAULT 'PAYSTACK' NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "bookings" ADD COLUMN IF NOT EXISTS "payment_test_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "payments" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'PAYSTACK' NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "payments" ADD COLUMN IF NOT EXISTS "test_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "payments" ADD COLUMN IF NOT EXISTS "provider_ref" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "wallet_transactions" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'PAYSTACK' NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "wallet_transactions" ADD COLUMN IF NOT EXISTS "test_mode" boolean DEFAULT false NOT NULL;