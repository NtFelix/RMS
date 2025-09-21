-- Finance Analytics Database Setup
-- Run this SQL in your Supabase SQL Editor to set up the optimized finance analytics

-- Create a function to get monthly aggregated finance data
CREATE OR REPLACE FUNCTION get_monthly_finance_data(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  month INTEGER,
  total_income DECIMAL,
  total_expenses DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(MONTH FROM f.datum)::INTEGER as month,
    COALESCE(SUM(CASE WHEN f.ist_einnahmen = true THEN f.betrag ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN f.ist_einnahmen = false THEN f.betrag ELSE 0 END), 0) as total_expenses
  FROM "Finanzen" f
  WHERE f.datum >= start_date 
    AND f.datum <= end_date
    AND f.user_id = auth.uid()  -- Ensure RLS compliance
  GROUP BY EXTRACT(MONTH FROM f.datum)
  ORDER BY month;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_monthly_finance_data(DATE, DATE) TO authenticated;

-- Create a function to get available years with transaction data
CREATE OR REPLACE FUNCTION get_available_finance_years()
RETURNS TABLE (
  year INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    EXTRACT(YEAR FROM f.datum)::INTEGER as year
  FROM "Finanzen" f
  WHERE f.datum IS NOT NULL
    AND f.user_id = auth.uid()  -- Ensure RLS compliance
    AND EXTRACT(YEAR FROM f.datum) <= EXTRACT(YEAR FROM CURRENT_DATE) + 1
  ORDER BY year DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_available_finance_years() TO authenticated;

-- Create optimized indexes for finance queries if they don't exist
CREATE INDEX IF NOT EXISTS idx_finanzen_user_datum_einnahmen 
ON "Finanzen" (user_id, datum, ist_einnahmen);

-- Create an index for monthly aggregations
CREATE INDEX IF NOT EXISTS idx_finanzen_month_year 
ON "Finanzen" (user_id, EXTRACT(YEAR FROM datum), EXTRACT(MONTH FROM datum));

-- Create an index for apartment filtering
CREATE INDEX IF NOT EXISTS idx_finanzen_wohnung_datum 
ON "Finanzen" (user_id, wohnung_id, datum);

-- Enable the pg_trgm extension if not already enabled (for text search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create an index for text search on name and notiz
CREATE INDEX IF NOT EXISTS idx_finanzen_text_search 
ON "Finanzen" USING gin((name || ' ' || COALESCE(notiz, '')) gin_trgm_ops);

-- Test the function (optional - you can run this to verify it works)
-- SELECT * FROM get_monthly_finance_data('2024-01-01', '2024-12-31');