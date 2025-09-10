"use client"

import { useState, useEffect } from "react"
import { FolderPlus, Loader2, Tag, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useModalStore } from "@/hooks/use-modal-store"

export function CategorySelectionModal() {
  const {
    isCategorySelectionModalOpen,
    categorySelectionData,
    closeCategorySelectionModal,
    loadUserCategories,
    clearCategoryCache
  } = useModalStore()

  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isCategorySelectionModalOpen) {
      setSelectedCategory("")
      setNewCategoryName("")
      setIsCreatingNew(false)
      setIsProcessing(false)
    }
  }, [isCategorySelectionModalOpen])

  const existingCategories = categorySelectionData?.existingCategories || []
  const isLoadingCategories = categorySelectionData?.isLoading || false
  const categoryError = categorySelectionData?.error

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category)
    setIsCreatingNew(false)
    setNewCategoryName("")
  }

  const handleNewCategoryToggle = () => {
    setIsCreatingNew(!isCreatingNew)
    setSelectedCategory("")
    if (!isCreatingNew) {
      setNewCategoryName("")
    }
  }

  const validateCategoryName = (name: string): string | null => {
    const trimmedName = name.trim()
    
    if (!trimmedName) {
      return "Bitte geben Sie einen Kategorienamen ein."
    }

    if (trimmedName.length < 2) {
      return "Der Kategoriename muss mindestens 2 Zeichen lang sein."
    }

    if (trimmedName.length > 50) {
      return "Der Kategoriename darf maximal 50 Zeichen lang sein."
    }

    // Check for invalid characters
    if (!/^[a-zA-ZäöüÄÖÜß0-9_\-\s]+$/.test(trimmedName)) {
      return "Der Kategoriename darf nur Buchstaben, Zahlen, Leerzeichen, Bindestriche und Unterstriche enthalten."
    }

    // Check if category already exists (case-insensitive)
    if (existingCategories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
      return "Diese Kategorie existiert bereits."
    }

    return null
  }

  const handleRefreshCategories = async () => {
    if (!categorySelectionData) return
    
    try {
      // Clear cache and reload categories
      clearCategoryCache()
      // The modal will automatically reload categories when opened
      toast({
        title: "Kategorien aktualisiert",
        description: "Die Kategorien wurden erfolgreich neu geladen."
      })
    } catch (error) {
      console.error('Error refreshing categories:', error)
      toast({
        title: "Fehler beim Aktualisieren",
        description: "Die Kategorien konnten nicht neu geladen werden.",
        variant: "destructive"
      })
    }
  }

  const handleConfirm = async () => {
    if (!categorySelectionData) return

    let finalCategory = ""

    if (isCreatingNew) {
      const validationError = validateCategoryName(newCategoryName)
      if (validationError) {
        toast({
          title: "Ungültiger Kategoriename",
          description: validationError,
          variant: "destructive"
        })
        return
      }
      finalCategory = newCategoryName.trim()
    } else {
      if (!selectedCategory) {
        toast({
          title: "Keine Kategorie ausgewählt",
          description: "Bitte wählen Sie eine Kategorie aus oder erstellen Sie eine neue.",
          variant: "destructive"
        })
        return
      }
      finalCategory = selectedCategory
    }

    setIsProcessing(true)

    try {
      // Call the callback with the selected/created category
      await categorySelectionData.onCategorySelected(finalCategory)
      
      // Show success message for new categories
      if (isCreatingNew) {
        toast({
          title: "Kategorie erstellt",
          description: `Die Kategorie "${finalCategory}" wurde erfolgreich erstellt.`
        })
        
        // Clear cache so new category appears in future loads
        clearCategoryCache()
      }

      handleClose()
    } catch (error) {
      console.error('Error processing category selection:', error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    if (isProcessing) return
    
    setSelectedCategory("")
    setNewCategoryName("")
    setIsCreatingNew(false)
    setIsProcessing(false)
    closeCategorySelectionModal()
  }

  const handleCancel = () => {
    if (categorySelectionData?.onCancel) {
      categorySelectionData.onCancel()
    }
    handleClose()
  }

  return (
    <Dialog open={isCategorySelectionModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Tag className="h-5 w-5 mr-2" />
            Kategorie auswählen
          </DialogTitle>
          <DialogDescription>
            Wählen Sie eine bestehende Kategorie aus oder erstellen Sie eine neue für Ihre Vorlage.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Loading State */}
          {isLoadingCategories && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Kategorien werden geladen...
                </span>
              </div>
            </div>
          )}

          {/* Error State */}
          {categoryError && !isLoadingCategories && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-destructive font-medium">
                  Fehler beim Laden der Kategorien
                </span>
              </div>
              <p className="text-xs text-destructive/80 mt-1">
                {categoryError}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefreshCategories}
                className="mt-2 h-7"
              >
                Erneut versuchen
              </Button>
            </div>
          )}

          {/* Existing Categories Section */}
          {!isLoadingCategories && !categoryError && existingCategories.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Bestehende Kategorien ({existingCategories.length})
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshCategories}
                  className="h-7 px-2"
                >
                  <Loader2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {existingCategories.map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    className={`cursor-pointer transition-colors hover:bg-primary/10 ${
                      selectedCategory === category 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => handleCategorySelect(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingCategories && !categoryError && existingCategories.length === 0 && (
            <div className="text-center py-6">
              <FolderPlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Noch keine Kategorien vorhanden
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Erstellen Sie Ihre erste Kategorie unten
              </p>
            </div>
          )}

          {/* New Category Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Neue Kategorie erstellen
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNewCategoryToggle}
                disabled={isProcessing}
                className="h-8"
              >
                <Plus className="h-4 w-4 mr-1" />
                {isCreatingNew ? "Abbrechen" : "Neu"}
              </Button>
            </div>
            
            {isCreatingNew && (
              <div className="space-y-2">
                <Input
                  id="new-category"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Kategoriename eingeben..."
                  disabled={isProcessing}
                  autoFocus
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  2-50 Zeichen, nur Buchstaben, Zahlen, Leerzeichen, Bindestriche und Unterstriche
                </p>
              </div>
            )}
          </div>

          {/* Selection Summary */}
          {(selectedCategory || (isCreatingNew && newCategoryName.trim())) && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Ausgewählte Kategorie:
              </p>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {isCreatingNew ? newCategoryName.trim() : selectedCategory}
                </span>
                {isCreatingNew && (
                  <Badge variant="secondary" className="text-xs">
                    Neu
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Abbrechen
          </Button>
          <Button 
            type="button"
            onClick={handleConfirm}
            disabled={
              isProcessing || 
              isLoadingCategories ||
              (!selectedCategory && (!isCreatingNew || !newCategoryName.trim()))
            }
          >
            {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isCreatingNew ? "Erstellen & Fortfahren" : "Fortfahren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}