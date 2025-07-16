-- Remove trial period fields from the profiles table
ALTER TABLE public.profiles
DROP COLUMN trial_starts_at,
DROP COLUMN trial_ends_at;
