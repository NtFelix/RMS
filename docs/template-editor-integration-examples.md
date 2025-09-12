# Template Editor Integration Examples

## Overview

This document provides practical examples of integrating the enhanced TipTap template editor with mention suggestions into various components and workflows within the property management system.

## Modal Integration Examples

### Template Creation Modal

```tsx
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TemplateEditor } from '@/components/template-editor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TEMPLATE_CATEGORIES } from '@/lib/template-constants';

const templateSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  category: z.enum(TEMPLATE_CATEGORIES),
  content: z.string().min(1, 'Inhalt ist erforderlich'),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: TemplateFormData) => Promise<void>;
}

export function TemplateCreateModal({ isOpen, onClose, onSave }: TemplateCreateModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const { control, handleSubmit, formState: { errors }, reset } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      category: 'Mail',
      content: '',
    },
  });

  const onSubmit = async (data: TemplateFormData) => {
    setIsLoading(true);
    try {
      await onSave(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Neue Vorlage erstellen</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 space-y-4">
          {/* Template Name */}
          <div className="space-y-2">
            <label htmlFor="template-name" className="text-sm font-medium">
              Vorlagenname
            </label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <input
                  id="template-name"
                  {...field}
                  className="w-full p-2 border rounded-md"
                  placeholder="z.B. Mietvertrag Standard"
                />
              )}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Template Category */}
          <div className="space-y-2">
            <label htmlFor="template-category" className="text-sm font-medium">
              Kategorie
            </label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category.message}</p>
            )}
          </div>

          {/* Template Content */}
          <div className="space-y-2 flex-1 flex flex-col">
            <label htmlFor="template-content" className="text-sm font-medium">
              Vorlageninhalt
            </label>
            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <div className="flex-1 min-h-0">
                  <TemplateEditor
                    content={field.value}
                    onChange={(html) => field.onChange(html)}
                    className="h-full min-h-[300px]"
                    placeholder="Beginnen Sie mit der Eingabe... Verwenden Sie @ für Variablen"
                    aria-label="Template content editor"
                    aria-describedby="content-help"
                  />
                </div>
              )}
            />
            <p id="content-help" className="text-xs text-muted-foreground">
              Tipp: Verwenden Sie @ um Variablen wie @Mieter.Name oder @Wohnung.Adresse einzufügen
            </p>
            {errors.content && (
              <p className="text-sm text-red-500">{errors.content.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Speichern...' : 'Vorlage erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Template Edit Modal

```tsx
import { useEffect } from 'react';
import { TemplateEditor } from '@/components/template-editor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
}

interface TemplateEditModalProps {
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: Template) => Promise<void>;
}

export function TemplateEditModal({ template, isOpen, onClose, onSave }: TemplateEditModalProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (template) {
      setContent(template.content);
    }
  }, [template]);

  const handleSave = async () => {
    if (!template) return;
    
    setIsLoading(true);
    try {
      await onSave({ ...template, content });
      onClose();
    } catch (error) {
      console.error('Failed to update template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Vorlage bearbeiten: {template.name}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 py-4">
          <TemplateEditor
            content={content}
            onChange={(html) => setContent(html)}
            className="h-full min-h-[400px]"
            aria-label={`Editing template: ${template.name}`}
          />
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Speichern...' : 'Änderungen speichern'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## Dashboard Integration

### Template Management Dashboard

```tsx
import { useState, useEffect } from 'react';
import { TemplateEditor } from '@/components/template-editor';
import { TemplateCreateModal } from './template-create-modal';
import { TemplateEditModal } from './template-edit-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export function TemplatesDashboard() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    // Fetch templates from API
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleCreateTemplate = async (templateData: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });
      
      if (response.ok) {
        await loadTemplates();
      }
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleUpdateTemplate = async (template: Template) => {
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      
      if (response.ok) {
        await loadTemplates();
      }
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diese Vorlage löschen möchten?')) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadTemplates();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Vorlagen verwalten</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Neue Vorlage
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge variant="secondary">{template.category}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Preview */}
                <div className="h-24 overflow-hidden border rounded">
                  <TemplateEditor
                    content={template.content}
                    readOnly={true}
                    className="border-0 text-xs"
                  />
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setIsPreviewMode(true);
                    }}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Vorschau
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setIsEditModalOpen(true);
                    }}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Bearbeiten
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Löschen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {templates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Noch keine Vorlagen erstellt</p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Erste Vorlage erstellen
          </Button>
        </div>
      )}

      {/* Modals */}
      <TemplateCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateTemplate}
      />

      <TemplateEditModal
        template={selectedTemplate}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTemplate(null);
        }}
        onSave={handleUpdateTemplate}
      />

      {/* Preview Modal */}
      {selectedTemplate && isPreviewMode && (
        <Dialog open={isPreviewMode} onOpenChange={setIsPreviewMode}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Vorschau: {selectedTemplate.name}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-[400px]">
              <TemplateEditor
                content={selectedTemplate.content}
                readOnly={true}
                className="h-full"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
```

## Email Integration

### Email Template Composer

```tsx
import { useState } from 'react';
import { TemplateEditor } from '@/components/template-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Save, Eye } from 'lucide-react';

interface EmailComposerProps {
  recipientEmail?: string;
  subject?: string;
  templateContent?: string;
  onSend: (email: EmailData) => Promise<void>;
  onSaveDraft: (email: EmailData) => Promise<void>;
}

interface EmailData {
  to: string;
  subject: string;
  content: string;
  htmlContent: string;
}

export function EmailComposer({ 
  recipientEmail = '', 
  subject = '', 
  templateContent = '',
  onSend,
  onSaveDraft 
}: EmailComposerProps) {
  const [to, setTo] = useState(recipientEmail);
  const [emailSubject, setEmailSubject] = useState(subject);
  const [content, setContent] = useState(templateContent);
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    setIsLoading(true);
    try {
      await onSend({
        to,
        subject: emailSubject,
        content,
        htmlContent: content, // The editor provides HTML content
      });
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await onSaveDraft({
        to,
        subject: emailSubject,
        content,
        htmlContent: content,
      });
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>E-Mail verfassen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Headers */}
        <div className="space-y-3">
          <div>
            <label htmlFor="email-to" className="text-sm font-medium">
              An
            </label>
            <Input
              id="email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="empfaenger@example.com"
            />
          </div>
          
          <div>
            <label htmlFor="email-subject" className="text-sm font-medium">
              Betreff
            </label>
            <Input
              id="email-subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="E-Mail Betreff"
            />
          </div>
        </div>

        {/* Email Content */}
        <div>
          <label className="text-sm font-medium">Nachricht</label>
          <div className="mt-2">
            {isPreview ? (
              <div className="border rounded-md p-4 min-h-[300px] bg-gray-50">
                <TemplateEditor
                  content={content}
                  readOnly={true}
                  className="border-0 bg-transparent"
                />
              </div>
            ) : (
              <TemplateEditor
                content={content}
                onChange={(html) => setContent(html)}
                className="min-h-[300px]"
                placeholder="Verfassen Sie Ihre Nachricht... Verwenden Sie @ für Variablen"
                aria-label="Email content editor"
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPreview(!isPreview)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {isPreview ? 'Bearbeiten' : 'Vorschau'}
            </Button>
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="w-4 h-4 mr-2" />
              Entwurf speichern
            </Button>
          </div>
          
          <Button 
            onClick={handleSend} 
            disabled={!to || !emailSubject || !content || isLoading}
          >
            <Send className="w-4 h-4 mr-2" />
            {isLoading ? 'Senden...' : 'E-Mail senden'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Document Generation Integration

### PDF Document Generator

```tsx
import { useState } from 'react';
import { TemplateEditor } from '@/components/template-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Eye } from 'lucide-react';

interface DocumentGeneratorProps {
  templates: Template[];
  tenants: Tenant[];
  apartments: Apartment[];
}

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Apartment {
  id: string;
  address: string;
  rooms: number;
  size: number;
}

export function DocumentGenerator({ templates, tenants, apartments }: DocumentGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [processedContent, setProcessedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Process template variables with actual data
  const processTemplate = (template: Template, tenant: Tenant, apartment: Apartment) => {
    let content = template.content;
    
    // Replace tenant variables
    content = content.replace(/@Mieter\.Name/g, tenant.name);
    content = content.replace(/@Mieter\.Email/g, tenant.email);
    content = content.replace(/@Mieter\.Telefon/g, tenant.phone);
    
    // Replace apartment variables
    content = content.replace(/@Wohnung\.Adresse/g, apartment.address);
    content = content.replace(/@Wohnung\.Zimmer/g, apartment.rooms.toString());
    content = content.replace(/@Wohnung\.Größe/g, `${apartment.size} m²`);
    
    // Replace date variables
    const today = new Date();
    content = content.replace(/@Datum\.Heute/g, today.toLocaleDateString('de-DE'));
    content = content.replace(/@Datum\.Monat/g, today.toLocaleDateString('de-DE', { month: 'long' }));
    content = content.replace(/@Datum\.Jahr/g, today.getFullYear().toString());
    
    return content;
  };

  const handleGenerate = () => {
    if (!selectedTemplate || !selectedTenant || !selectedApartment) return;
    
    const processed = processTemplate(selectedTemplate, selectedTenant, selectedApartment);
    setProcessedContent(processed);
  };

  const handleDownloadPDF = async () => {
    if (!processedContent) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: processedContent,
          filename: `${selectedTemplate?.name}_${selectedTenant?.name}`,
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTemplate?.name}_${selectedTenant?.name}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dokument generieren</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Dokumentkonfiguration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Selection */}
            <div>
              <label className="text-sm font-medium">Vorlage auswählen</label>
              <Select 
                value={selectedTemplate?.id || ''} 
                onValueChange={(value) => {
                  const template = templates.find(t => t.id === value);
                  setSelectedTemplate(template || null);
                  setProcessedContent('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vorlage auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tenant Selection */}
            <div>
              <label className="text-sm font-medium">Mieter auswählen</label>
              <Select 
                value={selectedTenant?.id || ''} 
                onValueChange={(value) => {
                  const tenant = tenants.find(t => t.id === value);
                  setSelectedTenant(tenant || null);
                  setProcessedContent('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mieter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Apartment Selection */}
            <div>
              <label className="text-sm font-medium">Wohnung auswählen</label>
              <Select 
                value={selectedApartment?.id || ''} 
                onValueChange={(value) => {
                  const apartment = apartments.find(a => a.id === value);
                  setSelectedApartment(apartment || null);
                  setProcessedContent('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wohnung auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {apartments.map((apartment) => (
                    <SelectItem key={apartment.id} value={apartment.id}>
                      {apartment.address} ({apartment.rooms} Zimmer)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleGenerate}
                disabled={!selectedTemplate || !selectedTenant || !selectedApartment}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-2" />
                Vorschau generieren
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Dokumentvorschau</CardTitle>
              {processedContent && (
                <Button 
                  onClick={handleDownloadPDF}
                  disabled={isGenerating}
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Generiere...' : 'PDF herunterladen'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {processedContent ? (
              <div className="border rounded-md">
                <TemplateEditor
                  content={processedContent}
                  readOnly={true}
                  className="min-h-[400px]"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] border rounded-md bg-gray-50">
                <div className="text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2" />
                  <p>Wählen Sie Vorlage, Mieter und Wohnung aus</p>
                  <p className="text-sm">um eine Vorschau zu generieren</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## API Integration Examples

### Template API Routes

```typescript
// app/api/templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = createClient();
  
  try {
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  try {
    const body = await request.json();
    const { name, category, content } = body;

    const { data: template, error } = await supabase
      .from('templates')
      .insert([{ name, category, content }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
```

### Document Generation API

```typescript
// app/api/documents/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  try {
    const { content, filename } = await request.json();

    // Launch puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${filename}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .mention-variable { background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;

    await page.setContent(htmlContent);

    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    });

    await browser.close();

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
```

## Testing Integration

### Component Testing with Template Editor

```tsx
// __tests__/template-integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateCreateModal } from '@/components/template-create-modal';

const mockOnSave = jest.fn();
const mockOnClose = jest.fn();

describe('TemplateCreateModal Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create template with mention variables', async () => {
    const user = userEvent.setup();
    
    render(
      <TemplateCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Fill in template name
    const nameInput = screen.getByLabelText(/vorlagenname/i);
    await user.type(nameInput, 'Test Template');

    // Select category
    const categorySelect = screen.getByRole('combobox');
    await user.click(categorySelect);
    await user.click(screen.getByText('Mail'));

    // Type in editor with mention
    const editor = screen.getByRole('textbox');
    await user.click(editor);
    await user.type(editor, 'Hallo @');

    // Wait for suggestion modal
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    // Select a mention variable
    const suggestion = screen.getByText('Mieter.Name');
    await user.click(suggestion);

    // Submit form
    const submitButton = screen.getByText('Vorlage erstellen');
    await user.click(submitButton);

    // Verify save was called with correct data
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Template',
          category: 'Mail',
          content: expect.stringContaining('Mieter.Name'),
        })
      );
    });
  });
});
```

This comprehensive integration guide provides practical examples for using the enhanced template editor in various contexts within the property management system, from simple modal integration to complex document generation workflows.