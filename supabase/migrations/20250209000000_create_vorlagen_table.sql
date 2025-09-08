-- Create Vorlagen table for template system
-- This migration creates the Vorlagen table with all necessary columns including kontext_anforderungen

-- Create the Vorlagen table
CREATE TABLE IF NOT EXISTS public."Vorlagen" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    titel TEXT NOT NULL,
    inhalt TEXT NOT NULL DEFAULT '',
    kategorie TEXT DEFAULT 'allgemein',
    kontext_anforderungen JSONB DEFAULT '[]'::jsonb,
    erstellungsdatum TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    aktualisiert_am TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vorlagen_user_id ON public."Vorlagen"(user_id);
CREATE INDEX IF NOT EXISTS idx_vorlagen_titel ON public."Vorlagen"(titel);
CREATE INDEX IF NOT EXISTS idx_vorlagen_kategorie ON public."Vorlagen"(kategorie);
CREATE INDEX IF NOT EXISTS idx_vorlagen_erstellungsdatum ON public."Vorlagen"(erstellungsdatum DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public."Vorlagen" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own templates
CREATE POLICY "Users can view own templates" ON public."Vorlagen"
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own templates
CREATE POLICY "Users can insert own templates" ON public."Vorlagen"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates" ON public."Vorlagen"
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates" ON public."Vorlagen"
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Vorlagen" TO authenticated;

-- Create trigger to update aktualisiert_am timestamp
CREATE OR REPLACE FUNCTION update_aktualisiert_am_vorlagen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.aktualisiert_am = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_aktualisiert_am_vorlagen
    BEFORE UPDATE ON public."Vorlagen"
    FOR EACH ROW
    EXECUTE FUNCTION update_aktualisiert_am_vorlagen();

-- Add comments for documentation
COMMENT ON TABLE public."Vorlagen" IS 'Template system table storing user-created document templates with placeholder support';
COMMENT ON COLUMN public."Vorlagen".kontext_anforderungen IS 'JSON array of required context types for template usage (e.g., ["mieter", "wohnung"])';
COMMENT ON COLUMN public."Vorlagen".titel IS 'Template name/title displayed in the UI';
COMMENT ON COLUMN public."Vorlagen".inhalt IS 'Template content with placeholders (e.g., @mieter.name, @wohnung.adresse)';
COMMENT ON COLUMN public."Vorlagen".kategorie IS 'Template category for organization (e.g., mail, vertrag, kuendigung)';