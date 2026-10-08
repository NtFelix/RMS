-- Fix: get_authorized_apps was reading from auth.oauth_authorizations which always
-- has user_id=null and status='pending' when the MCP proxy intercepts the OAuth flow.
-- Instead, we read from auth.sessions which correctly has user_id set after the token
-- exchange and groups by OAuth client to show one entry per connected app.

CREATE OR REPLACE FUNCTION public.get_authorized_apps()
RETURNS TABLE(
    authorization_id uuid,
    client_name text,
    client_logo text,
    scopes text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (c.id)
        s.id AS authorization_id,
        c.client_name,
        c.logo_uri AS client_logo,
        s.scopes AS scopes,
        s.created_at
    FROM auth.sessions s
    JOIN auth.oauth_clients c ON s.oauth_client_id = c.id
    WHERE s.user_id = auth.uid()
      AND s.oauth_client_id IS NOT NULL
    ORDER BY c.id, s.created_at DESC;
END;
$$;

-- Fix: revoke_app_access now deletes all sessions for the given OAuth client
-- (identified by the session id passed in) rather than trying to delete a
-- non-existent approved authorization record.

CREATE OR REPLACE FUNCTION public.revoke_app_access(auth_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_client_id uuid;
BEGIN
    -- Find the OAuth client for this session, checking ownership
    SELECT oauth_client_id INTO v_client_id
    FROM auth.sessions
    WHERE id = auth_id
      AND user_id = auth.uid();

    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'Session not found or access denied';
    END IF;

    -- Revoke all active sessions for this user + client
    DELETE FROM auth.sessions
    WHERE user_id = auth.uid()
      AND oauth_client_id = v_client_id;
END;
$$;
