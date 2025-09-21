-- Migration script to update finance functions
-- Run this if you already have the old functions deployed

-- Drop existing functions to allow signature changes
DROP FUNCTION IF EXISTS get_financial_summary_data(INTEGER);

-- Recreate the function with updated signature
CREATE OR REPLACE FUNCTION get_financial_summary_data(
  target_year INTEGER
)
RETURNS TABLE (
  id UUID,
  betrag DECIMAL,
  ist_einnahmen BOOLEAN,
  datum DATE,
  name TEXT,
  wohnung_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.betrag,
    f.ist_einnahmen,
    f.datum,
    f.name,
    f.wohnung_id
  FROM "Finanzen" f
  WHERE EXTRACT(YEAR FROM f.datum) = target_year
    AND f.user_id = auth.uid()  -- Ensure RLS compliance
    AND f.datum IS NOT NULL
  ORDER BY f.datum;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_financial_summary_data(INTEGER) TO authenticated;

-- Create the new chart data function
CREATE OR REPLACE FUNCTION get_financial_chart_data(
  target_year INTEGER
)
RETURNS TABLE (
  id UUID,
  betrag DECIMAL,
  ist_einnahmen BOOLEAN,
  datum DATE,
  name TEXT,
  wohnung_id UUID,
  apartment_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.betrag,
    f.ist_einnahmen,
    f.datum,
    f.name,
    f.wohnung_id,
    w.name as apartment_name
  FROM "Finanzen" f
  LEFT JOIN "Wohnungen" w ON f.wohnung_id = w.id
  WHERE EXTRACT(YEAR FROM f.datum) = target_year
    AND f.user_id = auth.uid()  -- Ensure RLS compliance
    AND f.datum IS NOT NULL
  ORDER BY f.datum;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_financial_chart_data(INTEGER) TO authenticated;