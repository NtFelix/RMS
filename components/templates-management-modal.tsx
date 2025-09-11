"use client"

import { useState, useEffect } from "react"
import { X, Plus, Search, FileText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useModalStore } from "@/hooks/use-modal-store"

export function TemplatesManagementModal() {
  const {
    isTemplatesManagementModalOpen,
    closeTemplatesManagementModal,
  } = useModalStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isLoading, setIsLoading] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isTemplatesManagementModalOpen) {
      setSearchQuery("")
      setSelectedCategory("all")
      setIsLoading(false)
    }
  }, [isTemplatesManagementModalOpen])

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
            <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground">
              Vorlagen verwalten
            </DialogTitle>
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
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-10 bg-background/50 border-border/50 focus:bg-background focus:border-border">
                    <SelectValue placeholder="Kategorie wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Kategorien</SelectItem>
                    <SelectItem value="mietvertraege">Mietverträge</SelectItem>
                    <SelectItem value="kuendigungen">Kündigungen</SelectItem>
                    <SelectItem value="betriebskosten">Betriebskosten</SelectItem>
                    <SelectItem value="sonstiges">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
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
            {isLoading ? (
              <TemplatesLoadingSkeleton />
            ) : (
              <TemplatesEmptyState onCreateTemplate={handleCreateTemplate} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Placeholder loading skeleton component
function TemplatesLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
            <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-3 bg-muted-foreground/20 rounded"></div>
              <div className="h-3 bg-muted-foreground/20 rounded w-5/6"></div>
              <div className="h-3 bg-muted-foreground/20 rounded w-4/6"></div>
            </div>
            <div className="h-8 bg-muted-foreground/20 rounded w-full mt-4"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Placeholder empty state component
interface TemplatesEmptyStateProps {
  onCreateTemplate: () => void
}

function TemplatesEmptyState({ onCreateTemplate }: TemplatesEmptyStateProps) {
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