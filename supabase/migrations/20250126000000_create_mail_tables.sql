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

-- Create function to delete storage files when email is deleted
CREATE OR REPLACE FUNCTION delete_mail_storage_files()
RETURNS TRIGGER AS $$
DECLARE
  folder_path text;
BEGIN
  -- Construct the folder path: user_id/email_id/
  folder_path := OLD.user_id::text || '/' || OLD.id::text;
  
  -- Delete all files in the email folder from storage
  -- This will delete body.json.gz and all attachments
  PERFORM storage.delete_folder('mails', folder_path);
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically delete storage files when email is deleted
CREATE TRIGGER delete_mail_storage_trigger
  BEFORE DELETE ON public."Mail_Metadaten"
  FOR EACH ROW
  EXECUTE FUNCTION delete_mail_storage_files();
