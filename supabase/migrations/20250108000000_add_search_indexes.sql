-- Migration: Add database indexes for search performance optimization
-- Created: 2025-01-08
-- Purpose: Optimize search queries across all entity types

-- Indexes for Mieter (Tenants) table
-- Primary search fields: name, email, telefonnummer
CREATE INDEX IF NOT EXISTS idx_mieter_name_search ON "Mieter" USING gin(to_tsvector('german', name));
CREATE INDEX IF NOT EXISTS idx_mieter_name_ilike ON "Mieter" (name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_mieter_email_ilike ON "Mieter" (email text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_mieter_telefonnummer_ilike ON "Mieter" (telefonnummer text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_mieter_user_id ON "Mieter" (user_id);
CREATE INDEX IF NOT EXISTS idx_mieter_wohnung_id ON "Mieter" (wohnung_id);

-- Indexes for Haeuser (Houses) table
-- Primary search fields: name, strasse, ort
CREATE INDEX IF NOT EXISTS idx_haeuser_name_search ON "Haeuser" USING gin(to_tsvector('german', name));
CREATE INDEX IF NOT EXISTS idx_haeuser_name_ilike ON "Haeuser" (name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_haeuser_strasse_ilike ON "Haeuser" (strasse text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_haeuser_ort_ilike ON "Haeuser" (ort text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_haeuser_user_id ON "Haeuser" (user_id);

-- Indexes for Wohnungen (Apartments) table
-- Primary search fields: name
CREATE INDEX IF NOT EXISTS idx_wohnungen_name_search ON "Wohnungen" USING gin(to_tsvector('german', name));
CREATE INDEX IF NOT EXISTS idx_wohnungen_name_ilike ON "Wohnungen" (name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_wohnungen_user_id ON "Wohnungen" (user_id);
CREATE INDEX IF NOT EXISTS idx_wohnungen_haus_id ON "Wohnungen" (haus_id);

-- Indexes for Finanzen (Finances) table
-- Primary search fields: name, notiz, betrag
CREATE INDEX IF NOT EXISTS idx_finanzen_name_search ON "Finanzen" USING gin(to_tsvector('german', name));
CREATE INDEX IF NOT EXISTS idx_finanzen_name_ilike ON "Finanzen" (name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_finanzen_notiz_ilike ON "Finanzen" (notiz text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_finanzen_betrag ON "Finanzen" (betrag);
CREATE INDEX IF NOT EXISTS idx_finanzen_user_id ON "Finanzen" (user_id);
CREATE INDEX IF NOT EXISTS idx_finanzen_datum ON "Finanzen" (datum DESC);
CREATE INDEX IF NOT EXISTS idx_finanzen_wohnung_id ON "Finanzen" (wohnung_id);

-- Indexes for Aufgaben (Tasks) table
-- Primary search fields: name, beschreibung
CREATE INDEX IF NOT EXISTS idx_aufgaben_name_search ON "Aufgaben" USING gin(to_tsvector('german', name));
CREATE INDEX IF NOT EXISTS idx_aufgaben_name_ilike ON "Aufgaben" (name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_aufgaben_beschreibung_ilike ON "Aufgaben" (beschreibung text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_aufgaben_user_id ON "Aufgaben" (user_id);
CREATE INDEX IF NOT EXISTS idx_aufgaben_erstellungsdatum ON "Aufgaben" (erstellungsdatum DESC);
CREATE INDEX IF NOT EXISTS idx_aufgaben_ist_erledigt ON "Aufgaben" (ist_erledigt);

-- Composite indexes for common search patterns
-- Mieter with apartment and house joins
CREATE INDEX IF NOT EXISTS idx_mieter_user_search ON "Mieter" (user_id, name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_mieter_user_email ON "Mieter" (user_id, email text_pattern_ops);

-- Haeuser with user filtering
CREATE INDEX IF NOT EXISTS idx_haeuser_user_search ON "Haeuser" (user_id, name text_pattern_ops);

-- Wohnungen with house relationship
CREATE INDEX IF NOT EXISTS idx_wohnungen_user_search ON "Wohnungen" (user_id, name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_wohnungen_haus_name ON "Wohnungen" (haus_id, name text_pattern_ops);

-- Finanzen with date and user filtering
CREATE INDEX IF NOT EXISTS idx_finanzen_user_search ON "Finanzen" (user_id, name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_finanzen_user_datum ON "Finanzen" (user_id, datum DESC);

-- Aufgaben with completion status and user filtering
CREATE INDEX IF NOT EXISTS idx_aufgaben_user_search ON "Aufgaben" (user_id, name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_aufgaben_user_status ON "Aufgaben" (user_id, ist_erledigt, erstellungsdatum DESC);

-- Comments explaining index choices:
-- 1. GIN indexes with to_tsvector for full-text search capabilities
-- 2. text_pattern_ops indexes for ILIKE queries with wildcards
-- 3. Regular B-tree indexes for exact matches and foreign keys
-- 4. Composite indexes for common query patterns with user_id filtering
-- 5. DESC indexes for date fields to optimize ORDER BY clauses