-- Create RPC function to get email summary statistics
-- This function returns all counts needed for the mail dashboard summary cards in a single call
-- Instead of making multiple separate queries for each statistic

CREATE OR REPLACE FUNCTION public.get_mail_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  user_uuid UUID;
BEGIN
  -- Get the authenticated user's ID
  user_uuid := auth.uid();
  
  -- Return null if no authenticated user
  IF user_uuid IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get all counts in a single query using conditional aggregation
  SELECT json_build_object(
    'total', COUNT(*),
    'unread', COUNT(*) FILTER (WHERE ist_gelesen = false),
    'inbox', COUNT(*) FILTER (WHERE ordner = 'inbox'),
    'sent', COUNT(*) FILTER (WHERE ordner = 'sent'),
    'drafts', COUNT(*) FILTER (WHERE ordner = 'drafts'),
    'archive', COUNT(*) FILTER (WHERE ordner = 'archive'),
    'trash', COUNT(*) FILTER (WHERE ordner = 'trash'),
    'spam', COUNT(*) FILTER (WHERE ordner = 'spam'),
    'favorites', COUNT(*) FILTER (WHERE ist_favorit = true)
  ) INTO result
  FROM public."Mail_Metadaten"
  WHERE user_id = user_uuid;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_mail_summary() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_mail_summary() IS 'Returns email statistics for the authenticated user including total, unread, and per-folder counts';
