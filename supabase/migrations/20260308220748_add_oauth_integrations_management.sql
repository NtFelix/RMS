-- Return the authorized apps. Uses the authorization_id.
CREATE OR REPLACE FUNCTION public.get_authorized_apps()
RETURNS TABLE (
  authorization_id UUID,
  client_name TEXT,
  client_logo TEXT,
  scopes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    c.id as authorization_id,
    app.client_name,
    app.logo_uri as client_logo,
    c.scopes::TEXT,
    c.granted_at as created_at
  FROM auth.oauth_consents c
  JOIN auth.oauth_clients app ON c.client_id = app.id
  WHERE c.user_id = auth.uid();
$$;

-- Allow users to revoke an integration by auth_id
DROP FUNCTION IF EXISTS public.revoke_app_access(UUID);
CREATE OR REPLACE FUNCTION public.revoke_app_access(auth_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- 1. Find the client_id for this authorization consent
  SELECT client_id INTO v_client_id
  FROM auth.oauth_consents
  WHERE id = auth_id AND user_id = auth.uid();

  IF v_client_id IS NULL THEN
    RETURN FALSE; -- Consent not found or access denied
  END IF;

  -- 2. Terminate all active sessions connected to this OAuth client
  DELETE FROM auth.sessions
  WHERE oauth_client_id = v_client_id AND user_id = auth.uid();

  -- 3. Delete the consent record so they have to re-authorize again next time
  DELETE FROM auth.oauth_consents
  WHERE id = auth_id AND user_id = auth.uid();
    
  -- 4. Delete lingering authorization records
  DELETE FROM auth.oauth_authorizations
  WHERE client_id = v_client_id AND user_id = auth.uid();

  RETURN TRUE;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_authorized_apps() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_app_access(UUID) TO authenticated;
