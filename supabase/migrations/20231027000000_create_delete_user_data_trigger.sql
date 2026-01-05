-- Function to delete user data from related tables
CREATE OR REPLACE FUNCTION handle_delete_user_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Added SECURITY DEFINER
AS $$
BEGIN
  -- Delete from profiles table (usually lowercase and unquoted)
  DELETE FROM public.profiles WHERE id = OLD.id;

  -- Delete from user's custom tables (quoted initial uppercase)
  DELETE FROM public."Aufgaben" WHERE user_id = OLD.id;
  DELETE FROM public."Finanzen" WHERE user_id = OLD.id;
  DELETE FROM public."Haeuser" WHERE user_id = OLD.id;
  DELETE FROM public."Mieter" WHERE user_id = OLD.id;
  DELETE FROM public."Nebenkosten" WHERE user_id = OLD.id;
  DELETE FROM public."Rechnungen" WHERE user_id = OLD.id;
  DELETE FROM public."Zaehler_Ablesungen" WHERE user_id = OLD.id;
  DELETE FROM public."Zaehler" WHERE user_id = OLD.id;
  DELETE FROM public."Wohnungen" WHERE user_id = OLD.id;

  RETURN OLD;
END;
$$;

-- Trigger to execute the function before user deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users; -- Drop existing trigger first
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_delete_user_data();
