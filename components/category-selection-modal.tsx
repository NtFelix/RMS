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
    closeCategorySelectionModal
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
          {/* Existing Categories Section */}
          {existingCategories.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Bestehende Kategorien ({existingCategories.length})
              </Label>
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