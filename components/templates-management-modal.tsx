"use client"

import { useState, useEffect, useMemo } from "react"
import { X, Plus, Search, FileText, AlertTriangle, RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useModalStore } from "@/hooks/use-modal-store"
import { useAuth } from "@/components/auth-provider"
import { TemplateClientService } from "@/lib/template-client-service"
import { templateCacheService } from "@/lib/template-cache"
import { CategoryFilter } from "@/components/category-filter"
import { TemplateCard } from "@/components/template-card"
import { TemplatesLoadingSkeleton } from "@/components/templates-loading-skeleton"
import { TemplatesEmptyState, TemplatesErrorEmptyState } from "@/components/templates-empty-state"
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

  // Template data state
  const [templates, setTemplates] = useState<TemplateWithMetadata[]>([])
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  
  // Loading and error state
  const [loadingState, setLoadingState] = useState<TemplateLoadingState>({
    isLoading: false,
    error: null,
    lastLoadTime: null,
    retryCount: 0
  })

  // Template service instance
  const templateService = useMemo(() => new TemplateClientService(), [])

  // Reset state when modal opens and load templates
  useEffect(() => {
    if (isTemplatesManagementModalOpen) {
      setSearchQuery("")
      setSelectedCategory("all")
      loadTemplates(false) // Don't force refresh on modal open
    }
  }, [isTemplatesManagementModalOpen, user?.id])

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

  // Template loading function with retry mechanism
  const loadTemplates = async (forceRefresh = false) => {
    if (!user?.id) {
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        error: "Benutzer nicht authentifiziert"
      }))
      return
    }

    setLoadingState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }))

    try {
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cachedTemplates = templateCacheService.getUserTemplates(user.id)
        
        if (cachedTemplates && cachedTemplates.length > 0) {
          const templatesWithMetadata = await enhanceTemplatesWithMetadata(cachedTemplates)
          
          setTemplates(templatesWithMetadata)
          setLoadingState(prev => ({
            ...prev,
            isLoading: false,
            lastLoadTime: Date.now(),
            retryCount: 0
          }))
          return
        }
      }

      // Load fresh data from service
      const loadedTemplates = await templateService.getUserTemplates()

      // Enhance templates with metadata
      const templatesWithMetadata = await enhanceTemplatesWithMetadata(loadedTemplates)

      // Update state
      setTemplates(templatesWithMetadata)
      
      // Update cache
      templateCacheService.setUserTemplates(user.id, loadedTemplates)

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
      }

    } catch (error) {
      console.error('Error loading templates:', error)
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Ein unbekannter Fehler ist aufgetreten'

      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        retryCount: prev.retryCount + 1
      }))

      toast({
        title: "Fehler beim Laden",
        description: errorMessage,
        variant: "destructive",
        action: loadingState.retryCount < 3 ? {
          label: "Erneut versuchen",
          onClick: () => loadTemplates(true)
        } : undefined
      })
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

  // Handle template deletion with confirmation
  const handleDeleteTemplate = async (templateId: string): Promise<void> => {
    if (!user?.id) {
      toast({
        title: "Fehler",
        description: "Benutzer nicht authentifiziert",
        variant: "destructive"
      })
      return
    }

    // Find the template to get its title for confirmation
    const templateToDelete = templates.find(t => t.id === templateId)
    if (!templateToDelete) {
      toast({
        title: "Fehler",
        description: "Die zu löschende Vorlage konnte nicht gefunden werden.",
        variant: "destructive"
      })
      return
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Möchten Sie die Vorlage "${templateToDelete.titel}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`
    )

    if (!confirmed) {
      return
    }

    try {
      await templateService.deleteTemplate(templateId)
      
      // Update local state immediately for better UX
      setTemplates(prev => prev.filter(template => template.id !== templateId))
      
      // Invalidate cache
      templateCacheService.invalidateUserCaches(user.id)
      
      toast({
        title: "Vorlage gelöscht",
        description: `Die Vorlage "${templateToDelete.titel}" wurde erfolgreich gelöscht.`
      })
      
    } catch (error) {
      console.error('Error deleting template:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
      
      toast({
        title: "Fehler beim Löschen",
        description: `Die Vorlage "${templateToDelete.titel}" konnte nicht gelöscht werden: ${errorMessage}`,
        variant: "destructive"
      })
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

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let filtered = templates

    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(template => 
        (template.kategorie || 'Ohne Kategorie') === selectedCategory
      )
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(template => 
        template.titel.toLowerCase().includes(query) ||
        (template.kategorie || '').toLowerCase().includes(query) ||
        JSON.stringify(template.inhalt).toLowerCase().includes(query)
      )
    }

    return filtered.sort((a, b) => {
      // Sort by last accessed/updated, then by title
      const aDate = a.lastAccessedAt || a.erstellungsdatum
      const bDate = b.lastAccessedAt || b.erstellungsdatum
      
      if (aDate !== bDate) {
        return new Date(bDate).getTime() - new Date(aDate).getTime()
      }
      
      return a.titel.localeCompare(b.titel)
    })
  }, [templates, selectedCategory, searchQuery])

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
    setSearchQuery(value)
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  const handleRetryLoad = () => {
    loadTemplates(true)
  }

  const handleRefresh = () => {
    handleModalReopen()
  }

  return (
    <Dialog open={isTemplatesManagementModalOpen} onOpenChange={closeTemplatesManagementModal}>
      <DialogContent 
        className="max-w-[90vw] max-h-[90vh] w-full h-full p-0 gap-0 overflow-hidden"
        onOpenAutoFocus={(e) => {
          // Focus the search input when modal opens
          e.preventDefault()
          setTimeout(() => {
            const searchInput = document.querySelector('[data-testid="template-search-input"]') as HTMLInputElement
            if (searchInput) {
              searchInput.focus()
            }
          }, 100)
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground">
                Vorlagen verwalten
              </DialogTitle>
              {templates.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filteredTemplates.length} von {templates.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {loadingState.lastLoadTime && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={loadingState.isLoading}
                  className="h-8 w-8 rounded-full hover:bg-muted"
                  title="Vorlagen aktualisieren"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingState.isLoading ? 'animate-spin' : ''}`} />
                  <span className="sr-only">Aktualisieren</span>
                </Button>
              )}
              <DialogClose asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Modal schließen</span>
                </Button>
              </DialogClose>
            </div>
          </div>
          
          {/* Search and Filters Bar */}
          <div className="p-4 sm:p-6 border-b bg-muted/30 backdrop-blur">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  data-testid="template-search-input"
                  type="text"
                  placeholder="Vorlagen durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-10 h-10 bg-background/50 border-border/50 focus:bg-background focus:border-border"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                    onClick={clearSearch}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Suche löschen</span>
                  </Button>
                )}
              </div>
              
              {/* Category Filter */}
              <div className="w-full sm:w-64">
                <CategoryFilter
                  templates={templates}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  className="h-10 bg-background/50 border-border/50 focus:bg-background focus:border-border"
                  placeholder="Kategorie wählen"
                />
              </div>
              
              {/* Create Button */}
              <Button 
                onClick={handleCreateTemplate}
                className="w-full sm:w-auto h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Neue Vorlage</span>
                <span className="sm:hidden">Erstellen</span>
              </Button>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            {loadingState.isLoading ? (
              <TemplatesLoadingSkeleton 
                count={8}
                showCategories={selectedCategory === "all"}
              />
            ) : loadingState.error ? (
              <TemplatesErrorEmptyState 
                error={loadingState.error}
                onRetry={handleRetryLoad}
                onCreateTemplate={handleCreateTemplate}
                canRetry={loadingState.retryCount < 3}
              />
            ) : filteredTemplates.length === 0 ? (
              <TemplatesEmptyState 
                onCreateTemplate={handleCreateTemplate}
                hasSearch={!!searchQuery}
                hasFilter={selectedCategory !== "all"}
                onClearFilters={() => {
                  setSearchQuery("")
                  setSelectedCategory("all")
                }}
              />
            ) : (
              <TemplatesGrid 
                templates={filteredTemplates}
                onEditTemplate={handleEditTemplate}
                onDeleteTemplate={handleDeleteTemplate}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}



// Templates grid component
interface TemplatesGridProps {
  templates: TemplateWithMetadata[]
  onEditTemplate: (templateId: string) => void
  onDeleteTemplate: (templateId: string) => Promise<void>
}

function TemplatesGrid({ templates, onEditTemplate, onDeleteTemplate }: TemplatesGridProps) {
  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const groups = new Map<string, TemplateWithMetadata[]>()
    
    templates.forEach(template => {
      const category = template.kategorie || 'Ohne Kategorie'
      if (!groups.has(category)) {
        groups.set(category, [])
      }
      groups.get(category)!.push(template)
    })

    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [templates])

  return (
    <div className="space-y-8">
      {groupedTemplates.map(([category, categoryTemplates]) => (
        <div key={category}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              {category}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {categoryTemplates.length} {categoryTemplates.length === 1 ? 'Vorlage' : 'Vorlagen'}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categoryTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => onEditTemplate(template.id)}
                onDelete={onDeleteTemplate}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

