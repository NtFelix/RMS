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
import { ValidationFeedback, FieldValidationWrapper, ValidationProgress } from "./template-validation-feedback"
import { GuidanceTooltip, ContextualHelp, SmartGuidance } from "./template-guidance-tooltips"
import { AccessibleFormField, ValidationAnnouncer, ScreenReaderOnly } from "./template-accessibility"
import { useTemplateValidation } from "@/hooks/use-template-validation"
import { TemplateOnboarding, useTemplateOnboarding } from "./template-onboarding"
import { ResponsiveModal } from "./template-responsive-enhancements"
import "./template-animations.css"

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

  // Enhanced onboarding integration
  const {
    isOnboardingOpen,
    onboardingContext,
    startOnboarding,
    closeOnboarding,
    completeOnboarding,
    shouldShowOnboarding
  } = useTemplateOnboarding()

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

  // Enhanced validation using the new real-time validation system
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

  // Reset state when modal opens/closes with enhanced onboarding
  useEffect(() => {
    if (isTemplateEditorModalOpen && templateEditorData) {
      // Show onboarding for new users
      if (templateEditorData.isNewTemplate && shouldShowOnboarding('new-template')) {
        setTimeout(() => {
          startOnboarding('new-template')
        }, 1000) // Delay to let modal settle
      }

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
  }, [isTemplateEditorModalOpen, templateEditorData, setTemplateEditorModalDirty, clearAutoSaveTimers, shouldShowOnboarding, startOnboarding])

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
    <>
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
        {/* Enhanced Header with improved styling and animations */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-background via-muted/20 to-background backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <FileText className="h-5 w-5 text-primary transition-colors duration-200" />
                {isTemplateEditorModalDirty && (
                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
                )}
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                  {templateEditorData.isNewTemplate ? "Neue Vorlage erstellen" : "Vorlage bearbeiten"}
                </DialogTitle>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {templateEditorData.initialCategory && (
                    <div className="flex items-center gap-2 animate-in fade-in duration-300">
                      <span className="text-xs">Kategorie:</span>
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary/80 text-secondary-foreground backdrop-blur-sm transition-all duration-200 hover:bg-secondary">
                        {templateEditorData.initialCategory}
                      </span>
                    </div>
                  )}
                  
                  {/* Enhanced Save Status Indicator */}
                  <div className="animate-in slide-in-from-right duration-300">
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
            </div>
            
            {/* Enhanced Action Buttons with improved styling */}
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving || saveInProgressRef.current}
                className="h-9 transition-all duration-200 hover:scale-105 hover:shadow-sm"
              >
                <X className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:rotate-90" />
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving || saveInProgressRef.current || !title.trim()}
                className="h-9 transition-all duration-200 hover:scale-105 hover:shadow-md bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              >
                {(isSaving || saveInProgressRef.current) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
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

          {/* Enhanced Title Input with improved styling and animations */}
          <div className="px-6 py-4 border-b bg-gradient-to-b from-background to-muted/10">
            <AccessibleFormField
              label="Titel der Vorlage"
              description="Wählen Sie einen aussagekräftigen Titel, der den Zweck der Vorlage beschreibt"
              fieldId="template-title"
              required={true}
              error={validationErrors.find(error => error.includes("Titel"))}
              warning={validationWarnings.find(warning => warning.includes("Titel"))}
            >
              <div className="relative group">
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="z.B. Mietvertrag Wohnung, Kündigung Mieter, Nebenkostenabrechnung..."
                  disabled={isSaving}
                  className={cn(
                    "text-lg font-medium pr-12 transition-all duration-200",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                    "group-hover:shadow-sm",
                    validationErrors.some(error => error.includes("Titel")) && "border-destructive focus-visible:ring-destructive/20",
                    title.length > 0 && "bg-background/50"
                  )}
                  maxLength={100}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {title.length > 0 && (
                    <div className="animate-in fade-in duration-200">
                      <div className={cn(
                        "h-2 w-2 rounded-full transition-colors duration-200",
                        title.length > 80 ? "bg-yellow-500" : "bg-green-500"
                      )} />
                    </div>
                  )}
                  <ContextualHelp topic="template-title" size="sm" />
                </div>
                
                {/* Enhanced character count indicator */}
                <div className="absolute -bottom-6 right-0 text-xs text-muted-foreground">
                  <span className={cn(
                    "transition-colors duration-200",
                    title.length > 90 && "text-red-500",
                    title.length > 80 && title.length <= 90 && "text-yellow-500"
                  )}>
                    {title.length}/100
                  </span>
                </div>
              </div>
            </AccessibleFormField>
            
            {/* Enhanced status indicators with animations */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-6">
              <div className="flex items-center gap-3">
                {title.length > 80 && (
                  <div className="animate-in slide-in-from-left duration-300">
                    <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                      <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full animate-pulse" />
                      Titel wird lang
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {lastSaveAttempt && (
                  <span className="text-xs opacity-70">
                    Letzter Speicherversuch: {lastSaveAttempt.toLocaleTimeString()}
                  </span>
                )}
                {isTemplateEditorModalDirty && (
                  <div className="animate-in fade-in duration-200">
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <div className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse" />
                      Ungespeicherte Änderungen
                    </span>
                  </div>
                )}
                {autoSaveEnabled && templateEditorData.templateId && isTemplateEditorModalDirty && (
                  <div className="animate-in slide-in-from-right duration-300">
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs">
                      <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />
                      Auto-Save aktiv
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Validation Messages with improved animations */}
          {(validationErrors.length > 0 || validationWarnings.length > 0) && (
            <div className="px-6 py-3 border-b bg-gradient-to-r from-muted/10 via-muted/20 to-muted/10 animate-in slide-in-from-top duration-300">
              <div className="space-y-3">
                <div className="animate-in fade-in duration-500 delay-100">
                  <ValidationProgress
                    result={{
                      isValid: validationErrors.length === 0,
                      errors: validationErrors.map(error => ({
                        field: 'template',
                        message: error,
                        code: 'VALIDATION_ERROR',
                        severity: 'error' as const
                      })),
                      warnings: validationWarnings.map(warning => ({
                        field: 'template',
                        message: warning,
                        code: 'VALIDATION_WARNING',
                        severity: 'warning' as const
                      })),
                      suggestions: []
                    }}
                  />
                </div>
                
                <div className="animate-in slide-in-from-bottom duration-400 delay-200">
                  <ValidationFeedback
                    result={{
                      isValid: validationErrors.length === 0,
                      errors: validationErrors.map(error => ({
                        field: 'template',
                        message: error,
                        code: 'VALIDATION_ERROR',
                        severity: 'error' as const
                      })),
                      warnings: validationWarnings.map(warning => ({
                        field: 'template',
                        message: warning,
                        code: 'VALIDATION_WARNING',
                        severity: 'warning' as const
                      })),
                      suggestions: []
                    }}
                    showSuggestions={true}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Smart Guidance for New Users */}
          {templateEditorData?.isNewTemplate && (
            <div className="px-6 py-3 border-b bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 animate-in slide-in-from-top duration-500">
              <div className="animate-in fade-in duration-700 delay-300">
                <SmartGuidance
                  context="new-template"
                  userLevel="beginner"
                />
              </div>
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
              {/* Enhanced Variable Summary with Guidance */}
              {variables.length > 0 ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Verwendete Variablen ({variables.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {variables.slice(0, 5).map((variable) => (
                      <GuidanceTooltip
                        key={variable}
                        title={`Variable: ${variable}`}
                        content={`Diese Variable wird durch den entsprechenden Wert ersetzt, wenn die Vorlage verwendet wird.`}
                        type="info"
                      >
                        <Badge 
                          variant="outline" 
                          className="text-xs cursor-help"
                          title={variable}
                        >
                          @{variable}
                        </Badge>
                      </GuidanceTooltip>
                    ))}
                    {variables.length > 5 && (
                      <GuidanceTooltip
                        title="Weitere Variablen"
                        content={`${variables.length - 5} weitere Variablen: ${variables.slice(5).join(', ')}`}
                        type="info"
                      >
                        <Badge variant="outline" className="text-xs cursor-help">
                          +{variables.length - 5} weitere
                        </Badge>
                      </GuidanceTooltip>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Keine Variablen verwendet.</span>
                  <GuidanceTooltip
                    title="Variablen hinzufügen"
                    content="Tippen Sie '@' im Editor um verfügbare Variablen zu sehen und Ihre Vorlage dynamisch zu gestalten."
                    type="tip"
                  >
                    <span className="text-blue-600 dark:text-blue-400 cursor-help underline">
                      Verwenden Sie '@' um Variablen hinzuzufügen.
                    </span>
                  </GuidanceTooltip>
                </div>
              )}

              {/* Accessibility Announcements */}
              <ValidationAnnouncer
                errors={validationErrors}
                warnings={validationWarnings}
                fieldName="Vorlage"
              />
              
              <ScreenReaderOnly>
                {isSaving && "Vorlage wird gespeichert"}
                {!isSaving && isTemplateEditorModalDirty && "Vorlage hat ungespeicherte Änderungen"}
                {variables.length > 0 && `${variables.length} Variablen in der Vorlage verwendet`}
              </ScreenReaderOnly>

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

    {/* Enhanced Onboarding Component */}
    <TemplateOnboarding
      isOpen={isOnboardingOpen}
      onClose={closeOnboarding}
      onComplete={completeOnboarding}
      context={onboardingContext}
    />
  </>
  )
}