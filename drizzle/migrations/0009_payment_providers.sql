-- Multi-provider payment rail (Paystack + Monnify) with per-payment provider
-- and test-mode attribution. Additive + idempotent: existing rows are
-- backfilled as PAYSTACK/live so in-flight bookings keep working unchanged.
ALTER TABLE IF EXISTS "bookings" ADD COLUMN IF NOT EXISTS "payment_provider" text DEFAULT 'PAYSTACK' NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "bookings" ADD COLUMN IF NOT EXISTS "payment_test_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "payments" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'PAYSTACK' NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "payments" ADD COLUMN IF NOT EXISTS "test_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "payments" ADD COLUMN IF NOT EXISTS "provider_ref" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_provider_idx" ON "payments" USING btree ("provider","test_mode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_payment_provider_idx" ON "bookings" USING btree ("payment_provider","payment_test_mode");--> statement-breakpoint
ALTER TABLE IF EXISTS "wallet_transactions" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'PAYSTACK' NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "wallet_transactions" ADD COLUMN IF NOT EXISTS "test_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallet_transactions_provider_idx" ON "wallet_transactions" USING btree ("provider","test_mode");
