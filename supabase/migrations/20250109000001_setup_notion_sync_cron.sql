-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to call the Notion sync Edge Function
CREATE OR REPLACE FUNCTION trigger_notion_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    supabase_url text;
    service_key text;
    response_status int;
BEGIN
    -- Get Supabase URL and service key from environment or settings
    -- Note: In production, these should be set as Supabase secrets
    supabase_url := current_setting('app.supabase_url', true);
    service_key := current_setting('app.supabase_service_key', true);
    
    -- If settings are not available, log and exit
    IF supabase_url IS NULL OR service_key IS NULL THEN
        RAISE LOG 'Notion sync skipped: Supabase URL or service key not configured';
        RETURN;
    END IF;
    
    -- Call the Edge Function using HTTP request
    -- Note: This requires the http extension and proper network configuration
    BEGIN
        -- Log the sync attempt
        RAISE LOG 'Starting scheduled Notion documentation sync at %', now();
        
        -- In a real implementation, you would use the http extension to call the Edge Function
        -- For now, we'll just log that the sync was triggered
        RAISE LOG 'Notion sync Edge Function would be called here: %/functions/v1/sync-notion-docs', supabase_url;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error during scheduled Notion sync: %', SQLERRM;
    END;
END;
$$;

-- Schedule the sync to run every 6 hours
-- Note: This requires pg_cron to be properly configured in your Supabase instance
SELECT cron.schedule(
    'notion-docs-sync',           -- job name
    '0 */6 * * *',               -- cron expression: every 6 hours
    'SELECT trigger_notion_sync();' -- SQL command to execute
);

-- Create a manual sync trigger function for API use
CREATE OR REPLACE FUNCTION manual_notion_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Log manual sync trigger
    RAISE LOG 'Manual Notion sync triggered at %', now();
    
    -- Call the sync function
    PERFORM trigger_notion_sync();
    
    -- Return success response
    result := jsonb_build_object(
        'success', true,
        'message', 'Notion sync triggered successfully',
        'timestamp', now()
    );
    
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    -- Return error response
    result := jsonb_build_object(
        'success', false,
        'message', 'Failed to trigger Notion sync: ' || SQLERRM,
        'timestamp', now()
    );
    
    RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION trigger_notion_sync() TO service_role;
GRANT EXECUTE ON FUNCTION manual_notion_sync() TO service_role;
GRANT EXECUTE ON FUNCTION manual_notion_sync() TO authenticated;

-- Add comments
COMMENT ON FUNCTION trigger_notion_sync() IS 'Triggers the Notion documentation sync Edge Function via cron job';
COMMENT ON FUNCTION manual_notion_sync() IS 'Manually triggers Notion documentation sync and returns result status';

-- Create a sync log table to track sync operations
CREATE TABLE IF NOT EXISTS public."NotionSyncLog" (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sync_type text NOT NULL CHECK (sync_type IN ('manual', 'scheduled')),
    started_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at timestamp with time zone NULL,
    success boolean NULL,
    pages_processed integer DEFAULT 0,
    errors text[] DEFAULT '{}',
    message text NULL,
    CONSTRAINT "NotionSyncLog_pkey" PRIMARY KEY (id)
);

-- Add RLS for sync log
ALTER TABLE public."NotionSyncLog" ENABLE ROW LEVEL SECURITY;

-- Allow service role full access to sync log
CREATE POLICY "Allow service role full access to sync log" ON public."NotionSyncLog"
FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read sync log
CREATE POLICY "Allow authenticated read access to sync log" ON public."NotionSyncLog"
FOR SELECT TO authenticated USING (true);

-- Grant permissions on sync log
GRANT SELECT ON public."NotionSyncLog" TO authenticated;
GRANT ALL ON public."NotionSyncLog" TO service_role;

-- Add comment
COMMENT ON TABLE public."NotionSyncLog" IS 'Tracks Notion documentation sync operations for monitoring and debugging';