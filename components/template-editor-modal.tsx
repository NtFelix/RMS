'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { JSONContent } from '@tiptap/react';
import { useModalStore } from '@/hooks/use-modal-store';
import { useModalKeyboardNavigation } from '@/hooks/use-modal-keyboard-navigation';
import { useTemplateAccessibility } from '@/hooks/use-template-accessibility';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { TemplateEditor } from '@/components/template-editor';
import { TEMPLATE_CATEGORIES, TemplateCategory } from '@/lib/template-constants';
import { ARIA_LABELS, KEYBOARD_SHORTCUTS } from '@/lib/accessibility-constants';
import { TemplateEditorModalProps } from '@/types/template';
import { validateTemplate, validateMentionVariables, isEmptyTipTapContent } from '@/lib/template-validation';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, Save, X, AlertCircle } from 'lucide-react';

// Enhanced form validation schemas
const categorySchema = z.object({
  kategorie: z.enum(TEMPLATE_CATEGORIES, {
    required_error: 'Bitte wählen Sie eine Kategorie aus.',
    invalid_type_error: 'Ungültige Kategorie ausgewählt.',
  }),
});

const templateSchema = z.object({
  titel: z
    .string({
      required_error: 'Der Titel ist erforderlich.',
      invalid_type_error: 'Der Titel muss ein Text sein.',
    })
    .min(3, 'Der Titel muss mindestens 3 Zeichen lang sein.')
    .max(100, 'Der Titel darf maximal 100 Zeichen lang sein.')
    .regex(/^[a-zA-ZäöüÄÖÜß0-9\s\-_.,!?()]+$/, 'Der Titel enthält ungültige Zeichen.'),
  inhalt: z.any().refine(
    (content) => {
      if (!content) return false;
      return !isEmptyTipTapContent(content);
    },
    {
      message: 'Der Inhalt darf nicht leer sein.',
    }
  ).refine(
    (content) => {
      if (!content) return false;
      const mentionValidation = validateMentionVariables(content);
      return mentionValidation.isValid;
    },
    {
      message: 'Der Inhalt enthält ungültige Variablen.',
    }
  ),
  kategorie: z.enum(TEMPLATE_CATEGORIES, {
    required_error: 'Bitte wählen Sie eine Kategorie aus.',
    invalid_type_error: 'Ungültige Kategorie ausgewählt.',
  }),
});

type CategoryFormData = z.infer<typeof categorySchema>;
type TemplateFormData = z.infer<typeof templateSchema>;

type Step = 'category' | 'editor';

export function TemplateEditorModal({
  isOpen,
  onClose,
  template,
  onSave,
}: TemplateEditorModalProps) {
  const [step, setStep] = useState<Step>('category');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | null>(null);
  const [editorContent, setEditorContent] = useState<JSONContent | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { setTemplateEditorModalDirty, isTemplateEditorModalDirty } = useModalStore();

  // Accessibility hook
  const {
    editorId,
    handleModalOpen,
    handleModalClose,
  } = useTemplateAccessibility({
    isEditorOpen: isOpen,
    onKeyboardShortcut: (shortcut) => {
      switch (shortcut) {
        case KEYBOARD_SHORTCUTS.save:
          if (step === 'editor' && !isLoading) {
            templateForm.handleSubmit(handleTemplateSave)();
          }
          break;
        case KEYBOARD_SHORTCUTS.closeModal:
          handleClose();
          break;
      }
    },
  });

  // Category selection form
  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      kategorie: template?.kategorie || undefined,
    },
  });

  // Template editor form
  const templateForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      titel: template?.titel || '',
      inhalt: template?.inhalt || undefined,
      kategorie: template?.kategorie || undefined,
    },
  });

  // Reset form and state when modal opens/closes or template changes
  useEffect(() => {
    if (isOpen) {
      setIsLoading(false);
      setValidationErrors([]);
      
      if (template) {
        // Editing existing template - skip category selection
        setSelectedCategory(template.kategorie);
        setStep('editor');
        templateForm.reset({
          titel: template.titel,
          inhalt: template.inhalt,
          kategorie: template.kategorie,
        });
        setEditorContent(template.inhalt);
      } else {
        // Creating new template - start with category selection
        setStep('category');
        setSelectedCategory(null);
        categoryForm.reset({ kategorie: undefined });
        templateForm.reset({
          titel: '',
          inhalt: undefined,
          kategorie: undefined,
        });
        setEditorContent(undefined);
      }
      setTemplateEditorModalDirty(false);
    }
  }, [isOpen, template, categoryForm, templateForm, setTemplateEditorModalDirty]);

  // Handle category selection
  const handleCategorySubmit = (data: CategoryFormData) => {
    setSelectedCategory(data.kategorie);
    templateForm.setValue('kategorie', data.kategorie);
    setStep('editor');
  };

  // Handle template save
  const handleTemplateSave = async (data: TemplateFormData) => {
    try {
      setIsLoading(true);
      setValidationErrors([]);

      // Client-side validation
      if (!editorContent) {
        templateForm.setError('inhalt', {
          type: 'required',
          message: 'Der Inhalt darf nicht leer sein.',
        });
        return;
      }

      // Comprehensive validation
      const templatePayload = {
        titel: data.titel.trim(),
        inhalt: editorContent,
        kategorie: data.kategorie,
        kontext_anforderungen: [], // Will be populated based on mentions in content
      };

      const validation = validateTemplate(templatePayload);
      if (!validation.isValid) {
        const errors = validation.errors.map(error => error.message);
        setValidationErrors(errors);
        
        // Set form errors
        validation.errors.forEach(error => {
          if (error.field === 'titel') {
            templateForm.setError('titel', { message: error.message });
          } else if (error.field === 'inhalt') {
            templateForm.setError('inhalt', { message: error.message });
          } else if (error.field === 'kategorie') {
            templateForm.setError('kategorie', { message: error.message });
          }
        });

        toast({
          title: 'Validierungsfehler',
          description: 'Bitte korrigieren Sie die Fehler im Formular.',
          variant: 'destructive',
        });
        return;
      }

      // Validate mention variables
      const mentionValidation = validateMentionVariables(editorContent);
      if (!mentionValidation.isValid) {
        const mentionErrors = mentionValidation.errors.map(error => error.message);
        setValidationErrors(mentionErrors);
        
        templateForm.setError('inhalt', {
          message: 'Der Inhalt enthält ungültige Variablen.',
        });

        toast({
          title: 'Ungültige Variablen',
          description: 'Bitte überprüfen Sie die verwendeten @-Variablen.',
          variant: 'destructive',
        });
        return;
      }

      // Pass the template ID along with the payload if we're editing an existing template
      const saveData = template ? { ...templatePayload, id: template.id } : templatePayload;
      await onSave(saveData);
      setTemplateEditorModalDirty(false);
    } catch (error) {
      console.error('Error saving template:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Speichern';
      setValidationErrors([errorMessage]);
      
      toast({
        title: 'Speicherfehler',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle editor content change
  const handleEditorChange = (html: string, json: JSONContent) => {
    setEditorContent(json);
    templateForm.setValue('inhalt', json);
    setTemplateEditorModalDirty(true);
    
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
    
    // Clear form errors for content
    if (templateForm.formState.errors.inhalt) {
      templateForm.clearErrors('inhalt');
    }
  };

  // Handle template name change
  const handleTitleChange = (value: string) => {
    templateForm.setValue('titel', value);
    setTemplateEditorModalDirty(true);
    
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
    
    // Clear form errors for title
    if (templateForm.formState.errors.titel) {
      templateForm.clearErrors('titel');
    }
  };

  // Handle back to category selection
  const handleBackToCategory = () => {
    if (template) {
      // If editing existing template, don't allow going back to category
      return;
    }
    setStep('category');
  };

  // Handle modal close with dirty check
  const handleClose = () => {
    if (isTemplateEditorModalDirty) {
      // This will be handled by the Dialog component's isDirty prop
      return;
    }
    onClose();
  };

  // Handle attempt to close when dirty
  const handleAttemptClose = () => {
    // Reset forms and state
    setStep('category');
    setSelectedCategory(null);
    setEditorContent(undefined);
    setTemplateEditorModalDirty(false);
    categoryForm.reset();
    templateForm.reset();
    onClose();
  };

  // Set up keyboard navigation
  useModalKeyboardNavigation({
    isOpen,
    onClose: handleClose,
    isDirty: isTemplateEditorModalDirty,
    onAttemptClose: handleAttemptClose,
    enableArrowNavigation: true,
  });

  // Handle modal open/close for accessibility
  useEffect(() => {
    if (isOpen) {
      handleModalOpen();
    } else {
      handleModalClose();
    }
  }, [isOpen, handleModalOpen, handleModalClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        id={editorId}
        className="max-w-[95vw] sm:max-w-4xl h-[90vh] min-h-[90vh] max-h-[90vh] overflow-hidden flex flex-col"
        isDirty={isTemplateEditorModalDirty}
        onAttemptClose={handleAttemptClose}
        role="dialog"
        aria-labelledby={`${editorId}-title`}
        aria-describedby={`${editorId}-description`}
      >
        <DialogHeader className="flex-shrink-0 px-4 sm:px-6">
          <DialogTitle 
            id={`${editorId}-title`}
            className="flex items-center gap-2 text-lg sm:text-xl"
          >
            <FileText className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">
              {template ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}
            </span>
            <span className="sm:hidden">
              {template ? 'Bearbeiten' : 'Erstellen'}
            </span>
          </DialogTitle>
          <DialogDescription 
            id={`${editorId}-description`}
            className="text-sm"
          >
            {template 
              ? 'Bearbeiten Sie Ihre bestehende Vorlage'
              : 'Erstellen Sie eine neue Dokumentvorlage mit dynamischen Variablen'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-4 sm:px-6">
          {step === 'category' && (
            <div className="space-y-4 sm:space-y-6">
              <div 
                className="text-sm text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                <span className="hidden sm:inline">Schritt 1 von 2: Wählen Sie eine Kategorie für Ihre Vorlage</span>
                <span className="sm:hidden">Schritt 1/2: Kategorie wählen</span>
              </div>

              <Form {...categoryForm}>
                <form
                  onSubmit={categoryForm.handleSubmit(handleCategorySubmit)}
                  className="space-y-6"
                  role="form"
                  aria-labelledby={`${editorId}-category-form-title`}
                >
                  <h3 id={`${editorId}-category-form-title`} className="sr-only">
                    Kategorie für neue Vorlage auswählen
                  </h3>
                  
                  <FormField
                    control={categoryForm.control}
                    name="kategorie"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategorie</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger aria-label={ARIA_LABELS.categorySelection}>
                              <SelectValue placeholder="Kategorie auswählen..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TEMPLATE_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onClose} 
                      className="w-full sm:w-auto"
                      aria-label={ARIA_LABELS.cancelButton}
                    >
                      <X className="h-4 w-4 mr-2" aria-hidden="true" />
                      Abbrechen
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto">
                      Weiter
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}

          {step === 'editor' && (
            <div className="space-y-4 sm:space-y-6 h-full flex flex-col">
              <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  {!template && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToCategory}
                      className="p-2"
                      aria-label="Zurück zur Kategorieauswahl"
                      disabled={isLoading}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <span className="hidden sm:inline">
                      {template ? 'Bearbeitung der Vorlage' : 'Schritt 2 von 2: Vorlage erstellen'}
                    </span>
                    <span className="sm:hidden">
                      {template ? 'Bearbeiten' : 'Schritt 2/2'}
                    </span>
                    {selectedCategory && (
                      <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                        {selectedCategory}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Validation Errors Display */}
              {validationErrors.length > 0 && (
                <div 
                  className="flex-shrink-0 p-3 sm:p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
                  role="alert"
                  aria-labelledby={`${editorId}-validation-title`}
                  aria-describedby={`${editorId}-validation-list`}
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="space-y-1">
                      <h4 
                        id={`${editorId}-validation-title`}
                        className="text-sm font-medium text-destructive"
                      >
                        Validierungsfehler
                      </h4>
                      <ul 
                        id={`${editorId}-validation-list`}
                        className="text-sm text-destructive/80 space-y-1"
                      >
                        {validationErrors.map((error, index) => (
                          <li key={index} className="flex items-start gap-1">
                            <span className="text-xs" aria-hidden="true">•</span>
                            <span className="break-words">{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <Form {...templateForm}>
                <form
                  onSubmit={templateForm.handleSubmit(handleTemplateSave)}
                  className="space-y-4 h-full flex flex-col"
                >
                  <FormField
                    control={templateForm.control}
                    name="titel"
                    render={({ field }) => (
                      <FormItem className="flex-shrink-0">
                        <FormLabel>Titel der Vorlage</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="z.B. Mietvertrag Standard, Mahnung..."
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleTitleChange(e.target.value);
                            }}
                            className="text-sm sm:text-base"
                            aria-label={ARIA_LABELS.templateNameInput}
                            aria-describedby={`${editorId}-title-help`}
                          />
                        </FormControl>
                        <div id={`${editorId}-title-help`} className="sr-only">
                          Geben Sie einen aussagekräftigen Namen für Ihre Vorlage ein
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={templateForm.control}
                    name="inhalt"
                    render={() => (
                      <FormItem className="flex-1 flex flex-col">
                        <FormLabel>Inhalt</FormLabel>
                        <FormControl>
                          <div className="flex-1">
                            <TemplateEditor
                              content={editorContent}
                              onChange={handleEditorChange}
                              placeholder="Beginnen Sie mit der Eingabe... Verwenden Sie @ für Variablen wie @Mieter.Name oder @Wohnung.Adresse"
                              className="h-full min-h-[250px] sm:min-h-[300px]"
                              aria-label={ARIA_LABELS.templateContentEditor}
                              aria-describedby={`${editorId}-content-help`}
                            />
                            <div id={`${editorId}-content-help`} className="sr-only">
                              Rich-Text-Editor für Vorlageninhalt. Verwenden Sie @ um Variablen einzufügen. Nutzen Sie die Toolbar für Formatierungen.
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col sm:flex-row justify-end gap-2 flex-shrink-0 pt-4 border-t">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleClose}
                      disabled={isLoading}
                      className="w-full sm:w-auto"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Abbrechen
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={!isTemplateEditorModalDirty || isLoading}
                      className="w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {isLoading ? (
                        <>
                          <Spinner className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Speichert...</span>
                          <span className="sm:hidden">Wird gespeichert...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">
                            {template ? 'Änderungen speichern' : 'Vorlage erstellen'}
                          </span>
                          <span className="sm:hidden">
                            {template ? 'Speichern' : 'Erstellen'}
                          </span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}