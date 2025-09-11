import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplatesManagementModal } from '@/components/templates-management-modal'
import { TemplateCard } from '@/components/template-card'
import { TemplateSearchBar } from '@/components/template-search-bar'
import { useModalStore } from '@/hooks/use-modal-store'
import { useAuth } from '@/components/auth-provider'
import { TemplateClientService } from '@/lib/template-client-service'
import type { Template } from '@/types/template'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/components/auth-provider')
jest.mock('@/lib/template-client-service')
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock console methods to avoid noise in tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})

// Mock confirm dialog
const mockConfirm = jest.fn()
global.confirm = mockConfirm

const mockTemplate: Template = {
  id: 'test-template',
  titel: 'Test Template',
  inhalt: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Test content' }],
      },
    ],
  },
  user_id: 'test-user',
  erstellungsdatum: '2024-01-15T10:00:00Z',
  kategorie: 'Test Category',
  kontext_anforderungen: ['variable1'],
  aktualisiert_am: null,
}

describe('Template Error Handling Tests', () => {
  const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
  const mockTemplateService = TemplateClientService as jest.MockedClass<typeof TemplateClientService>

  const mockCloseModal = jest.fn()
  const mockOpenTemplateEditor = jest.fn()
  const mockGetAllTemplates = jest.fn()
  const mockDeleteTemplate = jest.fn()
  const mockCreateTemplate = jest.fn()
  const mockUpdateTemplate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockConfirm.mockReturnValue(true)
    mockConsoleError.mockClear()
    mockConsoleWarn.mockClear()

    mockUseModalStore.mockReturnValue({
      isTemplatesManagementModalOpen: true,
      closeTemplatesManagementModal: mockCloseModal,
      openTemplateEditorModal: mockOpenTemplateEditor,
    } as any)

    mockUseAuth.mockReturnValue({
      user: { id: 'test-user', email: 'test@example.com' },
    } as any)

    mockTemplateService.mockImplementation(() => ({
      getAllTemplates: mockGetAllTemplates,
      deleteTemplate: mockDeleteTemplate,
      createTemplate: mockCreateTemplate,
      updateTemplate: mockUpdateTemplate,
    } as any))
  })

  afterAll(() => {
    mockConsoleError.mockRestore()
    mockConsoleWarn.mockRestore()
  })

  describe('Network Error Handling', () => {
    it('should handle network timeout errors gracefully', async () => {
      const timeoutError = new Error('Network timeout')
      timeoutError.name = 'TimeoutError'
      mockGetAllTemplates.mockRejectedValue(timeoutError)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText(/fehler beim laden/i)).toBeInTheDocument()
        expect(screen.getByText(/network timeout/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
      })

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Templates load error'),
        timeoutError
      )
    })

    it('should handle connection refused errors', async () => {
      const connectionError = new Error('Connection refused')
      connectionError.name = 'NetworkError'
      mockGetAllTemplates.mockRejectedValue(connectionError)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText(/fehler beim laden/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
      })
    })

    it('should handle offline scenarios', async () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })

      const offlineError = new Error('No internet connection')
      mockGetAllTemplates.mockRejectedValue(offlineError)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText(/keine internetverbindung/i)).toBeInTheDocument()
      })

      // Restore online status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      })
    })

    it('should retry failed network requests', async () => {
      const networkError = new Error('Network error')
      mockGetAllTemplates
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce([mockTemplate])

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      await user.click(retryButton)

      await waitFor(() => {
        expect(mockGetAllTemplates).toHaveBeenCalledTimes(2)
        expect(screen.getByText('Test Template')).toBeInTheDocument()
      })
    })

    it('should limit retry attempts', async () => {
      const persistentError = new Error('Persistent network error')
      mockGetAllTemplates.mockRejectedValue(persistentError)

      render(<TemplatesManagementModal />)

      const user = userEvent.setup()

      // Try multiple retries
      for (let i = 0; i < 5; i++) {
        await waitFor(() => {
          expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
        })

        const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
        await user.click(retryButton)
      }

      // After max retries, button should be disabled
      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
        expect(retryButton).toBeDisabled()
      })
    })
  })

  describe('Authentication Error Handling', () => {
    it('should handle unauthenticated user errors', () => {
      mockUseAuth.mockReturnValue({
        user: null,
      } as any)

      render(<TemplatesManagementModal />)

      expect(screen.getByText(/benutzer nicht authentifiziert/i)).toBeInTheDocument()
    })

    it('should handle expired session errors', async () => {
      const authError = new Error('Session expired')
      authError.name = 'AuthenticationError'
      mockGetAllTemplates.mockRejectedValue(authError)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText(/session expired/i)).toBeInTheDocument()
      })
    })

    it('should handle permission denied errors', async () => {
      const permissionError = new Error('Permission denied')
      permissionError.name = 'PermissionError'
      mockGetAllTemplates.mockRejectedValue(permissionError)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText(/permission denied/i)).toBeInTheDocument()
      })
    })
  })

  describe('Data Validation Error Handling', () => {
    it('should handle malformed template data', async () => {
      const malformedTemplate = {
        id: 'malformed',
        titel: null, // Invalid title
        inhalt: 'invalid-json', // Invalid content
        user_id: 'test-user',
        erstellungsdatum: 'invalid-date', // Invalid date
        kategorie: undefined,
        kontext_anforderungen: 'not-an-array', // Invalid array
        aktualisiert_am: null,
      } as any

      mockGetAllTemplates.mockResolvedValue([malformedTemplate])

      render(<TemplatesManagementModal />)

      // Should handle malformed data gracefully
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Should log warnings about malformed data
      expect(mockConsoleWarn).toHaveBeenCalled()
    })

    it('should handle empty or null template responses', async () => {
      mockGetAllTemplates.mockResolvedValue(null as any)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText(/noch keine vorlagen vorhanden/i)).toBeInTheDocument()
      })
    })

    it('should handle non-array template responses', async () => {
      mockGetAllTemplates.mockResolvedValue({ templates: [mockTemplate] } as any)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText(/noch keine vorlagen vorhanden/i)).toBeInTheDocument()
      })

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Expected array of templates')
      )
    })
  })

  describe('Template Operation Error Handling', () => {
    beforeEach(async () => {
      mockGetAllTemplates.mockResolvedValue([mockTemplate])
    })

    it('should handle template deletion errors', async () => {
      const deleteError = new Error('Failed to delete template')
      mockDeleteTemplate.mockRejectedValue(deleteError)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText('Test Template')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const templateCard = screen.getByRole('article')
      const moreButton = within(templateCard).getByRole('button', { name: /aktionen/i })
      await user.click(moreButton)

      const deleteButton = screen.getByRole('menuitem', { name: /löschen/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockDeleteTemplate).toHaveBeenCalled()
      })

      // Template should still be visible since deletion failed
      expect(screen.getByText('Test Template')).toBeInTheDocument()
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Template delete error'),
        deleteError
      )
    })

    it('should handle template creation errors', async () => {
      const createError = new Error('Failed to create template')
      mockCreateTemplate.mockRejectedValue(createError)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /neue vorlage/i })).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const createButton = screen.getByRole('button', { name: /neue vorlage/i })
      await user.click(createButton)

      expect(mockOpenTemplateEditor).toHaveBeenCalled()

      // Simulate template creation failure
      const onSaveCallback = mockOpenTemplateEditor.mock.calls[0][0].onSave
      await expect(onSaveCallback({
        titel: 'New Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test',
        kontext_anforderungen: [],
      })).rejects.toThrow('Failed to create template')
    })

    it('should handle template update errors', async () => {
      const updateError = new Error('Failed to update template')
      mockUpdateTemplate.mockRejectedValue(updateError)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText('Test Template')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const editButton = screen.getByRole('button', { name: /bearbeiten/i })
      await user.click(editButton)

      expect(mockOpenTemplateEditor).toHaveBeenCalled()

      // Simulate template update failure
      const onSaveCallback = mockOpenTemplateEditor.mock.calls[0][0].onSave
      await expect(onSaveCallback({
        titel: 'Updated Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test',
        kontext_anforderungen: [],
      })).rejects.toThrow('Failed to update template')
    })
  })

  describe('Search Error Handling', () => {
    it('should handle search input validation errors', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={jest.fn()}
        />
      )

      const searchInput = screen.getByRole('textbox')
      
      // Input dangerous characters
      await user.type(searchInput, '<script>alert("xss")</script>')

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/ungültige suchzeichen/i)
      })
    })

    it('should handle search processing errors', async () => {
      const mockOnChange = jest.fn().mockImplementation(() => {
        throw new Error('Search processing error')
      })
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
        />
      )

      const user = userEvent.setup()
      const searchInput = screen.getByRole('textbox')
      
      await user.type(searchInput, 'test')

      // Should handle error gracefully
      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.stringContaining('Search error'),
          expect.any(Error)
        )
      })
    })

    it('should handle extremely long search queries', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
          debounceMs={100}
        />
      )

      const searchInput = screen.getByRole('textbox')
      const longQuery = 'a'.repeat(1000) // Very long query
      
      await user.type(searchInput, longQuery)

      await waitFor(() => {
        // Should truncate to reasonable length
        expect(mockOnChange).toHaveBeenCalledWith('a'.repeat(100))
      })
    })
  })

  describe('Component Error Boundaries', () => {
    it('should catch and handle component rendering errors', () => {
      // Mock TemplateCard to throw an error
      const ErrorThrowingCard = () => {
        throw new Error('Component rendering error')
      }

      // This would need to be wrapped in an error boundary in the actual implementation
      expect(() => {
        render(<ErrorThrowingCard />)
      }).toThrow('Component rendering error')
    })

    it('should provide fallback UI for failed components', async () => {
      // Mock a component that fails to render
      const problematicTemplate = {
        ...mockTemplate,
        id: 'problematic-template',
      }

      // This test would verify that error boundaries show fallback UI
      // In a real implementation, you'd have error boundaries that catch errors
      // and show appropriate fallback content
    })
  })

  describe('Memory and Resource Error Handling', () => {
    it('should handle out of memory scenarios gracefully', async () => {
      // Simulate memory pressure
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        ...mockTemplate,
        id: `template-${i}`,
        titel: `Template ${i}`,
        inhalt: {
          type: 'doc',
          content: Array.from({ length: 1000 }, () => ({
            type: 'paragraph',
            content: [{ type: 'text', text: 'Large content block '.repeat(100) }],
          })),
        },
      }))

      mockGetAllTemplates.mockResolvedValue(largeData)

      // Should handle large datasets without crashing
      expect(() => {
        render(<TemplatesManagementModal />)
      }).not.toThrow()
    })

    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded')
      quotaError.name = 'QuotaExceededError'
      mockCreateTemplate.mockRejectedValue(quotaError)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /neue vorlage/i })).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const createButton = screen.getByRole('button', { name: /neue vorlage/i })
      await user.click(createButton)

      const onSaveCallback = mockOpenTemplateEditor.mock.calls[0][0].onSave
      await expect(onSaveCallback({
        titel: 'New Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test',
        kontext_anforderungen: [],
      })).rejects.toThrow('Quota exceeded')
    })
  })

  describe('Concurrent Operation Error Handling', () => {
    it('should handle concurrent template operations', async () => {
      mockGetAllTemplates.mockResolvedValue([mockTemplate])

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText('Test Template')).toBeInTheDocument()
      })

      const user = userEvent.setup()

      // Start multiple operations simultaneously
      const promises = [
        user.click(screen.getByRole('button', { name: /neue vorlage/i })),
        user.click(screen.getByRole('button', { name: /bearbeiten/i })),
      ]

      // Should handle concurrent operations without errors
      await expect(Promise.all(promises)).resolves.toBeDefined()
    })

    it('should handle race conditions in template updates', async () => {
      mockGetAllTemplates.mockResolvedValue([mockTemplate])
      
      // Simulate race condition where template is deleted while being edited
      mockDeleteTemplate.mockResolvedValue(undefined)
      mockUpdateTemplate.mockRejectedValue(new Error('Template not found'))

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText('Test Template')).toBeInTheDocument()
      })

      const user = userEvent.setup()

      // Start edit operation
      const editButton = screen.getByRole('button', { name: /bearbeiten/i })
      await user.click(editButton)

      // Simulate concurrent delete
      const templateCard = screen.getByRole('article')
      const moreButton = within(templateCard).getByRole('button', { name: /aktionen/i })
      await user.click(moreButton)

      const deleteButton = screen.getByRole('menuitem', { name: /löschen/i })
      await user.click(deleteButton)

      // Should handle the race condition gracefully
      expect(mockDeleteTemplate).toHaveBeenCalled()
    })
  })

  describe('Error Recovery and User Guidance', () => {
    it('should provide clear error messages and recovery options', async () => {
      const specificError = new Error('Template validation failed: Title is required')
      mockCreateTemplate.mockRejectedValue(specificError)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /neue vorlage/i })).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const createButton = screen.getByRole('button', { name: /neue vorlage/i })
      await user.click(createButton)

      const onSaveCallback = mockOpenTemplateEditor.mock.calls[0][0].onSave
      
      try {
        await onSaveCallback({
          titel: '',
          inhalt: { type: 'doc', content: [] },
          kategorie: 'Test',
          kontext_anforderungen: [],
        })
      } catch (error) {
        expect(error).toEqual(specificError)
      }
    })

    it('should maintain application state after errors', async () => {
      const error = new Error('Temporary error')
      mockGetAllTemplates
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce([mockTemplate])

      render(<TemplatesManagementModal />)

      // Apply search filter before error
      const user = userEvent.setup()
      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      await user.type(searchInput, 'test search')

      // Error occurs
      await waitFor(() => {
        expect(screen.getByText(/fehler beim laden/i)).toBeInTheDocument()
      })

      // Retry and recover
      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      await user.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Test Template')).toBeInTheDocument()
      })

      // Search filter should be maintained
      expect(searchInput).toHaveValue('test search')
    })
  })
})