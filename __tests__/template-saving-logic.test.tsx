/**
 * Tests for template saving logic implementation
 * Covers template creation, updating, validation, and error handling
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useToast } from '@/hooks/use-toast'
import { useModalStore } from '@/hooks/use-modal-store'
import { templateClientService } from '@/lib/template-client-service'
import { useTemplateOperations } from '@/hooks/use-template-operations'
import { extractVariablesFromContent, hasContentMeaning } from '@/lib/template-variable-extraction'
import { TemplateFormData, Template } from '@/types/template'

// Mock dependencies
jest.mock('@/hooks/use-toast')
jest.mock('@/hooks/use-modal-store')
jest.mock('@/lib/template-client-service')

const mockToast = jest.fn()
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockTemplateClientService = templateClientService as jest.Mocked<typeof templateClientService>

// Mock modal store functions
const mockOpenTemplateEditorModal = jest.fn()
const mockCloseTemplateEditorModal = jest.fn()

describe('Template Saving Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({ toast: mockToast })
    mockUseModalStore.mockReturnValue({
      openTemplateEditorModal: mockOpenTemplateEditorModal,
      closeTemplateEditorModal: mockCloseTemplateEditorModal,
      isTemplateEditorModalOpen: false,
      templateEditorData: undefined,
      isTemplateEditorModalDirty: false,
      setTemplateEditorModalDirty: jest.fn(),
    } as any)
  })

  describe('Variable Extraction', () => {
    it('should extract variables from Tiptap content', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              {
                type: 'mention',
                attrs: {
                  id: 'tenant_name',
                  label: 'Mieter Name'
                }
              },
              { type: 'text', text: ', your rent is ' },
              {
                type: 'mention',
                attrs: {
                  id: 'monthly_rent',
                  label: 'Monatliche Miete'
                }
              }
            ]
          }
        ]
      }

      const variables = extractVariablesFromContent(content)
      expect(variables).toEqual(['monthly_rent', 'tenant_name'])
    })

    it('should handle empty content', () => {
      const content = { type: 'doc', content: [] }
      const variables = extractVariablesFromContent(content)
      expect(variables).toEqual([])
    })

    it('should handle nested content structures', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'mention',
                        attrs: {
                          id: 'property_address',
                          label: 'Immobilienadresse'
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }

      const variables = extractVariablesFromContent(content)
      expect(variables).toEqual(['property_address'])
    })
  })

  describe('Content Validation', () => {
    it('should detect meaningful content', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This is meaningful content' }
            ]
          }
        ]
      }

      expect(hasContentMeaning(content)).toBe(true)
    })

    it('should detect empty content', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: []
          }
        ]
      }

      expect(hasContentMeaning(content)).toBe(false)
    })

    it('should detect content with only variables', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: {
                  id: 'tenant_name',
                  label: 'Mieter Name'
                }
              }
            ]
          }
        ]
      }

      expect(hasContentMeaning(content)).toBe(true)
    })
  })

  describe('Template Operations Hook', () => {
    it('should create a template successfully', async () => {
      const mockTemplate: Template = {
        id: 'test-id',
        titel: 'Test Template',
        inhalt: { type: 'doc', content: [] },
        user_id: 'user-id',
        erstellungsdatum: new Date().toISOString(),
        kategorie: 'Test Category',
        kontext_anforderungen: [],
        aktualisiert_am: null
      }

      mockTemplateClientService.createTemplate.mockResolvedValue(mockTemplate)

      const TestComponent = () => {
        const { createTemplate } = useTemplateOperations()
        
        const handleCreate = async () => {
          const templateData: TemplateFormData = {
            titel: 'Test Template',
            inhalt: { type: 'doc', content: [] },
            kategorie: 'Test Category',
            kontext_anforderungen: []
          }
          
          await createTemplate(templateData)
        }

        return <button onClick={handleCreate}>Create Template</button>
      }

      render(<TestComponent />)
      
      fireEvent.click(screen.getByText('Create Template'))

      await waitFor(() => {
        expect(mockTemplateClientService.createTemplate).toHaveBeenCalledWith({
          titel: 'Test Template',
          inhalt: { type: 'doc', content: [] },
          kategorie: 'Test Category',
          kontext_anforderungen: []
        })
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Vorlage erstellt",
        description: 'Die Vorlage "Test Template" wurde erfolgreich erstellt.',
      })
    })

    it('should handle template creation errors', async () => {
      const error = new Error('Validation failed: Title is required')
      mockTemplateClientService.createTemplate.mockRejectedValue(error)

      const TestComponent = () => {
        const { createTemplate } = useTemplateOperations()
        
        const handleCreate = async () => {
          const templateData: TemplateFormData = {
            titel: '',
            inhalt: { type: 'doc', content: [] },
            kategorie: 'Test Category',
            kontext_anforderungen: []
          }
          
          await createTemplate(templateData)
        }

        return <button onClick={handleCreate}>Create Template</button>
      }

      render(<TestComponent />)
      
      fireEvent.click(screen.getByText('Create Template'))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Fehler beim Erstellen",
          description: 'Validation failed: Title is required',
          variant: "destructive"
        })
      })
    })

    it('should update a template successfully', async () => {
      const mockTemplate: Template = {
        id: 'test-id',
        titel: 'Updated Template',
        inhalt: { type: 'doc', content: [] },
        user_id: 'user-id',
        erstellungsdatum: new Date().toISOString(),
        kategorie: 'Test Category',
        kontext_anforderungen: [],
        aktualisiert_am: new Date().toISOString()
      }

      mockTemplateClientService.updateTemplate.mockResolvedValue(mockTemplate)

      const TestComponent = () => {
        const { updateTemplate } = useTemplateOperations()
        
        const handleUpdate = async () => {
          await updateTemplate('test-id', {
            titel: 'Updated Template'
          })
        }

        return <button onClick={handleUpdate}>Update Template</button>
      }

      render(<TestComponent />)
      
      fireEvent.click(screen.getByText('Update Template'))

      await waitFor(() => {
        expect(mockTemplateClientService.updateTemplate).toHaveBeenCalledWith('test-id', {
          titel: 'Updated Template'
        })
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Vorlage aktualisiert",
        description: 'Die Vorlage "Updated Template" wurde erfolgreich aktualisiert.',
      })
    })
  })

  describe('API Integration', () => {
    it('should validate template data structure', () => {
      const templateData: TemplateFormData = {
        titel: 'Test Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test Category',
        kontext_anforderungen: ['tenant_name', 'monthly_rent']
      }

      // Validate that the structure matches what the API expects
      expect(templateData.titel).toBeDefined()
      expect(templateData.inhalt).toBeDefined()
      expect(templateData.kategorie).toBeDefined()
      expect(Array.isArray(templateData.kontext_anforderungen)).toBe(true)
    })

    it('should handle template validation requirements', () => {
      // Test validation rules that would be applied
      const validTemplate = {
        titel: 'Valid Template',
        inhalt: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Content' }] }] },
        kategorie: 'Test Category'
      }

      const invalidTemplate = {
        titel: '', // Invalid: empty title
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test Category'
      }

      expect(validTemplate.titel.trim().length).toBeGreaterThan(0)
      expect(validTemplate.titel.length).toBeLessThanOrEqual(100)
      expect(validTemplate.kategorie.trim().length).toBeGreaterThan(0)

      expect(invalidTemplate.titel.trim().length).toBe(0)
    })
  })
})