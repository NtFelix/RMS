-- Database optimizations for Template System
-- Performance improvements for Vorlagen table and related queries

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vorlagen_user_id ON public."Vorlagen"(user_id);
CREATE INDEX IF NOT EXISTS idx_vorlagen_titel ON public."Vorlagen"(titel);
CREATE INDEX IF NOT EXISTS idx_vorlagen_erstellungsdatum ON public."Vorlagen"(erstellungsdatum DESC);
CREATE INDEX IF NOT EXISTS idx_vorlagen_kategorie ON public."Vorlagen"(kategorie);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_vorlagen_user_kategorie ON public."Vorlagen"(user_id, kategorie);
CREATE INDEX IF NOT EXISTS idx_vorlagen_user_datum ON public."Vorlagen"(user_id, erstellungsdatum DESC);

-- Add indexes for entity tables used in template context
CREATE INDEX IF NOT EXISTS idx_mieter_user_id ON public."Mieter"(user_id);
CREATE INDEX IF NOT EXISTS idx_wohnungen_user_id ON public."Wohnungen"(user_id);
CREATE INDEX IF NOT EXISTS idx_haeuser_user_id ON public."Haeuser"(user_id);

-- Composite indexes for joins
CREATE INDEX IF NOT EXISTS idx_wohnungen_haus_user ON public."Wohnungen"(haus_id, user_id);
CREATE INDEX IF NOT EXISTS idx_mieter_wohnung_user ON public."Mieter"(wohnung_id, user_id);

-- Optimize text search for template content (if full-text search is needed)
-- CREATE INDEX IF NOT EXISTS idx_vorlagen_content_search ON public."Vorlagen" 
-- USING gin(to_tsvector('german', inhalt));

-- Add partial indexes for active templates (if we add an active/inactive flag)
-- CREATE INDEX IF NOT EXISTS idx_vorlagen_active ON public."Vorlagen"(user_id) 
-- WHERE active = true;

-- Statistics update for better query planning
ANALYZE public."Vorlagen";
ANALYZE public."Mieter";
ANALYZE public."Wohnungen";
ANALYZE public."Haeuser";