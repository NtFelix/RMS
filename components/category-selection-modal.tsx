"use client"

import { useState } from "react"
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
import { useModalStore } from "@/hooks/use-modal-store"
import { FolderPlus, Plus } from "lucide-react"

export function CategorySelectionModal() {
  const { 
    isCategorySelectionModalOpen, 
    categorySelectionData, 
    closeCategorySelectionModal 
  } = useModalStore()
  
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [newCategoryName, setNewCategoryName] = useState<string>("")
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false)

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category)
    setIsCreatingNew(false)
    setNewCategoryName("")
  }

  const handleCreateNewCategory = () => {
    setIsCreatingNew(true)
    setSelectedCategory("")
  }

  const handleConfirm = () => {
    const categoryToUse = isCreatingNew ? newCategoryName.trim() : selectedCategory
    
    if (categoryToUse && categorySelectionData?.onCategorySelected) {
      categorySelectionData.onCategorySelected(categoryToUse)
      closeCategorySelectionModal()
      // Reset state
      setSelectedCategory("")
      setNewCategoryName("")
      setIsCreatingNew(false)
    }
  }

  const handleCancel = () => {
    if (categorySelectionData?.onCancel) {
      categorySelectionData.onCancel()
    }
    closeCategorySelectionModal()
    // Reset state
    setSelectedCategory("")
    setNewCategoryName("")
    setIsCreatingNew(false)
  }

  const canConfirm = isCreatingNew 
    ? newCategoryName.trim().length > 0 
    : selectedCategory.length > 0

  if (!isCategorySelectionModalOpen || !categorySelectionData) {
    return null
  }

  const { existingCategories } = categorySelectionData

  return (
    <Dialog open={isCategorySelectionModalOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Kategorie auswählen</DialogTitle>
          <DialogDescription>
            Wählen Sie eine Kategorie für Ihre neue Vorlage aus oder erstellen Sie eine neue.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Existing Categories */}
          {existingCategories.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Vorhandene Kategorien</Label>
              <div className="flex flex-wrap gap-2">
                {existingCategories.map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => handleCategorySelect(category)}
                  >
                    <FolderPlus className="h-3 w-3 mr-1" />
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Create New Category */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Neue Kategorie erstellen</Label>
            {!isCreatingNew ? (
              <Button
                variant="outline"
                onClick={handleCreateNewCategory}
                className="w-full justify-start"
              >
                <Plus className="h-4 w-4 mr-2" />
                Neue Kategorie erstellen
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Kategoriename eingeben..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canConfirm) {
                      handleConfirm()
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCreatingNew(false)
                      setNewCategoryName("")
                    }}
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            Weiter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}