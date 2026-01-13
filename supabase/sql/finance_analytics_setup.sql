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

-- Drop existing function if it exists (required when changing return type)
DROP FUNCTION IF EXISTS get_financial_summary_data(INTEGER);

-- Create a function to get complete financial summary data for a year
-- This function handles pagination internally and returns all transactions for accurate calculations
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

-- Create a function to get complete financial data with apartment info for charts
-- This function returns all necessary fields for chart generation
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

-- Create a function to get aggregated financial summary for a year
-- This provides pre-calculated totals to avoid client-side processing of large datasets
-- Optimized to use a single table scan for better performance
CREATE OR REPLACE FUNCTION get_financial_year_summary(
  target_year INTEGER
)
RETURNS TABLE (
  year INTEGER,
  total_income DECIMAL,
  total_expenses DECIMAL,
  total_cashflow DECIMAL,
  transaction_count INTEGER,
  monthly_data JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    target_year as year,
    COALESCE(SUM(monthly.total_income), 0) as total_income,
    COALESCE(SUM(monthly.total_expenses), 0) as total_expenses,
    COALESCE(SUM(monthly.total_income - monthly.total_expenses), 0) as total_cashflow,
    COALESCE(SUM(monthly.transaction_count), 0)::INTEGER as transaction_count,
    COALESCE(jsonb_object_agg(monthly.month_num::text, 
      jsonb_build_object(
        'income', monthly.total_income,
        'expenses', monthly.total_expenses,
        'cashflow', monthly.total_income - monthly.total_expenses
      )) FILTER (WHERE monthly.month_num IS NOT NULL), '{}'::jsonb) as monthly_data
  FROM (
    SELECT 
      EXTRACT(MONTH FROM f.datum)::INTEGER - 1 as month_num, -- 0-based months for JS compatibility
      SUM(CASE WHEN f.ist_einnahmen = true THEN f.betrag ELSE 0 END) as total_income,
      SUM(CASE WHEN f.ist_einnahmen = false THEN f.betrag ELSE 0 END) as total_expenses,
      COUNT(*) as transaction_count
    FROM "Finanzen" f
    WHERE EXTRACT(YEAR FROM f.datum) = target_year
      AND f.user_id = auth.uid()
      AND f.datum IS NOT NULL
    GROUP BY EXTRACT(MONTH FROM f.datum)
  ) monthly;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_financial_year_summary(INTEGER) TO authenticated;

-- Create a function to get filtered financial summary
-- This provides pre-calculated totals based on filters to avoid client-side processing
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_filtered_financial_summary(TEXT, TEXT, TEXT, TEXT, TEXT[]) TO authenticated;

-- Test the functions (optional - you can run these to verify they work)
-- SELECT * FROM get_financial_summary_data(2024);
-- SELECT * FROM get_financial_year_summary(2024);
-- SELECT * FROM get_financial_chart_data(2024);