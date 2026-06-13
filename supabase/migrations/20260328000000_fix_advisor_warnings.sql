-- ============================================================================
-- Fix Supabase Advisor Warnings
-- 1. Remove unused indexes
-- 2. Remove duplicate index on Wohnungen
-- 3. Fix RLS policies with auth.uid() for better performance
-- ============================================================================

-- ============================================================================
-- PART 1: Remove unused indexes
-- These indexes have never been used and waste storage/performance
-- Note: DROP INDEX without CONCURRENTLY is acceptable here as all tables are small
-- (largest is Mail_Metadaten with ~12K rows). For tables >100K rows, use CONCURRENTLY.
-- ============================================================================

-- Unused indexes on Dokumentation table (6 indexes)
DROP INDEX IF EXISTS idx_dokumentation_full_text_search;
DROP INDEX IF EXISTS idx_dokumentation_kategorie;
DROP INDEX IF EXISTS idx_dokumentation_kategorie_titel;
DROP INDEX IF EXISTS idx_dokumentation_seiteninhalt_fts;
DROP INDEX IF EXISTS idx_dokumentation_titel;
DROP INDEX IF EXISTS idx_dokumentation_titel_fts;

-- Unused indexes on Dokumente_Metadaten table (2 indexes)
DROP INDEX IF EXISTS idx_metadata_user_id;
DROP INDEX IF EXISTS idx_metadata_user_path;

-- Unused indexes on Finanzen table (3 indexes)
DROP INDEX IF EXISTS idx_finanzen_month_year;
DROP INDEX IF EXISTS idx_finanzen_tags;
DROP INDEX IF EXISTS idx_finanzen_text_search;

-- Unused indexes on Mail tables (3 indexes)
DROP INDEX IF EXISTS mail_accounts_user_id_idx;
DROP INDEX IF EXISTS mail_import_jobs_user_id_idx;
-- Note: mail_sync_jobs_account_id_idx is safe to drop despite RLS using account_id:
-- Table has only 36 rows, Mail_Accounts has 8 rows - sequential scan is faster than index for small tables
DROP INDEX IF EXISTS mail_sync_jobs_account_id_idx;

-- ============================================================================
-- PART 2: Remove duplicate index on Wohnungen
-- ============================================================================

-- Wohnungen has both Wohnungen_pkey (primary key) and Wohnungen_id_key (unique constraint)
-- Both are on the 'id' column - keep the primary key, remove the duplicate unique constraint
-- Note: Wohnungen_id_key is a UNIQUE CONSTRAINT, not just an index, so we must drop the constraint
ALTER TABLE "Wohnungen" DROP CONSTRAINT IF EXISTS "Wohnungen_id_key";

-- ============================================================================
-- PART 3: Fix RLS policies for Mail_Import_Jobs and Mail_Sync_Jobs
-- Replace auth.uid() with (select auth.uid()) for better performance
-- This prevents re-evaluation of auth.uid() for each row
-- ============================================================================

-- Fix Mail_Import_Jobs RLS policies
DROP POLICY IF EXISTS "Secure DELETE" ON "Mail_Import_Jobs";
DROP POLICY IF EXISTS "Secure INSERT" ON "Mail_Import_Jobs";
DROP POLICY IF EXISTS "Secure SELECT" ON "Mail_Import_Jobs";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Mail_Import_Jobs";

CREATE POLICY "Secure DELETE" ON "Mail_Import_Jobs"
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Mail_Import_Jobs"
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Secure SELECT" ON "Mail_Import_Jobs"
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Mail_Import_Jobs"
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id); -- Prevent user_id modification

-- Fix Mail_Sync_Jobs RLS policies (these use auth.uid() in subqueries)
DROP POLICY IF EXISTS "Secure DELETE" ON "Mail_Sync_Jobs";
DROP POLICY IF EXISTS "Secure INSERT" ON "Mail_Sync_Jobs";
DROP POLICY IF EXISTS "Secure SELECT" ON "Mail_Sync_Jobs";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Mail_Sync_Jobs";

CREATE POLICY "Secure DELETE" ON "Mail_Sync_Jobs"
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "Mail_Accounts"
    WHERE "Mail_Accounts".id = "Mail_Sync_Jobs".account_id
    AND "Mail_Accounts".user_id = (select auth.uid())
  ));

CREATE POLICY "Secure INSERT" ON "Mail_Sync_Jobs"
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM "Mail_Accounts"
    WHERE "Mail_Accounts".id = "Mail_Sync_Jobs".account_id
    AND "Mail_Accounts".user_id = (select auth.uid())
  ));

CREATE POLICY "Secure SELECT" ON "Mail_Sync_Jobs"
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "Mail_Accounts"
    WHERE "Mail_Accounts".id = "Mail_Sync_Jobs".account_id
    AND "Mail_Accounts".user_id = (select auth.uid())
  ));

CREATE POLICY "Secure UPDATE" ON "Mail_Sync_Jobs"
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "Mail_Accounts"
    WHERE "Mail_Accounts".id = "Mail_Sync_Jobs".account_id
    AND "Mail_Accounts".user_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "Mail_Accounts"
    WHERE "Mail_Accounts".id = "Mail_Sync_Jobs".account_id
    AND "Mail_Accounts".user_id = (select auth.uid())
  )); -- Prevent account_id modification
