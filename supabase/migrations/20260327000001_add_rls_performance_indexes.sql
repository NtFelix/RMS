-- ============================================================
-- Migration: Add RLS Performance Indexes
-- Purpose: Create indexes for RLS policy columns without table locks
-- 
-- NOTE: These indexes support the consolidated RLS policies
-- from the previous migration. They should be run separately
-- to avoid table locks in production environments.
-- 
-- In Supabase production, consider running these manually
-- with CONCURRENTLY in the SQL Editor to avoid locks:
-- 
-- CREATE INDEX CONCURRENTLY mail_import_jobs_user_id_idx 
--   ON public."Mail_Import_Jobs" (user_id);
-- ============================================================

-- Index for Mail_Import_Jobs user_id RLS checks
CREATE INDEX IF NOT EXISTS mail_import_jobs_user_id_idx
  ON public."Mail_Import_Jobs" (user_id);

-- Index for Mail_Sync_Jobs account_id RLS checks  
CREATE INDEX IF NOT EXISTS mail_sync_jobs_account_id_idx
  ON public."Mail_Sync_Jobs" (account_id);

-- Index for Mail_Accounts user_id (used by helper function)
CREATE INDEX IF NOT EXISTS mail_accounts_user_id_idx
  ON public."Mail_Accounts" (user_id);

-- ============================================================
-- Down Migration
-- ============================================================
-- Comment: Indexes are not dropped by default as they benefit
-- overall query performance. If complete rollback is needed,
-- uncomment the following statements:
--
-- DROP INDEX IF EXISTS mail_import_jobs_user_id_idx;
-- DROP INDEX IF EXISTS mail_sync_jobs_account_id_idx;  
-- DROP INDEX IF EXISTS mail_accounts_user_id_idx;
