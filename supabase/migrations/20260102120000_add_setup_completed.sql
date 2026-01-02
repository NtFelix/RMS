-- Add setup_completed column to profiles table
-- This tracks whether the user has completed the initial setup wizard (name + address)
-- Similar to onboarding_completed which tracks the in-app guided tour completion

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.setup_completed IS 'Tracks whether the user has completed the initial setup wizard for name and address during onboarding.';
