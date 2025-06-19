-- Function to delete user data from related tables
CREATE OR REPLACE FUNCTION handle_delete_user_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete from profiles table
  DELETE FROM public.profiles WHERE user_id = OLD.id;
  -- Delete from houses table
  DELETE FROM public.houses WHERE user_id = OLD.id;
  -- Delete from apartments table
  DELETE FROM public.apartments WHERE user_id = OLD.id;
  -- Delete from tenants table
  DELETE FROM public.tenants WHERE user_id = OLD.id;
  -- Delete from financial_data table
  DELETE FROM public.financial_data WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$;

-- Trigger to execute the function before user deletion
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_delete_user_data();
