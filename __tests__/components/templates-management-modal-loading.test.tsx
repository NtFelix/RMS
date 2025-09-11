import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplatesManagementModal } from '@/components/templates-management-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { useAuth } from '@/components/auth-provider'
import { TemplateService } from '@/lib/template-service'
import { templateCacheService } from '@/lib/template-cache'
import { useToast } from '@/hooks/use-toast'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/components/auth-provider')
jest.mock('@/lib/template-service')
jest.mock('@/lib/template-cache')
jest.mock('@/hooks/use-toast')

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>

// Mock template data
const mockTemplates = [
  {
    id: '1',
    titel: 'Mietvertrag Standard',
    inhalt: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mietvertrag Inhalt' }] }] },
    kategorie: 'Mietverträge',
    user_id: 'user-1',
    erstellungsdatum: '2024-01-01T10:00:00Z',
    aktualisiert_am: '2024-01-02T10:00:00Z',
    kontext_anforderungen: ['mieter_name', 'wohnung_adresse']
  },
  {
    id: '2',
    titel: 'Kündigung Vorlage',
    inhalt: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Kündigung Inhalt' }] }] },
    kategorie: 'Kündigungen',
    user_id: 'user-1',
    erstellungsdatum: '2024-01-03T10:00:00Z',
    aktualisiert_am: null,
    kontext_anforderungen: ['mieter_name', 'kuendigung_datum']
  }
]

const mockCategories = ['Mietverträge', 'Kündigungen', 'Betriebskosten']

describe('TemplatesManagementModal - Loading and State Management', () => {
  const mockToast = jest.fn()
  const mockCloseModal = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseToast.mockReturnValue({
      toast: mockToast
    })

    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      isLoading: false
    })

    mockUseModalStore.mockReturnValue({
      isTemplatesManagementModalOpen: true,
      closeTemplatesManagementModal: mockCloseModal
    })

    // Mock TemplateService
    const mockTemplateService = {
      getUserTemplates: jest.fn(),
      getUserCategories: jest.fn()
    }
    ;(TemplateService as jest.Mock).mockImplementation(() => mockTemplateService)

    // Mock template cache service
    ;(templateCacheService.getUserTemplates as jest.Mock).mockReturnValue(null)
    ;(templateCacheService.getUserCategories as jest.Mock).mockReturnValue(null)
    ;(templateCacheService.setUserTemplates as jest.Mock).mockImplementation(() => {})
    ;(templateCacheService.setUserCategories as jest.Mock).mockImplementation(() => {})
    ;(templateCacheService.invalidateUserCaches as jest.Mock).mockImplementation(() => {})
  })

  describe('Initial Loading', () => {
    test('should show loading skeleton when modal opens', async () => {
      const mockTemplateService = new TemplateService()
      ;(mockTemplateService.getUserTemplates as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )
      ;(mockTemplateService.getUserCategories as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<TemplatesManagementModal />)

      expect(screen.getByText('Vorlagen verwalten')).toBeInTheDocument()
      
      // Should show loading skeleton
      await waitFor(() => {
        expect(screen.getByTestId('templates-loading-skeleton')).toBeInTheDocument()
      })
    })

    test('should load templates and categories on modal open', async () => {
      const mockTemplateService = new TemplateService()
      ;(mockTemplateService.getUserTemplates as jest.Mock).mockResolvedValue(mockTemplates)
      ;(mockTemplateService.getUserCategories as jest.Mock).mockResolvedValue(mockCategories)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(mockTemplateService.getUserTemplates).toHaveBeenCalledWith('user-1')
        expect(mockTemplateService.getUserCategories).toHaveBeenCalledWith('user-1')
      })

      // Should display templates
      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
        expect(screen.getByText('Kündigung Vorlage')).toBeInTheDocument()
      })
    })

    test('should use cached data when available', async () => {
      // Mock cached data
      ;(templateCacheService.getUserTemplates as jest.Mock).mockReturnValue(mockTemplates)
      ;(templateCacheService.getUserCategories as jest.Mock).mockReturnValue(mockCategories)

      const mockTemplateService = new TemplateService()
      ;(mockTemplateService.getUserTemplates as jest.Mock).mockResolvedValue(mockTemplates)
      ;(mockTemplateService.getUserCategories as jest.Mock).mockResolvedValue(mockCategories)

      render(<TemplatesManagementModal />)

      // Should use cached data and not call service
      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })

      expect(mockTemplateService.getUserTemplates).not.toHaveBeenCalled()
      expect(mockTemplateService.getUserCategories).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    test('should show error state when loading fails', async () => {
      const mockTemplateService = new TemplateService()
      ;(mockTemplateService.getUserTemplates as jest.Mock).mockRejectedValue(
        new Error('Failed to load templates')
      )
      ;(mockTemplateService.getUserCategories as jest.Mock).mockRejectedValue(
        new Error('Failed to load categories')
      )

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText('Fehler beim Laden der Vorlagen')).toBeInTheDocument()
        expect(screen.getByText('Failed to load templates')).toBeInTheDocument()
      })

      // Should show retry button
      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
    })

    test('should retry loading when retry button is clicked', async () => {
      const mockTemplateService = new TemplateService()
      ;(mockTemplateService.getUserTemplates as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockTemplates)
      ;(mockTemplateService.getUserCategories as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockCategories)

      render(<TemplatesManagementModal />)

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Fehler beim Laden der Vorlagen')).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByText('Erneut versuchen')
      await userEvent.click(retryButton)

      // Should retry and succeed
      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })

      expect(mockTemplateService.getUserTemplates).toHaveBeenCalledTimes(2)
    })

    test('should show toast notification on retry success', async () => {
      const mockTemplateService = new TemplateService()
      ;(mockTemplateService.getUserTemplates as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockTemplates)
      ;(mockTemplateService.getUserCategories as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockCategories)

      render(<TemplatesManagementModal />)

      // Wait for error state and retry
      await waitFor(() => {
        expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Erneut versuchen')
      await userEvent.click(retryButton)

      // Should show success toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Vorlagen geladen",
          description: "Die Vorlagen wurden erfolgreich aktualisiert."
        })
      })
    })

    test('should limit retry attempts', async () => {
      const mockTemplateService = new TemplateService()
      ;(mockTemplateService.getUserTemplates as jest.Mock).mockRejectedValue(
        new Error('Persistent error')
      )
      ;(mockTemplateService.getUserCategories as jest.Mock).mockRejectedValue(
        new Error('Persistent error')
      )

      render(<TemplatesManagementModal />)

      // Retry multiple times
      for (let i = 0; i < 4; i++) {
        await waitFor(() => {
          expect(screen.getByText('Fehler beim Laden der Vorlagen')).toBeInTheDocument()
        })

        const retryButton = screen.queryByText('Erneut versuchen')
        if (retryButton) {
          await userEvent.click(retryButton)
        }
      }

      // After 3 retries, retry button should be disabled/hidden
      await waitFor(() => {
        expect(screen.queryByText('Erneut versuchen')).not.toBeInTheDocument()
      })
    })
  })

  describe('Cache Management', () => {
    test('should invalidate cache when modal reopens', async () => {
      const mockTemplateService = new TemplateService()
      ;(mockTemplateService.getUserTemplates as jest.Mock).mockResolvedValue(mockTemplates)
      ;(mockTemplateService.getUserCategories as jest.Mock).mockResolvedValue(mockCategories)

      const { rerender } = render(<TemplatesManagementModal />)

      // Close and reopen modal
      mockUseModalStore.mockReturnValue({
        isTemplatesManagementModalOpen: false,
        closeTemplatesManagementModal: mockCloseModal
      })
      rerender(<TemplatesManagementModal />)

      mockUseModalStore.mockReturnValue({
        isTemplatesManagementModalOpen: true,
        closeTemplatesManagementModal: mockCloseModal
      })
      rerender(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(templateCacheService.invalidateUserCaches).toHaveBeenCalledWith('user-1')
      })
    })

    test('should refresh data when refresh button is clicked', async () => {
      const mockTemplateService = new TemplateService()
      ;(mockTemplateService.getUserTemplates as jest.Mock).mockResolvedValue(mockTemplates)
      ;(mockTemplateService.getUserCategories as jest.Mock).mockResolvedValue(mockCategories)

      render(<TemplatesManagementModal />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })

      // Click refresh button
      const refreshButton = screen.getByTitle('Vorlagen aktualisieren')
      await userEvent.click(refreshButton)

      await waitFor(() => {
        expect(templateCacheService.invalidateUserCaches).toHaveBeenCalledWith('user-1')
        expect(mockTemplateService.getUserTemplates).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Template Enhancement', () => {
    test('should enhance templates with metadata', async () => {
      const mockTemplateService = new TemplateService()
      ;(mockTemplateService.getUserTemplates as jest.Mock).mockResolvedValue(mockTemplates)
      ;(mockTemplateService.getUserCategories as jest.Mock).mockResolvedValue(mockCategories)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      })

      // Should show variable count badges
      expect(screen.getAllByText('2 Variablen')).toHaveLength(2) // Both templates have 2 variables
    })

    test('should generate category statistics', async () => {
      const mockTemplateService = new TemplateService()
      ;(mockTemplateService.getUserTemplates as jest.Mock).mockResolvedValue(mockTemplates)
      ;(mockTemplateService.getUserCategories as jest.Mock).mockResolvedValue(mockCategories)

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText('Alle Kategorien (2)')).toBeInTheDocument()
      })

      // Open category filter
      const categoryFilter = screen.getByRole('combobox')
      await userEvent.click(categoryFilter)

      // Should show category counts
      expect(screen.getByText('Mietverträge (1)')).toBeInTheDocument()
      expect(screen.getByText('Kündigungen (1)')).toBeInTheDocument()
    })
  })

  describe('Authentication', () => {
    test('should handle unauthenticated user', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false
      })

      render(<TemplatesManagementModal />)

      await waitFor(() => {
        expect(screen.getByText('Benutzer nicht authentifiziert')).toBeInTheDocument()
      })
    })

    test('should wait for authentication to complete', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true
      })

      render(<TemplatesManagementModal />)

      // Should not attempt to load templates while auth is loading
      const mockTemplateService = new TemplateService()
      expect(mockTemplateService.getUserTemplates).not.toHaveBeenCalled()
    })
  })
})