-- Create a PostgreSQL function for advanced full-text search with ranking

CREATE OR REPLACE FUNCTION search_documentation(search_query text)
RETURNS TABLE (
  id uuid,
  titel text,
  kategorie text,
  seiteninhalt text,
  meta jsonb,
  relevance_score real
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.titel,
    d.kategorie,
    d.seiteninhalt,
    d.meta,
    ts_rank(
      to_tsvector('german', coalesce(d.titel, '') || ' ' || coalesce(d.seiteninhalt, '')),
      plainto_tsquery('german', search_query)
    ) as relevance_score
  FROM public."Dokumentation" d
  WHERE to_tsvector('german', coalesce(d.titel, '') || ' ' || coalesce(d.seiteninhalt, ''))
        @@ plainto_tsquery('german', search_query)
  ORDER BY relevance_score DESC, d.titel ASC;
END;
$$;