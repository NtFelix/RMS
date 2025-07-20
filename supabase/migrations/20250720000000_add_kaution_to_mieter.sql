-- Add kaution JSONB column to Mieter table
ALTER TABLE public."Mieter" 
ADD COLUMN kaution jsonb null;

-- Add comment to describe the column
COMMENT ON COLUMN public."Mieter".kaution IS 'Security deposit information including amount, payment date, and status';