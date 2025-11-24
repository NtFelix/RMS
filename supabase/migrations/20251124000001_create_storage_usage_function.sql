-- Create a function to calculate total storage usage for a user
create or replace function public.calculate_storage_usage(target_user_id uuid)
returns bigint
language plpgsql
security definer
as $$
declare
  total_size bigint;
begin
  select coalesce(sum(dateigroesse), 0)
  into total_size
  from public."Dokumente_Metadaten"
  where user_id = target_user_id;
  
  return total_size;
end;
$$;
