-- Supabase RLS Policies for Crelab
-- Enable RLS on all tables and create granular policies

ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "providers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolio_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_packages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "disputes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consent_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_config" ENABLE ROW LEVEL SECURITY;

-- User: users can read/update their own record; admins can read all
CREATE POLICY user_select_own ON "user"
  FOR SELECT USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY user_update_own ON "user"
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY user_insert_on_signup ON "user"
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Session: own session access
CREATE POLICY session_select_own ON "session"
  FOR SELECT USING (auth.uid() = user_id);

-- Account: own account access
CREATE POLICY account_select_own ON "account"
  FOR SELECT USING (auth.uid() = user_id);

-- Providers: public can read active+verified; owner can manage; admins can manage all
CREATE POLICY providers_select_public ON "providers"
  FOR SELECT USING (active = true AND verified = true);

CREATE POLICY providers_select_own ON "providers"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY providers_select_admin ON "providers"
  FOR SELECT USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY providers_insert_own ON "providers"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY providers_update_own ON "providers"
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY providers_update_admin ON "providers"
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'ADMIN') WITH CHECK (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY providers_delete_own ON "providers"
  FOR DELETE USING (auth.uid() = user_id);

-- Portfolio items
CREATE POLICY portfolio_items_select_public ON "portfolio_items"
  FOR SELECT USING (
    visible = true AND EXISTS (
      SELECT 1 FROM "providers"
      WHERE "providers".id = provider_id AND "providers".active = true AND "providers".verified = true
    )
  );

CREATE POLICY portfolio_items_select_own ON "portfolio_items"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "providers" WHERE "providers".id = provider_id AND "providers".user_id = auth.uid())
  );

CREATE POLICY portfolio_items_select_admin ON "portfolio_items"
  FOR SELECT USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY portfolio_items_insert_own ON "portfolio_items"
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM "providers" WHERE "providers".id = provider_id AND "providers".user_id = auth.uid())
  );

CREATE POLICY portfolio_items_update_own ON "portfolio_items"
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM "providers" WHERE "providers".id = provider_id AND "providers".user_id = auth.uid())
  );

CREATE POLICY portfolio_items_delete_own ON "portfolio_items"
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM "providers" WHERE "providers".id = provider_id AND "providers".user_id = auth.uid())
  );

-- Service packages
CREATE POLICY service_packages_select_public ON "service_packages"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "providers" WHERE "providers".id = provider_id AND "providers".active = true AND "providers".verified = true)
  );

CREATE POLICY service_packages_select_own ON "service_packages"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "providers" WHERE "providers".id = provider_id AND "providers".user_id = auth.uid())
  );

CREATE POLICY service_packages_insert_own ON "service_packages"
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM "providers" WHERE "providers".id = provider_id AND "providers".user_id = auth.uid())
  );

CREATE POLICY service_packages_update_own ON "service_packages"
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM "providers" WHERE "providers".id = provider_id AND "providers".user_id = auth.uid())
  );

CREATE POLICY service_packages_delete_own ON "service_packages"
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM "providers" WHERE "providers".id = provider_id AND "providers".user_id = auth.uid())
  );

-- Bookings
CREATE POLICY bookings_select_involved ON "bookings"
  FOR SELECT USING (
    client_id = auth.uid()
    OR provider_id IN (SELECT id FROM "providers" WHERE user_id = auth.uid())
    OR auth.jwt() ->> 'role' = 'ADMIN'
  );

CREATE POLICY bookings_insert_client ON "bookings"
  FOR INSERT WITH CHECK (client_id = auth.uid());

CREATE POLICY bookings_update_involved ON "bookings"
  FOR UPDATE USING (
    client_id = auth.uid()
    OR provider_id IN (SELECT id FROM "providers" WHERE user_id = auth.uid())
    OR auth.jwt() ->> 'role' = 'ADMIN'
  );

-- Payments
CREATE POLICY payments_select_involved ON "payments"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "bookings" WHERE "bookings".id = booking_id AND "bookings".client_id = auth.uid())
    OR EXISTS (SELECT 1 FROM "bookings" JOIN "providers" ON "bookings".provider_id = "providers".id WHERE "bookings".id = booking_id AND "providers".user_id = auth.uid())
    OR auth.jwt() ->> 'role' = 'ADMIN'
  );

-- Reviews
CREATE POLICY reviews_select_public ON "reviews"
  FOR SELECT USING (true);

CREATE POLICY reviews_insert_involved ON "reviews"
  FOR INSERT WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM "bookings" WHERE "bookings".id = booking_id AND ("bookings".client_id = auth.uid() OR "bookings".provider_id IN (SELECT id FROM "providers" WHERE user_id = auth.uid())))
  );

CREATE POLICY reviews_update_admin ON "reviews"
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY reviews_delete_admin ON "reviews"
  FOR DELETE USING (auth.jwt() ->> 'role' = 'ADMIN');

-- Disputes
CREATE POLICY disputes_select_involved ON "disputes"
  FOR SELECT USING (
    raised_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM "bookings" WHERE "bookings".id = booking_id AND "bookings".provider_id IN (SELECT id FROM "providers" WHERE user_id = auth.uid()))
    OR auth.jwt() ->> 'role' = 'ADMIN'
  );

CREATE POLICY disputes_insert_involved ON "disputes"
  FOR INSERT WITH CHECK (
    raised_by_id = auth.uid()
    AND EXISTS (SELECT 1 FROM "bookings" WHERE "bookings".id = booking_id AND ("bookings".client_id = auth.uid() OR "bookings".provider_id IN (SELECT id FROM "providers" WHERE user_id = auth.uid())))
  );

CREATE POLICY disputes_update_admin ON "disputes"
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'ADMIN') WITH CHECK (auth.jwt() ->> 'role' = 'ADMIN');

-- Consent records
CREATE POLICY consent_records_select_own ON "consent_records"
  FOR SELECT USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY consent_records_insert_own ON "consent_records"
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Platform config
CREATE POLICY platform_config_select_public ON "platform_config"
  FOR SELECT USING (true);

CREATE POLICY platform_config_insert_admin ON "platform_config"
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY platform_config_update_admin ON "platform_config"
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'ADMIN') WITH CHECK (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY platform_config_delete_admin ON "platform_config"
  FOR DELETE USING (auth.jwt() ->> 'role' = 'ADMIN');
