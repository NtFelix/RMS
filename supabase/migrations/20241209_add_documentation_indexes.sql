-- Add indexes for the Dokumentation table to improve query performance

-- Index for kategorie filtering
CREATE INDEX IF NOT EXISTS idx_dokumentation_kategorie 
ON public."Dokumentation" (kategorie);

-- Index for titel searching
CREATE INDEX IF NOT EXISTS idx_dokumentation_titel 
ON public."Dokumentation" (titel);

-- Full-text search index for titel and seiteninhalt
CREATE INDEX IF NOT EXISTS idx_dokumentation_fulltext 
ON public."Dokumentation" 
USING gin(to_tsvector('german', coalesce(titel, '') || ' ' || coalesce(seiteninhalt, '')));

-- Composite index for kategorie + titel for category-specific searches
CREATE INDEX IF NOT EXISTS idx_dokumentation_kategorie_titel 
ON public."Dokumentation" (kategorie, titel);

-- Index for meta JSONB queries (if needed for filtering)
CREATE INDEX IF NOT EXISTS idx_dokumentation_meta 
ON public."Dokumentation" 
USING gin(meta);