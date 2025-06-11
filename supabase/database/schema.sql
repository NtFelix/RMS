-- Supabase Function to handle new user entries and create a profile
-- This function should be owned by the correct role (usually postgres or supabase_admin)
-- Ensure the search_path is set correctly if your 'profiles' table is not in 'public'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET SEARCH_PATH = public -- Important for accessing auth.users data
AS $$
BEGIN
  -- Insert a new row into public.profiles
  -- NEW.id comes from auth.users.id
  -- NEW.raw_user_meta_data->>'email' gets the email from the user's metadata set during signup.
  -- Adjust the fields (e.g., full_name, avatar_url) according to your 'profiles' table structure
  -- and the metadata your authentication provider might send.
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'email');

  -- Example with more fields if your 'profiles' table has them and metadata provides them:
  -- INSERT INTO public.profiles (id, email, full_name, avatar_url)
  -- VALUES (
  --   NEW.id,
  --   NEW.raw_user_meta_data->>'email',
  --   NEW.raw_user_meta_data->>'full_name',  -- Assuming 'full_name' might be in metadata
  --   NEW.raw_user_meta_data->>'avatar_url'  -- Assuming 'avatar_url' might be in metadata
  -- );

  RETURN NEW;
END;
$$;

-- Supabase Trigger to call handle_new_user on new user signup
-- This trigger fires after a new user is inserted into auth.users

-- First, drop the trigger if it already exists to avoid errors during re-creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Then, create the new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant usage on the function to the supabase_auth_admin role (or relevant role)
-- This might be necessary if the trigger has issues with permissions,
-- though SECURITY DEFINER should generally handle it.
-- Check Supabase logs if new users don't get profiles created.
-- GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Reminder:
-- 1. Run this SQL in your Supabase SQL Editor.
-- 2. Ensure your 'public.profiles' table has an 'id' (UUID, primary key) and 'email' (TEXT) column.
-- 3. The 'id' column in 'profiles' should be a foreign key to 'auth.users.id' for data integrity if desired,
--    though this trigger works by copying the ID.
