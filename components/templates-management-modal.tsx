"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { X, Plus, Search, FileText, AlertTriangle, RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useModalStore } from "@/hooks/use-modal-store"
import { useAuth } from "@/components/auth-provider"
import { useIsMobile } from "@/hooks/use-mobile"
import { useMobileAccessibility } from "@/hooks/use-mobile-accessibility"
import { TemplateClientService } from "@/lib/template-client-service"
import { templateCacheService } from "@/lib/template-cache"
import { optimizedTemplateLoader } from "@/lib/template-performance-optimizer"
import { useDebouncedTemplateFilters } from "@/hooks/use-debounced-template-search"
import { VirtualTemplateGrid, useVirtualTemplateGrid } from "@/components/template-virtual-grid"
import { TemplatePerformanceMonitor } from "@/components/template-performance-monitor"
import { CategoryFilter } from "@/components/category-filter"
import { TemplateCard } from "@/components/template-card"
import { TemplatesLoadingSkeleton } from "@/components/templates-loading-skeleton"
import { TemplatesEmptyState, TemplatesErrorEmptyState } from "@/components/templates-empty-state"
import { TemplateErrorBoundary, TemplateOperationErrorBoundary } from "@/components/template-error-boundary"
import { useTemplateLoadingErrorHandling, useTemplateDeletionErrorHandling, useTemplateSearchErrorHandling, useNetworkErrorHandling } from "@/hooks/use-template-error-handling"
import { TemplatesModalErrorHandler } from "@/lib/template-error-handler"
import { useFocusTrap, useFocusAnnouncement, useHighContrastMode } from "@/hooks/use-focus-trap"
import type { Template } from "@/types/template"
import type { 
  TemplateWithMetadata, 
  TemplateLoadingState 
} from "@/types/template-modal"

export function TemplatesManagementModal() {
  const {
    isTemplatesManagementModalOpen,
    closeTemplatesManagementModal,
  } = useModalStore()
  
  const { user } = useAuth()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const { announceToScreenReader } = useMobileAccessibility({
    enableTouchFeedback: true,
    enableLargerTouchTargets: true,
    announceStateChanges: true
  })

  // Accessibility refs and hooks
  const searchInputRef = useRef<HTMLInputElement>(null)
  const userMenuTriggerRef = useRef<HTMLElement>(null)
  const focusTrapRef = useFocusTrap({
    isActive: isTemplatesManagementModalOpen,
    initialFocusRef: searchInputRef,
    restoreFocusRef: userMenuTriggerRef
  })
  const { announce, AnnouncementRegion } = useFocusAnnouncement()
  const isHighContrast = useHighContrastMode()

  // Template data state
  const [templates, setTemplates] = useState<TemplateWithMetadata[]>([])
  
  // Loading and error state
  const [loadingState, setLoadingState] = useState<TemplateLoadingState>({
    isLoading: false,
    error: null,
    lastLoadTime: null,
    retryCount: 0
  })

  // Performance optimizations
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setCategoryFilter,
    filteredTemplates,
    clearAllFilters,
    hasActiveFilters,
    isProcessing,
    performanceMetrics
  } = useDebouncedTemplateFilters(templates, {
    debounceMs: 300,
    minQueryLength: 1,
    enablePerformanceMonitoring: process.env.NODE_ENV === 'development'
  })

  // Virtual scrolling for large lists
  const { shouldUseVirtualization } = useVirtualTemplateGrid(filteredTemplates)

  // Error handling hooks
  const loadingErrorHandler = useTemplateLoadingErrorHandling()
  const deletionErrorHandler = useTemplateDeletionErrorHandling()
  const searchErrorHandler = useTemplateSearchErrorHandling()
  const { isOnline, handleNetworkError } = useNetworkErrorHandling()

  // Template service instance
  const templateService = useMemo(() => new TemplateClientService(), [])

  // Reset state when modal opens and load templates
  useEffect(() => {
    if (isTemplatesManagementModalOpen) {
      setSearchQuery("")
      setSelectedCategory("all")
      loadTemplates(false) // Don't force refresh on modal open
      
      // Store reference to user menu trigger for focus restoration
      const userMenuTrigger = document.querySelector('[aria-label*="Benutzermenü"]') as HTMLElement
      if (userMenuTrigger) {
        userMenuTriggerRef.current = userMenuTrigger
      }
      
      // Announce modal opening
      announce("Vorlagen-Modal geöffnet", "polite")
      if (isMobile) {
        announceToScreenReader("Vorlagen-Modal geöffnet. Wischen Sie nach links oder rechts, um zwischen Vorlagen zu navigieren.", "polite")
      }
    }
  }, [isTemplatesManagementModalOpen, user?.id, announce])

  // Track modal open/close for cache invalidation
  const [hasLoadedBefore, setHasLoadedBefore] = useState(false)
  useEffect(() => {
    if (isTemplatesManagementModalOpen && user?.id && hasLoadedBefore) {
      // Modal reopened after previous load - invalidate cache
      handleModalReopen()
    } else if (isTemplatesManagementModalOpen && user?.id && !hasLoadedBefore) {
      // First time opening - just load normally
      setHasLoadedBefore(true)
    }
  }, [isTemplatesManagementModalOpen, user?.id, hasLoadedBefore])

  // Template loading function with performance optimization
  const loadTemplates = async (forceRefresh = false) => {
    if (!user?.id) {
      TemplatesModalErrorHandler.handlePermissionError(
        new Error("User not authenticated"),
        "load templates"
      )
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        error: "Benutzer nicht authentifiziert"
      }))
      return
    }

    const loadOperation = async () => {
      // Check network status before making request
      if (!isOnline) {
        throw new Error("Keine Internetverbindung verfügbar")
      }

      // Use optimized loader with caching and deduplication
      const loadedTemplates = await optimizedTemplateLoader.loadTemplates(user.id, forceRefresh)

      // Enhance templates with metadata
      const templatesWithMetadata = await enhanceTemplatesWithMetadata(loadedTemplates)

      // Update state
      setTemplates(templatesWithMetadata)

      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        lastLoadTime: Date.now(),
        retryCount: 0
      }))

      // Show success message if this was a retry
      if (loadingState.retryCount > 0) {
        toast({
          title: "Vorlagen geladen",
          description: "Die Vorlagen wurden erfolgreich aktualisiert."
        })
        announce("Vorlagen erfolgreich geladen", "polite")
      }

      return templatesWithMetadata
    }

    setLoadingState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }))

    const result = await loadingErrorHandler.executeWithErrorHandling(
      loadOperation,
      "load templates",
      { userId: user.id, forceRefresh }
    )

    if (result === null) {
      // Error was handled by the error handler
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        error: "Fehler beim Laden der Vorlagen",
        retryCount: prev.retryCount + 1
      }))
    }
  }

  // Enhance templates with metadata
  const enhanceTemplatesWithMetadata = async (templates: Template[]): Promise<TemplateWithMetadata[]> => {
    if (!templates || !Array.isArray(templates)) {
      return []
    }
    
    return templates.map(template => {
      const contentStr = JSON.stringify(template.inhalt)
      const textContent = contentStr.replace(/<[^>]*>/g, '').replace(/[{}"\[\]]/g, ' ')
      
      return {
        ...template,
        wordCount: textContent.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: textContent.length,
        lastAccessedAt: template.aktualisiert_am || template.erstellungsdatum,
        usageCount: 0 // Could be enhanced with actual usage tracking
      }
    })
  }

  // Handle template deletion with comprehensive error handling
  const handleDeleteTemplate = async (templateId: string): Promise<void> => {
    if (!user?.id) {
      TemplatesModalErrorHandler.handlePermissionError(
        new Error("User not authenticated"),
        "delete template"
      )
      return
    }

    // Find the template to get its title for confirmation
    const templateToDelete = templates.find(t => t.id === templateId)
    if (!templateToDelete) {
      TemplatesModalErrorHandler.handleGenericError(
        new Error("Template not found"),
        "find template for deletion",
        { templateId }
      )
      return
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Möchten Sie die Vorlage "${templateToDelete.titel}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`
    )

    if (!confirmed) {
      return
    }

    const deleteOperation = async () => {
      // Check network status
      if (!isOnline) {
        throw new Error("Keine Internetverbindung verfügbar")
      }

      await templateService.deleteTemplate(templateId)
      
      // Update local state immediately for better UX
      setTemplates(prev => prev.filter(template => template.id !== templateId))
      
      // Invalidate cache
      templateCacheService.invalidateUserCaches(user.id)
      
      toast({
        title: "Vorlage gelöscht",
        description: `Die Vorlage "${templateToDelete.titel}" wurde erfolgreich gelöscht.`
      })
      
      // Announce deletion for screen readers
      announce(`Vorlage "${templateToDelete.titel}" wurde gelöscht`, "polite")
    }

    const retryableDeleteOperation = TemplatesModalErrorHandler.createRetryMechanism(
      deleteOperation,
      2, // Max 2 retries for deletion
      500 // 500ms base delay
    )

    try {
      await retryableDeleteOperation()
    } catch (error) {
      TemplatesModalErrorHandler.handleDeleteError(
        error as Error,
        templateToDelete.titel,
        retryableDeleteOperation
      )
    }
  }

  // Invalidate cache when modal reopens
  const handleModalReopen = () => {
    if (user?.id) {
      templateCacheService.invalidateUserCaches(user.id)
      loadTemplates(true)
    }
  }

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isTemplatesManagementModalOpen) {
        closeTemplatesManagementModal()
      }
    }

    if (isTemplatesManagementModalOpen) {
      document.addEventListener("keydown", handleEscape)
      // Prevent background scrolling
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isTemplatesManagementModalOpen, closeTemplatesManagementModal])

  // Note: filteredTemplates is now handled by useDebouncedTemplateFilters hook

  const handleCreateTemplate = () => {
    const { openTemplateEditorModal } = useModalStore()
    
    openTemplateEditorModal({
      isNewTemplate: true,
      initialCategory: selectedCategory !== 'all' ? selectedCategory : undefined,
      onSave: async (templateData) => {
        try {
          await templateService.createTemplate({
            titel: templateData.titel,
            inhalt: templateData.inhalt,
            kategorie: templateData.kategorie,
            kontext_anforderungen: templateData.kontext_anforderungen
          })
          
          toast({
            title: "Vorlage erstellt",
            description: `Die Vorlage "${templateData.titel}" wurde erfolgreich erstellt.`
          })
          
          // Refresh templates list
          await loadTemplates(true)
        } catch (error) {
          console.error('Error creating template:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
          toast({
            title: "Fehler beim Erstellen",
            description: errorMessage,
            variant: "destructive"
          })
          throw error // Re-throw to let the editor handle it
        }
      },
      onCancel: () => {
        // Template editor will handle closing
      }
    })
  }

  const handleEditTemplate = (templateId: string) => {
    const { openTemplateEditorModal } = useModalStore()
    
    // Find the template to edit
    const templateToEdit = templates.find(t => t.id === templateId)
    if (!templateToEdit) {
      toast({
        title: "Fehler",
        description: "Die zu bearbeitende Vorlage konnte nicht gefunden werden.",
        variant: "destructive"
      })
      return
    }
    
    openTemplateEditorModal({
      templateId: templateToEdit.id,
      initialTitle: templateToEdit.titel,
      initialContent: templateToEdit.inhalt,
      initialCategory: templateToEdit.kategorie,
      isNewTemplate: false,
      onSave: async (templateData) => {
        try {
          await templateService.updateTemplate(templateToEdit.id, {
            titel: templateData.titel,
            inhalt: templateData.inhalt,
            kategorie: templateData.kategorie,
            kontext_anforderungen: templateData.kontext_anforderungen
          })
          
          toast({
            title: "Vorlage gespeichert",
            description: `Die Vorlage "${templateData.titel}" wurde erfolgreich aktualisiert.`
          })
          
          // Refresh templates list
          await loadTemplates(true)
        } catch (error) {
          console.error('Error updating template:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
          toast({
            title: "Fehler beim Speichern",
            description: errorMessage,
            variant: "destructive"
          })
          throw error // Re-throw to let the editor handle it
        }
      },
      onCancel: () => {
        // Template editor will handle closing
      }
    })
  }

  const handleSearchChange = (value: string) => {
    try {
      setSearchQuery(value)
      
      // Announce search results for screen readers (debounced)
      if (value.trim()) {
        setTimeout(() => {
          const resultCount = filteredTemplates.length
          announce(`${resultCount} Suchergebnisse für "${value}"`, "polite")
        }, 500)
      }
    } catch (error) {
      TemplatesModalErrorHandler.handleSearchError(error as Error, value)
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  const handleCategoryChange = (category: string) => {
    setCategoryFilter(category)
  }

  const handleRetryLoad = () => {
    loadTemplates(true)
  }

  const handleRefresh = () => {
    handleModalReopen()
  }

  return (
    <TemplateErrorBoundary
      onError={(error, errorInfo) => {
        TemplatesModalErrorHandler.handleModalInitializationError(error)
      }}
    >
      <Dialog 
        open={isTemplatesManagementModalOpen} 
        onOpenChange={closeTemplatesManagementModal}
        aria-describedby="templates-modal-description"
      >
        <DialogContent 
          ref={focusTrapRef}
          className={`
            ${isMobile 
              ? 'max-w-full max-h-full w-full h-full inset-0 rounded-none border-0' 
              : 'max-w-[90vw] max-h-[90vh] w-full h-full rounded-lg'
            } 
            p-0 gap-0 overflow-hidden focus:outline-none 
            ${isHighContrast ? 'high-contrast-modal' : ''}
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby="templates-modal-title"
          aria-describedby="templates-modal-description"
          onOpenAutoFocus={(e) => {
            // Focus the search input when modal opens
            e.preventDefault()
            setTimeout(() => {
              if (searchInputRef.current) {
                searchInputRef.current.focus()
              }
            }, 100)
          }}
          onCloseAutoFocus={(e) => {
            // Return focus to the trigger element
            e.preventDefault()
            if (userMenuTriggerRef.current) {
              userMenuTriggerRef.current.focus()
            }
          }}
        >
          <div className="flex flex-col h-full">
          {/* Hidden description for screen readers */}
          <DialogDescription className="sr-only">
            Modal zum Verwalten Ihrer Dokumentvorlagen. Hier können Sie Vorlagen suchen, filtern, bearbeiten und neue erstellen.
          </DialogDescription>
          
          {/* Header */}
          <header className={`
            flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60
            ${isMobile ? 'p-3 min-h-[56px]' : 'p-4 sm:p-6'}
          `}>
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <DialogTitle 
                id="templates-modal-title"
                className={`font-semibold text-foreground truncate ${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'}`}
              >
                {isMobile ? 'Vorlagen' : 'Vorlagen verwalten'}
              </DialogTitle>
              {templates.length > 0 && !isMobile && (
                <Badge 
                  variant="secondary" 
                  className="text-xs shrink-0"
                  aria-label={`${filteredTemplates.length} von ${templates.length} Vorlagen werden angezeigt`}
                >
                  {filteredTemplates.length} von {templates.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0" role="toolbar" aria-label="Modal-Aktionen">
              {loadingState.lastLoadTime && !isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={loadingState.isLoading}
                  className="h-8 w-8 rounded-full hover:bg-muted focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-label="Vorlagen aktualisieren"
                  title="Vorlagen aktualisieren"
                >
                  <RefreshCw 
                    className={`h-4 w-4 ${loadingState.isLoading ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                </Button>
              )}
              <DialogClose asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className={`rounded-full hover:bg-muted focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isMobile ? 'h-9 w-9' : 'h-8 w-8 sm:h-10 sm:w-10'}`}
                  aria-label="Modal schließen"
                  title="Modal schließen (Escape)"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DialogClose>
            </div>
          </header>
          
          {/* Search and Filters Bar */}
          <TemplateOperationErrorBoundary 
            operation="search and filter"
            onRetry={() => {
              setSearchQuery("")
              setSelectedCategory("all")
            }}
          >
            <section 
              className={`border-b bg-muted/30 backdrop-blur ${isMobile ? 'p-3' : 'p-4 sm:p-6'}`}
              aria-label="Suche und Filter"
            >
              <div className={`flex gap-3 ${isMobile ? 'flex-col' : 'flex-col sm:flex-row sm:gap-4'}`} role="search">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <label htmlFor="template-search-input" className="sr-only">
                    Vorlagen durchsuchen
                  </label>
                  <Search 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" 
                    aria-hidden="true"
                  />
                  <Input
                    ref={searchInputRef}
                    id="template-search-input"
                    data-testid="template-search-input"
                    type="search"
                    placeholder={isMobile ? "Suchen..." : "Vorlagen durchsuchen..."}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className={`pl-10 pr-10 bg-background/50 border-border/50 focus:bg-background focus:border-border focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isMobile ? 'h-11 text-base' : 'h-10'}`}
                    aria-describedby="search-help-text search-results-count"
                    autoComplete="off"
                    spellCheck="false"
                    inputMode="search"
                  />
                  <div id="search-help-text" className="sr-only">
                    Geben Sie Suchbegriffe ein, um Vorlagen nach Titel, Kategorie oder Inhalt zu filtern
                  </div>
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`absolute right-1 top-1/2 transform -translate-y-1/2 p-0 hover:bg-muted focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isMobile ? 'h-7 w-7' : 'h-6 w-6'}`}
                      onClick={clearSearch}
                      aria-label={`Suche "${searchQuery}" löschen`}
                      title="Suche löschen"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  )}
                </div>
                
                {/* Mobile: Category Filter and Create Button in same row */}
                <div className={`flex gap-3 ${isMobile ? 'flex-row' : 'w-full sm:w-64'}`}>
                  {/* Category Filter */}
                  <div className={isMobile ? 'flex-1' : 'w-full'}>
                    <CategoryFilter
                      templates={templates}
                      selectedCategory={selectedCategory}
                      onCategoryChange={handleCategoryChange}
                      className={`bg-background/50 border-border/50 focus:bg-background focus:border-border focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isMobile ? 'h-11' : 'h-10'}`}
                      placeholder={isMobile ? "Kategorie" : "Kategorie wählen"}
                    />
                  </div>
                  
                  {/* Create Button */}
                  <Button 
                    onClick={handleCreateTemplate}
                    className={`bg-primary hover:bg-primary/90 text-primary-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isMobile ? 'h-11 px-4 shrink-0' : 'w-full sm:w-auto h-10 px-4'}`}
                    aria-label="Neue Vorlage erstellen"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {isMobile ? (
                      <span className="sr-only">Neue Vorlage erstellen</span>
                    ) : (
                      <>
                        <span className="ml-2 hidden sm:inline">Neue Vorlage</span>
                        <span className="ml-2 sm:hidden">Erstellen</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Search Results Count - Live Region */}
              <div 
                id="search-results-count" 
                className="sr-only" 
                aria-live="polite" 
                aria-atomic="true"
              >
                {searchQuery && `${filteredTemplates.length} Suchergebnisse für "${searchQuery}"`}
                {selectedCategory !== "all" && !searchQuery && `${filteredTemplates.length} Vorlagen in Kategorie "${selectedCategory}"`}
              </div>
              
              {/* Performance indicator for development */}
              {process.env.NODE_ENV === 'development' && performanceMetrics && (
                <div className="text-xs text-muted-foreground mt-2">
                  Search: {performanceMetrics.searchTime.toFixed(1)}ms | 
                  Results: {performanceMetrics.resultCount} | 
                  {isProcessing && " Processing..."}
                </div>
              )}
            </section>
          </TemplateOperationErrorBoundary>
          
          {/* Content Area */}
          <TemplateOperationErrorBoundary 
            operation="template display"
            onRetry={() => loadTemplates(true)}
          >
            <main 
              className={`flex-1 overflow-auto focus:outline-none ${isMobile ? 'p-3' : 'p-4 sm:p-6'}`}
              tabIndex={-1}
              aria-label="Vorlagen-Inhalt"
              role="main"
            >
              {/* Loading State */}
              {loadingState.isLoading && (
                <>
                  <div className="sr-only" aria-live="polite">
                    Vorlagen werden geladen...
                  </div>
                  <TemplatesLoadingSkeleton 
                    count={8}
                    showCategories={selectedCategory === "all"}
                  />
                </>
              )}
              
              {/* Error State */}
              {!loadingState.isLoading && loadingState.error && (
                <>
                  <div className="sr-only" aria-live="assertive">
                    Fehler beim Laden der Vorlagen: {loadingState.error}
                  </div>
                  <TemplatesErrorEmptyState 
                    error={loadingState.error}
                    onRetry={handleRetryLoad}
                    onCreateTemplate={handleCreateTemplate}
                    canRetry={loadingState.retryCount < 3}
                  />
                </>
              )}
              
              {/* Empty State */}
              {!loadingState.isLoading && !loadingState.error && filteredTemplates.length === 0 && (
                <>
                  <div className="sr-only" aria-live="polite">
                    {hasActiveFilters
                      ? "Keine Vorlagen gefunden für die aktuellen Filter"
                      : "Keine Vorlagen vorhanden"
                    }
                  </div>
                  <TemplatesEmptyState 
                    onCreateTemplate={handleCreateTemplate}
                    hasSearch={!!searchQuery}
                    hasFilter={selectedCategory !== "all"}
                    onClearFilters={clearAllFilters}
                  />
                </>
              )}
              
              {/* Templates Grid - Use virtual scrolling for large lists */}
              {!loadingState.isLoading && !loadingState.error && filteredTemplates.length > 0 && (
                <>
                  <div className="sr-only" aria-live="polite">
                    {filteredTemplates.length} Vorlagen werden angezeigt
                    {shouldUseVirtualization && " (optimiert für große Listen)"}
                  </div>
                  
                  {shouldUseVirtualization ? (
                    <div className="h-[600px]">
                      <VirtualTemplateGrid
                        templates={filteredTemplates}
                        onEditTemplate={handleEditTemplate}
                        onDeleteTemplate={handleDeleteTemplate}
                        groupByCategory={selectedCategory === "all"}
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    <TemplatesGrid 
                      templates={filteredTemplates}
                      onEditTemplate={handleEditTemplate}
                      onDeleteTemplate={handleDeleteTemplate}
                    />
                  )}
                </>
              )}
            </main>
          </TemplateOperationErrorBoundary>
          </div>
          
          {/* Accessibility announcement region */}
          <AnnouncementRegion />
        </DialogContent>
      </Dialog>
      
      {/* Performance Monitor (Development only) */}
      {process.env.NODE_ENV === 'development' && <TemplatePerformanceMonitor />}
    </TemplateErrorBoundary>
  )
}



// Templates grid component
interface TemplatesGridProps {
  templates: TemplateWithMetadata[]
  onEditTemplate: (templateId: string) => void
  onDeleteTemplate: (templateId: string) => Promise<void>
}

function TemplatesGrid({ templates, onEditTemplate, onDeleteTemplate }: TemplatesGridProps) {
  // Group templates by category with error handling
  const groupedTemplates = useMemo(() => {
    try {
      const groups = new Map<string, TemplateWithMetadata[]>()
      
      templates.forEach(template => {
        try {
          const category = template.kategorie || 'Ohne Kategorie'
          if (!groups.has(category)) {
            groups.set(category, [])
          }
          groups.get(category)!.push(template)
        } catch (error) {
          console.warn('Error processing template for grouping:', error, template)
          // Add to default category as fallback
          const fallbackCategory = 'Ohne Kategorie'
          if (!groups.has(fallbackCategory)) {
            groups.set(fallbackCategory, [])
          }
          groups.get(fallbackCategory)!.push(template)
        }
      })

      return Array.from(groups.entries()).sort(([a], [b]) => {
        try {
          return a.localeCompare(b)
        } catch (error) {
          console.warn('Error sorting categories:', error)
          return 0
        }
      })
    } catch (error) {
      TemplatesModalErrorHandler.handleGenericError(
        error as Error,
        "group templates by category",
        { templateCount: templates.length }
      )
      // Return templates ungrouped as fallback
      return [['Alle Vorlagen', templates]]
    }
  }, [templates])

  return (
    <TemplateOperationErrorBoundary 
      operation="template grid display"
      onRetry={() => window.location.reload()}
    >
      <div className="space-y-8" role="region" aria-label="Vorlagen-Liste">
        {groupedTemplates.map(([category, categoryTemplates], categoryIndex) => (
          <section key={category} aria-labelledby={`category-${categoryIndex}-heading`}>
            <header className="flex items-center justify-between mb-4">
              <h3 
                id={`category-${categoryIndex}-heading`}
                className="text-lg font-semibold text-foreground"
              >
                {category}
              </h3>
              <Badge 
                variant="secondary" 
                className="text-xs"
                aria-label={`${categoryTemplates.length} ${categoryTemplates.length === 1 ? 'Vorlage' : 'Vorlagen'} in Kategorie ${category}`}
              >
                {categoryTemplates.length} {categoryTemplates.length === 1 ? 'Vorlage' : 'Vorlagen'}
              </Badge>
            </header>
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              role="grid"
              aria-label={`Vorlagen in Kategorie ${category}`}
            >
              {categoryTemplates.map((template, templateIndex) => (
                <TemplateOperationErrorBoundary
                  key={template.id}
                  operation={`template card for "${template.titel}"`}
                  onRetry={() => {
                    // Template card errors are usually not recoverable at this level
                    console.log('Template card error, skipping template:', template.id)
                  }}
                >
                  <div 
                    role="gridcell"
                    aria-rowindex={Math.floor(templateIndex / 4) + 1}
                    aria-colindex={(templateIndex % 4) + 1}
                  >
                    <TemplateCard
                      template={template}
                      onEdit={() => onEditTemplate(template.id)}
                      onDelete={onDeleteTemplate}
                    />
                  </div>
                </TemplateOperationErrorBoundary>
              ))}
            </div>
          </section>
        ))}
      </div>
    </TemplateOperationErrorBoundary>
  )
}

