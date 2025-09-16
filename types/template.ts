import { JSONContent } from '@tiptap/react';
import { TemplateCategory } from '../lib/template-constants';

// Template interface matching Supabase schema
export interface Template {
  id: string;
  titel: string;
  inhalt: JSONContent; // TipTap JSON format
  user_id: string;
  kategorie: TemplateCategory;
  kontext_anforderungen: string[];
  erstellungsdatum: string;
  aktualisiert_am: string;
}

// Template creation/update payload
export interface TemplatePayload {
  titel: string;
  inhalt: JSONContent;
  kategorie: TemplateCategory;
  kontext_anforderungen: string[];
}

// Template editor props
export interface TemplateEditorProps {
  content?: string | JSONContent;
  onChange?: (content: string, json: JSONContent) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

// Templates modal props
export interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Template card props
export interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => void;
}

// Template editor modal props
export interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: Template; // undefined for new template
  onSave: (template: Partial<Template>) => void;
}

// Template modal props (legacy - keeping for backward compatibility)
export interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: Template;
  onSave?: (template: TemplatePayload) => Promise<void>;
}