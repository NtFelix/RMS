-- ============================================================================
-- DOCUMENT TEMPLATE SYSTEM - VORLAGEN TABLE SETUP
-- ============================================================================
-- 
-- This migration creates the Vorlagen table for the document template system
-- with JSONB content storage for Tiptap editor content and proper indexing
-- for performance.
--
-- FEATURES:
-- - JSONB content storage for Tiptap JSON format
-- - User isolation through RLS policies
-- - Optimized indexes for querying
-- - Variable context tracking
-- ============================================================================

-- Create Vorlagen table if it doesn't exist
CREATE TABLE IF NOT EXISTS public."Vorlagen" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titel text NULL,
  inhalt jsonb NULL, -- Tiptap JSON content as JSONB object
  user_id uuid NULL DEFAULT auth.uid(),
  erstellungsdatum timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
  kategorie text NULL,
  kontext_anforderungen text[] NOT NULL DEFAULT '{}', -- Array of variable keys used
  aktualisiert_am timestamp with time zone NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
  CONSTRAINT Vorlagen_pkey PRIMARY KEY (id),
  CONSTRAINT Vorlagen_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_vorlagen_user_id ON public."Vorlagen"(user_id);
CREATE INDEX IF NOT EXISTS idx_vorlagen_kategorie ON public."Vorlagen"(kategorie);
CREATE INDEX IF NOT EXISTS idx_vorlagen_erstellungsdatum ON public."Vorlagen"(erstellungsdatum DESC);

-- Add JSONB-specific indexes for content querying
CREATE INDEX IF NOT EXISTS idx_vorlagen_inhalt_gin ON public."Vorlagen" USING gin(inhalt);

-- Enable Row Level Security
ALTER TABLE public."Vorlagen" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation
DO $
BEGIN
  -- Policy for users to access only their own templates
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'Vorlagen' 
    AND policyname = 'Users can only access their own templates'
  ) THEN
    CREATE POLICY "Users can only access their own templates" ON public."Vorlagen"
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  -- Policy for users to insert their own templates
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'Vorlagen' 
    AND policyname = 'Users can insert their own templates'
  ) THEN
    CREATE POLICY "Users can insert their own templates" ON public."Vorlagen"
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $;

-- Grant necessary permissions
GRANT ALL ON public."Vorlagen" TO authenticated;
GRANT USAGE ON SEQUENCE public."Vorlagen_id_seq" TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public."Vorlagen" IS 'Document templates with Tiptap JSON content and variable tracking';
COMMENT ON COLUMN public."Vorlagen".inhalt IS 'Tiptap JSON content stored as JSONB for efficient querying';
COMMENT ON COLUMN public."Vorlagen".kontext_anforderungen IS 'Array of variable keys used in the template content';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this query to verify the table was created successfully:
-- SELECT table_name, column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'Vorlagen' 
-- ORDER BY ordinal_position;
-- ============================================================================