-- Add unique constraint to prevent duplicate email imports
-- This ensures that the same email from the same provider cannot be imported twice
-- Uses composite key (quelle, quelle_id) to allow same ID from different providers

-- Drop old constraint if it exists (in case migration was run before)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'Mail_Metadaten_quelle_id_unique'
    ) THEN
        ALTER TABLE public."Mail_Metadaten"
        DROP CONSTRAINT "Mail_Metadaten_quelle_id_unique";
        RAISE NOTICE 'Dropped old single-column unique constraint';
    END IF;
END $$;

-- Add composite unique constraint on (quelle, quelle_id)
-- This prevents duplicates within each provider (outlook, gmail, imap)
-- but allows the same quelle_id across different providers
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'Mail_Metadaten_quelle_quelle_id_unique'
    ) THEN
        ALTER TABLE public."Mail_Metadaten"
        ADD CONSTRAINT "Mail_Metadaten_quelle_quelle_id_unique" 
        UNIQUE (quelle, quelle_id);
        
        RAISE NOTICE 'Added composite unique constraint on (quelle, quelle_id)';
    ELSE
        RAISE NOTICE 'Composite unique constraint already exists';
    END IF;
END $$;

-- Add comment
COMMENT ON CONSTRAINT "Mail_Metadaten_quelle_quelle_id_unique" ON public."Mail_Metadaten" 
IS 'Ensures each email from a specific provider (identified by quelle + quelle_id) is only imported once. Allows same quelle_id across different providers (outlook, gmail, imap).';
