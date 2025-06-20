-- Add trial period fields to the profiles table
ALTER TABLE public.profiles
ADD COLUMN trial_starts_at TIMESTAMPTZ NULL,
ADD COLUMN trial_ends_at TIMESTAMPTZ NULL;

-- Optionally, you might want to add a comment to the table or columns
COMMENT ON COLUMN public.profiles.trial_starts_at IS 'Timestamp when the trial period starts for the user.';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'Timestamp when the trial period ends for the user.';
