"use client"

import { useState } from "react"
import { 
  Trash2, 
  Edit3, 
  Copy, 
  Eye,
  FileText
} from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { ConfirmationAlertDialog } from "@/components/ui/confirmation-alert-dialog"
import { useModalStore } from "@/hooks/use-modal-store"
import { useToast } from "@/hooks/use-toast"
import { templateClientService } from "@/lib/template-client-service"
import type { TemplateItem } from "@/types/template"

interface TemplateContextMenuProps {
  template: TemplateItem
  children: React.ReactNode
  onTemplateDeleted?: () => void
  onTemplateUpdated?: () => void
}

export function TemplateContextMenu({ 
  template, 
  children, 
  onTemplateDeleted,
  onTemplateUpdated
}: TemplateContextMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const { openTemplateEditorModal } = useModalStore()

  const handleEdit = () => {
    // Handle both string and object content
    let parsedContent
    try {
      parsedContent = typeof template.content === 'string' 
        ? JSON.parse(template.content) 
        : template.content
    } catch (error) {
      console.error('Error parsing template content:', error)
      parsedContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [],
          },
        ],
      }
    }

    openTemplateEditorModal({
      templateId: template.id,
      initialTitle: template.name,
      initialContent: parsedContent,
      initialCategory: template.category || '',
      isNewTemplate: false,
      onSave: async (templateData) => {
        try {
          await templateClientService.updateTemplate(template.id, {
            titel: templateData.titel,
            inhalt: templateData.inhalt,
            kategorie: templateData.kategorie
          })
          
          toast({
            title: "Vorlage aktualisiert",
            description: `"${templateData.titel}" wurde erfolgreich aktualisiert.`,
          })
          
          if (onTemplateUpdated) {
            onTemplateUpdated()
          }
        } catch (error) {
          console.error('Error updating template:', error)
          toast({
            title: "Fehler beim Aktualisieren",
            description: error instanceof Error ? error.message : "Unbekannter Fehler",
            variant: "destructive",
          })
          throw error
        }
      },
      onCancel: () => {
        // Template editor modal will handle the cancel logic
      }
    })
  }

  const handleDuplicate = async () => {
    try {
      // Create duplicate with "(Copy)" suffix
      const duplicateTitle = `${template.name} (Copy)`
      
      // Handle both string and object content
      let parsedContent
      try {
        parsedContent = typeof template.content === 'string' 
          ? JSON.parse(template.content) 
          : template.content
      } catch (error) {
        console.error('Error parsing template content for duplication:', error)
        parsedContent = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [],
            },
          ],
        }
      }

      await templateClientService.createTemplate({
        titel: duplicateTitle,
        inhalt: parsedContent,
        kategorie: template.category || '',
        kontext_anforderungen: template.variables || []
      })
      
      toast({
        title: "Vorlage dupliziert",
        description: `"${duplicateTitle}" wurde erfolgreich erstellt.`,
      })
      
      if (onTemplateUpdated) {
        onTemplateUpdated()
      }
    } catch (error) {
      console.error('Error duplicating template:', error)
      toast({
        title: "Fehler beim Duplizieren",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await templateClientService.deleteTemplate(template.id)
      
      toast({
        title: "Vorlage gelöscht",
        description: `"${template.name}" wurde erfolgreich gelöscht.`,
      })
      
      if (onTemplateDeleted) {
        onTemplateDeleted()
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast({
        title: "Löschen fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handlePreview = () => {
    // For now, open the template in edit mode as preview
    // In the future, this could open a read-only preview modal
    handleEdit()
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={handlePreview}>
            <Eye className="mr-2 h-4 w-4" />
            Vorschau anzeigen
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem onClick={handleEdit}>
            <Edit3 className="mr-2 h-4 w-4" />
            Bearbeiten
          </ContextMenuItem>
          
          <ContextMenuItem onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplizieren
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <ConfirmationAlertDialog
        isOpen={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Vorlage löschen"
        description={
          <>
            Möchten Sie die Vorlage <strong>{template.name}</strong> wirklich dauerhaft löschen?
            <br /><br />
            <span className="text-sm text-muted-foreground">
              Diese Aktion kann nicht rückgängig gemacht werden. Die Vorlage wird dauerhaft aus dem System entfernt.
            </span>
            {template.variables.length > 0 && (
              <>
                <br /><br />
                <span className="text-sm text-muted-foreground">
                  Diese Vorlage enthält {template.variables.length} Variable{template.variables.length !== 1 ? 'n' : ''}: {template.variables.join(', ')}
                </span>
              </>
            )}
          </>
        }
        confirmButtonText="Endgültig löschen"
        confirmButtonVariant="destructive"
        cancelButtonText="Abbrechen"
      />
    </>
  )
}