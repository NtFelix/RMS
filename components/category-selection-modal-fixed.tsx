"use client"

import { useState } from "react"
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
  } = useModalStore()

  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const existingCategories = categorySelectionData?.existingCategories || []
  const isLoadingCategories = categorySelectionData?.isLoading || false
  const categoryError = categorySelectionData?.error
  const allowNewCategory = categorySelectionData?.allowNewCategory ?? true

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

  const handleConfirm = async () => {
    if (!categorySelectionData) return

    let finalCategory = ""

    if (isCreatingNew && allowNewCategory) {
      const trimmedName = newCategoryName.trim()
      if (!trimmedName) {
        toast({
          title: "Ungültiger Kategoriename",
          description: "Bitte geben Sie einen Kategorienamen ein.",
          variant: "destructive"
        })
        return
      }
      if (trimmedName.length < 2 || trimmedName.length > 50) {
        toast({
          title: "Ungültiger Kategoriename",
          description: "Der Kategoriename muss zwischen 2 und 50 Zeichen lang sein.",
          variant: "destructive"
        })
        return
      }
      finalCategory = trimmedName
    } else {
      if (!selectedCategory) {
        toast({
          title: "Keine Kategorie ausgewählt",
          description: "Bitte wählen Sie eine Kategorie aus.",
          variant: "destructive"
        })
        return
      }
      finalCategory = selectedCategory
    }

    setIsProcessing(true)

    try {
      await categorySelectionData.onCategorySelected(finalCategory)
      
      if (isCreatingNew) {
        toast({
          title: "Kategorie erstellt",
          description: `Die Kategorie "${finalCategory}" wurde erfolgreich erstellt.`
        })
      }

      // Reset state and close
      setSelectedCategory("")
      setNewCategoryName("")
      setIsCreatingNew(false)
      setIsProcessing(false)
      closeCategorySelectionModal()
    } catch (error) {
      console.error('Error processing category selection:', error)
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive"
      })
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    if (categorySelectionData?.onCancel) {
      categorySelectionData.onCancel()
    }
    // Reset state and close
    setSelectedCategory("")
    setNewCategoryName("")
    setIsCreatingNew(false)
    setIsProcessing(false)
    closeCategorySelectionModal()
  }

  if (!isCategorySelectionModalOpen) return null

  return (
    <Dialog open={isCategorySelectionModalOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Tag className="h-5 w-5 mr-2" />
            Kategorie auswählen
          </DialogTitle>
          <DialogDescription>
            {allowNewCategory 
              ? "Wählen Sie eine bestehende Kategorie aus oder erstellen Sie eine neue für Ihre Vorlage."
              : "Wählen Sie eine bestehende Kategorie für Ihre Vorlage aus."
            }
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
              <span className="text-sm text-destructive font-medium">
                Fehler beim Laden der Kategorien: {categoryError}
              </span>
            </div>
          )}

          {/* Existing Categories Section */}
          {!isLoadingCategories && !categoryError && existingCategories.length > 0 && (
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

          {/* Empty State */}
          {!isLoadingCategories && !categoryError && existingCategories.length === 0 && (
            <div className="text-center py-6">
              <FolderPlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Noch keine Kategorien vorhanden
              </p>
              {allowNewCategory && (
                <p className="text-xs text-muted-foreground mt-1">
                  Erstellen Sie Ihre erste Kategorie unten
                </p>
              )}
            </div>
          )}

          {/* New Category Section */}
          {allowNewCategory && (
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
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Kategoriename eingeben..."
                    disabled={isProcessing}
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    2-50 Zeichen
                  </p>
                </div>
              )}
            </div>
          )}

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
              (!selectedCategory && (!allowNewCategory || !isCreatingNew || !newCategoryName.trim()))
            }
          >
            {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isCreatingNew && allowNewCategory ? "Erstellen & Fortfahren" : "Fortfahren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}