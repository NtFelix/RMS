-- Create file_metadata table for cloud storage
CREATE TABLE file_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  folder_path TEXT NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('haus', 'wohnung', 'mieter', 'sonstiges')),
  entity_id UUID,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_file_metadata_user_id ON file_metadata(user_id);
CREATE INDEX idx_file_metadata_folder_path ON file_metadata(user_id, folder_path);
CREATE INDEX idx_file_metadata_entity ON file_metadata(user_id, entity_type, entity_id);
CREATE INDEX idx_file_metadata_storage_path ON file_metadata(storage_path);

-- Enable Row Level Security
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only access their own files" ON file_metadata
  FOR ALL USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_file_metadata_updated_at 
  BEFORE UPDATE ON file_metadata 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket policy (this would be done in Supabase dashboard or via API)
-- The bucket 'documents' should be created with the following policies:
-- 1. Users can upload files to their own folder: bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text
-- 2. Users can read files from their own folder: bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text
-- 3. Users can delete files from their own folder: bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text