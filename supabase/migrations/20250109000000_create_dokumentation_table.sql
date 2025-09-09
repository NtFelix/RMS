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