-- Add tags column to Finanzen table
-- Migration: add_tags_to_finanzen
-- Created: 2026-01-11

ALTER TABLE "Finanzen" ADD COLUMN IF NOT EXISTS tags text[] DEFAULT NULL;

-- Create index for faster tag searches using GIN
CREATE INDEX IF NOT EXISTS idx_finanzen_tags ON "Finanzen" USING GIN (tags);

-- Add comment for documentation
COMMENT ON COLUMN "Finanzen".tags IS 'Optional array of tags for categorizing finance entries (e.g., Miete, Nebenkosten, Reparatur)';
