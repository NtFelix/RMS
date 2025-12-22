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
import { TemplateCard } from '@/components/template-card';
import { TemplateEditorModal } from '@/components/template-editor-modal';
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
  } = useTemplateFilters(templates);

  // Set initial category when modal opens
  useEffect(() => {
    if (isOpen && initialCategory && initialCategory !== selectedCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [isOpen, initialCategory, selectedCategory, setSelectedCategory]);

  // Get available categories from templates
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
    focusFirstTemplate,
    focusSearchInput,
  } = useTemplateAccessibility({
    isModalOpen: isOpen,
    templateCount: templates.length,
    filteredCount: filteredTemplates.length,
    searchQuery,
    onKeyboardShortcut: (shortcut) => {
      switch (shortcut) {
        case KEYBOARD_SHORTCUTS.openTemplates:
          // Already handled by parent component
          break;
        case KEYBOARD_SHORTCUTS.closeModal:
          handleClose();
          break;
        case KEYBOARD_SHORTCUTS.save:
          // Handled by editor
          break;
      }
    },
  });

  // Handle template creation
  const handleCreateTemplate = () => {
    if (isCreating) return; // Prevent multiple clicks
    openTemplateEditorModal(undefined, handleSaveTemplate);
  };

  // Handle template editing
  const handleEditTemplate = (template: Template) => {
    openTemplateEditorModal(template, handleSaveTemplate);
  };

  // Handle template deletion
  const handleDeleteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    openConfirmationModal({
      title: 'Vorlage löschen',
      description: `Sind Sie sicher, dass Sie die Vorlage "${template.titel}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`,
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          setIsDeleting(templateId);
          await deleteTemplate(templateId);
          announceTemplateDeleted();
          toast({
            title: 'Erfolg',
            description: 'Vorlage wurde erfolgreich gelöscht.',
          });

          // Close the confirmation modal after a brief delay to show success
          setTimeout(() => {
            closeConfirmationModal();
          }, 500);
        } catch (error) {
          console.error('Error deleting template:', error);
          toast({
            title: 'Fehler',
            description: 'Fehler beim Löschen der Vorlage.',
            variant: 'destructive',
          });

          // Close the confirmation modal even on error
          closeConfirmationModal();
        } finally {
          setIsDeleting(null);
        }
      },
    });
  };

  // Handle template save (create or update)
  const handleSaveTemplate = async (templateData: Partial<Template>) => {
    const currentTemplate = templateEditorData?.template;
    const templateId = (templateData as any).id || currentTemplate?.id;

    try {
      if (!templateId) {
        setIsCreating(true);
      }

      const payload: TemplatePayload = {
        titel: templateData.titel!,
        inhalt: templateData.inhalt!,
        kategorie: templateData.kategorie!,
        kontext_anforderungen: templateData.kontext_anforderungen || [],
      };

      if (templateId) {
        await updateTemplate(templateId, payload);
        announceTemplateUpdated();
        toast({
          title: 'Erfolg',
          description: 'Vorlage wurde erfolgreich aktualisiert.',
        });
      } else {
        await createTemplate(payload);
        announceTemplateCreated();
        toast({
          title: 'Erfolg',
          description: 'Vorlage wurde erfolgreich erstellt.',
        });
      }

      closeTemplateEditorModal({ force: true });
    } catch (error) {
      console.error('Error saving template:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

      toast({
        title: 'Fehler',
        description: errorMessage,
        variant: 'destructive',
      });

      // Re-throw to let the modal handle it
      throw error;
    } finally {
      if (!templateId) {
        setIsCreating(false);
      }
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    announceFilterApplied(templates.length);
  };

  // Track dirty state for search and filters
  useEffect(() => {
    const isDirty = searchQuery !== '' || (selectedCategory && selectedCategory !== 'all');
    setTemplatesModalDirty(Boolean(isDirty));
  }, [searchQuery, selectedCategory, setTemplatesModalDirty]);

  // Handle modal close with dirty state check
  const handleClose = () => {
    if (isTemplatesModalDirty) {
      // This will be handled by the Dialog component's isDirty prop
      return;
    }
    onClose();
  };

  // Handle attempt to close when dirty
  const handleAttemptClose = () => {
    // Reset filters and close
    setSearchQuery('');
    setSelectedCategory('all');
    setTemplatesModalDirty(false);
    onClose();
  };

  // Set up keyboard navigation
  useModalKeyboardNavigation({
    isOpen,
    onClose: handleClose,
    isDirty: isTemplatesModalDirty,
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

  // Handle keyboard navigation for template cards
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle navigation if focus is within template cards area
      const target = event.target as HTMLElement;
      if (target.closest('[data-template-card]') || target.closest('[data-templates-grid]')) {
        handleTemplateCardNavigation(event, container);
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleTemplateCardNavigation]);

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="px-1">
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        role="status"
        aria-label={ARIA_LABELS.loadingTemplates}
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-3 p-4 border rounded-lg" aria-hidden="true">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-16 sm:h-20 w-full" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-1/3" />
              <div className="flex gap-1">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
        <div className="sr-only">Vorlagen werden geladen...</div>
      </div>
    </div>
  );

  // Render error state
  const renderError = () => (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      role="alert"
      aria-labelledby={`${modalId}-error-title`}
      aria-describedby={`${modalId}-error-description`}
    >
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
      <h3 id={`${modalId}-error-title`} className="text-lg font-medium mb-2">
        Fehler beim Laden der Vorlagen
      </h3>
      <p id={`${modalId}-error-description`} className="text-muted-foreground mb-4">
        {error}
      </p>
      <Button
        onClick={refreshTemplates}
        variant="outline"
        aria-label="Vorlagen erneut laden"
      >
        Erneut versuchen
      </Button>
    </div>
  );

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">
        {searchQuery || selectedCategory ? 'Keine Vorlagen gefunden' : 'Noch keine Vorlagen erstellt'}
      </h3>
      <p className="text-muted-foreground mb-4">
        {searchQuery || (selectedCategory && selectedCategory !== 'all')
          ? 'Versuchen Sie andere Suchbegriffe oder Filter.'
          : 'Erstellen Sie Ihre erste Vorlage, um loszulegen.'
        }
      </p>
      {searchQuery || (selectedCategory && selectedCategory !== 'all') ? (
        <Button onClick={handleClearFilters} variant="outline">
          Filter zurücksetzen
        </Button>
      ) : (
        <Button
          onClick={handleCreateTemplate}
          disabled={isCreating}
          className="min-w-[180px]"
          aria-label="Erste Vorlage erstellen"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
              Erstellt...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Erste Vorlage erstellen
            </>
          )}
        </Button>
      )}
    </div>
  );

  // Render template groups
  const renderTemplateGroups = () => {
    const categories = Object.keys(groupedTemplates).sort();

    if (categories.length === 0) {
      return renderEmptyState();
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
                  <div className={cn(
                    "flex items-center gap-2.5 px-3 py-1.5 rounded-full border bg-background/50 backdrop-blur-sm shadow-sm transition-all hover:bg-background/80",
                    config ? "border-current/20" : "border-border",
                    config?.color.text
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                    <h3
                      className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground/90"
                      id={`${modalId}-category-${category}`}
                    >
                      {category}
                    </h3>
                    <span
                      className="text-[11px] font-semibold text-muted-foreground/40 tabular-nums"
                      aria-label={`${groupedTemplates[category].length} Vorlagen in Kategorie ${category}`}
                    >
                      {groupedTemplates[category].length}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent" />
                </div>
              </div>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                role="grid"
                aria-labelledby={`${modalId}-category-${category}`}
              >
                {groupedTemplates[category].map((template, index) => (
                  <div
                    key={template.id}
                    className="relative min-h-0"
                    role="gridcell"
                    aria-rowindex={Math.floor(index / 4) + 1}
                    aria-colindex={(index % 4) + 1}
                  >
                    <TemplateCard
                      template={template}
                      onEdit={handleEditTemplate}
                      onDelete={handleDeleteTemplate}
                    />
                    {isDeleting === template.id && (
                      <div
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-20"
                        role="status"
                        aria-label={ARIA_LABELS.deletingTemplate}
                      >
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                        <span className="sr-only">Vorlage wird gelöscht...</span>
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
  };

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
            <DialogTitle
              id={`${modalId}-title`}
              className="flex items-center gap-2"
            >
              <FileText className="h-5 w-5" aria-hidden="true" />
              {ARIA_LABELS.templatesModal}
            </DialogTitle>
            <DialogDescription id={`${modalId}-description`}>
              {ARIA_LABELS.templatesModalDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col p-1" ref={containerRef}>
            {/* Search, Filter and Actions Section */}
            <div className="flex-shrink-0 pb-4 sm:pb-6 border-b space-y-3 px-2 pt-1">
              {/* Single Row: Search, Filter, and Create Button */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Search Bar - Takes most space */}
                <div className="flex-1 min-w-0">
                  <SearchInput
                    data-search-input
                    placeholder="Vorlagen durchsuchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClear={() => setSearchQuery("")}
                    mode="modal"
                    aria-label={ARIA_LABELS.templatesSearch}
                    aria-describedby={`${modalId}-search-help`}
                  />
                  <div id={`${modalId}-search-help`} className="sr-only">
                    Geben Sie Suchbegriffe ein, um Vorlagen zu filtern. Verwenden Sie die Pfeiltasten zur Navigation.
                  </div>
                </div>

                {/* Category Filter - Medium width */}
                <div className="min-w-0">
                  <div className="relative w-[140px] sm:w-[180px] min-w-0">
                    <Select
                      value={selectedCategory || 'all'}
                      onValueChange={(value) => {
                        setSelectedCategory(value);
                        announceFilterApplied(value === 'all' ? templates.length : filteredTemplates.length);
                      }}
                    >
                      <SelectTrigger
                        className="w-full focus-visible:scale-100 focus:ring-2 focus:ring-offset-1 focus:ring-offset-background text-sm"
                        aria-label={ARIA_LABELS.categoryFilter}
                        aria-expanded={false}
                      >
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                          <SelectValue placeholder="Alle Kategorien" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="z-50 min-w-[200px]">
                        <SelectItem value="all">Alle Kategorien</SelectItem>
                        {availableCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Create Button - Fixed width */}
                <Button
                  data-create-template-button
                  onClick={handleCreateTemplate}
                  className="flex-shrink-0 min-w-[100px] sm:min-w-[120px]"
                  disabled={isCreating || loading}
                  aria-label={ARIA_LABELS.createTemplateButton}
                  aria-describedby={`${modalId}-create-help`}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 sm:mr-2 animate-spin" aria-hidden="true" />
                      <span className="hidden sm:inline">Erstellt...</span>
                      <span className="sm:hidden">Erstelle...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1 sm:mr-2" aria-hidden="true" />
                      <span className="hidden sm:inline">Neue Vorlage</span>
                      <span className="sm:hidden">Neu</span>
                    </>
                  )}
                </Button>
                <div id={`${modalId}-create-help`} className="sr-only">
                  Erstellt eine neue Dokumentvorlage mit dem Rich-Text-Editor
                </div>
              </div>

              {/* Third Row: Active Filters */}
              {(searchQuery || (selectedCategory && selectedCategory !== 'all')) && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    <span className="hidden sm:inline">Aktive Filter:</span>
                    <span className="sm:hidden">Filter:</span>
                  </span>
                  {searchQuery && (
                    <Badge variant="outline" className="text-xs">
                      <span className="hidden sm:inline">Suche: "</span>
                      <span className="sm:hidden">"</span>
                      <span className="max-w-[100px] sm:max-w-none truncate">{searchQuery}</span>"
                    </Badge>
                  )}
                  {selectedCategory && selectedCategory !== 'all' && (
                    <Badge variant="outline" className="text-xs">
                      <span className="hidden sm:inline">Kategorie: </span>
                      {selectedCategory}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-6 px-2 text-xs ml-auto"
                    aria-label={ARIA_LABELS.clearFiltersButton}
                  >
                    <span className="hidden sm:inline">Zurücksetzen</span>
                    <span className="sm:hidden">Reset</span>
                  </Button>
                </div>
              )}

              {/* Results Count */}
              {!loading && !error && (
                <div
                  className="text-sm text-muted-foreground pt-2"
                  role="status"
                  aria-live="polite"
                  aria-label={`${filteredTemplates.length} von ${templates.length} Vorlagen werden angezeigt`}
                >
                  {filteredTemplates.length} von {templates.length} Vorlagen
                </div>
              )}
            </div>

            {/* Content */}
            <div
              className="flex-1 overflow-y-auto pt-6 pb-4"
              role="region"
              aria-label={ARIA_LABELS.templatesList}
              data-templates-grid
            >
              <div className="min-h-0">
                {loading && renderLoadingSkeleton()}
                {error && renderError()}
                {!loading && !error && renderTemplateGroups()}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Editor Modal - Managed by modal store */}
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