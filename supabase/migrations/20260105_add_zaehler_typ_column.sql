-- Migration: Add zaehler_typ and einheit columns to Zaehler table
-- This enables support for different meter types (water, gas, electricity, heat)

-- Add zaehler_typ column with 'wasser' as default for existing meters
ALTER TABLE "Zaehler"
ADD COLUMN IF NOT EXISTS zaehler_typ TEXT NOT NULL DEFAULT 'wasser';

-- Add einheit column with 'm³' as default for water meters
ALTER TABLE "Zaehler"
ADD COLUMN IF NOT EXISTS einheit TEXT NOT NULL DEFAULT 'm³';

-- Add comment explaining the meter types
COMMENT ON COLUMN "Zaehler".zaehler_typ IS 'Type of meter: wasser (default), kaltwasser, warmwasser, waermemenge, heizkostenverteiler, strom, gas';
COMMENT ON COLUMN "Zaehler".einheit IS 'Unit of measurement: m³, kWh, MWh, Einheiten';
