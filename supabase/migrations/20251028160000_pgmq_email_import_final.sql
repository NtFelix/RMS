-- ============================================================================
-- PGMQ Email Import System - Complete Setup
-- ============================================================================
-- This migration sets up the complete email import system using PGMQ
-- Note: Cron job is configured via Supabase UI to call edge function every 5 minutes
-- ============================================================================

-- Create pgmq schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS pgmq;

-- Enable PGMQ extension
CREATE EXTENSION IF NOT EXISTS pgmq WITH SCHEMA pgmq CASCADE;

-- ============================================================================
-- 1. CREATE PGMQ QUEUE
-- ============================================================================

-- Create PGMQ queue for email imports
SELECT pgmq.create('outlook_email_import');

-- ============================================================================
-- 2. CREATE TRACKING TABLE
-- ============================================================================

-- Mail Import Jobs tracking table
CREATE TABLE IF NOT EXISTS public."Mail_Import_Jobs" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public."Mail_Accounts"(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sync_job_id UUID REFERENCES public."Mail_Sync_Jobs"(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    total_pages_processed INTEGER DEFAULT 0,
    total_messages_imported INTEGER DEFAULT 0,
    fehler_nachricht TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    erstellt_am TIMESTAMPTZ DEFAULT NOW(),
    aktualisiert_am TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Drop existing policies if they exist (in case of re-running migration)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own import jobs" ON public."Mail_Import_Jobs";
    DROP POLICY IF EXISTS "Service role can manage import jobs" ON public."Mail_Import_Jobs";
EXCEPTION
    WHEN undefined_table THEN
        NULL; -- Table doesn't exist yet, ignore
END $$;

ALTER TABLE public."Mail_Import_Jobs" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own import jobs"
    ON public."Mail_Import_Jobs"
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage import jobs"
    ON public."Mail_Import_Jobs"
    FOR ALL
    USING (true);

-- ============================================================================
-- 4. PGMQ WRAPPER FUNCTIONS (for RPC calls from edge functions)
-- ============================================================================

-- Wrapper function for pgmq.read
CREATE OR REPLACE FUNCTION pgmq_read(
    queue_name TEXT,
    vt INTEGER,
    qty INTEGER
)
RETURNS SETOF pgmq.message_record AS $$
BEGIN
    RETURN QUERY SELECT * FROM pgmq.read(queue_name, vt, qty);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper function for pgmq.delete
CREATE OR REPLACE FUNCTION pgmq_delete(
    queue_name TEXT,
    msg_id BIGINT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN pgmq.delete(queue_name, msg_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. QUEUE MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to queue email import task
CREATE OR REPLACE FUNCTION queue_email_import(
    p_account_id UUID,
    p_user_id UUID,
    p_sync_job_id UUID DEFAULT NULL,
    p_next_link TEXT DEFAULT NULL,
    p_page_number INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
    v_job_id UUID;
    v_message JSONB;
BEGIN
    -- Create tracking job if this is the first page
    IF p_page_number = 1 THEN
        INSERT INTO public."Mail_Import_Jobs" (
            account_id,
            user_id,
            sync_job_id,
            status
        ) VALUES (
            p_account_id,
            p_user_id,
            p_sync_job_id,
            'queued'
        ) RETURNING id INTO v_job_id;
    ELSE
        -- Find existing job
        SELECT id INTO v_job_id
        FROM public."Mail_Import_Jobs"
        WHERE account_id = p_account_id
        AND sync_job_id = p_sync_job_id
        ORDER BY erstellt_am DESC
        LIMIT 1;
    END IF;

    -- Prepare message for PGMQ
    v_message := jsonb_build_object(
        'job_id', v_job_id,
        'account_id', p_account_id,
        'user_id', p_user_id,
        'sync_job_id', p_sync_job_id,
        'next_link', p_next_link,
        'page_number', p_page_number,
        'queued_at', NOW()
    );

    -- Send to PGMQ queue
    PERFORM pgmq.send('outlook_email_import', v_message);

    RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get queue statistics
CREATE OR REPLACE FUNCTION get_email_import_stats(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    queued_jobs INTEGER,
    processing_jobs INTEGER,
    completed_jobs INTEGER,
    failed_jobs INTEGER,
    total_messages_imported INTEGER,
    queue_depth BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status = 'queued')::INTEGER,
        COUNT(*) FILTER (WHERE status = 'processing')::INTEGER,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER,
        COUNT(*) FILTER (WHERE status = 'failed')::INTEGER,
        COALESCE(SUM(total_messages_imported), 0)::INTEGER,
        (SELECT COUNT(*) FROM pgmq.q_outlook_email_import)::BIGINT
    FROM public."Mail_Import_Jobs"
    WHERE p_user_id IS NULL OR user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE public."Mail_Import_Jobs" IS 'Tracks email import jobs processed via PGMQ';
COMMENT ON FUNCTION queue_email_import IS 'Queues an email import task in PGMQ and creates/updates tracking job';
COMMENT ON FUNCTION get_email_import_stats IS 'Get statistics about email import jobs and queue depth';
COMMENT ON COLUMN public."Mail_Metadaten"."quelle_id" IS 'Provider message ID (e.g., Outlook message ID) for fetching full email content';

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- The cron job is already configured via Supabase UI to call:
-- Edge Function: process-outlook-import-queue
-- Schedule: Every 5 minutes (*/5 * * * *)
-- Method: POST
--
-- Next steps:
-- 1. Deploy edge functions:
--    supabase functions deploy sync-outlook-emails
--    supabase functions deploy process-outlook-import-queue
--
-- 2. Set edge function secrets:
--    supabase secrets set OUTLOOK_CLIENT_ID=your-client-id
--    supabase secrets set OUTLOOK_CLIENT_SECRET=your-client-secret
--
-- 3. Test the queue:
--    SELECT * FROM get_email_import_stats();
--    SELECT COUNT(*) FROM pgmq.q_outlook_email_import;
-- ============================================================================
