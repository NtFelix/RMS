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
    a.id as authorization_id,
    c.client_name,
    c.logo_uri as client_logo,
    a.scopes,
    a.created_at
  FROM auth.oauth_authorizations a
  JOIN auth.oauth_clients c ON a.client_id = c.id
  WHERE a.user_id = auth.uid();
$$;

-- Allow users to revoke an integration by auth_id
CREATE OR REPLACE FUNCTION public.revoke_app_access(auth_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- 1. Find the client_id for this authorization
  SELECT client_id INTO v_client_id
  FROM auth.oauth_authorizations
  WHERE id = auth_id AND user_id = auth.uid();

  IF v_client_id IS NOT NULL THEN
    -- 2. Delete the consent record so they have to re-authorize again next time
    DELETE FROM auth.oauth_consents
    WHERE user_id = auth.uid() 
      AND client_id = v_client_id;
      
    -- 3. Delete authorization records
    DELETE FROM auth.oauth_authorizations
    WHERE id = auth_id AND user_id = auth.uid();
  END IF;
END;
$$;
