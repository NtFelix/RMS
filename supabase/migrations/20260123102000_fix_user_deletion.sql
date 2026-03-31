-- 1. Ensure the Mail_Accounts has CASCADE deletion
-- This handles either the old 'Mailadressen_user_id_fkey' or the newer 'Mail_Accounts_user_id_fkey'
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Mailadressen_user_id_fkey' AND table_name = 'Mail_Accounts'
    ) THEN
        ALTER TABLE "public"."Mail_Accounts" DROP CONSTRAINT "Mailadressen_user_id_fkey";
    END IF;

    -- Update existing constraint to ensure CASCADE if it's not already
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Mail_Accounts_user_id_fkey' AND table_name = 'Mail_Accounts'
    ) THEN
        ALTER TABLE "public"."Mail_Accounts" DROP CONSTRAINT "Mail_Accounts_user_id_fkey";
    END IF;

    -- Add the correct constraint with CASCADE
    ALTER TABLE "public"."Mail_Accounts" 
    ADD CONSTRAINT "Mail_Accounts_user_id_fkey" 
    FOREIGN KEY ("user_id") 
    REFERENCES "auth"."users"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;
END $$;

-- 2. Create the Cleanup Trigger Function
-- This function is called AFTER a user is deleted to clean up storage folders.
CREATE OR REPLACE FUNCTION public.handle_delete_user_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'vault'
AS $function$
DECLARE
  service_key text;
BEGIN
  -- Get the key from the vault (ensure no spaces)
  SELECT TRIM(decrypted_secret) INTO service_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'service_role_key' 
  LIMIT 1;

  IF service_key IS NOT NULL AND service_key <> '' THEN
    PERFORM
      net.http_post(
        url := 'https://ocubnwzybybcbrhsnqqs.supabase.co/functions/v1/delete-user-account',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', service_key,
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object('userId', OLD.id)
      );
    RAISE LOG 'Cleanup triggered for user %', OLD.id;
  ELSE
    RAISE WARNING 'Cleanup SKIPPED: service_role_key not found in vault';
  END IF;

  RETURN OLD;
END;
$function$;

-- 3. Create the trigger on auth.users
-- This ensures that the storage cleanup happens automatically on user deletion.
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_delete_user_data();