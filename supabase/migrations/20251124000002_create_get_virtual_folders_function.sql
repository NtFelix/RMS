-- Create a function to fetch virtual folders (Houses, Apartments, Tenants) with file counts
create or replace function public.get_virtual_folders(
  p_user_id uuid,
  p_current_path text
)
returns table (
  id text,
  name text,
  path text,
  type text,
  file_count bigint
)
language plpgsql
security definer
as $$
declare
  v_path_parts text[];
  v_depth int;
  v_house_id uuid;
  v_apt_id uuid;
  v_uuid_pattern text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  v_path_parts := string_to_array(p_current_path, '/');
  v_depth := array_length(v_path_parts, 1);

  -- Root level (Depth 1: user_uuid) -> Fetch Houses
  if v_depth = 1 then
    return query
    select 
      h.id::text,
      h.name,
      p_current_path || '/' || h.id,
      'house'::text,
      (select count(*) from public."Dokumente_Metadaten" dm where dm.dateipfad = p_current_path || '/' || h.id and dm.user_id = p_user_id)
    from public."Haeuser" h
    where h.user_id = p_user_id;
  end if;

  -- House level (Depth 2: user_uuid/house_uuid) -> Fetch Apartments
  if v_depth = 2 then
    -- Check if the second part is a UUID (House ID)
    if (v_path_parts)[2] ~ v_uuid_pattern then
      v_house_id := (v_path_parts)[2]::uuid;
      return query
      select 
        w.id::text,
        w.name,
        p_current_path || '/' || w.id,
        'apartment'::text,
        (select count(*) from public."Dokumente_Metadaten" dm where dm.dateipfad = p_current_path || '/' || w.id and dm.user_id = p_user_id)
      from public."Wohnungen" w
      where w.haus_id = v_house_id and w.user_id = p_user_id;
    end if;
  end if;

  -- Apartment level (Depth 3: user_uuid/house_uuid/apt_uuid) -> Fetch Tenants
  if v_depth = 3 then
    -- Check if the third part is a UUID (Apartment ID)
    if (v_path_parts)[3] ~ v_uuid_pattern then
      v_apt_id := (v_path_parts)[3]::uuid;
      return query
      select 
        m.id::text,
        m.name,
        p_current_path || '/' || m.id,
        'tenant'::text,
        (select count(*) from public."Dokumente_Metadaten" dm where dm.dateipfad = p_current_path || '/' || m.id and dm.user_id = p_user_id)
      from public."Mieter" m
      where m.wohnung_id = v_apt_id and m.user_id = p_user_id;
    end if;
  end if;

  -- If deeper or other, return empty
  return;
end;
$$;
