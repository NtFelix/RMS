-- ============================================================
-- Down Migration: Restore original permissive RLS policies
-- Rollback: Restores original 5+5 separate policies
-- ============================================================

-- Drop consolidated policies
DROP POLICY IF EXISTS "Service role full access to import jobs" ON public."Mail_Import_Jobs";
DROP POLICY IF EXISTS "Users can manage their own import jobs"  ON public."Mail_Import_Jobs";
DROP POLICY IF EXISTS "Service role full access to sync jobs"   ON public."Mail_Sync_Jobs";
DROP POLICY IF EXISTS "Users can manage sync jobs for their accounts" ON public."Mail_Sync_Jobs";

-- Drop helper function
DROP FUNCTION IF EXISTS public.user_owns_mail_account(bigint);

-- ============================================================
-- Restore original Mail_Import_Jobs policies
-- ============================================================
CREATE POLICY "Service role can manage import jobs" ON public."Mail_Import_Jobs"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Secure SELECT" ON public."Mail_Import_Jobs"
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Secure INSERT" ON public."Mail_Import_Jobs"
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Secure UPDATE" ON public."Mail_Import_Jobs"
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Secure DELETE" ON public."Mail_Import_Jobs"
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Restore original Mail_Sync_Jobs policies
-- ============================================================
CREATE POLICY "Service role can manage sync jobs" ON public."Mail_Sync_Jobs"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Secure SELECT" ON public."Mail_Sync_Jobs"
  FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public."Mail_Accounts"
    WHERE "Mail_Accounts".id = "Mail_Sync_Jobs".account_id
    AND "Mail_Accounts".user_id = auth.uid()
  ));

CREATE POLICY "Secure INSERT" ON public."Mail_Sync_Jobs"
  FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public."Mail_Accounts"
    WHERE "Mail_Accounts".id = "Mail_Sync_Jobs".account_id
    AND "Mail_Accounts".user_id = auth.uid()
  ));

CREATE POLICY "Secure UPDATE" ON public."Mail_Sync_Jobs"
  FOR UPDATE TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public."Mail_Accounts"
    WHERE "Mail_Accounts".id = "Mail_Sync_Jobs".account_id
    AND "Mail_Accounts".user_id = auth.uid()
  ));

CREATE POLICY "Secure DELETE" ON public."Mail_Sync_Jobs"
  FOR DELETE TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public."Mail_Accounts"
    WHERE "Mail_Accounts".id = "Mail_Sync_Jobs".account_id
    AND "Mail_Accounts".user_id = auth.uid()
  ));

-- ============================================================
-- Note: Indexes are not dropped as they may be beneficial
-- ============================================================
-- The indexes created in the up migration are kept as they
-- improve performance even with the original policies.
