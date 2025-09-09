-- Create Dokumentation table for storing synced Notion documentation
CREATE TABLE IF NOT EXISTS public."Dokumentation" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titel text NOT NULL,
  kategorie text NULL,
  seiteninhalt text NULL,
  meta jsonb NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT "Dokumentation_pkey" PRIMARY KEY (id)
);

-- Create unique constraint on notion_id in meta to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_dokumentation_notion_id 
ON public."Dokumentation" ((meta->>'notion_id'))
WHERE meta->>'notion_id' IS NOT NULL;

-- Add RLS (Row Level Security) - Documentation is public, no user-specific access needed
ALTER TABLE public."Dokumentation" ENABLE ROW LEVEL SECURITY;

-- Allow public read access to documentation
CREATE POLICY "Allow public read access to documentation" ON public."Dokumentation"
FOR SELECT USING (true);

-- Only allow service role to insert/update/delete (for sync operations)
CREATE POLICY "Allow service role full access to documentation" ON public."Dokumentation"
FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public."Dokumentation" TO anon;
GRANT SELECT ON public."Dokumentation" TO authenticated;
GRANT ALL ON public."Dokumentation" TO service_role;

-- Add comment for documentation
COMMENT ON TABLE public."Dokumentation" IS 'Stores documentation articles synced from Notion database';
COMMENT ON COLUMN public."Dokumentation".titel IS 'Article title (mapped from Notion Name property)';
COMMENT ON COLUMN public."Dokumentation".kategorie IS 'Article category (mapped from Notion Kategorie property)';
COMMENT ON COLUMN public."Dokumentation".seiteninhalt IS 'Article content in markdown format (extracted from Notion page blocks)';
COMMENT ON COLUMN public."Dokumentation".meta IS 'Additional metadata from Notion including notion_id, timestamps, and other properties';

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