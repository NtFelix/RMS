"use client"

import { useState, useEffect, useCallback } from "react"
import { Save, X, FileText, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useModalStore } from "@/hooks/use-modal-store"
import { TiptapTemplateEditor } from "@/components/editor/tiptap-template-editor"
import { extractVariablesFromContent, hasContentMeaning } from "@/lib/template-variable-extraction"
import { cn } from "@/lib/utils"

interface TemplateFormData {
  titel: string
  inhalt: object
  kategorie: string
  kontext_anforderungen: string[]
}

interface TemplateEditorData {
  templateId?: string // For editing existing templates
  initialTitle?: string
  initialContent?: object
  initialCategory?: string
  isNewTemplate: boolean
  onSave: (template: TemplateFormData) => Promise<void>
  onCancel: () => void
}

export function TemplateEditorModal() {
  const [isMounted, setIsMounted] = useState(false)
  
  const {
    isTemplateEditorModalOpen,
    templateEditorData,
    isTemplateEditorModalDirty,
    closeTemplateEditorModal,
    setTemplateEditorModalDirty,
  } = useModalStore()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState<object>({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [],
      },
    ],
  })
  const [variables, setVariables] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])

  const { toast } = useToast()

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isTemplateEditorModalOpen && templateEditorData) {
      setTitle(templateEditorData.initialTitle || "")
      
      // Handle initial content properly
      const initialContent = templateEditorData.initialContent || {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [],
          },
        ],
      }
      
      setContent(initialContent)
      
      // Extract variables from initial content
      const initialVariables = extractVariablesFromContent(initialContent)
      setVariables(initialVariables)
      
      setIsSaving(false)
      setValidationErrors([])
      setValidationWarnings([])
      setTemplateEditorModalDirty(false)
    }
  }, [isTemplateEditorModalOpen, templateEditorData, setTemplateEditorModalDirty])

  // Handle content changes from the editor
  const handleContentChange = useCallback((newContent: object, extractedVariables?: string[]) => {
    setContent(newContent)
    
    // Extract variables from content if not provided by the editor
    const variables = extractedVariables || extractVariablesFromContent(newContent)
    setVariables(variables)
    
    setTemplateEditorModalDirty(true)
    
    // Clear previous validation errors when content changes
    setValidationErrors([])
    setValidationWarnings([])
  }, [setTemplateEditorModalDirty])

  // Handle title changes
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    setTemplateEditorModalDirty(true)
  }

  // Validate template data
  const validateTemplate = (): boolean => {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate title
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      errors.push("Bitte geben Sie einen Titel für die Vorlage ein.")
    } else if (trimmedTitle.length < 2) {
      errors.push("Der Titel muss mindestens 2 Zeichen lang sein.")
    } else if (trimmedTitle.length > 100) {
      errors.push("Der Titel darf maximal 100 Zeichen lang sein.")
    }

    // Validate category
    const category = templateEditorData?.initialCategory?.trim()
    if (!category) {
      errors.push("Bitte wählen Sie eine Kategorie für die Vorlage aus.")
    }

    // Basic content validation (more detailed validation will be done server-side)
    if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
      warnings.push("Der Vorlageninhalt ist leer. Fügen Sie Text und Variablen hinzu.")
    } else {
      // Check if content has meaningful content (not just empty paragraphs)
      const hasContent = hasContentMeaning(content)
      if (!hasContent) {
        warnings.push("Die Vorlage scheint keinen Inhalt zu haben. Fügen Sie Text oder Variablen hinzu.")
      }
    }

    // Check for content without any variables
    if (variables.length === 0 && content && Object.keys(content).length > 0) {
      const hasContent = hasContentMeaning(content)
      if (hasContent) {
        warnings.push("Die Vorlage enthält keine Variablen. Erwägen Sie das Hinzufügen von Variablen mit '@', um die Vorlage dynamisch zu gestalten.")
      }
    }

    // Check for too many variables (performance warning)
    if (variables.length > 20) {
      warnings.push(`Die Vorlage enthält ${variables.length} Variablen. Eine große Anzahl von Variablen kann die Performance beeinträchtigen.`)
    }

    setValidationErrors(errors)
    setValidationWarnings(warnings)

    return errors.length === 0
  }



  // Handle save action
  const handleSave = async () => {
    if (!templateEditorData) return

    // Validate before saving
    if (!validateTemplate()) {
      toast({
        title: "Validierungsfehler",
        description: "Bitte korrigieren Sie die Fehler vor dem Speichern.",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)

    try {
      const templateData: TemplateFormData = {
        titel: title.trim(),
        inhalt: content,
        kategorie: templateEditorData.initialCategory || "Sonstiges",
        kontext_anforderungen: variables
      }

      // Call the save handler provided by the parent component
      await templateEditorData.onSave(templateData)

      // Success feedback is handled by the parent component (useTemplateOperations)
      // Reset dirty state and close modal
      setTemplateEditorModalDirty(false)
      handleClose()
    } catch (error) {
      console.error('Error saving template:', error)
      
      // Enhanced error handling with specific error types
      let errorMessage = "Die Vorlage konnte nicht gespeichert werden."
      let errorTitle = "Fehler beim Speichern"
      
      if (error instanceof Error) {
        if (error.message.includes('Validation failed')) {
          errorTitle = "Validierungsfehler"
          errorMessage = error.message
        } else if (error.message.includes('title')) {
          errorTitle = "Ungültiger Titel"
          errorMessage = "Der Titel der Vorlage ist ungültig oder bereits vorhanden."
        } else if (error.message.includes('category')) {
          errorTitle = "Ungültige Kategorie"
          errorMessage = "Die Kategorie der Vorlage ist ungültig."
        } else if (error.message.includes('content')) {
          errorTitle = "Ungültiger Inhalt"
          errorMessage = "Der Inhalt der Vorlage ist ungültig oder enthält Fehler."
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle cancel action
  const handleCancel = () => {
    if (templateEditorData?.onCancel) {
      templateEditorData.onCancel()
    }
    handleClose()
  }

  // Handle close with dirty state check
  const handleClose = () => {
    if (isSaving) return
    
    // The modal store will handle dirty state confirmation
    closeTemplateEditorModal()
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Save shortcut (Ctrl/Cmd + S)
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      handleSave()
      return
    }

    // Cancel shortcut (Escape)
    if (event.key === 'Escape') {
      event.preventDefault()
      handleClose()
      return
    }
  }

  // Prevent SSR issues
  if (!isMounted) return null
  if (!templateEditorData) return null

  return (
    <Dialog 
      open={isTemplateEditorModalOpen} 
      onOpenChange={handleClose}
    >
      <DialogContent 
        className="max-w-6xl w-full h-[90vh] flex flex-col p-0"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <DialogTitle className="text-lg">
                  {templateEditorData.isNewTemplate ? "Neue Vorlage erstellen" : "Vorlage bearbeiten"}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {templateEditorData.initialCategory && (
                    <span className="flex items-center gap-2">
                      Kategorie: 
                      <Badge variant="secondary" className="text-xs">
                        {templateEditorData.initialCategory}
                      </Badge>
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-9"
              >
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !title.trim()}
                className="h-9"
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Speichern
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title Input */}
          <div className="px-6 py-4 border-b bg-background">
            <div className="space-y-2">
              <Label htmlFor="template-title" className="text-sm font-medium">
                Titel der Vorlage
              </Label>
              <Input
                id="template-title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Geben Sie einen Titel für die Vorlage ein..."
                disabled={isSaving}
                className={cn(
                  "text-lg font-medium",
                  validationErrors.some(error => error.includes("Titel")) && "border-destructive"
                )}
                maxLength={100}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {title.length}/100 Zeichen
                </span>
                {isTemplateEditorModalDirty && (
                  <span className="text-amber-600 dark:text-amber-400">
                    • Ungespeicherte Änderungen
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Validation Messages */}
          {(validationErrors.length > 0 || validationWarnings.length > 0) && (
            <div className="px-6 py-3 border-b bg-muted/20">
              {validationErrors.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center space-x-2 text-destructive mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Fehler</span>
                  </div>
                  <ul className="text-sm text-destructive space-y-1 ml-6">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="list-disc">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {validationWarnings.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Hinweise</span>
                  </div>
                  <ul className="text-sm text-amber-600 dark:text-amber-400 space-y-1 ml-6">
                    {validationWarnings.map((warning, index) => (
                      <li key={index} className="list-disc">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <TiptapTemplateEditor
              initialContent={content}
              onContentChange={handleContentChange}
              onSave={handleSave}
              onCancel={handleCancel}
              placeholder="Beginnen Sie mit der Eingabe oder verwenden Sie '/' für Befehle und '@' für Variablen..."
              className="h-full"
              editable={!isSaving}
            />
          </div>

          {/* Footer with Variable Summary */}
          {variables.length > 0 && (
            <div className="px-6 py-3 border-t bg-muted/30">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Verwendete Variablen ({variables.length}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {variables.slice(0, 5).map((variable) => (
                    <Badge 
                      key={variable} 
                      variant="outline" 
                      className="text-xs"
                      title={variable}
                    >
                      @{variable}
                    </Badge>
                  ))}
                  {variables.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{variables.length - 5} weitere
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}