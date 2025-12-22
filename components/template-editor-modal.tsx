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
import { TemplateEditor } from '@/components/template-editor';
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
  ChevronRight
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

  const handleNextStep = () => {
    categoryForm.handleSubmit(handleCategorySubmit)();
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
      <DialogContent
        id={editorId}
        className="max-w-[95vw] sm:max-w-5xl lg:max-w-6xl h-[90vh] sm:h-[83vh] overflow-hidden flex flex-col p-0 gap-0 border-0 bg-background/95 backdrop-blur-xl shadow-2xl"
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
        <div className="flex-shrink-0 px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3 w-full">
            {!template && step === 'editor' && (
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleBackToCategory}
                aria-label="Zurück zur Kategorieauswahl"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="p-2 rounded-lg bg-primary/5 text-primary">
              <FileText className="h-5 w-5" />
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
                            className="text-lg font-semibold tracking-tight border-0 pl-2 pr-0 h-auto bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50 w-full"
                            aria-label="Titel der Vorlage"
                          />
                          {templateForm.formState.errors.titel && (
                            <span className="text-xs text-destructive">{templateForm.formState.errors.titel.message}</span>
                          )}
                        </div>
                      )}
                    />
                  </div>
                  <div className="flex-shrink-0 w-[160px]">
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
                          <SelectTrigger className="h-9 text-xs bg-muted/30 border-muted-foreground/10 hover:bg-muted/50 transition-colors">
                            <SelectValue placeholder="Kategorie" />
                          </SelectTrigger>
                          <SelectContent>
                            {TEMPLATE_CATEGORIES.map((cat) => {
                              const meta = TEMPLATE_TYPE_CONFIGS[cat];
                              const Icon = TEMPLATE_ICON_MAP[meta.icon];
                              return (
                                <SelectItem key={cat} value={cat}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs">{meta.label}</span>
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
                  <h2 className="text-lg font-semibold tracking-tight">
                    {template ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
                  </h2>
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    {step === 'category'
                      ? 'Wählen Sie einen Vorlagentyp'
                      : (template ? 'Bearbeiten Sie die Details der Vorlage' : 'Füllen Sie die Details der neuen Vorlage aus')
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {step === 'category' && (
              <motion.div
                key="category-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col p-6 sm:p-10 overflow-y-auto"
              >
                <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col justify-center">
                  <div className="text-center mb-10">
                    <h3 className="text-2xl font-semibold mb-2">Was möchten Sie erstellen?</h3>
                    <p className="text-muted-foreground">Wählen Sie eine Kategorie, um mit der passenden Struktur zu starten.</p>
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
                                        "w-full text-left relative overflow-hidden rounded-[2.5rem] border-2 p-6 transition-all duration-200 h-full flex flex-col gap-4",
                                        isSelected
                                          ? "border-primary bg-primary/5 shadow-md"
                                          : "border-muted bg-card hover:border-primary/50 hover:shadow-sm"
                                      )}
                                    >
                                      <div className={cn(
                                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                                        meta.color.full
                                      )}>
                                        <Icon className="h-6 w-6" />
                                      </div>

                                      <div className="space-y-1">
                                        <h4 className="font-semibold text-lg">{meta.label}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                          {meta.description}
                                        </p>
                                      </div>

                                      {isSelected && (
                                        <div className="absolute top-4 right-4 text-primary">
                                          <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                            <Check className="h-3.5 w-3.5" />
                                          </div>
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
                    </form>
                  </Form>
                </div>

                <div className="flex justify-end mt-8 border-t pt-6">
                  <Button
                    onClick={handleNextStep}
                    size="lg"
                    disabled={!selectedCategory}
                    className="min-w-[140px]"
                  >
                    Weiter
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
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
                        <div className="flex-1 overflow-auto p-6">
                          <div className="h-full rounded-xl overflow-hidden border bg-background flex flex-col">
                            <TemplateEditor
                              content={editorContent}
                              onChange={handleEditorChange}
                              placeholder="Beginnen Sie mit der Eingabe... Verwenden Sie @ für Variablen wie @Mieter.Name oder @Wohnung.Adresse"
                              className="flex-1 border-0 focus-within:ring-0 rounded-none min-h-[400px]"
                            />
                            {templateForm.formState.errors.inhalt && (
                              <div className="px-4 py-2 border-t bg-destructive/5 text-destructive text-xs italic">
                                {templateForm.formState.errors.inhalt.message as string}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    />

                    {/* Row 2: Footer with Save & Abort */}
                    <div className="flex-shrink-0 px-6 py-4 border-t bg-background flex items-center justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelClick}
                        disabled={isLoading}
                      >
                        Abbrechen
                      </Button>
                      <Button
                        type="submit"
                        disabled={!isTemplateEditorModalDirty || isLoading}
                        className="min-w-[120px]"
                      >
                        {isLoading ? (
                          <>
                            <Spinner className="h-4 w-4 mr-2" />
                            Speichert...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {template ? 'Speichern' : 'Erstellen'}
                          </>
                        )}
                      </Button>
                    </div>
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