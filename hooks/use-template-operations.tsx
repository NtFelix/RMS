"use client"

import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useModalStore } from '@/hooks/use-modal-store'
import { templateClientService } from '@/lib/template-client-service'
import { Template, TemplateFormData, TemplateEditorData } from '@/types/template'

/**
 * Hook for handling template operations (create, update, delete)
 * Provides handlers for template editor modal and manages loading states
 */
export function useTemplateOperations() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { openTemplateEditorModal, closeTemplateEditorModal } = useModalStore()

  /**
   * Create a new template
   */
  const createTemplate = useCallback(async (data: TemplateFormData): Promise<Template | null> => {
    setIsLoading(true)
    
    try {
      const template = await templateClientService.createTemplate(data)
      
      toast({
        title: "Vorlage erstellt",
        description: `Die Vorlage "${template.titel}" wurde erfolgreich erstellt.`,
      })
      
      return template
    } catch (error) {
      console.error('Error creating template:', error)
      
      toast({
        title: "Fehler beim Erstellen",
        description: error instanceof Error ? error.message : "Die Vorlage konnte nicht erstellt werden.",
        variant: "destructive"
      })
      
      return null
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  /**
   * Update an existing template
   */
  const updateTemplate = useCallback(async (id: string, data: Partial<TemplateFormData>): Promise<Template | null> => {
    setIsLoading(true)
    
    try {
      const template = await templateClientService.updateTemplate(id, data)
      
      toast({
        title: "Vorlage aktualisiert",
        description: `Die Vorlage "${template.titel}" wurde erfolgreich aktualisiert.`,
      })
      
      return template
    } catch (error) {
      console.error('Error updating template:', error)
      
      toast({
        title: "Fehler beim Aktualisieren",
        description: error instanceof Error ? error.message : "Die Vorlage konnte nicht aktualisiert werden.",
        variant: "destructive"
      })
      
      return null
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  /**
   * Delete a template
   */
  const deleteTemplate = useCallback(async (id: string, title: string): Promise<boolean> => {
    setIsLoading(true)
    
    try {
      await templateClientService.deleteTemplate(id)
      
      toast({
        title: "Vorlage gelöscht",
        description: `Die Vorlage "${title}" wurde erfolgreich gelöscht.`,
      })
      
      return true
    } catch (error) {
      console.error('Error deleting template:', error)
      
      toast({
        title: "Fehler beim Löschen",
        description: error instanceof Error ? error.message : "Die Vorlage konnte nicht gelöscht werden.",
        variant: "destructive"
      })
      
      return false
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  /**
   * Open template editor for creating a new template
   */
  const openCreateTemplateEditor = useCallback((category: string) => {
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
  }, [createTemplate, openTemplateEditorModal, closeTemplateEditorModal])

  /**
   * Open template editor for editing an existing template
   */
  const openEditTemplateEditor = useCallback(async (template: Template) => {
    try {
      // Fetch the latest template data to ensure we have the most current version
      const latestTemplate = await templateClientService.getTemplate(template.id)
      
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
      
      openTemplateEditorModal(editorData)
    } catch (error) {
      console.error('Error loading template for editing:', error)
      
      toast({
        title: "Fehler beim Laden",
        description: "Die Vorlage konnte nicht geladen werden.",
        variant: "destructive"
      })
    }
  }, [updateTemplate, openTemplateEditorModal, closeTemplateEditorModal, toast])

  /**
   * Duplicate a template
   */
  const duplicateTemplate = useCallback(async (template: Template): Promise<Template | null> => {
    const duplicateData: TemplateFormData = {
      titel: `${template.titel} (Kopie)`,
      inhalt: template.inhalt,
      kategorie: template.kategorie || 'Sonstiges',
      kontext_anforderungen: template.kontext_anforderungen
    }
    
    return await createTemplate(duplicateData)
  }, [createTemplate])

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
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    openCreateTemplateEditor,
    openEditTemplateEditor,
    createTemplateSaveHandler
  }
}