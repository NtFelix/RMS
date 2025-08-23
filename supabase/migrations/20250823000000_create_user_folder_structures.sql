-- Create user_folder_structures table for storing cloud storage folder hierarchies
CREATE TABLE IF NOT EXISTS public.user_folder_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_structure JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one folder structure per user
  CONSTRAINT user_folder_structures_user_id_unique UNIQUE (user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_folder_structures_user_id 
ON public.user_folder_structures(user_id);

-- Enable RLS
ALTER TABLE public.user_folder_structures ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - users can only access their own folder structures
CREATE POLICY "Users can manage their own folder structures" 
ON public.user_folder_structures
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_folder_structures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_user_folder_structures_updated_at
  BEFORE UPDATE ON public.user_folder_structures
  FOR EACH ROW
  EXECUTE FUNCTION update_user_folder_structures_updated_at();