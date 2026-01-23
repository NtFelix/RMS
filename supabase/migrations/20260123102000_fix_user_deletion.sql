-- 1. Ensure the Mail_Accounts has CASCADE deletion
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'Mailadressen_user_id_fkey' 
        AND table_name = 'Mail_Accounts'
    ) THEN
        ALTER TABLE "public"."Mail_Accounts" DROP CONSTRAINT "Mailadressen_user_id_fkey";
        
        ALTER TABLE "public"."Mail_Accounts" 
        ADD CONSTRAINT "Mail_Accounts_user_id_fkey" 
        FOREIGN KEY ("user_id") 
        REFERENCES "auth"."users"("id") 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Create the Cleanup Trigger Function
-- This function will be called AFTER a user is deleted from auth.users
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