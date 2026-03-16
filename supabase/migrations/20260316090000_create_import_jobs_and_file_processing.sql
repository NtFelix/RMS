-- Create import_jobs table and file-processing storage policies

-- Ensure storage bucket exists (private)
insert into storage.buckets (id, name, public)
values ('file-processing', 'file-processing', false)
on conflict (id) do nothing;

-- Import jobs table
create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  storage_path text not null,
  original_filename text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  preview_columns jsonb,
  preview_rows jsonb,
  total_row_count integer,
  mapping jsonb,
  imported_count integer,
  error_count integer,
  error_summary jsonb,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists import_jobs_user_id_idx on public.import_jobs (user_id);
create index if not exists import_jobs_expires_at_idx on public.import_jobs (expires_at);

alter table public.import_jobs enable row level security;
alter table public.import_jobs force row level security;

create policy "import_jobs_select_own"
  on public.import_jobs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "import_jobs_insert_own"
  on public.import_jobs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "import_jobs_update_own"
  on public.import_jobs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "import_jobs_delete_own"
  on public.import_jobs for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Storage policies for file-processing bucket
create policy "file_processing_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'file-processing'
    and name like ('user_' || auth.uid())::text || '/%'
  );

create policy "file_processing_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'file-processing'
    and name like ('user_' || auth.uid())::text || '/%'
  );

create policy "file_processing_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'file-processing'
    and name like ('user_' || auth.uid())::text || '/%'
  )
  with check (
    bucket_id = 'file-processing'
    and name like ('user_' || auth.uid())::text || '/%'
  );

create policy "file_processing_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'file-processing'
    and name like ('user_' || auth.uid())::text || '/%'
  );
