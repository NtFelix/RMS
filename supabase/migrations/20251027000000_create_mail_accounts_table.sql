-- Create Mail_Accounts table
create table public."Mail_Accounts" (
  id uuid not null default gen_random_uuid (),
  ist_aktiv boolean not null default true,
  mailadresse text not null,
  user_id uuid null default auth.uid (),
  erstellungsdatum date null,
  constraint Mailadressen_pkey primary key (id),
  constraint Mailadressen_mailadresse_key unique (mailadresse),
  constraint Mailadressen_user_id_fkey foreign KEY (user_id) references auth.users (id) on update CASCADE on delete RESTRICT
) TABLESPACE pg_default;

-- Enable Row Level Security
ALTER TABLE public."Mail_Accounts" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Mail_Accounts
-- Policy: Users can view their own mail accounts
CREATE POLICY "Users can view their own mail accounts"
  ON public."Mail_Accounts"
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own mail accounts
CREATE POLICY "Users can insert their own mail accounts"
  ON public."Mail_Accounts"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own mail accounts
CREATE POLICY "Users can update their own mail accounts"
  ON public."Mail_Accounts"
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own mail accounts
CREATE POLICY "Users can delete their own mail accounts"
  ON public."Mail_Accounts"
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE public."Mail_Accounts" IS 'Stores user email accounts with @mietevo.de domain';
