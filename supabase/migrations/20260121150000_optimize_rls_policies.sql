-- Migration: Optimize RLS policies for better performance
-- Issue: auth.<function>() re-evaluates for each row, causing suboptimal query performance
-- Solution: Wrap auth.<function>() in (SELECT ...) to evaluate once per query

-- ============================================================================
-- AUFGABEN
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Aufgaben";
DROP POLICY IF EXISTS "Secure INSERT" ON "Aufgaben";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Aufgaben";
DROP POLICY IF EXISTS "Secure DELETE" ON "Aufgaben";

CREATE POLICY "Secure SELECT" ON "Aufgaben"
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Aufgaben"
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Aufgaben"
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure DELETE" ON "Aufgaben"
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- DOKUMENTATION (clean up duplicate policies and optimize)
-- ============================================================================
DROP POLICY IF EXISTS "Allow service role full access to documentation" ON "Dokumentation";
DROP POLICY IF EXISTS "Allow public read access to documentation" ON "Dokumentation";
DROP POLICY IF EXISTS "Public read access" ON "Dokumentation";

CREATE POLICY "Allow service role full access to documentation" ON "Dokumentation"
    FOR ALL USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Public read access" ON "Dokumentation"
    FOR SELECT TO anon, authenticated USING (true);

-- ============================================================================
-- DOKUMENTE_METADATEN
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Dokumente_Metadaten";
DROP POLICY IF EXISTS "Secure INSERT" ON "Dokumente_Metadaten";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Dokumente_Metadaten";
DROP POLICY IF EXISTS "Secure DELETE" ON "Dokumente_Metadaten";

CREATE POLICY "Secure SELECT" ON "Dokumente_Metadaten"
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Dokumente_Metadaten"
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Dokumente_Metadaten"
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure DELETE" ON "Dokumente_Metadaten"
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- FINANZEN
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Finanzen";
DROP POLICY IF EXISTS "Secure INSERT" ON "Finanzen";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Finanzen";
DROP POLICY IF EXISTS "Secure DELETE" ON "Finanzen";

CREATE POLICY "Secure SELECT" ON "Finanzen"
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Finanzen"
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Finanzen"
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure DELETE" ON "Finanzen"
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- HAEUSER
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Haeuser";
DROP POLICY IF EXISTS "Secure INSERT" ON "Haeuser";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Haeuser";
DROP POLICY IF EXISTS "Secure DELETE" ON "Haeuser";

CREATE POLICY "Secure SELECT" ON "Haeuser"
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Haeuser"
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Haeuser"
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure DELETE" ON "Haeuser"
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- MIETER
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Mieter";
DROP POLICY IF EXISTS "Secure INSERT" ON "Mieter";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Mieter";
DROP POLICY IF EXISTS "Secure DELETE" ON "Mieter";

CREATE POLICY "Secure SELECT" ON "Mieter"
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Mieter"
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Mieter"
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure DELETE" ON "Mieter"
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- WOHNUNGEN
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Wohnungen";
DROP POLICY IF EXISTS "Secure INSERT" ON "Wohnungen";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Wohnungen";
DROP POLICY IF EXISTS "Secure DELETE" ON "Wohnungen";

CREATE POLICY "Secure SELECT" ON "Wohnungen"
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Wohnungen"
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Wohnungen"
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure DELETE" ON "Wohnungen"
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- ZAEHLER (clean up duplicate policies and optimize)
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Zaehler";
DROP POLICY IF EXISTS "Secure INSERT" ON "Zaehler";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Zaehler";
DROP POLICY IF EXISTS "Secure DELETE" ON "Zaehler";
DROP POLICY IF EXISTS "Zaehler_allow_authenticated_select_own" ON "Zaehler";
DROP POLICY IF EXISTS "Zaehler_allow_authenticated_insert_own" ON "Zaehler";
DROP POLICY IF EXISTS "Zaehler_allow_authenticated_update_own" ON "Zaehler";
DROP POLICY IF EXISTS "Zaehler_allow_authenticated_delete_own" ON "Zaehler";

CREATE POLICY "Secure SELECT" ON "Zaehler"
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Zaehler"
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Zaehler"
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure DELETE" ON "Zaehler"
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- ZAEHLER_ABLESUNGEN (clean up duplicate policies and optimize)
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Zaehler_Ablesungen";
DROP POLICY IF EXISTS "Secure INSERT" ON "Zaehler_Ablesungen";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Zaehler_Ablesungen";
DROP POLICY IF EXISTS "Secure DELETE" ON "Zaehler_Ablesungen";
DROP POLICY IF EXISTS "Zaehler_Ablesungen_allow_authenticated_select_own" ON "Zaehler_Ablesungen";
DROP POLICY IF EXISTS "Zaehler_Ablesungen_allow_authenticated_insert_own" ON "Zaehler_Ablesungen";
DROP POLICY IF EXISTS "Zaehler_Ablesungen_allow_authenticated_update_own" ON "Zaehler_Ablesungen";
DROP POLICY IF EXISTS "Zaehler_Ablesungen_allow_authenticated_delete_own" ON "Zaehler_Ablesungen";

CREATE POLICY "Secure SELECT" ON "Zaehler_Ablesungen"
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Zaehler_Ablesungen"
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Zaehler_Ablesungen"
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure DELETE" ON "Zaehler_Ablesungen"
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- PROFILES
-- ============================================================================
DROP POLICY IF EXISTS "profiles_select_own" ON "profiles";
DROP POLICY IF EXISTS "profiles_update_own" ON "profiles";

CREATE POLICY "profiles_select_own" ON "profiles"
    FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_update_own" ON "profiles"
    FOR UPDATE USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================================
-- MAIL_ACCOUNTS (has duplicate policies - clean up and optimize)
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Mail_Accounts";
DROP POLICY IF EXISTS "Secure INSERT" ON "Mail_Accounts";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Mail_Accounts";
DROP POLICY IF EXISTS "Secure DELETE" ON "Mail_Accounts";
DROP POLICY IF EXISTS "Users can view their own mail accounts" ON "Mail_Accounts";
DROP POLICY IF EXISTS "Users can insert their own mail accounts" ON "Mail_Accounts";
DROP POLICY IF EXISTS "Users can update their own mail accounts" ON "Mail_Accounts";
DROP POLICY IF EXISTS "Users can delete their own mail accounts" ON "Mail_Accounts";

CREATE POLICY "Secure SELECT" ON "Mail_Accounts"
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Mail_Accounts"
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Mail_Accounts"
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure DELETE" ON "Mail_Accounts"
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- MAIL_IMPORT_JOBS (has duplicate policies - clean up and optimize)
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Mail_Import_Jobs";
DROP POLICY IF EXISTS "Secure INSERT" ON "Mail_Import_Jobs";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Mail_Import_Jobs";
DROP POLICY IF EXISTS "Secure DELETE" ON "Mail_Import_Jobs";
DROP POLICY IF EXISTS "Users can view their own import jobs" ON "Mail_Import_Jobs";
DROP POLICY IF EXISTS "Service role can manage import jobs" ON "Mail_Import_Jobs";

CREATE POLICY "Secure SELECT" ON "Mail_Import_Jobs"
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Mail_Import_Jobs"
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Mail_Import_Jobs"
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure DELETE" ON "Mail_Import_Jobs"
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role can manage import jobs" ON "Mail_Import_Jobs"
    FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- NEBENKOSTEN
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Nebenkosten";
DROP POLICY IF EXISTS "Secure INSERT" ON "Nebenkosten";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Nebenkosten";
DROP POLICY IF EXISTS "Secure DELETE" ON "Nebenkosten";

CREATE POLICY "Secure SELECT" ON "Nebenkosten"
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Nebenkosten"
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Nebenkosten"
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure DELETE" ON "Nebenkosten"
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- RECHNUNGEN
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Rechnungen";
DROP POLICY IF EXISTS "Secure INSERT" ON "Rechnungen";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Rechnungen";
DROP POLICY IF EXISTS "Secure DELETE" ON "Rechnungen";

CREATE POLICY "Secure SELECT" ON "Rechnungen"
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Rechnungen"
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Rechnungen"
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure DELETE" ON "Rechnungen"
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- VORLAGEN
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Vorlagen";
DROP POLICY IF EXISTS "Secure INSERT" ON "Vorlagen";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Vorlagen";
DROP POLICY IF EXISTS "Secure DELETE" ON "Vorlagen";

CREATE POLICY "Secure SELECT" ON "Vorlagen"
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Vorlagen"
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Vorlagen"
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure DELETE" ON "Vorlagen"
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- WASSERZAEHLER
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Wasserzaehler";
DROP POLICY IF EXISTS "Secure INSERT" ON "Wasserzaehler";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Wasserzaehler";
DROP POLICY IF EXISTS "Secure DELETE" ON "Wasserzaehler";

CREATE POLICY "Secure SELECT" ON "Wasserzaehler"
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Wasserzaehler"
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Wasserzaehler"
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure DELETE" ON "Wasserzaehler"
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- MAIL_METADATEN
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Mail_Metadaten";
DROP POLICY IF EXISTS "Secure INSERT" ON "Mail_Metadaten";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Mail_Metadaten";
DROP POLICY IF EXISTS "Secure DELETE" ON "Mail_Metadaten";

CREATE POLICY "Secure SELECT" ON "Mail_Metadaten"
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure INSERT" ON "Mail_Metadaten"
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure UPDATE" ON "Mail_Metadaten"
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Secure DELETE" ON "Mail_Metadaten"
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- MAIL_SYNC_JOBS (uses subquery to check ownership via Mail_Accounts)
-- ============================================================================
DROP POLICY IF EXISTS "Secure SELECT" ON "Mail_Sync_Jobs";
DROP POLICY IF EXISTS "Secure INSERT" ON "Mail_Sync_Jobs";
DROP POLICY IF EXISTS "Secure UPDATE" ON "Mail_Sync_Jobs";
DROP POLICY IF EXISTS "Secure DELETE" ON "Mail_Sync_Jobs";
DROP POLICY IF EXISTS "Users can view their own sync jobs" ON "Mail_Sync_Jobs";
DROP POLICY IF EXISTS "Service role can insert sync jobs" ON "Mail_Sync_Jobs";
DROP POLICY IF EXISTS "Service role can update sync jobs" ON "Mail_Sync_Jobs";
DROP POLICY IF EXISTS "Service role can manage sync jobs" ON "Mail_Sync_Jobs";

CREATE POLICY "Secure SELECT" ON "Mail_Sync_Jobs"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "Mail_Accounts"
            WHERE "Mail_Accounts".id = "Mail_Sync_Jobs".account_id
            AND "Mail_Accounts".user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Secure INSERT" ON "Mail_Sync_Jobs"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Mail_Accounts"
            WHERE "Mail_Accounts".id = "Mail_Sync_Jobs".account_id
            AND "Mail_Accounts".user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Secure UPDATE" ON "Mail_Sync_Jobs"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "Mail_Accounts"
            WHERE "Mail_Accounts".id = "Mail_Sync_Jobs".account_id
            AND "Mail_Accounts".user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Mail_Accounts"
            WHERE "Mail_Accounts".id = "Mail_Sync_Jobs".account_id
            AND "Mail_Accounts".user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Secure DELETE" ON "Mail_Sync_Jobs"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "Mail_Accounts"
            WHERE "Mail_Accounts".id = "Mail_Sync_Jobs".account_id
            AND "Mail_Accounts".user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Service role can manage sync jobs" ON "Mail_Sync_Jobs"
    FOR ALL USING ((SELECT auth.role()) = 'service_role');
