-- Create a function to handle file deletion from storage
create or replace function public.handle_storage_deletion()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Delete the corresponding metadata record
  -- We parse the path to get directory and filename
  -- storage.objects.name is the full path (e.g. "user_123/folder/file.txt")
  delete from public."Dokumente_Metadaten"
  where dateipfad = substring(old.name from '^(.*)/[^/]+$')
    and dateiname = substring(old.name from '[^/]+$');
    
  return old;
end;
$$;

-- Create the trigger on the storage.objects table
-- This requires the 'storage' schema to be accessible
drop trigger if exists on_file_delete on storage.objects;

create trigger on_file_delete
after delete on storage.objects
for each row
execute function public.handle_storage_deletion();
