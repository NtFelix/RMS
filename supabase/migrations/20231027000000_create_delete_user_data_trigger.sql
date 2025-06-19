-- Function to delete user data from related tables
CREATE OR REPLACE FUNCTION handle_delete_user_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete from profiles table
  DELETE FROM public.profiles WHERE id = OLD.id; -- Corrected column name

  -- Delete from user's custom tables
  DELETE FROM public.Aufgaben WHERE user_id = OLD.id;
  DELETE FROM public.Finanzen WHERE user_id = OLD.id;
  DELETE FROM public.Haeuser WHERE user_id = OLD.id;
  DELETE FROM public.Mieter WHERE user_id = OLD.id;
  DELETE FROM public.Nebenkosten WHERE user_id = OLD.id;
  DELETE FROM public.Rechnungen WHERE user_id = OLD.id;
  DELETE FROM public.Wasserzaehler WHERE user_id = OLD.id;
  DELETE FROM public.Wohnungen WHERE user_id = OLD.id;

  -- Add any other tables that need cascading deletes here
  -- e.g., DELETE FROM public.another_table WHERE user_id = OLD.id;

  RETURN OLD;
END;
$$;

-- Trigger to execute the function before user deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users; -- Drop existing trigger first
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_delete_user_data();
