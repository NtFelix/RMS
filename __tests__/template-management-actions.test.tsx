import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplatesManagementModal } from '@/components/templates-management-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { useAuth } from '@/components/auth-provider'
import { TemplateClientService } from '@/lib/template-client-service'
import { useToast } from '@/hooks/use-toast'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/components/auth-provider')
jest.mock('@/lib/template-client-service')
jest.mock('@/hooks/use-toast')
jest.mock('@/lib/template-cache', () => ({
  templateCacheService: {
    getUserTemplates: jest.fn(),
    setUserTemplates: jest.fn(),
    invalidateUserCaches: jest.fn(),
  }
}))

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>
const mockTemplateClientService = TemplateClientService as jest.MockedClass<typeof TemplateClientService>

describe('Template Management Actions', () => {
  const mockToast = jest.fn()
  const mockCloseModal = jest.fn()
  const mockOpenTemplateEditor = jest.fn()
  
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  }

  const mockTemplates = [
    {
      id: 'template-1',
      titel: 'Test Template 1',
      kategorie: 'Test Category',
      inhalt: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test content' }] }] },
      kontext_anforderungen: ['@variable1'],
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-02T00:00:00Z',
      user_id: 'test-user-id'
    },
    {
      id: 'template-2',
      titel: 'Test Template 2',
      kategorie: 'Another Category',
      inhalt: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Another test content' }] }] },
      kontext_anforderungen: ['@variable2'],
      erstellungsdatum: '2024-01-03T00:00:00Z',
      aktualisiert_am: null,
      user_id: 'test-user-id'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn()
    } as any)

    mockUseToast.mockReturnValue({
      toast: mockToast
    })

    mockUseModalStore.mockReturnValue({
      isTemplatesManagementModalOpen: true,
      closeTemplatesManagementModal: mockCloseModal,
      openTemplateEditorModal: mockOpenTemplateEditor,
      getState: () => ({
        openTemplateEditorModal: mockOpenTemplateEditor
      })
    } as any)

    // Mock TemplateClientService methods
    const mockServiceInstance = {
      getUserTemplates: jest.fn().mockResolvedValue(mockTemplates),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn()
    }
    
    mockTemplateClientService.mockImplementation(() => mockServiceInstance as any)
  })

  describe('Create Template Action', () => {
    it('should open template editor modal for creating new template', async () => {
      render(<TemplatesManagementModal />)
      
      // Wait for templates to load
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })

      // Click create button
      const createButton = screen.getByText(/Neue Vorlage|Erstellen/)
      await userEvent.click(createButton)

      // Verify template editor modal is opened with correct parameters
      expect(mockOpenTemplateEditor).toHaveBeenCalledWith({
        isNewTemplate: true,
        initialCategory: undefined, // Since no category is selected
        onSave: expect.any(Function),
        onCancel: expect.any(Function)
      })
    })

    it('should handle template creation success', async () => {
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })

      const createButton = screen.getByText(/Neue Vorlage|Erstellen/)
      await userEvent.click(createButton)

      // Get the onSave callback that was passed to the template editor
      const onSaveCallback = mockOpenTemplateEditor.mock.calls[0][0].onSave

      // Mock successful template creation
      const mockServiceInstance = mockTemplateClientService.mock.instances[0] as any
      mockServiceInstance.createTemplate.mockResolvedValue({
        id: 'new-template-id',
        titel: 'New Template',
        kategorie: 'Test Category'
      })

      // Call the onSave callback
      await onSaveCallback({
        titel: 'New Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test Category',
        kontext_anforderungen: []
      })

      // Verify success toast was shown
      expect(mockToast).toHaveBeenCalledWith({
        title: "Vorlage erstellt",
        description: 'Die Vorlage "New Template" wurde erfolgreich erstellt.'
      })
    })

    it('should handle template creation error', async () => {
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })

      const createButton = screen.getByText(/Neue Vorlage|Erstellen/)
      await userEvent.click(createButton)

      const onSaveCallback = mockOpenTemplateEditor.mock.calls[0][0].onSave

      // Mock failed template creation
      const mockServiceInstance = mockTemplateClientService.mock.instances[0] as any
      mockServiceInstance.createTemplate.mockRejectedValue(new Error('Creation failed'))

      // Call the onSave callback and expect it to throw
      await expect(onSaveCallback({
        titel: 'New Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test Category',
        kontext_anforderungen: []
      })).rejects.toThrow('Creation failed')

      // Verify error toast was shown
      expect(mockToast).toHaveBeenCalledWith({
        title: "Fehler beim Erstellen",
        description: "Creation failed",
        variant: "destructive"
      })
    })
  })

  describe('Edit Template Action', () => {
    it('should open template editor modal for editing existing template', async () => {
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })

      // Find and click edit button for the first template
      const editButtons = screen.getAllByText('Bearbeiten')
      await userEvent.click(editButtons[0])

      // Verify template editor modal is opened with correct parameters
      expect(mockOpenTemplateEditor).toHaveBeenCalledWith({
        templateId: 'template-1',
        initialTitle: 'Test Template 1',
        initialContent: mockTemplates[0].inhalt,
        initialCategory: 'Test Category',
        isNewTemplate: false,
        onSave: expect.any(Function),
        onCancel: expect.any(Function)
      })
    })

    it('should handle template update success', async () => {
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('Bearbeiten')
      await userEvent.click(editButtons[0])

      const onSaveCallback = mockOpenTemplateEditor.mock.calls[0][0].onSave

      // Mock successful template update
      const mockServiceInstance = mockTemplateClientService.mock.instances[0] as any
      mockServiceInstance.updateTemplate.mockResolvedValue({
        ...mockTemplates[0],
        titel: 'Updated Template'
      })

      // Call the onSave callback
      await onSaveCallback({
        titel: 'Updated Template',
        inhalt: mockTemplates[0].inhalt,
        kategorie: 'Test Category',
        kontext_anforderungen: ['@variable1']
      })

      // Verify success toast was shown
      expect(mockToast).toHaveBeenCalledWith({
        title: "Vorlage gespeichert",
        description: 'Die Vorlage "Updated Template" wurde erfolgreich aktualisiert.'
      })
    })
  })

  describe('Delete Template Action', () => {
    it('should show confirmation dialog and delete template on confirmation', async () => {
      // Mock window.confirm
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true)
      
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })

      // Find and click the dropdown menu for the first template
      const dropdownTriggers = screen.getAllByRole('button', { name: /Aktionen öffnen/i })
      await userEvent.click(dropdownTriggers[0])

      // Click delete option
      const deleteButton = screen.getByText('Löschen')
      await userEvent.click(deleteButton)

      // Verify confirmation dialog was shown
      expect(mockConfirm).toHaveBeenCalledWith(
        'Möchten Sie die Vorlage "Test Template 1" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.'
      )

      // Verify delete service was called
      const mockServiceInstance = mockTemplateClientService.mock.instances[0] as any
      await waitFor(() => {
        expect(mockServiceInstance.deleteTemplate).toHaveBeenCalledWith('template-1')
      })

      // Verify success toast was shown
      expect(mockToast).toHaveBeenCalledWith({
        title: "Vorlage gelöscht",
        description: 'Die Vorlage "Test Template 1" wurde erfolgreich gelöscht.'
      })

      mockConfirm.mockRestore()
    })

    it('should not delete template if user cancels confirmation', async () => {
      // Mock window.confirm to return false
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false)
      
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })

      const dropdownTriggers = screen.getAllByRole('button', { name: /Aktionen öffnen/i })
      await userEvent.click(dropdownTriggers[0])

      const deleteButton = screen.getByText('Löschen')
      await userEvent.click(deleteButton)

      // Verify delete service was NOT called
      const mockServiceInstance = mockTemplateClientService.mock.instances[0] as any
      expect(mockServiceInstance.deleteTemplate).not.toHaveBeenCalled()

      mockConfirm.mockRestore()
    })

    it('should handle delete error gracefully', async () => {
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true)
      
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })

      const dropdownTriggers = screen.getAllByRole('button', { name: /Aktionen öffnen/i })
      await userEvent.click(dropdownTriggers[0])

      // Mock delete failure
      const mockServiceInstance = mockTemplateClientService.mock.instances[0] as any
      mockServiceInstance.deleteTemplate.mockRejectedValue(new Error('Delete failed'))

      const deleteButton = screen.getByText('Löschen')
      await userEvent.click(deleteButton)

      // Wait for error handling
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Fehler beim Löschen",
          description: 'Die Vorlage "Test Template 1" konnte nicht gelöscht werden: Delete failed',
          variant: "destructive"
        })
      })

      mockConfirm.mockRestore()
    })
  })
})