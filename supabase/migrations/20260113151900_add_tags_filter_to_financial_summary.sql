-- Add tags parameter to get_filtered_financial_summary function
-- This fixes the bug where filtered summary cards don't update when filtering by tags

-- Drop existing function to recreate with new signature
DROP FUNCTION IF EXISTS get_filtered_financial_summary(TEXT, TEXT, TEXT, TEXT);

-- Create updated function with tags parameter
CREATE OR REPLACE FUNCTION get_filtered_financial_summary(
  search_query TEXT DEFAULT '',
  apartment_name TEXT DEFAULT '',
  target_year TEXT DEFAULT '',
  transaction_type TEXT DEFAULT '',
  filter_tags TEXT[] DEFAULT '{}'
)
RETURNS TABLE (
  total_income DECIMAL,
  total_expenses DECIMAL,
  total_balance DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN f.ist_einnahmen = true THEN f.betrag ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN f.ist_einnahmen = false THEN f.betrag ELSE 0 END), 0) as total_expenses,
    COALESCE(SUM(CASE WHEN f.ist_einnahmen = true THEN f.betrag ELSE -f.betrag END), 0) as total_balance
  FROM "Finanzen" f
  LEFT JOIN "Wohnungen" w ON f.wohnung_id = w.id
  WHERE f.user_id = auth.uid()
    AND f.datum IS NOT NULL
    -- Text search filter
    AND (search_query = '' OR 
         f.name ILIKE '%' || search_query || '%' OR 
         COALESCE(f.notiz, '') ILIKE '%' || search_query || '%')
    -- Apartment filter
    AND (apartment_name = '' OR apartment_name = 'Alle Wohnungen' OR w.name = apartment_name)
    -- Year filter
    AND (target_year = '' OR target_year = 'Alle Jahre' OR EXTRACT(YEAR FROM f.datum)::TEXT = target_year)
    -- Transaction type filter
    AND (transaction_type = '' OR transaction_type = 'Alle Transaktionen' OR 
         (transaction_type = 'Einnahme' AND f.ist_einnahmen = true) OR
         (transaction_type = 'Ausgabe' AND f.ist_einnahmen = false))
    -- Tags filter - check if entry has at least one of the selected tags
    AND (array_length(filter_tags, 1) IS NULL OR f.tags && filter_tags);
END;
$$;

-- Grant execute permission to authenticated users with new signature
GRANT EXECUTE ON FUNCTION get_filtered_financial_summary(TEXT, TEXT, TEXT, TEXT, TEXT[]) TO authenticated;
