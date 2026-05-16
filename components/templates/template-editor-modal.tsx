'use client';

import { useState, useEffect, useTransition, useCallback, useMemo, useReducer } from 'react';
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
import dynamic from 'next/dynamic';

const TemplateEditor = dynamic(
  () => import('@/components/templates/template-editor').then((mod) => mod.TemplateEditor),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Spinner className="size-8" />
      </div>
    )
  }
);

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
import { motion, AnimatePresence, m, LazyMotion, domAnimation } from 'framer-motion';
import { cn } from '@/lib/utils';

// --- Types & Schemas ---

const categorySchema = z.object({
  kategorie: z.enum(TEMPLATE_CATEGORIES, {
    required_error: 'Bitte wählen Sie eine Kategorie aus.',
    invalid_type_error: 'Ungültige Kategorie ausgewählt.',
  }),
});

const templateSchema = z.object({
  titel: z.string().min(3).max(100).regex(/^[a-zA-ZäöüÄÖÜß0-9\s\-_.,!?()]+$/),
  inhalt: z.any().refine(c => c && !isEmptyTipTapContent(c)),
  kategorie: z.enum(TEMPLATE_CATEGORIES),
});

type CategoryFormData = z.infer<typeof categorySchema>;
type TemplateFormData = z.infer<typeof templateSchema>;
type Step = 'category' | 'editor';

type EditorState = {
  step: Step;
  selectedCategory: TemplateCategory | null;
  editorContent: JSONContent | undefined;
  validationErrors: string[];
};

type EditorAction =
  | { type: 'RESET'; template?: any }
  | { type: 'SET_STEP'; step: Step }
  | { type: 'SET_CATEGORY'; category: TemplateCategory }
  | { type: 'SET_CONTENT'; content: JSONContent }
  | { type: 'SET_ERRORS'; errors: string[] };

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'RESET':
      return {
        step: action.template ? 'editor' : 'category',
        selectedCategory: action.template?.kategorie || null,
        editorContent: action.template?.inhalt,
        validationErrors: [],
      };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.category };
    case 'SET_CONTENT':
      return { ...state, editorContent: action.content, validationErrors: [] };
    case 'SET_ERRORS':
      return { ...state, validationErrors: action.errors };
    default:
      return state;
  }
}

// --- Main Component ---

export function TemplateEditorModal({ isOpen, onClose, template, onSave }: TemplateEditorModalProps) {
  const [state, dispatch] = useReducer(editorReducer, {
    step: template ? 'editor' : 'category',
    selectedCategory: template?.kategorie || null,
    editorContent: template?.inhalt,
    validationErrors: [],
  });

  const [isPending, startTransition] = useTransition();

  const { setTemplateEditorModalDirty, isTemplateEditorModalDirty, closeTemplateEditorModal } = useModalStore();

  useEffect(() => {
    if (isOpen) {
      dispatch({ type: 'RESET', template });
      setTemplateEditorModalDirty(false);
    }
  }, [isOpen, template, setTemplateEditorModalDirty]);

  const { editorId, handleModalOpen, handleModalClose } = useTemplateAccessibility({
    isEditorOpen: isOpen,
    onKeyboardShortcut: (shortcut) => {
      if (shortcut === KEYBOARD_SHORTCUTS.save && state.step === 'editor' && !isPending) {
        templateForm.handleSubmit(handleTemplateSave)();
      } else if (shortcut === KEYBOARD_SHORTCUTS.closeModal) {
        closeTemplateEditorModal();
      }
    },
  });

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { kategorie: template?.kategorie },
  });

  const templateForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      titel: template?.titel || '',
      inhalt: template?.inhalt,
      kategorie: template?.kategorie,
    },
  });

  useEffect(() => {
    if (isOpen) {
      categoryForm.reset({ kategorie: template?.kategorie });
      templateForm.reset({
        titel: template?.titel || '',
        inhalt: template?.inhalt,
        kategorie: template?.kategorie,
      });
    }
  }, [isOpen, template, categoryForm, templateForm]);

  const handleCategorySelect = (category: TemplateCategory) => {
    dispatch({ type: 'SET_CATEGORY', category });
    categoryForm.setValue('kategorie', category);
  };

  const handleCategorySubmit = (data: CategoryFormData) => {
    dispatch({ type: 'SET_CATEGORY', category: data.kategorie });
    templateForm.setValue('kategorie', data.kategorie);
    dispatch({ type: 'SET_STEP', step: 'editor' });
  };

  const handleTemplateSave = async (data: TemplateFormData) => {
    if (!state.editorContent) {
      templateForm.setError('inhalt', { message: 'Der Inhalt darf nicht leer sein.' });
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          titel: data.titel.trim(),
          inhalt: state.editorContent,
          kategorie: data.kategorie,
          kontext_anforderungen: [],
        };

        const validation = validateTemplate(payload);
        if (!validation.isValid) {
          validation.errors.forEach(e => templateForm.setError(e.field as any, { message: e.message }));
          return;
        }

        if (!validateMentionVariables(state.editorContent!).isValid) {
          templateForm.setError('inhalt', { message: 'Der Inhalt enthält ungültige Variablen.' });
          return;
        }

        await onSave(template ? { ...payload, id: template.id } : payload);
        setTemplateEditorModalDirty(false);
      } catch (error) {
        dispatch({ type: 'SET_ERRORS', errors: [error instanceof Error ? error.message : 'Fehler beim Speichern'] });
      }
    });
  };

  const handleEditorChange = (_html: string, json: JSONContent) => {
    dispatch({ type: 'SET_CONTENT', content: json });
    templateForm.setValue('inhalt', json);
    setTemplateEditorModalDirty(true);
    if (templateForm.formState.errors.inhalt) templateForm.clearErrors('inhalt');
  };

  const handleTitleChange = (value: string) => {
    templateForm.setValue('titel', value);
    setTemplateEditorModalDirty(true);
    if (templateForm.formState.errors.titel) templateForm.clearErrors('titel');
  };

  useModalKeyboardNavigation({
    isOpen,
    onClose: closeTemplateEditorModal,
    isDirty: isTemplateEditorModalDirty,
    onAttemptClose: closeTemplateEditorModal,
    enableArrowNavigation: false,
  });

  useEffect(() => {
    if (isOpen) handleModalOpen();
    else handleModalClose();
  }, [isOpen, handleModalOpen, handleModalClose]);

  return (
    <LazyMotion features={domAnimation}>
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeTemplateEditorModal()}>
        <DialogContent
          id={editorId}
          className="max-w-[95vw] sm:max-w-5xl lg:max-w-6xl h-[90vh] sm:h-[83vh] overflow-hidden flex flex-col p-0 gap-0 border border-primary/10 bg-background rounded-[24px] shadow-2xl"
          isDirty={isTemplateEditorModalDirty}
          onAttemptClose={closeTemplateEditorModal}
          role="dialog"
          aria-labelledby={`${editorId}-title`}
          aria-describedby={`${editorId}-description`}
        >
          <DialogTitle id={`${editorId}-title`} className="sr-only">
            {template ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}
          </DialogTitle>
          <DialogDescription id={`${editorId}-description`} className="sr-only">
            {template ? 'Bearbeiten Sie Ihre bestehende Vorlage' : 'Erstellen Sie eine neue Dokumentvorlage'}
          </DialogDescription>

          <HeaderSection 
            template={template} 
            step={state.step} 
            onBack={() => dispatch({ type: 'SET_STEP', step: 'category' })}
            templateForm={templateForm}
            onTitleChange={handleTitleChange}
            setSelectedCategory={(c: TemplateCategory) => dispatch({ type: 'SET_CATEGORY', category: c })}
          />

          <div className="flex-1 overflow-hidden relative bg-background">
            <AnimatePresence mode="wait">
              {state.step === 'category' ? (
                <CategoryStep 
                  categoryForm={categoryForm}
                  onCategorySelect={handleCategorySelect}
                  onCategorySubmit={handleCategorySubmit}
                  selectedCategory={state.selectedCategory}
                />
              ) : (
                <EditorStep 
                  templateForm={templateForm}
                  editorContent={state.editorContent}
                  onEditorChange={handleEditorChange}
                  onCancel={() => closeTemplateEditorModal({ force: true })}
                  onSave={templateForm.handleSubmit(handleTemplateSave)}
                  isPending={isPending}
                  isDirty={isTemplateEditorModalDirty}
                  hasTemplate={!!template}
                />
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </LazyMotion>
  );
}

// --- Internal Sub-components ---

function HeaderSection({ template, step, onBack, templateForm, onTitleChange, setSelectedCategory }: any) {
  return (
    <div className="flex-shrink-0 px-6 pt-1 pb-3 border-b flex items-center justify-between bg-muted/20 backdrop-blur-md">
      <div className="flex items-center gap-4 flex-1">
        {!template && step === 'editor' && (
          <Button variant="ghost" size="icon" className="-ml-2 size-8 text-muted-foreground hover:text-primary rounded-full transition-colors" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
        )}
        <div className="text-primary"><FileText size={24} className="stroke-[2]" /></div>
        <div className="flex-1 min-w-0">
          {step === 'editor' ? (
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <Controller
                  control={templateForm.control}
                  name="titel"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <Input {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); onTitleChange(e.target.value); }} placeholder="Titel der Vorlage eingeben" className="text-xl font-semibold text-foreground bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-primary/10 focus-visible:bg-primary/5 rounded-xl px-2 py-1 w-full max-w-md transition-all placeholder:text-muted-foreground/30 h-auto" />
                      {templateForm.formState.errors.titel && <span className="text-xs text-destructive mt-1 ml-2">{templateForm.formState.errors.titel.message}</span>}
                    </div>
                  )}
                />
              </div>
              <div className="flex-shrink-0">
                <Controller
                  control={templateForm.control}
                  name="kategorie"
                  render={({ field }) => (
                    <Select onValueChange={(value) => { field.onChange(value); setSelectedCategory(value as TemplateCategory); }} value={field.value}>
                      <SelectTrigger className="w-[180px] h-10"><SelectValue placeholder="Kategorie wählen" /></SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_CATEGORIES.map((cat) => {
                          const meta = TEMPLATE_TYPE_CONFIGS[cat];
                          const Icon = TEMPLATE_ICON_MAP[meta.icon];
                          return <SelectItem key={cat} value={cat}><div className="flex items-center gap-2"><Icon className="size-4" /><span>{meta.label}</span></div></SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          ) : (
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{template ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</h2>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryStep({ categoryForm, onCategorySelect, onCategorySubmit, selectedCategory }: any) {
  return (
    <m.div key="category-step" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col p-6 sm:p-10 overflow-y-auto">
      <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col justify-center">
        <div className="text-center mb-10">
          <h3 className="text-3xl font-semibold mb-3 text-foreground tracking-tight">Was möchten Sie erstellen?</h3>
          <p className="text-muted-foreground text-lg">Wählen Sie eine Kategorie, um mit der passenden Struktur zu starten.</p>
        </div>
        <Form {...categoryForm}>
          <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-8">
            <FormField control={categoryForm.control} name="kategorie" render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {TEMPLATE_CATEGORIES.map((category) => {
                    const meta = TEMPLATE_TYPE_CONFIGS[category];
                    const Icon = TEMPLATE_ICON_MAP[meta.icon];
                    const isSelected = field.value === category;
                    return (
                      <m.div key={category} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <button type="button" onClick={() => onCategorySelect(category)} className={cn("w-full text-left relative overflow-hidden rounded-[32px] border transition-all duration-300 h-full flex flex-col gap-6 p-8", isSelected ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10 ring-4 ring-primary/5" : "border-primary/10 bg-muted/10 hover:border-primary/30 hover:bg-muted/20")}>
                          <div className={cn("size-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm", isSelected ? "bg-primary text-primary-foreground scale-110 rotate-3" : "bg-background text-primary/40")}><Icon className="size-7" /></div>
                          <div className="space-y-2"><h4 className={cn("font-semibold text-xl tracking-tight", isSelected ? "text-primary" : "text-foreground/80")}>{meta.label}</h4><p className="text-sm text-muted-foreground leading-relaxed">{meta.description}</p></div>
                          {isSelected && <div className="absolute top-6 right-6 text-primary size-8 rounded-full bg-white flex items-center justify-center shadow-lg animate-in zoom-in-0"><Check className="size-5" /></div>}
                        </button>
                      </m.div>
                    );
                  })}
                </div>
                <FormMessage className="text-center mt-4" />
              </FormItem>
            )} />
            <div className="flex justify-center pt-6"><Button type="submit" disabled={!selectedCategory} className="min-w-[200px] h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/20 transition-all font-bold text-lg group">Weiter<ChevronRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" /></Button></div>
          </form>
        </Form>
      </div>
    </m.div>
  );
}

function EditorStep({ templateForm, editorContent, onEditorChange, onCancel, onSave, isPending, isDirty, hasTemplate }: any) {
  return (
    <m.div key="editor-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full flex flex-col">
      <Form {...templateForm}>
        <form onSubmit={onSave} className="flex-1 flex flex-col overflow-hidden">
          <FormField control={templateForm.control} name="inhalt" render={() => (
            <div className="flex-1 overflow-auto bg-background p-0">
              <TemplateEditor content={editorContent} onChange={onEditorChange} placeholder="Beginnen Sie mit der Eingabe… Verwenden Sie @ für Variablen wie @Mieter.Name" className="flex-1 border-0 focus-within:ring-0 rounded-none h-full" />
              {templateForm.formState.errors.inhalt && <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-destructive text-white text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-2 z-50"><div className="flex items-center gap-2"><AlertCircle className="size-4" />{templateForm.formState.errors.inhalt.message as string}</div></div>}
            </div>
          )} />
          <footer className="flex-shrink-0 flex items-center justify-end gap-3 px-6 pb-4 pt-4 bg-transparent border-t">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending} className="px-6 h-12 rounded-full font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">Abbrechen</Button>
            <Button type="submit" disabled={!isDirty || isPending} className="flex items-center gap-2 px-10 h-12 rounded-full font-bold bg-primary hover:bg-primary/95 transition-all disabled:opacity-50 group">{isPending ? <><Spinner className="size-5 mr-2" />Speichert…</> : <><Save size={18} className="transition-transform group-hover:scale-110" /><span>{hasTemplate ? 'Änderungen speichern' : 'Vorlage erstellen'}</span></>}</Button>
          </footer>
        </form>
      </Form>
    </m.div>
  );
}
