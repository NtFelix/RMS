-- Security Hardening Migration
-- Addresses audit vulnerabilities including Unauthorized DELETE, GraphQL Introspection, and Row Count Enumeration.

-- 1. HARDEN RLS POLICIES (Fixes Critical Unauthorized DELETE & Spoofed INSERTs)
-- We ensure every modification operation (INSERT, UPDATE, DELETE) is restricted to the owner by checking auth.uid() against user_id.

DO $$
DECLARE
    t text;
    -- Tables that use 'user_id' for ownership
    tables_with_user_id text[] := ARRAY[
        'Aufgaben', 'Finanzen', 'Haeuser', 'Mieter', 'Nebenkosten', 
        'Rechnungen', 'Wasserzaehler', 'Zaehler', 'Zaehler_Ablesungen',
        'Dokumente_Metadaten', 'Mail_Accounts', 'Mail_Import_Jobs', 
        'Mail_Metadaten', 'Vorlagen', 'Wohnungen'
    ];
BEGIN
    FOREACH t IN ARRAY tables_with_user_id LOOP
        -- Secure SELECT: Ensure users can only read their own data
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to select their own data" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Secure SELECT" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Secure SELECT" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)', t);
        
        -- Secure DELETE: Ensure users can only delete their own data
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to delete their own data" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Secure DELETE" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Secure DELETE" ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id)', t);
        
        -- Secure INSERT: Prevent spoofing user_id on creation
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to insert their own data" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Secure INSERT" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Secure INSERT" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)', t);
        
        -- Secure UPDATE: Ensure users can only update their own data
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to update their own data" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Secure UPDATE" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Secure UPDATE" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
    END LOOP;
END $$;

-- profiles table uses 'id' instead of 'user_id'
DROP POLICY IF EXISTS "Can view own profile data" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Can update own profile data" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Mail_Sync_Jobs uses 'account_id' referencing Mail_Accounts (which has 'user_id')
-- We verify ownership by joining through Mail_Accounts
DROP POLICY IF EXISTS "Secure SELECT" ON public."Mail_Sync_Jobs";
CREATE POLICY "Secure SELECT" ON public."Mail_Sync_Jobs" FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public."Mail_Accounts" WHERE "Mail_Accounts".id = account_id AND "Mail_Accounts".user_id = auth.uid()));

DROP POLICY IF EXISTS "Secure INSERT" ON public."Mail_Sync_Jobs";
CREATE POLICY "Secure INSERT" ON public."Mail_Sync_Jobs" FOR INSERT TO authenticated 
    WITH CHECK (EXISTS (SELECT 1 FROM public."Mail_Accounts" WHERE "Mail_Accounts".id = account_id AND "Mail_Accounts".user_id = auth.uid()));

DROP POLICY IF EXISTS "Secure UPDATE" ON public."Mail_Sync_Jobs";
CREATE POLICY "Secure UPDATE" ON public."Mail_Sync_Jobs" FOR UPDATE TO authenticated 
    USING (EXISTS (SELECT 1 FROM public."Mail_Accounts" WHERE "Mail_Accounts".id = account_id AND "Mail_Accounts".user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public."Mail_Accounts" WHERE "Mail_Accounts".id = account_id AND "Mail_Accounts".user_id = auth.uid()));

DROP POLICY IF EXISTS "Secure DELETE" ON public."Mail_Sync_Jobs";
CREATE POLICY "Secure DELETE" ON public."Mail_Sync_Jobs" FOR DELETE TO authenticated 
    USING (EXISTS (SELECT 1 FROM public."Mail_Accounts" WHERE "Mail_Accounts".id = account_id AND "Mail_Accounts".user_id = auth.uid()));

-- 2. REMOVE GRAPHQL EXTENSION (Not used, reduces attack surface)
-- Dropping the extension eliminates the GraphQL API endpoint entirely.
DROP EXTENSION IF EXISTS pg_graphql CASCADE;

-- 3. FIX ROW COUNT ENUMERATION & INFORMATION DISCLOSURE
-- Setting tight timeouts prevents brute-force data enumeration through expensive queries.
-- Setting log level to error prevents leaking internal database structure in error messages.
ALTER ROLE authenticated SET statement_timeout = '10s';
ALTER ROLE anon SET statement_timeout = '5s';
ALTER ROLE authenticated SET log_min_messages = 'error';

-- 4. SECURE FUNCTION SEARCH PATHS
-- Setting the search_path to 'public' for custom functions prevents search-path hijacking attacks.
DO $$
DECLARE
    func_record record;
BEGIN
    FOR func_record IN (
        SELECT quote_ident(n.nspname) || '.' || quote_ident(p.proname) || '(' || pg_get_function_identity_arguments(p.oid) || ')' as func_id
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    ) LOOP
        BEGIN
            EXECUTE 'ALTER FUNCTION ' || func_record.func_id || ' SET search_path = public';
        EXCEPTION WHEN OTHERS THEN
            -- Log skipped functions for review instead of silently ignoring
            RAISE WARNING 'Could not set search_path for function %: %', func_record.func_id, SQLERRM;
        END;
    END LOOP;
END $$;

-- 5. MINIMUM PRIVILEGE PRINCIPLE (Fixes API vulnerability 9)
-- Revoke default public access and grant explicit permissions only to authenticated users.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

-- Grant selective public access to the Documentation table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Dokumentation') THEN
        GRANT SELECT ON public."Dokumentation" TO anon;
        -- Add RLS policy for anonymous access
        DROP POLICY IF EXISTS "Allow public read access to documentation" ON public."Dokumentation";
        CREATE POLICY "Allow public read access to documentation" ON public."Dokumentation" FOR SELECT TO anon USING (true);
    END IF;
END $$;
