BEGIN;

-- 1. NULL-Handling (Sicherstellen, dass wir mit Arrays arbeiten können)
UPDATE "Finanzen"
SET tags = ARRAY[]::text[]
WHERE tags IS NULL;

-- 2. Tag-Normalisierung mit umfassender Keyword-Suche
WITH tagged_entries AS (
  SELECT 
    id,
    ARRAY_REMOVE(ARRAY[
      -- CATEGORY: MIETE
      CASE WHEN (name ILIKE ANY(ARRAY['%miet%', '%rent%', '%kaution%']) OR notiz ILIKE ANY(ARRAY['%miet%', '%rent%', '%kaution%'])) 
           THEN 'Miete' END,
      
      -- CATEGORY: BETRIEBSKOSTEN (Abrechnungsrelevant)
      CASE WHEN (name ILIKE ANY(ARRAY['%nebenkosten%', '%betriebskosten%']) OR notiz ILIKE ANY(ARRAY['%nebenkosten%', '%betriebskosten%'])) 
           THEN 'Nebenkosten' END,
      CASE WHEN (name ILIKE '%heiz%' OR notiz ILIKE '%heiz%') THEN 'Heizkosten' END,
      CASE WHEN (name ILIKE '%wasser%' OR notiz ILIKE '%wasser%') THEN 'Wasserkosten' END,
      CASE WHEN (name ILIKE '%strom%' OR notiz ILIKE '%strom%') THEN 'Stromkosten' END,
      CASE WHEN (name ILIKE ANY(ARRAY['%müll%', '%abfall%']) OR notiz ILIKE ANY(ARRAY['%müll%', '%abfall%'])) THEN 'Müllabfuhr' END,
      CASE WHEN (name ILIKE '%steuer%' OR notiz ILIKE '%steuer%') THEN 'Grundsteuer' END,
      CASE WHEN (name ILIKE ANY(ARRAY['%reinigung%', '%putz%']) OR notiz ILIKE ANY(ARRAY['%reinigung%', '%putz%'])) THEN 'Reinigung' END,
      CASE WHEN (name ILIKE '%hausmeister%' OR notiz ILIKE '%hausmeister%') THEN 'Hausmeister' END,

      -- CATEGORY: INSTANDHALTUNG
      CASE WHEN (name ILIKE ANY(ARRAY['%reparatur%', '%handwerker%', '%wartung%', '%renovierung%', '%instand%']) OR 
                 notiz ILIKE ANY(ARRAY['%reparatur%', '%handwerker%', '%wartung%', '%renovierung%', '%instand%'])) 
           THEN 'Reparatur' END,
      
      -- CATEGORY: VERSICHERUNG
      CASE WHEN (name ILIKE '%versicherung%' OR notiz ILIKE '%versicherung%') THEN 'Versicherung' END,
      
      -- CATEGORY: VERWALTUNG
      CASE WHEN (name ILIKE ANY(ARRAY['%verwaltung%', '%bank%', '%gebühr%', '%anwalt%', '%notar%']) OR 
                 notiz ILIKE ANY(ARRAY['%verwaltung%', '%bank%', '%gebühr%', '%anwalt%', '%notar%'])) 
           THEN 'Verwaltung' END,

      -- SPECIAL: NACHZAHLUNG / NACHTRAG
      CASE WHEN (name ILIKE ANY(ARRAY['%nachzahlung%', '%nachtrag%']) OR notiz ILIKE ANY(ARRAY['%nachzahlung%', '%nachtrag%'])) 
           THEN 'Nachzahlung' END,
      
      -- SPECIAL: VORAUSZAHLUNG
      CASE WHEN (name ILIKE ANY(ARRAY['%nebenkosten%', '%vorauszahlung%']) OR notiz ILIKE ANY(ARRAY['%nebenkosten%', '%vorauszahlung%']))
                AND NOT (
                    name ILIKE ANY(ARRAY['%nachzahlung%', '%nachtrag%']) OR 
                    notiz ILIKE ANY(ARRAY['%nachzahlung%', '%nachtrag%']) OR 
                    'Nachzahlung' = ANY(tags)
                )
           THEN 'Vorauszahlung' END
    ], NULL) AS calculated_tags
  FROM "Finanzen"
)
UPDATE "Finanzen" f
SET tags = (
  SELECT ARRAY_AGG(DISTINCT tag ORDER BY tag)
  FROM unnest(f.tags || t.calculated_tags) AS tag
)
FROM tagged_entries t
WHERE f.id = t.id 
  AND ARRAY_LENGTH(t.calculated_tags, 1) > 0
RETURNING f.id, f.name, f.notiz, f.tags;

COMMIT;

-- 3. Index für Performance
CREATE INDEX IF NOT EXISTS idx_finanzen_tags ON "Finanzen" USING GIN (tags);
