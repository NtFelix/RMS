'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { TemplateEditor } from '@/components/templates/template-editor';
import { TEMPLATE_CATEGORIES, TemplateCategory, TEMPLATE_TYPE_CONFIGS, TEMPLATE_ICON_MAP } from '@/lib/template-constants';
import { ARIA_LABELS, KEYBOARD_SHORTCUTS } from '@/lib/accessibility-constants';
import { TemplateEditorModalProps } from '@/types/template';
import { validateTemplate, validateMentionVariables, isEmptyTipTapContent } from '@/lib/template-validation';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  FileText,
  Save,
  AlertCircle,
  Mail,
  MoreHorizontal,
  Check,
  ChevronRight,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


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

  const {
    setTemplateEditorModalDirty,
    isTemplateEditorModalDirty,
    closeTemplateEditorModal
  } = useModalStore();

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
          handleAttemptClose();
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
  const handleCategorySelect = (category: TemplateCategory) => {
    setSelectedCategory(category);
    categoryForm.setValue('kategorie', category);
  };

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

  // Handle attempt to close (called by Dialog component when dirty)
  const handleAttemptClose = () => {
    closeTemplateEditorModal(); // Store handles confirmation and cleanup
  };

  // Handle cancel button click (force close)
  const handleCancelClick = () => {
    closeTemplateEditorModal({ force: true }); // Force close without confirmation
  };

  // Set up keyboard navigation
  useModalKeyboardNavigation({
    isOpen,
    onClose: handleAttemptClose,
    isDirty: isTemplateEditorModalDirty,
    onAttemptClose: handleAttemptClose,
    enableArrowNavigation: false,
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
      <DialogContent
        id={editorId}
        className="max-w-[95vw] sm:max-w-5xl lg:max-w-6xl h-[90vh] sm:h-[83vh] overflow-hidden flex flex-col p-0 gap-0 border border-primary/10 bg-background rounded-[24px] shadow-2xl"
        isDirty={isTemplateEditorModalDirty}
        onAttemptClose={handleAttemptClose}
        role="dialog"
        aria-labelledby={`${editorId}-title`}
        aria-describedby={`${editorId}-description`}
      >
        {/* Invisible Titles for Screen Readers */}
        <DialogTitle id={`${editorId}-title`} className="sr-only">
          {template ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}
        </DialogTitle>
        <DialogDescription id={`${editorId}-description`} className="sr-only">
          {template
            ? 'Bearbeiten Sie Ihre bestehende Vorlage'
            : 'Erstellen Sie eine neue Dokumentvorlage mit dynamischen Variablen'
          }
        </DialogDescription>

        {/* Header Section */}
        <div className="flex-shrink-0 px-6 pt-1 pb-3 border-b flex items-center justify-between bg-muted/20 backdrop-blur-md">
          <div className="flex items-center gap-4 flex-1">
            {!template && step === 'editor' && (
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 h-8 w-8 text-muted-foreground hover:text-primary rounded-full transition-colors"
                onClick={handleBackToCategory}
                aria-label="Zurück zur Kategorieauswahl"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="text-primary">
              <FileText size={24} className="stroke-[2]" />
            </div>

            <div className="flex-1 min-w-0">
              {step === 'editor' ? (
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <Controller
                      control={templateForm.control}
                      name="titel"
                      render={({ field }) => (
                        <div className="flex flex-col">
                          <Input
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              field.onChange(e);
                              handleTitleChange(e.target.value);
                            }}
                            placeholder="Titel der Vorlage eingeben"
                            className="text-xl font-bold text-foreground bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-primary/10 focus-visible:bg-primary/5 rounded-xl px-2 py-1 w-full max-w-md transition-all placeholder:text-muted-foreground/30 h-auto"
                            aria-label="Titel der Vorlage"
                          />
                          {templateForm.formState.errors.titel && (
                            <span className="text-xs text-destructive mt-1 ml-2">{templateForm.formState.errors.titel.message}</span>
                          )}
                        </div>
                      )}
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <Controller
                      control={templateForm.control}
                      name="kategorie"
                      render={({ field }) => (
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedCategory(value as TemplateCategory);
                          }}
                          value={field.value}
                        >
                          <SelectTrigger className="w-[180px] h-10">
                            <SelectValue placeholder="Kategorie wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {TEMPLATE_CATEGORIES.map((cat) => {
                              const meta = TEMPLATE_TYPE_CONFIGS[cat];
                              const Icon = TEMPLATE_ICON_MAP[meta.icon];
                              return (
                                <SelectItem key={cat} value={cat}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <span>{meta.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {template ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
                  </h2>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-background">
          <AnimatePresence mode="wait">
            {step === 'category' && (
              <motion.div
                key="category-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col p-6 sm:p-10 overflow-y-auto"
              >
                <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col justify-center">
                  <div className="text-center mb-10">
                    <h3 className="text-3xl font-bold mb-3 text-foreground tracking-tight">Was möchten Sie erstellen?</h3>
                    <p className="text-muted-foreground text-lg">Wählen Sie eine Kategorie, um mit der passenden Struktur zu starten.</p>
                  </div>

                  <Form {...categoryForm}>
                    <form onSubmit={categoryForm.handleSubmit(handleCategorySubmit)} className="space-y-8">
                      <FormField
                        control={categoryForm.control}
                        name="kategorie"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                              {TEMPLATE_CATEGORIES.map((category) => {
                                const meta = TEMPLATE_TYPE_CONFIGS[category];
                                const Icon = TEMPLATE_ICON_MAP[meta.icon];
                                const isSelected = field.value === category;

                                return (
                                  <motion.div
                                    key={category}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleCategorySelect(category)}
                                      className={cn(
                                        "w-full text-left relative overflow-hidden rounded-[32px] border transition-all duration-300 h-full flex flex-col gap-6 p-8",
                                        isSelected
                                          ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10 ring-4 ring-primary/5"
                                          : "border-primary/10 bg-muted/10 hover:border-primary/30 hover:bg-muted/20"
                                      )}
                                    >
                                      <div className={cn(
                                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                                        isSelected ? "bg-primary text-primary-foreground scale-110 rotate-3" : "bg-background text-primary/40"
                                      )}>
                                        <Icon className="h-7 w-7" />
                                      </div>

                                      <div className="space-y-2">
                                        <h4 className={cn(
                                          "font-bold text-xl tracking-tight",
                                          isSelected ? "text-primary" : "text-foreground/80"
                                        )}>{meta.label}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                          {meta.description}
                                        </p>
                                      </div>

                                      {isSelected && (
                                        <div className="absolute top-6 right-6 text-primary h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-lg animate-in zoom-in-0">
                                          <Check className="h-5 w-5" />
                                        </div>
                                      )}
                                    </button>
                                  </motion.div>
                                );
                              })}
                            </div>
                            <FormMessage className="text-center mt-4" />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-center pt-6">
                        <Button
                          type="submit"
                          disabled={!selectedCategory}
                          className="min-w-[200px] h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/20 transition-all font-bold text-lg group"
                        >
                          Weiter
                          <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </motion.div>
            )}

            {step === 'editor' && (
              <motion.div
                key="editor-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full flex flex-col"
              >
                <Form {...templateForm}>
                  <form
                    onSubmit={templateForm.handleSubmit(handleTemplateSave)}
                    className="flex-1 flex flex-col overflow-hidden"
                  >
                    {/* Row 1: Editor Canvas */}
                    <FormField
                      control={templateForm.control}
                      name="inhalt"
                      render={() => (
                        <div className="flex-1 overflow-auto bg-background p-0">
                          <TemplateEditor
                            content={editorContent}
                            onChange={handleEditorChange}
                            placeholder="Beginnen Sie mit der Eingabe... Verwenden Sie @ für Variablen wie @Mieter.Name"
                            className="flex-1 border-0 focus-within:ring-0 rounded-none h-full"
                          />
                          {templateForm.formState.errors.inhalt && (
                            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-destructive text-white text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-2 z-50">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                {templateForm.formState.errors.inhalt.message as string}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    />

                    {/* Row 2: Footer with Save & Abort */}
                    <footer className="flex-shrink-0 flex items-center justify-end gap-3 px-6 pb-4 pt-4 bg-transparent border-t">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancelClick}
                        disabled={isLoading}
                        className="px-6 h-12 rounded-full font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                      >
                        Abbrechen
                      </Button>
                      <Button
                        type="submit"
                        disabled={!isTemplateEditorModalDirty || isLoading}
                        className="flex items-center gap-2 px-10 h-12 rounded-full font-bold bg-primary hover:bg-primary/95 transition-all disabled:opacity-50 group"
                      >
                        {isLoading ? (
                          <>
                            <Spinner className="h-5 w-5 mr-2" />
                            Speichert...
                          </>
                        ) : (
                          <>
                            <Save size={18} className="transition-transform group-hover:scale-110" />
                            <span>{template ? 'Änderungen speichern' : 'Vorlage erstellen'}</span>
                          </>
                        )}
                      </Button>
                    </footer>
                  </form>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}