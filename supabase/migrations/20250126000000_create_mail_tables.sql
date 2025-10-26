create table public."Mail_Metadaten" (
  id uuid not null default gen_random_uuid (),
  quelle text not null,
  quelle_id text null,
  betreff text null,
  absender text not null,
  empfaenger text not null,
  cc_mails text[] null,
  bcc_mails text[] null,
  datum_erhalten timestamp with time zone not null,
  dateipfad text null,
  ist_gelesen boolean not null default false,
  ist_favorit boolean not null default false,
  user_id uuid not null default auth.uid (),
  ordner text not null,
  hat_anhang boolean not null,
  erstellungsdatum timestamp with time zone not null default now(),
  aktualiserungsdatum timestamp with time zone not null default now(),
  mail_account_id uuid not null,
  constraint Mail_Metadaten_pkey primary key (id),
  constraint Mail_Metadaten_mail_account_id_fkey foreign KEY (mail_account_id) references "Mail_Accounts" (id) on update CASCADE on delete CASCADE,
  constraint Mail_Metadaten_user_id_fkey foreign KEY (user_id) references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

-- Drop the old trigger and function (if exists)
DROP TRIGGER IF EXISTS delete_mail_storage_trigger ON public."Mail_Metadaten";
DROP FUNCTION IF EXISTS delete_mail_storage_files();

-- Create new simplified function that just logs
-- Storage files are deleted by the application (lib/email-utils.ts)
CREATE OR REPLACE FUNCTION delete_mail_storage_files()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the deletion for audit purposes
  RAISE NOTICE 'Email deleted: user_id=%, email_id=%, dateipfad=%', 
    OLD.user_id, OLD.id, OLD.dateipfad;
  
  -- Storage files are deleted by the application before this trigger runs
  -- See: lib/email-utils.ts -> deleteEmailPermanently()
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER delete_mail_storage_trigger
  BEFORE DELETE ON public."Mail_Metadaten"
  FOR EACH ROW
  EXECUTE FUNCTION delete_mail_storage_files();

-- Create RLS policies for the mails storage bucket
-- These policies allow users to manage their own email files

-- Policy 1: Users can read their own email files
CREATE POLICY "Users can read mails files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'mails' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can insert their own email files
CREATE POLICY "Users can insert mails files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mails' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can update their own email files
CREATE POLICY "Users can update mails files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'mails' AND 
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'mails' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Users can delete their own email files
CREATE POLICY "Users can delete mails files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mails' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);
