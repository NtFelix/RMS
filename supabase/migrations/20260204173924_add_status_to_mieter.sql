-- Add status column to Mieter table
ALTER TABLE "Mieter" 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'mieter';

-- Create index for status column
CREATE INDEX IF NOT EXISTS idx_mieter_status ON "Mieter" (status);
