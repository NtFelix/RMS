-- Fix insert_finance_entries_batch to include tags field
-- The tags column is TEXT[] (array of text) in the Finanzen table
-- This migration adds support for saving tags when creating finance entries via RPC

CREATE OR REPLACE FUNCTION public.insert_finance_entries_batch(p_entries jsonb, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  entry JSONB;
  inserted_count INTEGER := 0;
  skipped_count INTEGER := 0;
  entry_tags TEXT[];
BEGIN
  IF p_entries IS NULL OR jsonb_typeof(p_entries) <> 'array' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'entries payload must be a JSON array',
      'inserted', 0,
      'skipped', 0
    );
  END IF;

  FOR entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    BEGIN
      IF NOT (entry ? 'wohnung_id' AND entry ? 'name' AND entry ? 'betrag' AND entry ? 'datum') THEN
        skipped_count := skipped_count + 1;
        CONTINUE;
      END IF;

      -- Extract tags array from JSONB if present
      IF entry ? 'tags' AND jsonb_typeof(entry->'tags') = 'array' THEN
        SELECT ARRAY_AGG(elem::TEXT) INTO entry_tags
        FROM jsonb_array_elements_text(entry->'tags') AS elem;
      ELSE
        entry_tags := NULL;
      END IF;

      INSERT INTO "Finanzen" (
        wohnung_id,
        name,
        betrag,
        datum,
        ist_einnahmen,
        notiz,
        tags,
        user_id
      ) VALUES (
        (entry->>'wohnung_id')::UUID,
        entry->>'name',
        (entry->>'betrag')::NUMERIC,
        (entry->>'datum')::DATE,
        COALESCE((entry->>'ist_einnahmen')::BOOLEAN, TRUE),
        entry->>'notiz',
        entry_tags,
        p_user_id
      );

      inserted_count := inserted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Skipping entry due to error: %. Entry: %', SQLERRM, entry;
      skipped_count := skipped_count + 1;
      CONTINUE;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'inserted', inserted_count,
    'skipped', skipped_count
  );
END;
$function$;
