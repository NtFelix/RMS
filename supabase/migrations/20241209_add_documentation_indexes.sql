-- Add performance indexes for documentation table
-- This migration adds indexes for kategorie and titel fields to improve query performance

-- Index for kategorie field (used for category filtering)
CREATE INDEX IF NOT EXISTS idx_dokumentation_kategorie 
ON public."Dokumentation" (kategorie);

-- Index for titel field (used for title searches and sorting)
CREATE INDEX IF NOT EXISTS idx_dokumentation_titel 
ON public."Dokumentation" (titel);

-- Composite index for kategorie and titel (used for filtered category searches)
CREATE INDEX IF NOT EXISTS idx_dokumentation_kategorie_titel 
ON public."Dokumentation" (kategorie, titel);

-- Full-text search index for seiteninhalt (used for content searches)
CREATE INDEX IF NOT EXISTS idx_dokumentation_seiteninhalt_fts 
ON public."Dokumentation" 
USING gin(to_tsvector('german', seiteninhalt));

-- Full-text search index for titel (used for title searches)
CREATE INDEX IF NOT EXISTS idx_dokumentation_titel_fts 
ON public."Dokumentation" 
USING gin(to_tsvector('german', titel));

-- Composite full-text search index for both titel and seiteninhalt
CREATE INDEX IF NOT EXISTS idx_dokumentation_full_text_search 
ON public."Dokumentation" 
USING gin(to_tsvector('german', coalesce(titel, '') || ' ' || coalesce(seiteninhalt, '')));