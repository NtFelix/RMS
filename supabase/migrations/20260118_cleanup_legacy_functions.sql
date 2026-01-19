-- Cleanup legacy water-specific functions
-- These have been replaced by generic versions (get_zaehler_data, etc.)

DROP FUNCTION IF EXISTS public.get_wasser_zaehler_data(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_wasser_zaehler_for_haus(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_wasser_ablesungen_for_meter(uuid, uuid);
