create table if not exists public."Dokumente_Metadaten" (
  id uuid not null default gen_random_uuid (),
  dateipfad text not null,
  dateiname text not null,
  dateigroesse numeric null,
  mime_type text null,
  erstellungsdatum timestamp with time zone null default (now() AT TIME ZONE 'utc'::text),
  aktualisierungsdatum timestamp with time zone null default (now() AT TIME ZONE 'utc'::text),
  letzter_zugriff timestamp with time zone null default (now() AT TIME ZONE 'utc'::text),
  user_id uuid null default auth.uid (),
  constraint Dokumente_Metadaten_pkey primary key (id),
  constraint Dokumente_Metadaten_user_id_fkey foreign KEY (user_id) references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;