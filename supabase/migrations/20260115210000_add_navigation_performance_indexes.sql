-- Create indexes to optimize document navigation and folder discovery
-- These indexes are critical for the performance of the get_folder_contents RPC

-- Optimize file lookup and folder discovery in Dokumente_Metadaten
CREATE INDEX IF NOT EXISTS idx_metadata_user_path ON public."Dokumente_Metadaten" (user_id, dateipfad);

-- Optimize total storage size calculation
CREATE INDEX IF NOT EXISTS idx_metadata_user_id ON public."Dokumente_Metadaten" (user_id);

-- Optimize virtual folder mapping
CREATE INDEX IF NOT EXISTS idx_wohnungen_haus_id ON public."Wohnungen" (haus_id);
CREATE INDEX IF NOT EXISTS idx_mieter_wohnung_id ON public."Mieter" (wohnung_id);

-- Analysis of the get_folder_contents show that the recursive LIKE query
-- and the SUM(dateigroesse) scan are the most expensive parts.
-- The indexes above will allow Postgres to use Index Only Scans for these operations.
