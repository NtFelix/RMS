-- Function to get authorized apps
CREATE OR REPLACE FUNCTION public.get_authorized_apps()
RETURNS TABLE (
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
  SELECT
    a.id as authorization_id,
    c.client_name,
    c.logo_uri as client_logo,
    a.scope as scopes,
    a.created_at
  FROM
    auth.oauth_authorizations a
  JOIN
    auth.oauth_clients c ON a.client_id = c.id
  WHERE
    a.user_id = auth.uid()
    AND a.status = 'approved'; 
END;
$$;

-- Function to revoke app access
CREATE OR REPLACE FUNCTION public.revoke_app_access(auth_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM auth.oauth_authorizations
  WHERE id = auth_id AND user_id = auth.uid();
END;
$$;
