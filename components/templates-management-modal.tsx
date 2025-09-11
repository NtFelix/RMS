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
import { TemplateService } from "@/lib/template-service"
import { templateCacheService } from "@/lib/template-cache"
import { CategoryFilter } from "@/components/category-filter"
import { TemplateCard } from "@/components/template-card"
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
  const templateService = useMemo(() => new TemplateService(), [])

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
      const loadedTemplates = await templateService.getUserTemplates(user.id)

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

  // Handle template deletion
  const handleDeleteTemplate = async (templateId: string): Promise<void> => {
    if (!user?.id) {
      throw new Error("Benutzer nicht authentifiziert")
    }

    try {
      await templateService.deleteTemplate(templateId)
      
      // Update local state immediately for better UX
      setTemplates(prev => prev.filter(template => template.id !== templateId))
      
      // Invalidate cache
      templateCacheService.invalidateUserCaches(user.id)
      
    } catch (error) {
      console.error('Error deleting template:', error)
      throw error // Re-throw so the TemplateCard can handle the error display
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
    // Placeholder for create template functionality
    console.log("Create new template")
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
              <TemplatesLoadingSkeleton />
            ) : loadingState.error ? (
              <TemplatesErrorState 
                error={loadingState.error}
                onRetry={handleRetryLoad}
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
                onEditTemplate={(templateId) => console.log('Edit template:', templateId)}
                onDeleteTemplate={handleDeleteTemplate}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Loading skeleton component
function TemplatesLoadingSkeleton() {
  return (
    <div className="space-y-6" data-testid="templates-loading-skeleton">
      {/* Category sections skeleton */}
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-4">
          {/* Category header skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-6 bg-muted-foreground/20 rounded w-32 animate-pulse"></div>
            <div className="h-5 bg-muted-foreground/20 rounded w-16 animate-pulse"></div>
          </div>
          
          {/* Templates grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
                      <div className="flex gap-2">
                        <div className="h-3 bg-muted-foreground/20 rounded w-16"></div>
                        <div className="h-3 bg-muted-foreground/20 rounded w-12"></div>
                      </div>
                    </div>
                    <div className="h-6 w-6 bg-muted-foreground/20 rounded"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted-foreground/20 rounded"></div>
                    <div className="h-3 bg-muted-foreground/20 rounded w-5/6"></div>
                    <div className="h-3 bg-muted-foreground/20 rounded w-4/6"></div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <div className="h-3 bg-muted-foreground/20 rounded w-20"></div>
                    <div className="h-3 bg-muted-foreground/20 rounded w-20"></div>
                  </div>
                  <div className="h-8 bg-muted-foreground/20 rounded w-full mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Error state component
interface TemplatesErrorStateProps {
  error: string
  onRetry: () => void
  canRetry: boolean
}

function TemplatesErrorState({ error, onRetry, canRetry }: TemplatesErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center min-h-[400px]">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 text-destructive" />
      </div>
      <h3 className="text-lg sm:text-xl font-semibold mb-2 text-foreground">
        Fehler beim Laden der Vorlagen
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md text-sm sm:text-base px-4">
        {error}
      </p>
      {canRetry && (
        <Button onClick={onRetry} variant="outline" size="lg">
          <RefreshCw className="mr-2 h-4 w-4" />
          Erneut versuchen
        </Button>
      )}
    </div>
  )
}

// Empty state component
interface TemplatesEmptyStateProps {
  onCreateTemplate: () => void
  hasSearch: boolean
  hasFilter: boolean
  onClearFilters: () => void
}

function TemplatesEmptyState({ 
  onCreateTemplate, 
  hasSearch, 
  hasFilter, 
  onClearFilters 
}: TemplatesEmptyStateProps) {
  if (hasSearch || hasFilter) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center min-h-[400px]">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center mb-6">
          <Search className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold mb-2 text-foreground">
          Keine Vorlagen gefunden
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md text-sm sm:text-base px-4">
          {hasSearch 
            ? "Ihre Suche ergab keine Treffer. Versuchen Sie andere Suchbegriffe."
            : "In dieser Kategorie sind keine Vorlagen vorhanden."
          }
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClearFilters}>
            Filter zurücksetzen
          </Button>
          <Button onClick={onCreateTemplate}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Vorlage erstellen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center min-h-[400px]">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center mb-6">
        <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg sm:text-xl font-semibold mb-2 text-foreground">
        Noch keine Vorlagen vorhanden
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md text-sm sm:text-base px-4">
        Erstellen Sie Ihre erste Vorlage, um Zeit bei wiederkehrenden Dokumenten zu sparen.
      </p>
      <Button 
        onClick={onCreateTemplate}
        size="lg"
        className="px-6 py-3"
      >
        <Plus className="mr-2 h-4 w-4" />
        Erste Vorlage erstellen
      </Button>
    </div>
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

