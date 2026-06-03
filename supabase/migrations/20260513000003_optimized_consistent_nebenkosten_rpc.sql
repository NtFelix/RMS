-- Optimized and Consistent RPC for Nebenkosten
-- 1. Renames user_id_field back to user_id for frontend consistency.
-- 2. Optimizes total_area calculation by using aggregate SUM instead of correlated subquery.
-- 3. Resolves ambiguity by strictly qualifying all table columns.

DROP FUNCTION IF EXISTS public.get_nebenkosten_with_metrics();

CREATE OR REPLACE FUNCTION public.get_nebenkosten_with_metrics()
RETURNS TABLE (
    id uuid,
    startdatum date,
    enddatum date,
    nebenkostenart text[],
    betrag numeric[],
    berechnungsart text[],
    zaehlerkosten jsonb,
    zaehlerverbrauch jsonb,
    haeuser_id uuid,
    user_id uuid,
    vorauszahlungs_art text,
    haus_name text,
    gesamt_flaeche numeric,
    anzahl_wohnungen integer,
    anzahl_mieter integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH house_metrics AS (
      SELECT 
          h.id as house_id,
          h.name as house_name,
          COALESCE(h.groesse, SUM(w.groesse)) as total_area,
          COUNT(w.id)::INTEGER as apartment_count
      FROM public."Haeuser" h
      LEFT JOIN public."Wohnungen" w ON h.id = w.haus_id AND w.user_id = v_uid
      WHERE h.user_id = v_uid
      GROUP BY h.id, h.name, h.groesse
  ),
  tenant_counts AS (
      SELECT 
          n.id as nebenkosten_id,
          COUNT(DISTINCT m.id)::INTEGER as tenant_count
      FROM public."Nebenkosten" n
      LEFT JOIN public."Wohnungen" w ON n.haeuser_id = w.haus_id AND w.user_id = v_uid
      LEFT JOIN public."Mieter" m ON w.id = m.wohnung_id 
          AND m.user_id = v_uid
          AND COALESCE(m.einzug, '1900-01-01'::DATE) <= n.enddatum
          AND COALESCE(m.auszug, '9999-12-31'::DATE) >= n.startdatum
      WHERE n.user_id = v_uid
      GROUP BY n.id
  )
  SELECT 
      n.id,
      n.startdatum,
      n.enddatum,
      n.nebenkostenart,
      n.betrag,
      n.berechnungsart,
      n.zaehlerkosten,
      n.zaehlerverbrauch,
      n.haeuser_id,
      n.user_id,
      n.vorauszahlungs_art,
      COALESCE(hm.house_name, 'Unbekanntes Haus') as haus_name,
      COALESCE(hm.total_area, 0) as gesamt_flaeche,
      COALESCE(hm.apartment_count, 0) as anzahl_wohnungen,
      COALESCE(tc.tenant_count, 0) as anzahl_mieter
  FROM public."Nebenkosten" n
  LEFT JOIN house_metrics hm ON n.haeuser_id = hm.house_id
  LEFT JOIN tenant_counts tc ON n.id = tc.nebenkosten_id
  WHERE n.user_id = v_uid
  ORDER BY n.startdatum DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_nebenkosten_with_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_nebenkosten_with_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nebenkosten_with_metrics() TO service_role;
