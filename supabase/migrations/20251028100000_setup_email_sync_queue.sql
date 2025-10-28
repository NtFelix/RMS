-- Enable pg_net extension for HTTP requests from database (optional for future use)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Add status check constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'mail_sync_jobs_status_check'
    ) THEN
        ALTER TABLE public."Mail_Sync_Jobs" 
        ADD CONSTRAINT mail_sync_jobs_status_check 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
    END IF;
END $$;

-- Enable RLS on Mail_Sync_Jobs
ALTER TABLE public."Mail_Sync_Jobs" ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their own sync jobs" ON public."Mail_Sync_Jobs";
DROP POLICY IF EXISTS "Users can insert their own sync jobs" ON public."Mail_Sync_Jobs";
DROP POLICY IF EXISTS "Service role can insert sync jobs" ON public."Mail_Sync_Jobs";
DROP POLICY IF EXISTS "Service role can update sync jobs" ON public."Mail_Sync_Jobs";

-- RLS Policies for Mail_Sync_Jobs
-- Users can view sync jobs for their own mail accounts
CREATE POLICY "Users can view their own sync jobs"
    ON public."Mail_Sync_Jobs"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."Mail_Accounts" ma
            WHERE ma.id = account_id
            AND ma.user_id = auth.uid()
        )
    );

-- Service role can insert sync jobs
CREATE POLICY "Service role can insert sync jobs"
    ON public."Mail_Sync_Jobs"
    FOR INSERT
    WITH CHECK (true);

-- Service role can update sync jobs
CREATE POLICY "Service role can update sync jobs"
    ON public."Mail_Sync_Jobs"
    FOR UPDATE
    USING (true);
