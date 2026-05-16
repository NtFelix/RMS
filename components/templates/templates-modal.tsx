'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TemplateCard } from '@/components/templates/template-card';
import dynamic from 'next/dynamic';

const TemplateEditorModal = dynamic(
  () => import('@/components/templates/template-editor-modal').then((mod) => mod.TemplateEditorModal),
  { ssr: false }
);

import { useTemplates, useTemplateFilters } from '@/hooks/use-templates';
import { useModalStore } from '@/hooks/use-modal-store';
import { useModalKeyboardNavigation } from '@/hooks/use-modal-keyboard-navigation';
import { useTemplateAccessibility } from '@/hooks/use-template-accessibility';
import { TEMPLATE_CATEGORIES } from '@/lib/template-constants';
import { ARIA_LABELS, KEYBOARD_SHORTCUTS } from '@/lib/accessibility-constants';
import { Template, TemplatePayload } from '@/types/template';
import {
  FileText,
  Plus,
  Filter,
  AlertCircle,
  Loader2,
  Mail,
  MoreHorizontal
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { TEMPLATE_TYPE_CONFIGS, TemplateCategory, TEMPLATE_ICON_MAP } from '@/lib/template-constants';
import { cn } from '@/lib/utils';


interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
}

export function TemplatesModal({ isOpen, onClose, initialCategory }: TemplatesModalProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    openConfirmationModal,
    closeConfirmationModal,
    openTemplateEditorModal,
    closeTemplateEditorModal,
    isTemplateEditorModalOpen,
    templateEditorData,
    setTemplatesModalDirty,
    isTemplatesModalDirty,
  } = useModalStore();

  const {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refreshTemplates,
  } = useTemplates();

  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    filteredTemplates,
    groupedTemplates,
  } = useTemplateFilters(templates, initialCategory);

  const availableCategories = useMemo(() => {
    const categoriesInUse = new Set(templates.map(t => t.kategorie));
    return TEMPLATE_CATEGORIES.filter(category => categoriesInUse.has(category));
  }, [templates]);

  // Accessibility hook
  const {
    modalId,
    handleModalOpen,
    handleModalClose,
    handleTemplateCardNavigation,
    announceTemplateCreated,
    announceTemplateUpdated,
    announceTemplateDeleted,
    announceFilterApplied,
  } = useTemplateAccessibility({
    isModalOpen: isOpen,
    templateCount: templates.length,
    filteredCount: filteredTemplates.length,
    searchQuery,
    onKeyboardShortcut: (shortcut) => {
      if (shortcut === KEYBOARD_SHORTCUTS.closeModal) handleClose();
    },
  });

  const handleCreateTemplate = () => {
    if (isCreating) return;
    openTemplateEditorModal(undefined, handleSaveTemplate);
  };

  const handleEditTemplate = (template: Template) => {
    openTemplateEditorModal(template, handleSaveTemplate);
  };

  const handleDeleteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    openConfirmationModal({
      title: 'Vorlage löschen',
      description: `Sind Sie sicher, dass Sie die Vorlage "${template.titel}" löschen möchten?`,
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          setIsDeleting(templateId);
          await deleteTemplate(templateId);
          announceTemplateDeleted();
          toast({ title: 'Erfolg', description: 'Vorlage wurde erfolgreich gelöscht.', variant: 'success' });
          setTimeout(() => closeConfirmationModal(), 500);
        } catch (error) {
          toast({ title: 'Fehler', description: 'Fehler beim Löschen der Vorlage.', variant: 'destructive' });
          closeConfirmationModal();
        } finally {
          setIsDeleting(null);
        }
      },
    });
  };

  const handleSaveTemplate = async (templateData: Partial<Template>) => {
    const currentTemplate = templateEditorData?.template;
    const templateId = (templateData as any).id || currentTemplate?.id;

    try {
      if (!templateId) setIsCreating(true);
      const payload: TemplatePayload = {
        titel: templateData.titel!,
        inhalt: templateData.inhalt!,
        kategorie: templateData.kategorie!,
        kontext_anforderungen: templateData.kontext_anforderungen || [],
      };

      if (templateId) {
        await updateTemplate(templateId, payload);
        announceTemplateUpdated();
      } else {
        await createTemplate(payload);
        announceTemplateCreated();
      }
      closeTemplateEditorModal({ force: true });
    } catch (error) {
      throw error;
    } finally {
      if (!templateId) setIsCreating(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    announceFilterApplied(templates.length);
  };

  useEffect(() => {
    const isDirty = searchQuery !== '' || (selectedCategory && selectedCategory !== 'all');
    setTemplatesModalDirty(Boolean(isDirty));
  }, [searchQuery, selectedCategory, setTemplatesModalDirty]);

  const handleClose = () => {
    if (isTemplatesModalDirty) return;
    onClose();
  };

  const handleAttemptClose = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setTemplatesModalDirty(false);
    onClose();
  };

  useModalKeyboardNavigation({
    isOpen: isOpen && !isTemplateEditorModalOpen,
    onClose: handleClose,
    isDirty: isTemplatesModalDirty,
    onAttemptClose: handleAttemptClose,
    enableArrowNavigation: true,
  });

  useEffect(() => {
    if (isOpen) handleModalOpen();
    else handleModalClose();
  }, [isOpen, handleModalOpen, handleModalClose]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-template-card]') || target.closest('[data-templates-grid]')) {
        handleTemplateCardNavigation(event, container);
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleTemplateCardNavigation]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          id={modalId}
          className="max-w-[98vw] sm:max-w-6xl lg:max-w-7xl h-[95vh] min-h-[95vh] max-h-[95vh] overflow-hidden flex flex-col"
          isDirty={isTemplatesModalDirty}
          onAttemptClose={handleAttemptClose}
          role="dialog"
          aria-labelledby={`${modalId}-title`}
          aria-describedby={`${modalId}-description`}
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle id={`${modalId}-title`} className="flex items-center gap-2">
              <FileText className="size-5" aria-hidden="true" />
              {ARIA_LABELS.templatesModal}
            </DialogTitle>
            <DialogDescription id={`${modalId}-description`}>
              {ARIA_LABELS.templatesModalDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col p-1" ref={containerRef}>
            <SearchAndFilterSection 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={(val) => {
                setSelectedCategory(val);
                announceFilterApplied(val === 'all' ? templates.length : filteredTemplates.length);
              }}
              availableCategories={availableCategories}
              onAddTemplate={handleCreateTemplate}
              isCreating={isCreating}
              isLoading={loading}
              modalId={modalId}
              templatesCount={templates.length}
              filteredCount={filteredTemplates.length}
              onClearFilters={handleClearFilters}
              hasError={!!error}
            />

            <div className="flex-1 overflow-y-auto pt-6 pb-4" role="region" aria-label={ARIA_LABELS.templatesList} data-templates-grid>
              <div className="min-h-0">
                {loading && <LoadingSkeleton />}
                {error && <ErrorState error={error} onRetry={refreshTemplates} modalId={modalId} />}
                {!loading && !error && (
                  <TemplateGroups 
                    groupedTemplates={groupedTemplates}
                    onEdit={handleEditTemplate}
                    onDelete={handleDeleteTemplate}
                    isDeleting={isDeleting}
                    modalId={modalId}
                    searchQuery={searchQuery}
                    selectedCategory={selectedCategory}
                    onClearFilters={handleClearFilters}
                    onAddTemplate={handleCreateTemplate}
                    isCreating={isCreating}
                  />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isTemplateEditorModalOpen && templateEditorData && (
        <TemplateEditorModal
          isOpen={isTemplateEditorModalOpen}
          onClose={() => closeTemplateEditorModal()}
          template={templateEditorData.template}
          onSave={templateEditorData.onSave}
        />
      )}
    </>
  );
}

// --- Sub-components ---

function SearchAndFilterSection({ 
  searchQuery, onSearchChange, selectedCategory, onCategoryChange, 
  availableCategories, onAddTemplate, isCreating, isLoading, modalId,
  templatesCount, filteredCount, onClearFilters, hasError
}: any) {
  return (
    <div className="flex-shrink-0 pb-4 sm:pb-6 border-b space-y-3 px-2 pt-1">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <SearchInput
            data-search-input
            placeholder="Vorlagen durchsuchen…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onClear={() => onSearchChange("")}
            mode="modal"
            aria-label={ARIA_LABELS.templatesSearch}
          />
        </div>
        <div className="min-w-0">
          <div className="relative w-[140px] sm:w-[180px] min-w-0">
            <Select value={selectedCategory || 'all'} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-full text-sm">
                <div className="flex items-center gap-2">
                  <Filter className="size-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                  <SelectValue placeholder="Alle Kategorien" />
                </div>
              </SelectTrigger>
              <SelectContent className="z-50 min-w-[200px]">
                <SelectItem value="all">Alle Kategorien</SelectItem>
                {availableCategories.map((category: string) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={onAddTemplate} className="flex-shrink-0 min-w-[100px] sm:min-w-[120px]" disabled={isCreating || isLoading}>
          {isCreating ? (
            <><Loader2 className="size-4 mr-1 sm:mr-2 animate-spin" /> <span className="hidden sm:inline">Erstellt…</span></>
          ) : (
            <><Plus className="size-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Neue Vorlage</span><span className="sm:hidden">Neu</span></>
          )}
        </Button>
      </div>

      {(searchQuery || (selectedCategory && selectedCategory !== 'all')) && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          {searchQuery && <Badge variant="outline" className="text-xs">Suche: "{searchQuery}"</Badge>}
          {selectedCategory && selectedCategory !== 'all' && <Badge variant="outline" className="text-xs">Kategorie: {selectedCategory}</Badge>}
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-6 px-2 text-xs ml-auto">Zurücksetzen</Button>
        </div>
      )}

      {!isLoading && !hasError && (
        <div className="text-sm text-muted-foreground pt-2" role="status" aria-live="polite">
          {filteredCount} von {templatesCount} Vorlagen
        </div>
      )}
    </div>
  );
}

function TemplateGroups({ groupedTemplates, onEdit, onDelete, isDeleting, modalId, searchQuery, selectedCategory, onClearFilters, onAddTemplate, isCreating }: any) {
  const categories = Object.keys(groupedTemplates).sort();

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{searchQuery || selectedCategory ? 'Keine Vorlagen gefunden' : 'Noch keine Vorlagen erstellt'}</h3>
        <p className="text-muted-foreground mb-4">{searchQuery || (selectedCategory && selectedCategory !== 'all') ? 'Versuchen Sie andere Suchbegriffe oder Filter.' : 'Erstellen Sie Ihre erste Vorlage, um loszulegen.'}</p>
        <Button onClick={searchQuery || (selectedCategory && selectedCategory !== 'all') ? onClearFilters : onAddTemplate} variant={searchQuery || (selectedCategory && selectedCategory !== 'all') ? 'outline' : 'default'} disabled={isCreating}>
          {searchQuery || (selectedCategory && selectedCategory !== 'all') ? 'Filter zurücksetzen' : isCreating ? 'Erstellt…' : 'Erste Vorlage erstellen'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-1">
      {categories.map((category) => {
        const config = TEMPLATE_TYPE_CONFIGS[category as TemplateCategory];
        const Icon = config ? TEMPLATE_ICON_MAP[config.icon] : FileText;
        return (
          <div key={category} className="space-y-4">
            <div className="py-6 first:pt-2">
              <div className="flex items-center gap-4">
                <div className={cn("flex items-center gap-2.5 px-3 py-1.5 rounded-full border bg-zinc-50/50 backdrop-blur-sm shadow-sm", config?.color.text)}>
                  <Icon className="size-3.5" />
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.1em]">{category}</h3>
                  <span className="text-[11px] font-semibold opacity-40 tabular-nums">{groupedTemplates[category].length}</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {groupedTemplates[category].map((template: Template) => (
                <div key={template.id} className="relative min-h-0">
                  <TemplateCard template={template} onEdit={onEdit} onDelete={onDelete} />
                  {isDeleting === template.id && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-20">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3 p-4 border rounded-lg">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ error, onRetry, modalId }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
      <AlertCircle className="size-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Fehler beim Laden</h3>
      <p className="text-muted-foreground mb-4">{error}</p>
      <Button onClick={onRetry} variant="outline">Erneut versuchen</Button>
    </div>
  );
}
