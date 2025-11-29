-- Supabase Function to handle new user entries and create a profile with only the ID.
-- The email will be sourced from auth.users when needed.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET SEARCH_PATH = public
AS $$
BEGIN
  -- Log the incoming data
  RAISE LOG '[handle_new_user] Triggered. NEW.id: %', NEW.id;

  -- Insert a new row into public.profiles, only with the user's ID.
  -- The 'email' column should be removed from 'profiles' table.
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);

  RAISE LOG '[handle_new_user] Successfully inserted profile ID for user: %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log any error that occurs during the INSERT
    RAISE LOG '[handle_new_user] Error inserting profile ID for user %: SQLSTATE: %, SQLERRM: %', NEW.id, SQLSTATE, SQLERRM;
    -- Re-throw the exception to abort the transaction and ensure data consistency.
    RAISE;
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


-- Reminder:
-- 1. Run this SQL in your Supabase SQL Editor.
-- 2. Ensure your 'public.profiles' table has an 'id' (UUID, primary key) column.
--    Other columns will be for Stripe data (e.g., stripe_customer_id, etc.).