"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Save, X, FileText, Loader2, AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react"
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
import { ToastAction } from "@/components/ui/toast"
import { useModalStore } from "@/hooks/use-modal-store"
import { TiptapTemplateEditor } from "@/components/editor/tiptap-template-editor"
import { extractVariablesFromContent, hasContentMeaning } from "@/lib/template-variable-extraction"
import { useDebouncedSave, SaveIndicator } from "@/hooks/use-debounced-save"
import { useTemplateOfflineDetection } from "@/hooks/use-template-offline-detection"
import { 
  TemplateSaveStatus, 
  TemplateContentSkeleton, 
  OfflineStatus,
  TemplateLoadingError 
} from "@/components/template-loading-states"
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
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSaveAttempt, setLastSaveAttempt] = useState<Date | null>(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [contentLoadError, setContentLoadError] = useState<string | null>(null)

  // Refs for managing auto-save
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const firstChangeTimeRef = useRef<Date | null>(null)
  const lastSuccessfulSaveRef = useRef<Date | null>(null)
  const saveInProgressRef = useRef(false)

  const { toast } = useToast()
  
  // Offline detection
  const { 
    isOffline, 
    isConnecting, 
    queueOperation, 
    retryConnection 
  } = useTemplateOfflineDetection({
    enableOfflineQueue: true,
    onConnectionRestored: () => {
      // Retry any failed operations when connection is restored
      if (saveError && isTemplateEditorModalDirty) {
        performManualSave()
      }
    }
  })

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Auto-save configuration
  const AUTO_SAVE_DELAY = 3000 // 3 seconds
  const MAX_AUTO_SAVE_DELAY = 15000 // 15 seconds max delay

  /**
   * Clear all auto-save timers
   */
  const clearAutoSaveTimers = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
      autoSaveTimeoutRef.current = null
    }
    if (maxAutoSaveTimeoutRef.current) {
      clearTimeout(maxAutoSaveTimeoutRef.current)
      maxAutoSaveTimeoutRef.current = null
    }
  }, [])

  // Validate template data
  const validateTemplate = useCallback((): boolean => {
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
  }, [title, templateEditorData?.initialCategory, content, variables])

  /**
   * Perform auto-save operation
   */
  const performAutoSave = useCallback(async () => {
    if (!templateEditorData || saveInProgressRef.current || !autoSaveEnabled) {
      return
    }

    // Don't auto-save if there are validation errors
    if (validationErrors.length > 0) {
      return
    }

    // Don't auto-save if title is empty
    if (!title.trim()) {
      return
    }

    saveInProgressRef.current = true
    
    try {
      const templateData: TemplateFormData = {
        titel: title.trim(),
        inhalt: content,
        kategorie: templateEditorData.initialCategory || "Sonstiges",
        kontext_anforderungen: variables
      }

      await templateEditorData.onSave(templateData)
      
      lastSuccessfulSaveRef.current = new Date()
      setSaveError(null)
      setTemplateEditorModalDirty(false)
      firstChangeTimeRef.current = null
      
      // Show subtle auto-save success indicator
      toast({
        title: "Automatisch gespeichert",
        description: "Ihre Änderungen wurden automatisch gespeichert.",
        duration: 2000,
      })
    } catch (error) {
      console.error('Auto-save failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim automatischen Speichern'
      setSaveError(errorMessage)
      
      // Show auto-save error but don't interrupt user
      toast({
        title: "Automatisches Speichern fehlgeschlagen",
        description: "Ihre Änderungen sind lokal gesichert. Versuchen Sie manuell zu speichern.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      saveInProgressRef.current = false
    }
  }, [templateEditorData, title, content, variables, validationErrors, autoSaveEnabled, setTemplateEditorModalDirty, toast])

  /**
   * Schedule auto-save with debouncing
   */
  const scheduleAutoSave = useCallback(() => {
    if (!autoSaveEnabled || !templateEditorData?.templateId) {
      return // Only auto-save for existing templates
    }

    clearAutoSaveTimers()

    // Set up regular debounced auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave()
    }, AUTO_SAVE_DELAY)

    // Set up max delay auto-save if this is the first change
    if (!firstChangeTimeRef.current) {
      firstChangeTimeRef.current = new Date()
      maxAutoSaveTimeoutRef.current = setTimeout(() => {
        performAutoSave()
      }, MAX_AUTO_SAVE_DELAY)
    }
  }, [autoSaveEnabled, templateEditorData?.templateId, performAutoSave, clearAutoSaveTimers])

  /**
   * Enhanced save operation with better error handling, retry logic, and offline support
   */
  const performManualSave = useCallback(async (retryCount = 0): Promise<boolean> => {
    if (!templateEditorData || saveInProgressRef.current) {
      return false
    }

    // Validate before saving
    if (!validateTemplate()) {
      toast({
        title: "Validierungsfehler",
        description: "Bitte korrigieren Sie die Fehler vor dem Speichern.",
        variant: "destructive"
      })
      return false
    }

    // Handle offline scenario
    if (isOffline) {
      const templateData: TemplateFormData = {
        titel: title.trim(),
        inhalt: content,
        kategorie: templateEditorData.initialCategory || "Sonstiges",
        kontext_anforderungen: variables
      }

      // Queue operation for when connection is restored
      queueOperation({
        type: templateEditorData.isNewTemplate ? 'create' : 'update',
        templateData: templateEditorData.templateId 
          ? { ...templateData, id: templateEditorData.templateId }
          : templateData
      })

      // Mark as saved locally
      setTemplateEditorModalDirty(false)
      lastSuccessfulSaveRef.current = new Date()
      
      toast({
        title: "Offline gespeichert",
        description: "Ihre Änderungen wurden lokal gespeichert und werden synchronisiert, sobald die Verbindung wiederhergestellt ist.",
        duration: 5000,
      })
      
      return true
    }

    saveInProgressRef.current = true
    setIsSaving(true)
    setSaveError(null)
    setLastSaveAttempt(new Date())

    try {
      const templateData: TemplateFormData = {
        titel: title.trim(),
        inhalt: content,
        kategorie: templateEditorData.initialCategory || "Sonstiges",
        kontext_anforderungen: variables
      }

      await templateEditorData.onSave(templateData)

      // Success
      lastSuccessfulSaveRef.current = new Date()
      setTemplateEditorModalDirty(false)
      firstChangeTimeRef.current = null
      clearAutoSaveTimers()
      
      toast({
        title: templateEditorData.isNewTemplate ? "Vorlage erstellt" : "Vorlage gespeichert",
        description: `Die Vorlage "${title.trim()}" wurde erfolgreich ${templateEditorData.isNewTemplate ? 'erstellt' : 'gespeichert'}.`,
      })
      
      return true
    } catch (error) {
      console.error('Manual save failed:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
      setSaveError(errorMessage)
      
      // Enhanced error handling with specific error types and retry options
      let errorTitle = "Fehler beim Speichern"
      let errorDescription = errorMessage
      let shouldRetry = false
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorTitle = "Netzwerkfehler"
          errorDescription = "Überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut."
          shouldRetry = true
          
          // If it's a network error, the user might have gone offline
          // The offline detection will handle this automatically
        } else if (error.message.includes('validation') || error.message.includes('Validation')) {
          errorTitle = "Validierungsfehler"
          errorDescription = error.message
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          errorTitle = "Berechtigung verweigert"
          errorDescription = "Sie haben keine Berechtigung, diese Vorlage zu speichern."
        } else if (error.message.includes('title') && error.message.includes('exists')) {
          errorTitle = "Titel bereits vorhanden"
          errorDescription = "Eine Vorlage mit diesem Titel existiert bereits. Bitte wählen Sie einen anderen Titel."
        } else {
          shouldRetry = retryCount < 2 // Allow up to 2 retries for unknown errors
        }
      }
      
      // Show error with retry option if applicable
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
        action: shouldRetry ? (
          <ToastAction altText="Erneut versuchen" onClick={() => performManualSave(retryCount + 1)}>
            Erneut versuchen
          </ToastAction>
        ) : undefined
      })
      
      return false
    } finally {
      setIsSaving(false)
      saveInProgressRef.current = false
    }
  }, [templateEditorData, title, content, variables, validateTemplate, setTemplateEditorModalDirty, clearAutoSaveTimers, toast, isOffline, queueOperation])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isTemplateEditorModalOpen && templateEditorData) {
      // Show loading state for existing templates
      if (templateEditorData.templateId && templateEditorData.initialContent) {
        setIsLoadingContent(true)
        setContentLoadError(null)
      }

      setTitle(templateEditorData.initialTitle || "")
      
      // Handle initial content properly with loading simulation for better UX
      const loadContent = async () => {
        try {
          // Simulate loading delay for better UX feedback
          if (templateEditorData.templateId) {
            await new Promise(resolve => setTimeout(resolve, 300))
          }

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
          
          setIsLoadingContent(false)
        } catch (error) {
          console.error('Error loading template content:', error)
          setContentLoadError(error instanceof Error ? error.message : 'Fehler beim Laden des Inhalts')
          setIsLoadingContent(false)
        }
      }

      loadContent()
      
      // Reset all state
      setIsSaving(false)
      setValidationErrors([])
      setValidationWarnings([])
      setSaveError(null)
      setLastSaveAttempt(null)
      setTemplateEditorModalDirty(false)
      
      // Reset refs
      firstChangeTimeRef.current = null
      lastSuccessfulSaveRef.current = null
      saveInProgressRef.current = false
      
      // Enable auto-save for existing templates
      setAutoSaveEnabled(!!templateEditorData.templateId)
    } else if (!isTemplateEditorModalOpen) {
      // Clear timers when modal closes
      clearAutoSaveTimers()
      setIsLoadingContent(false)
      setContentLoadError(null)
    }
  }, [isTemplateEditorModalOpen, templateEditorData, setTemplateEditorModalDirty, clearAutoSaveTimers])

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      clearAutoSaveTimers()
    }
  }, [clearAutoSaveTimers])

  // Save on unmount if there are unsaved changes (for existing templates only)
  useEffect(() => {
    return () => {
      if (isTemplateEditorModalDirty && templateEditorData?.templateId && autoSaveEnabled) {
        // Fire and forget save on unmount
        performAutoSave().catch(error => {
          console.error('Failed to save on unmount:', error)
        })
      }
    }
  }, [isTemplateEditorModalDirty, templateEditorData?.templateId, autoSaveEnabled, performAutoSave])

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
    setSaveError(null)
    
    // Schedule auto-save for content changes
    scheduleAutoSave()
  }, [setTemplateEditorModalDirty, scheduleAutoSave])

  // Handle title changes
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle)
    setTemplateEditorModalDirty(true)
    setSaveError(null)
    
    // Clear validation errors when title changes
    setValidationErrors([])
    setValidationWarnings([])
    
    // Schedule auto-save for title changes
    scheduleAutoSave()
  }, [setTemplateEditorModalDirty, scheduleAutoSave])





  // Handle save action
  const handleSave = useCallback(async () => {
    if (!templateEditorData) return

    const success = await performManualSave()
    if (success) {
      // Clear auto-save timers
      clearAutoSaveTimers()
      
      // Reset all state
      setTitle("")
      setContent({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      })
      setVariables([])
      setValidationErrors([])
      setValidationWarnings([])
      setSaveError(null)
      setLastSaveAttempt(null)
      firstChangeTimeRef.current = null
      lastSuccessfulSaveRef.current = null
      
      // Close the modal
      closeTemplateEditorModal()
    }
  }, [templateEditorData, performManualSave, clearAutoSaveTimers, closeTemplateEditorModal])

  // Handle cancel action
  const handleCancel = useCallback(() => {
    if (templateEditorData?.onCancel) {
      templateEditorData.onCancel()
    }
    
    // Clear auto-save timers
    clearAutoSaveTimers()
    
    // Check for unsaved changes
    if (isTemplateEditorModalDirty) {
      // Show confirmation dialog for unsaved changes
      const confirmClose = window.confirm(
        "Sie haben ungespeicherte Änderungen. Möchten Sie diese verwerfen und das Fenster schließen?"
      )
      
      if (!confirmClose) {
        return
      }
    }
    
    // Reset all state
    setTitle("")
    setContent({
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }]
    })
    setVariables([])
    setValidationErrors([])
    setValidationWarnings([])
    setSaveError(null)
    setLastSaveAttempt(null)
    firstChangeTimeRef.current = null
    lastSuccessfulSaveRef.current = null
    
    // Close the modal
    closeTemplateEditorModal()
  }, [templateEditorData, clearAutoSaveTimers, isTemplateEditorModalDirty, closeTemplateEditorModal])



  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Save shortcut (Ctrl/Cmd + S)
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      handleSave()
      return
    }

    // Cancel shortcut (Escape)
    if (event.key === 'Escape') {
      event.preventDefault()
      handleCancel()
      return
    }

    // Auto-save toggle (Ctrl/Cmd + Shift + A)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
      event.preventDefault()
      setAutoSaveEnabled(prev => {
        const newValue = !prev
        toast({
          title: `Automatisches Speichern ${newValue ? 'aktiviert' : 'deaktiviert'}`,
          description: newValue 
            ? "Ihre Änderungen werden automatisch gespeichert."
            : "Automatisches Speichern wurde deaktiviert.",
          duration: 3000,
        })
        return newValue
      })
      return
    }
  }, [handleSave, handleCancel, toast])

  // Prevent SSR issues
  if (!isMounted) return null
  if (!templateEditorData) return null

  return (
    <Dialog 
      open={isTemplateEditorModalOpen} 
      onOpenChange={(open) => {
        if (!open) {
          handleCancel()
        }
      }}
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
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {templateEditorData.initialCategory && (
                    <div className="flex items-center gap-2">
                      Kategorie: 
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                        {templateEditorData.initialCategory}
                      </span>
                    </div>
                  )}
                  
                  {/* Save Status Indicator */}
                  <TemplateSaveStatus
                    status={
                      isSaving ? 'saving' :
                      saveError ? 'error' :
                      isTemplateEditorModalDirty ? 'dirty' :
                      lastSuccessfulSaveRef.current ? 'saved' :
                      'idle'
                    }
                    lastSaved={lastSuccessfulSaveRef.current || undefined}
                    error={saveError || undefined}
                    autoSaveEnabled={autoSaveEnabled && !!templateEditorData?.templateId}
                  />
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving || saveInProgressRef.current}
                className="h-9"
              >
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving || saveInProgressRef.current || !title.trim()}
                className="h-9"
              >
                {(isSaving || saveInProgressRef.current) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Speichern
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Offline Status */}
          {(isOffline || isConnecting) && (
            <div className="px-6 py-2 border-b">
              <OfflineStatus 
                isOffline={isOffline}
                isConnecting={isConnecting}
                onRetry={retryConnection}
              />
            </div>
          )}

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
                <div className="flex items-center gap-2">
                  {lastSaveAttempt && (
                    <span className="text-xs">
                      Letzter Speicherversuch: {lastSaveAttempt.toLocaleTimeString()}
                    </span>
                  )}
                  {isTemplateEditorModalDirty && (
                    <span className="text-amber-600 dark:text-amber-400">
                      • Ungespeicherte Änderungen
                    </span>
                  )}
                  {autoSaveEnabled && templateEditorData.templateId && isTemplateEditorModalDirty && (
                    <span className="text-blue-600 dark:text-blue-400 text-xs">
                      • Auto-Save aktiv
                    </span>
                  )}
                </div>
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
            {isLoadingContent ? (
              <TemplateContentSkeleton />
            ) : contentLoadError ? (
              <TemplateLoadingError
                error={contentLoadError}
                templateName={templateEditorData?.initialTitle}
                onRetry={() => {
                  setContentLoadError(null)
                  setIsLoadingContent(true)
                  // Trigger content reload
                  setTimeout(() => {
                    setIsLoadingContent(false)
                  }, 300)
                }}
                onCancel={handleCancel}
              />
            ) : (
              <TiptapTemplateEditor
                initialContent={content}
                onContentChange={handleContentChange}
                onSave={handleSave}
                onCancel={handleCancel}
                placeholder="Beginnen Sie mit der Eingabe oder verwenden Sie '/' für Befehle und '@' für Variablen..."
                className="h-full"
                editable={!isSaving && !saveInProgressRef.current && !isLoadingContent}
                enablePerformanceMonitoring={process.env.NODE_ENV === 'development'}
                enableVirtualScrolling={false} // Can be enabled for very large templates
                optimizeForLargeDocuments={true}
                deferInitialization={false}
                contentChangeDelay={200}
                variableExtractionDelay={400}
              />
            )}
          </div>

          {/* Footer with Variable Summary and Save Status */}
          <div className="px-6 py-3 border-t bg-muted/30">
            <div className="flex items-center justify-between">
              {/* Variable Summary */}
              {variables.length > 0 ? (
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
              ) : (
                <div className="text-sm text-muted-foreground">
                  Keine Variablen verwendet. Verwenden Sie '@' um Variablen hinzuzufügen.
                </div>
              )}

              {/* Save Status and Controls */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {lastSuccessfulSaveRef.current && (
                  <span>
                    Zuletzt gespeichert: {lastSuccessfulSaveRef.current.toLocaleTimeString()}
                  </span>
                )}
                
                {templateEditorData.templateId && (
                  <div className="flex items-center gap-2">
                    <span>Auto-Save:</span>
                    <button
                      type="button"
                      onClick={() => setAutoSaveEnabled(prev => !prev)}
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium transition-colors",
                        autoSaveEnabled 
                          ? "bg-green-100 text-green-700 hover:bg-green-200" 
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      {autoSaveEnabled ? "Ein" : "Aus"}
                    </button>
                  </div>
                )}
                
                <div className="text-xs">
                  Strg+S zum Speichern
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}