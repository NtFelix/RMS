-- Phase 3: Optimization & Security Hardening
-- 1. Hardening vulnerable functions
-- 2. Migrating reporting functions to SECURITY INVOKER
-- 3. Adding performance indexes for common JOINs and RLS checks

-- Fix get_actual_prepayments (Add ownership check)
CREATE OR REPLACE FUNCTION public.get_actual_prepayments(
    p_wohnung_ids uuid[], 
    p_start_date date, 
    p_end_date date, 
    p_tags text[] DEFAULT ARRAY['Nebenkosten'::text]
)
RETURNS SETOF public."Finanzen"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public."Finanzen"
    WHERE user_id = auth.uid() -- Critical security fix
    AND wohnung_id = ANY(p_wohnung_ids)
    AND datum >= p_start_date
    AND datum <= p_end_date
    AND ist_einnahmen = true
    AND (
        (tags && p_tags) -- Matches tags provided (default: Nebenkosten)
        OR
        (tags && ARRAY['Vorauszahlung']::text[]) -- Always allow 'Vorauszahlung' tag
        OR 
        (name ILIKE '%nebenkosten%' OR name ILIKE '%vorauszahlung%' OR notiz ILIKE '%nebenkosten%' OR notiz ILIKE '%vorauszahlung%') -- Name/Notiz fallback
    )
    -- Strict avoidance of back-payments (Nachzahlungen/Nachträge)
    AND NOT (name ILIKE '%nachzahlung%' OR name ILIKE '%nachtrag%' OR notiz ILIKE '%nachzahlung%' OR notiz ILIKE '%nachtrag%')
    AND NOT ('Nachzahlung' = ANY(tags));
END;
$$;

-- Migrate reporting functions to SECURITY INVOKER
-- These functions already have RLS-compliant WHERE clauses, 
-- but converting to INVOKER ensures they respect RLS natively.

DROP FUNCTION IF EXISTS public.get_available_finance_years();
CREATE OR REPLACE FUNCTION public.get_available_finance_years()
 RETURNS TABLE(year integer)
 LANGUAGE plpgsql
 SECURITY INVOKER -- Changed from DEFINER
 SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    EXTRACT(YEAR FROM f.datum)::INTEGER as year
  FROM public."Finanzen" f
  WHERE f.datum IS NOT NULL
    -- RLS will handle the filtering
  ORDER BY year DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.get_filtered_financial_summary(text, text, text, text);
CREATE OR REPLACE FUNCTION public.get_filtered_financial_summary(
    search_query text DEFAULT ''::text, 
    apartment_name text DEFAULT ''::text, 
    target_year text DEFAULT ''::text, 
    transaction_type text DEFAULT ''::text
)
 RETURNS TABLE(total_income numeric, total_expenses numeric, total_balance numeric)
 LANGUAGE plpgsql
 SECURITY INVOKER -- Changed from DEFINER
 SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN f.ist_einnahmen = true THEN f.betrag ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN f.ist_einnahmen = false THEN f.betrag ELSE 0 END), 0) as total_expenses,
    COALESCE(SUM(CASE WHEN f.ist_einnahmen = true THEN f.betrag ELSE -f.betrag END), 0) as total_balance
  FROM public."Finanzen" f
  LEFT JOIN public."Wohnungen" w ON f.wohnung_id = w.id
  WHERE f.datum IS NOT NULL
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
         (transaction_type = 'Ausgabe' AND f.ist_einnahmen = false));
END;
$$;

DROP FUNCTION IF EXISTS public.get_filtered_financial_summary(text, text, text, text, text[]);
CREATE OR REPLACE FUNCTION public.get_filtered_financial_summary(
    search_query text DEFAULT ''::text, 
    apartment_name text DEFAULT ''::text, 
    target_year text DEFAULT ''::text, 
    transaction_type text DEFAULT ''::text, 
    filter_tags text[] DEFAULT '{}'::text[]
)
 RETURNS TABLE(total_income numeric, total_expenses numeric, total_balance numeric)
 LANGUAGE plpgsql
 SECURITY INVOKER -- Changed from DEFINER
 SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN f.ist_einnahmen = true THEN f.betrag ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN f.ist_einnahmen = false THEN f.betrag ELSE 0 END), 0) as total_expenses,
    COALESCE(SUM(CASE WHEN f.ist_einnahmen = true THEN f.betrag ELSE -f.betrag END), 0) as total_balance
  FROM public."Finanzen" f
  LEFT JOIN public."Wohnungen" w ON f.wohnung_id = w.id
  WHERE f.datum IS NOT NULL
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
    -- Tags filter
    AND (array_length(filter_tags, 1) IS NULL OR f.tags && filter_tags);
END;
$$;

DROP FUNCTION IF EXISTS public.get_financial_chart_data(integer);
CREATE OR REPLACE FUNCTION public.get_financial_chart_data(target_year integer)
 RETURNS TABLE(id uuid, betrag numeric, ist_einnahmen boolean, datum date, name text, wohnung_id uuid, apartment_name text)
 LANGUAGE plpgsql
 SECURITY INVOKER -- Changed from DEFINER
 SET search_path = ''
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
  FROM public."Finanzen" f
  LEFT JOIN public."Wohnungen" w ON f.wohnung_id = w.id
  WHERE EXTRACT(YEAR FROM f.datum) = target_year
    AND f.datum IS NOT NULL
  ORDER BY f.datum;
END;
$$;

DROP FUNCTION IF EXISTS public.get_financial_summary_data(integer);
CREATE OR REPLACE FUNCTION public.get_financial_summary_data(target_year integer)
 RETURNS TABLE(id uuid, betrag numeric, ist_einnahmen boolean, datum date, name text, wohnung_id uuid)
 LANGUAGE plpgsql
 SECURITY INVOKER -- Changed from DEFINER
 SET search_path = ''
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
  FROM public."Finanzen" f
  WHERE EXTRACT(YEAR FROM f.datum) = target_year
    AND f.datum IS NOT NULL
  ORDER BY f.datum;
END;
$$;

DROP FUNCTION IF EXISTS public.get_financial_year_summary(integer);
CREATE OR REPLACE FUNCTION public.get_financial_year_summary(target_year integer)
 RETURNS TABLE(year integer, total_income numeric, total_expenses numeric, total_cashflow numeric, transaction_count integer, monthly_data jsonb)
 LANGUAGE plpgsql
 SECURITY INVOKER -- Changed from DEFINER
 SET search_path = ''
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
      EXTRACT(MONTH FROM f.datum)::INTEGER - 1 as month_num,
      SUM(CASE WHEN f.ist_einnahmen = true THEN f.betrag ELSE 0 END) as total_income,
      SUM(CASE WHEN f.ist_einnahmen = false THEN f.betrag ELSE 0 END) as total_expenses,
      COUNT(*) as transaction_count
    FROM public."Finanzen" f
    WHERE EXTRACT(YEAR FROM f.datum) = target_year
      AND f.datum IS NOT NULL
    GROUP BY EXTRACT(MONTH FROM f.datum)
  ) monthly;
END;
$$;

DROP FUNCTION IF EXISTS public.get_mail_summary();
CREATE OR REPLACE FUNCTION public.get_mail_summary()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY INVOKER -- Changed from DEFINER
 SET search_path = ''
AS $$
DECLARE
  result JSON;
BEGIN
  -- Get all counts in a single query using conditional aggregation
  SELECT json_build_object(
    'total', COUNT(*),
    'unread', COUNT(*) FILTER (WHERE ist_gelesen = false),
    'inbox', COUNT(*) FILTER (WHERE ordner = 'inbox'),
    'sent', COUNT(*) FILTER (WHERE ordner = 'sent'),
    'drafts', COUNT(*) FILTER (WHERE ordner = 'drafts'),
    'archive', COUNT(*) FILTER (WHERE ordner = 'archive'),
    'trash', COUNT(*) FILTER (WHERE ordner = 'trash'),
    'spam', COUNT(*) FILTER (WHERE ordner = 'spam'),
    'favorites', COUNT(*) FILTER (WHERE ist_favorit = true)
  ) INTO result
  FROM public."Mail_Metadaten";

  RETURN result;
END;
$$;

DROP FUNCTION IF EXISTS public.get_monthly_finance_data(date, date);
CREATE OR REPLACE FUNCTION public.get_monthly_finance_data(start_date date, end_date date)
 RETURNS TABLE(month integer, total_income numeric, total_expenses numeric)
 LANGUAGE plpgsql
 SECURITY INVOKER -- Changed from DEFINER
 SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(MONTH FROM f.datum)::INTEGER as month,
    COALESCE(SUM(CASE WHEN f.ist_einnahmen = true THEN f.betrag ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN f.ist_einnahmen = false THEN f.betrag ELSE 0 END), 0) as total_expenses
  FROM public."Finanzen" f
  WHERE f.datum >= start_date 
    AND f.datum <= end_date
  GROUP BY EXTRACT(MONTH FROM f.datum)
  ORDER BY month;
END;
$$;

-- 3. Performance Optimization (Indexing)
-- Add indexes for common JOINs and RLS filtering if not present

CREATE INDEX IF NOT EXISTS idx_haeuser_user_id ON public."Haeuser" (user_id);
CREATE INDEX IF NOT EXISTS idx_wohnungen_user_id ON public."Wohnungen" (user_id);
CREATE INDEX IF NOT EXISTS idx_nebenkosten_user_id ON public."Nebenkosten" (user_id);
CREATE INDEX IF NOT EXISTS idx_nebenkosten_haeuser_id ON public."Nebenkosten" (haeuser_id);
CREATE INDEX IF NOT EXISTS idx_rechnungen_user_id ON public."Rechnungen" (user_id);
CREATE INDEX IF NOT EXISTS idx_rechnungen_nebenkosten_id ON public."Rechnungen" (nebenkosten_id);
CREATE INDEX IF NOT EXISTS idx_rechnungen_mieter_id ON public."Rechnungen" (mieter_id);
CREATE INDEX IF NOT EXISTS idx_zaehler_user_id ON public."Zaehler" (user_id);
CREATE INDEX IF NOT EXISTS idx_zaehler_wohnung_id ON public."Zaehler" (wohnung_id);
CREATE INDEX IF NOT EXISTS idx_zaehler_ablesungen_user_id ON public."Zaehler_Ablesungen" (user_id);
CREATE INDEX IF NOT EXISTS idx_zaehler_ablesungen_zaehler_id ON public."Zaehler_Ablesungen" (zaehler_id);
CREATE INDEX IF NOT EXISTS idx_zaehler_ablesungen_datum ON public."Zaehler_Ablesungen" (ablese_datum);

-- Optimization for financial searches
CREATE INDEX IF NOT EXISTS idx_finanzen_name_trgm ON public."Finanzen" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_finanzen_notiz_trgm ON public."Finanzen" USING gin (notiz gin_trgm_ops);

-- Grant permissions (just in case they were lost during DROP)
GRANT EXECUTE ON FUNCTION public.get_available_finance_years() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_filtered_financial_summary(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_filtered_financial_summary(text, text, text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_chart_data(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_summary_data(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_year_summary(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mail_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_finance_data(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_actual_prepayments(uuid[], date, date, text[]) TO authenticated;

-- 4. Background Worker Security
-- Restrict get_next_pending_import to service_role only
REVOKE ALL ON FUNCTION public.get_next_pending_import() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_next_pending_import() FROM anon;
REVOKE ALL ON FUNCTION public.get_next_pending_import() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_pending_import() TO service_role;

