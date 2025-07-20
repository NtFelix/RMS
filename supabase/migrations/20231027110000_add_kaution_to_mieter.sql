-- Add kaution column to Mieter table
ALTER TABLE public."Mieter"
ADD COLUMN kaution jsonb null;
