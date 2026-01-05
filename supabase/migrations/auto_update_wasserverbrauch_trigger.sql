-- Function to automatically update wasserverbrauch in Nebenkosten
-- when water readings are added, updated, or deleted
CREATE OR REPLACE FUNCTION update_nebenkosten_wasserverbrauch()
RETURNS TRIGGER AS $$
DECLARE
  affected_nebenkosten RECORD;
BEGIN
  -- Find all Nebenkosten entries that could be affected by this reading change
  FOR affected_nebenkosten IN
    SELECT DISTINCT n.id, n.haeuser_id, n.startdatum, n.enddatum, n.user_id
    FROM "Nebenkosten" n
    JOIN "Wohnungen" w ON w.haus_id = n.haeuser_id
    JOIN "Zaehler" wz ON wz.wohnung_id = w.id
    WHERE wz.id = COALESCE(NEW.zaehler_id, OLD.zaehler_id)
      AND n.user_id = COALESCE(NEW.user_id, OLD.user_id)
      -- Check if the reading date falls within the Nebenkosten period
      AND COALESCE(NEW.ablese_datum, OLD.ablese_datum) >= n.startdatum
      AND COALESCE(NEW.ablese_datum, OLD.ablese_datum) <= n.enddatum
  LOOP
    -- Calculate total water consumption for this Nebenkosten entry
    UPDATE "Nebenkosten"
    SET wasserverbrauch = (
      SELECT COALESCE(SUM(wa.verbrauch), 0)
      FROM "Zaehler_Ablesungen" wa
      JOIN "Zaehler" wz ON wa.zaehler_id = wz.id
      JOIN "Wohnungen" w ON wz.wohnung_id = w.id
      WHERE w.haus_id = affected_nebenkosten.haeuser_id
        AND wa.ablese_datum >= affected_nebenkosten.startdatum
        AND wa.ablese_datum <= affected_nebenkosten.enddatum
        AND wa.user_id = affected_nebenkosten.user_id
    )
    WHERE id = affected_nebenkosten.id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_wasserverbrauch_on_insert ON "Zaehler_Ablesungen";
DROP TRIGGER IF EXISTS trigger_update_wasserverbrauch_on_update ON "Zaehler_Ablesungen";
DROP TRIGGER IF EXISTS trigger_update_wasserverbrauch_on_delete ON "Zaehler_Ablesungen";

-- Create triggers for INSERT, UPDATE, and DELETE on Zaehler_Ablesungen
CREATE TRIGGER trigger_update_wasserverbrauch_on_insert
  AFTER INSERT ON "Zaehler_Ablesungen"
  FOR EACH ROW
  EXECUTE FUNCTION update_nebenkosten_wasserverbrauch();

CREATE TRIGGER trigger_update_wasserverbrauch_on_update
  AFTER UPDATE ON "Zaehler_Ablesungen"
  FOR EACH ROW
  EXECUTE FUNCTION update_nebenkosten_wasserverbrauch();

CREATE TRIGGER trigger_update_wasserverbrauch_on_delete
  AFTER DELETE ON "Zaehler_Ablesungen"
  FOR EACH ROW
  EXECUTE FUNCTION update_nebenkosten_wasserverbrauch();

-- Also update when a new Nebenkosten entry is created
CREATE OR REPLACE FUNCTION initialize_nebenkosten_wasserverbrauch()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate initial water consumption for new Nebenkosten entry
  NEW.wasserverbrauch := (
    SELECT COALESCE(SUM(wa.verbrauch), 0)
    FROM "Zaehler_Ablesungen" wa
    JOIN "Zaehler" wz ON wa.zaehler_id = wz.id
    JOIN "Wohnungen" w ON wz.wohnung_id = w.id
    WHERE w.haus_id = NEW.haeuser_id
      AND wa.ablese_datum >= NEW.startdatum
      AND wa.ablese_datum <= NEW.enddatum
      AND wa.user_id = NEW.user_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_initialize_wasserverbrauch ON "Nebenkosten";

-- Create trigger for new Nebenkosten entries
CREATE TRIGGER trigger_initialize_wasserverbrauch
  BEFORE INSERT ON "Nebenkosten"
  FOR EACH ROW
  EXECUTE FUNCTION initialize_nebenkosten_wasserverbrauch();

-- One-time update: Calculate wasserverbrauch for all existing Nebenkosten entries
UPDATE "Nebenkosten" n
SET wasserverbrauch = (
  SELECT COALESCE(SUM(wa.verbrauch), 0)
  FROM "Zaehler_Ablesungen" wa
  JOIN "Zaehler" wz ON wa.zaehler_id = wz.id
  JOIN "Wohnungen" w ON wz.wohnung_id = w.id
  WHERE w.haus_id = n.haeuser_id
    AND wa.ablese_datum >= n.startdatum
    AND wa.ablese_datum <= n.enddatum
    AND wa.user_id = n.user_id
)
WHERE n.wasserverbrauch IS NULL OR n.wasserverbrauch = 0;
