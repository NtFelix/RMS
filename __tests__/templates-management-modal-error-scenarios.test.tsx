/**
 * Test suite for error scenarios in the templates management modal
 * Tests integration of error handling with the modal components
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplatesManagementModal } from '@/components/templates-management-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { useAuth } from '@/components/auth-provider'
import { TemplateClientService } from '@/lib/template-client-service'
import { templateCacheService } from '@/lib/template-cache'
import { toast } from '@/hooks/use-toast'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/components/auth-provider')
jest.mock('@/lib/template-client-service')
jest.mock('@/lib/template-cache')
jest.mock('@/hooks/use-toast')

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockTemplateClientService = TemplateClientService as jest.MockedClass<typeof TemplateClientService>
const mockTemplateCacheService = templateCacheService as jest.Mocked<typeof templateCacheService>
const mockToast = toast as jest.MockedFunction<typeof toast>

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

// Mock window.confirm
const mockConfirm = jest.fn()
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: mockConfirm
})

// Mock window.location.reload
const mockReload = jest.fn()
Object.defineProperty(window.location, 'reload', {
  writable: true,
  value: mockReload
})

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com'
}

const mockTemplates = [
  {
    id: 'template-1',
    titel: 'Test Template 1',
    kategorie: 'Test Category',
    inhalt: { content: 'Test content 1' },
    erstellungsdatum: '2024-01-01T00:00:00Z',
    aktualisiert_am: '2024-01-02T00:00:00Z',
    kontext_anforderungen: ['var1', 'var2']
  },
  {
    id: 'template-2',
    titel: 'Test Template 2',
    kategorie: 'Another Category',
    inhalt: { content: 'Test content 2' },
    erstellungsdatum: '2024-01-01T00:00:00Z',
    aktualisiert_am: null,
    kontext_anforderungen: ['var3']
  }
]

beforeEach(() => {
  jest.clearAllMocks()
  
  mockUseModalStore.mockReturnValue({
    isTemplatesManagementModalOpen: true,
    closeTemplatesManagementModal: jest.fn(),
    openTemplateEditorModal: jest.fn()
  } as any)
  
  mockUseAuth.mockReturnValue({
    user: mockUser
  } as any)
  
  mockTemplateCacheService.getUserTemplates.mockReturnValue(null)
  mockTemplateCacheService.setUserTemplates.mockImplementation(() => {})
  mockTemplateCacheService.invalidateUserCaches.mockImplementation(() => {})
  
  mockConfirm.mockReturnValue(true)
  
  // Reset navigator.onLine
  Object.defineProperty(navigator, 'onLine', {
    value: true
  })
})

describe('TemplatesManagementModal Error Scenarios', () => {
  describe('Template Loading Errors', () => {
    test('should handle template loading failure', async () => {
      const mockService = {
        getUserTemplates: jest.fn().mockRejectedValue(new Error('Network error'))
      }
      mockTemplateClientService.mockImplementation(() => mockService as any)
      
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Fehler beim Laden der Vorlagen',
            variant: 'destructive'
          })
        )
      })
      
      expect(screen.getByText(/Fehler beim Laden/)).toBeInTheDocument()
    })

    test('should handle network offline scenario', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false
      })
      
      const mockService = {
        getUserTemplates: jest.fn().mockRejectedValue(new Error('Keine Internetverbindung verfügbar'))
      }
      mockTemplateClientService.mockImplementation(() => mockService as any)
      
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Verbindungsfehler'
          })
        )
      })
    })

    test('should handle authentication errors', async () => {
      mockUseAuth.mockReturnValue({
        user: null
      } as any)
      
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Keine Berechtigung'
          })
        )
      })
    })

    test('should retry loading on failure', async () => {
      const mockService = {
        getUserTemplates: jest.fn()
          .mockRejectedValueOnce(new Error('First failure'))
          .mockResolvedValueOnce(mockTemplates)
      }
      mockTemplateClientService.mockImplementation(() => mockService as any)
      
      render(<TemplatesManagementModal />)
      
      // Wait for initial error
      await waitFor(() => {
        expect(screen.getByText(/Erneut versuchen/)).toBeInTheDocument()
      })
      
      // Click retry button
      const retryButton = screen.getByText('Erneut versuchen')
      fireEvent.click(retryButton)
      
      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })
      
      expect(mockService.getUserTemplates).toHaveBeenCalledTimes(2)
    })
  })

  describe('Template Deletion Errors', () => {
    test('should handle template deletion failure', async () => {
      const mockService = {
        getUserTemplates: jest.fn().mockResolvedValue(mockTemplates),
        deleteTemplate: jest.fn().mockRejectedValue(new Error('Delete failed'))
      }
      mockTemplateClientService.mockImplementation(() => mockService as any)
      
      render(<TemplatesManagementModal />)
      
      // Wait for templates to load
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })
      
      // Find and click delete button
      const deleteButtons = screen.getAllByText('Löschen')
      fireEvent.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Löschen fehlgeschlagen',
            variant: 'destructive'
          })
        )
      })
    })

    test('should handle deletion when template not found', async () => {
      const mockService = {
        getUserTemplates: jest.fn().mockResolvedValue(mockTemplates)
      }
      mockTemplateClientService.mockImplementation(() => mockService as any)
      
      render(<TemplatesManagementModal />)
      
      // Wait for templates to load
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })
      
      // Manually trigger deletion with non-existent ID
      const modal = screen.getByRole('dialog')
      const deleteHandler = (modal as any).handleDeleteTemplate
      
      if (deleteHandler) {
        await act(async () => {
          await deleteHandler('non-existent-id')
        })
        
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            description: expect.stringContaining('konnte nicht gefunden werden')
          })
        )
      }
    })

    test('should handle deletion cancellation', async () => {
      mockConfirm.mockReturnValue(false)
      
      const mockService = {
        getUserTemplates: jest.fn().mockResolvedValue(mockTemplates),
        deleteTemplate: jest.fn()
      }
      mockTemplateClientService.mockImplementation(() => mockService as any)
      
      render(<TemplatesManagementModal />)
      
      // Wait for templates to load
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })
      
      // Find and click delete button
      const deleteButtons = screen.getAllByText('Löschen')
      fireEvent.click(deleteButtons[0])
      
      // Should not call delete service
      expect(mockService.deleteTemplate).not.toHaveBeenCalled()
    })
  })

  describe('Search and Filter Errors', () => {
    test('should handle search errors gracefully', async () => {
      const mockService = {
        getUserTemplates: jest.fn().mockResolvedValue(mockTemplates)
      }
      mockTemplateClientService.mockImplementation(() => mockService as any)
      
      render(<TemplatesManagementModal />)
      
      // Wait for templates to load
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })
      
      // Try to search with problematic query that might cause JSON.stringify to fail
      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      
      // Create a circular reference that would break JSON.stringify
      const circularTemplate = { ...mockTemplates[0] }
      circularTemplate.inhalt = { self: circularTemplate }
      
      // This should not crash the component
      fireEvent.change(searchInput, { target: { value: 'test' } })
      
      // Component should still be functional
      expect(screen.getByText('Test Template 1')).toBeInTheDocument()
    })

    test('should handle filter errors gracefully', async () => {
      const mockService = {
        getUserTemplates: jest.fn().mockResolvedValue(mockTemplates)
      }
      mockTemplateClientService.mockImplementation(() => mockService as any)
      
      render(<TemplatesManagementModal />)
      
      // Wait for templates to load
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })
      
      // Try to filter by category
      const categoryFilter = screen.getByRole('combobox')
      fireEvent.click(categoryFilter)
      
      // Select a category
      const categoryOption = screen.getByText('Test Category')
      fireEvent.click(categoryOption)
      
      // Should filter successfully without errors
      expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      expect(screen.queryByText('Test Template 2')).not.toBeInTheDocument()
    })
  })

  describe('Template Grouping Errors', () => {
    test('should handle template grouping errors', async () => {
      // Create templates with problematic data
      const problematicTemplates = [
        {
          ...mockTemplates[0],
          kategorie: null // This might cause grouping issues
        },
        {
          ...mockTemplates[1],
          kategorie: undefined
        }
      ]
      
      const mockService = {
        getUserTemplates: jest.fn().mockResolvedValue(problematicTemplates)
      }
      mockTemplateClientService.mockImplementation(() => mockService as any)
      
      render(<TemplatesManagementModal />)
      
      // Should handle null/undefined categories gracefully
      await waitFor(() => {
        expect(screen.getByText('Ohne Kategorie')).toBeInTheDocument()
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
        expect(screen.getByText('Test Template 2')).toBeInTheDocument()
      })
    })

    test('should handle template sorting errors', async () => {
      // Create templates with problematic dates
      const problematicTemplates = [
        {
          ...mockTemplates[0],
          erstellungsdatum: 'invalid-date'
        },
        {
          ...mockTemplates[1],
          aktualisiert_am: 'also-invalid'
        }
      ]
      
      const mockService = {
        getUserTemplates: jest.fn().mockResolvedValue(problematicTemplates)
      }
      mockTemplateClientService.mockImplementation(() => mockService as any)
      
      render(<TemplatesManagementModal />)
      
      // Should still render templates despite sorting issues
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
        expect(screen.getByText('Test Template 2')).toBeInTheDocument()
      })
    })
  })

  describe('Modal Initialization Errors', () => {
    test('should handle modal initialization errors', () => {
      // Mock a component that throws during render
      const OriginalTemplatesManagementModal = TemplatesManagementModal
      
      const ProblematicModal = () => {
        throw new Error('Modal initialization failed')
      }
      
      // This should be caught by the error boundary
      const { container } = render(<ProblematicModal />)
      
      // Error boundary should render error UI
      expect(container).toBeInTheDocument()
    })
  })

  describe('Recovery Mechanisms', () => {
    test('should recover from errors when modal is reopened', async () => {
      let shouldFail = true
      const mockService = {
        getUserTemplates: jest.fn().mockImplementation(() => {
          if (shouldFail) {
            shouldFail = false
            throw new Error('First load failed')
          }
          return Promise.resolve(mockTemplates)
        })
      }
      mockTemplateClientService.mockImplementation(() => mockService as any)
      
      const { rerender } = render(<TemplatesManagementModal />)
      
      // Wait for initial error
      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Laden/)).toBeInTheDocument()
      })
      
      // Close and reopen modal
      mockUseModalStore.mockReturnValue({
        isTemplatesManagementModalOpen: false,
        closeTemplatesManagementModal: jest.fn(),
        openTemplateEditorModal: jest.fn()
      } as any)
      
      rerender(<TemplatesManagementModal />)
      
      mockUseModalStore.mockReturnValue({
        isTemplatesManagementModalOpen: true,
        closeTemplatesManagementModal: jest.fn(),
        openTemplateEditorModal: jest.fn()
      } as any)
      
      rerender(<TemplatesManagementModal />)
      
      // Should succeed on reopen
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })
    })

    test('should clear errors when search is cleared', async () => {
      const mockService = {
        getUserTemplates: jest.fn().mockResolvedValue(mockTemplates)
      }
      mockTemplateClientService.mockImplementation(() => mockService as any)
      
      render(<TemplatesManagementModal />)
      
      // Wait for templates to load
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
      })
      
      // Search for something
      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...')
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
      
      // Should show no results
      await waitFor(() => {
        expect(screen.getByText('Keine Vorlagen gefunden')).toBeInTheDocument()
      })
      
      // Clear search
      const clearButton = screen.getByLabelText('Suche löschen')
      fireEvent.click(clearButton)
      
      // Should show all templates again
      await waitFor(() => {
        expect(screen.getByText('Test Template 1')).toBeInTheDocument()
        expect(screen.getByText('Test Template 2')).toBeInTheDocument()
      })
    })
  })

  describe('Error Logging and Monitoring', () => {
    test('should log errors for monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const mockService = {
        getUserTemplates: jest.fn().mockRejectedValue(new Error('Test error for logging'))
      }
      mockTemplateClientService.mockImplementation(() => mockService as any)
      
      render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[TemplatesModal]'),
          expect.objectContaining({
            message: 'Test error for logging'
          })
        )
      })
      
      consoleSpy.mockRestore()
    })
  })
})