"use client"

import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { useModalStore } from '@/hooks/use-modal-store'
import { templateClientService } from '@/lib/template-client-service'
import { Template, TemplateFormData, TemplateEditorData } from '@/types/template'

interface OperationState {
  isLoading: boolean
  operation: 'create' | 'update' | 'delete' | 'duplicate' | 'load' | null
  progress?: number
  currentTemplate?: string
}

/**
 * Hook for handling template operations (create, update, delete)
 * Provides handlers for template editor modal and manages loading states
 */
export function useTemplateOperations() {
  const [operationState, setOperationState] = useState<OperationState>({
    isLoading: false,
    operation: null
  })
  const { toast } = useToast()
  const { openTemplateEditorModal, closeTemplateEditorModal, closeCategorySelectionModal } = useModalStore()

  // Helper to update operation state
  const setOperation = useCallback((operation: OperationState['operation'], templateName?: string, progress?: number) => {
    setOperationState({
      isLoading: !!operation,
      operation,
      currentTemplate: templateName,
      progress
    })
  }, [])

  /**
   * Create a new template with enhanced loading states and error handling
   */
  const createTemplate = useCallback(async (data: TemplateFormData): Promise<Template | null> => {
    setOperation('create', data.titel)
    
    try {
      // Show progress for better UX
      setOperation('create', data.titel, 25)
      
      const template = await templateClientService.createTemplate(data)
      
      setOperation('create', data.titel, 100)
      
      toast({
        title: "Vorlage erstellt",
        description: `Die Vorlage "${template.titel}" wurde erfolgreich erstellt.`,
      })
      
      return template
    } catch (error) {
      console.error('Error creating template:', error)
      
      const errorMessage = error instanceof Error ? error.message : "Die Vorlage konnte nicht erstellt werden."
      
      toast({
        title: "Fehler beim Erstellen",
        description: errorMessage,
        variant: "destructive",
        action: (
          <ToastAction altText="Erneut versuchen" onClick={() => createTemplate(data)}>
            Erneut versuchen
          </ToastAction>
        )
      })
      
      return null
    } finally {
      setOperation(null)
    }
  }, [toast, setOperation])

  /**
   * Update an existing template with enhanced loading states and error handling
   */
  const updateTemplate = useCallback(async (id: string, data: Partial<TemplateFormData>): Promise<Template | null> => {
    setOperation('update', data.titel)
    
    try {
      // Show progress for better UX
      setOperation('update', data.titel, 25)
      
      const template = await templateClientService.updateTemplate(id, data)
      
      setOperation('update', data.titel, 100)
      
      toast({
        title: "Vorlage aktualisiert",
        description: `Die Vorlage "${template.titel}" wurde erfolgreich aktualisiert.`,
      })
      
      return template
    } catch (error) {
      console.error('Error updating template:', error)
      
      const errorMessage = error instanceof Error ? error.message : "Die Vorlage konnte nicht aktualisiert werden."
      
      toast({
        title: "Fehler beim Aktualisieren",
        description: errorMessage,
        variant: "destructive",
        action: (
          <ToastAction altText="Erneut versuchen" onClick={() => updateTemplate(id, data)}>
            Erneut versuchen
          </ToastAction>
        )
      })
      
      return null
    } finally {
      setOperation(null)
    }
  }, [toast, setOperation])

  /**
   * Delete a template with enhanced loading states and error handling
   */
  const deleteTemplate = useCallback(async (id: string, title: string): Promise<boolean> => {
    setOperation('delete', title)
    
    try {
      // Show progress for better UX
      setOperation('delete', title, 50)
      
      await templateClientService.deleteTemplate(id)
      
      setOperation('delete', title, 100)
      
      toast({
        title: "Vorlage gelöscht",
        description: `Die Vorlage "${title}" wurde erfolgreich gelöscht.`,
      })
      
      return true
    } catch (error) {
      console.error('Error deleting template:', error)
      
      const errorMessage = error instanceof Error ? error.message : "Die Vorlage konnte nicht gelöscht werden."
      
      toast({
        title: "Fehler beim Löschen",
        description: errorMessage,
        variant: "destructive",
        action: (
          <ToastAction altText="Erneut versuchen" onClick={() => deleteTemplate(id, title)}>
            Erneut versuchen
          </ToastAction>
        )
      })
      
      return false
    } finally {
      setOperation(null)
    }
  }, [toast, setOperation])

  /**
   * Open template editor for creating a new template
   */
  const openCreateTemplateEditor = useCallback((category: string) => {
    // Close category selection modal first
    closeCategorySelectionModal()
    
    const editorData: TemplateEditorData = {
      isNewTemplate: true,
      initialCategory: category,
      onSave: async (templateData: TemplateFormData) => {
        const template = await createTemplate(templateData)
        if (template) {
          closeTemplateEditorModal()
          // Optionally trigger a refresh of the templates list
          // This could be handled by the parent component
        }
      },
      onCancel: () => {
        closeTemplateEditorModal()
      }
    }
    
    openTemplateEditorModal(editorData)
  }, [createTemplate, openTemplateEditorModal, closeTemplateEditorModal, closeCategorySelectionModal])

  /**
   * Open template editor for editing an existing template with loading states
   */
  const openEditTemplateEditor = useCallback(async (template: Template) => {
    setOperation('load', template.titel)
    
    try {
      // Show progress for better UX
      setOperation('load', template.titel, 25)
      
      // Fetch the latest template data to ensure we have the most current version
      const latestTemplate = await templateClientService.getTemplate(template.id)
      
      setOperation('load', template.titel, 75)
      
      const editorData: TemplateEditorData = {
        templateId: latestTemplate.id,
        isNewTemplate: false,
        initialTitle: latestTemplate.titel,
        initialContent: latestTemplate.inhalt,
        initialCategory: latestTemplate.kategorie || undefined,
        onSave: async (templateData: TemplateFormData) => {
          const updatedTemplate = await updateTemplate(latestTemplate.id, templateData)
          if (updatedTemplate) {
            closeTemplateEditorModal()
            // Optionally trigger a refresh of the templates list
            // This could be handled by the parent component
          }
        },
        onCancel: () => {
          closeTemplateEditorModal()
        }
      }
      
      setOperation('load', template.titel, 100)
      
      openTemplateEditorModal(editorData)
    } catch (error) {
      console.error('Error loading template for editing:', error)
      
      const errorMessage = error instanceof Error ? error.message : "Die Vorlage konnte nicht geladen werden."
      
      toast({
        title: "Fehler beim Laden",
        description: errorMessage,
        variant: "destructive",
        action: (
          <ToastAction altText="Erneut versuchen" onClick={() => openEditTemplateEditor(template)}>
            Erneut versuchen
          </ToastAction>
        )
      })
    } finally {
      setOperation(null)
    }
  }, [updateTemplate, openTemplateEditorModal, closeTemplateEditorModal, toast, setOperation])

  /**
   * Duplicate a template with enhanced loading states
   */
  const duplicateTemplate = useCallback(async (template: Template): Promise<Template | null> => {
    setOperation('duplicate', template.titel)
    
    try {
      const duplicateData: TemplateFormData = {
        titel: `${template.titel} (Kopie)`,
        inhalt: template.inhalt,
        kategorie: template.kategorie || 'Sonstiges',
        kontext_anforderungen: template.kontext_anforderungen
      }
      
      const result = await createTemplate(duplicateData)
      return result
    } catch (error) {
      console.error('Error duplicating template:', error)
      return null
    } finally {
      setOperation(null)
    }
  }, [createTemplate, setOperation])

  /**
   * Save template handler for the template editor modal
   * This is a generic save handler that can be used for both create and update operations
   */
  const createTemplateSaveHandler = useCallback((
    templateId?: string,
    onSuccess?: (template: Template) => void,
    onError?: (error: Error) => void
  ) => {
    return async (templateData: TemplateFormData) => {
      try {
        let template: Template | null
        
        if (templateId) {
          // Update existing template
          template = await updateTemplate(templateId, templateData)
        } else {
          // Create new template
          template = await createTemplate(templateData)
        }
        
        if (template && onSuccess) {
          onSuccess(template)
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error occurred')
        if (onError) {
          onError(err)
        }
        throw err // Re-throw to let the modal handle it
      }
    }
  }, [createTemplate, updateTemplate])

  return {
    // Legacy support
    isLoading: operationState.isLoading,
    
    // Enhanced state
    operationState,
    
    // Operations
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    openCreateTemplateEditor,
    openEditTemplateEditor,
    createTemplateSaveHandler
  }
}