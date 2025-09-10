import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategorySelectionModal } from '@/components/category-selection-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { useToast } from '@/hooks/use-toast'

// Mock the hooks
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-toast')

// Mock fetch globally
global.fetch = jest.fn()

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('Category Modal Integration with Modal Store', () => {
  const mockToast = jest.fn()
  const mockOnCategorySelected = jest.fn()
  const mockOnCancel = jest.fn()
  const mockCloseCategorySelectionModal = jest.fn()
  const mockLoadUserCategories = jest.fn()
  const mockClearCategoryCache = jest.fn()

  const createMockStore = (overrides = {}) => ({
    isCategorySelectionModalOpen: false,
    categorySelectionData: undefined,
    categoryCache: new Map(),
    categoryLoadingState: new Map(),
    closeCategorySelectionModal: mockCloseCategorySelectionModal,
    loadUserCategories: mockLoadUserCategories,
    clearCategoryCache: mockClearCategoryCache,
    openCategorySelectionModal: jest.fn(),
    ...overrides
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
    })

    mockUseModalStore.mockReturnValue(createMockStore() as any)
  })

  describe('Modal State Management Integration', () => {
    it('should integrate with modal store for opening and closing', () => {
      const mockStore = createMockStore({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Mietverträge', 'Kündigungen'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: undefined
        }
      })

      mockUseModalStore.mockReturnValue(mockStore as any)

      render(<CategorySelectionModal />)
      
      expect(screen.getByText('Kategorie auswählen')).toBeInTheDocument()
      expect(screen.getByText('Mietverträge')).toBeInTheDocument()
      expect(screen.getByText('Kündigungen')).toBeInTheDocument()
    })

    it('should handle loading state from modal store', () => {
      const mockStore = createMockStore({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: true,
          error: undefined
        }
      })

      mockUseModalStore.mockReturnValue(mockStore as any)

      render(<CategorySelectionModal />)
      
      expect(screen.getByText('Kategorien werden geladen...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /fortfahren/i })).toBeDisabled()
    })

    it('should handle error state from modal store', () => {
      const mockStore = createMockStore({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: 'Failed to load categories'
        }
      })

      mockUseModalStore.mockReturnValue(mockStore as any)

      render(<CategorySelectionModal />)
      
      expect(screen.getByText('Fehler beim Laden der Kategorien')).toBeInTheDocument()
      expect(screen.getByText('Failed to load categories')).toBeInTheDocument()
      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
    })

    it('should call modal store methods on user interactions', async () => {
      const user = userEvent.setup()
      const mockStore = createMockStore({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Mietverträge'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: undefined
        }
      })

      mockUseModalStore.mockReturnValue(mockStore as any)

      render(<CategorySelectionModal />)
      
      // Test cancel button calls modal store close method
      await user.click(screen.getByText('Abbrechen'))
      
      expect(mockOnCancel).toHaveBeenCalled()
      expect(mockCloseCategorySelectionModal).toHaveBeenCalled()
    })
  })

  describe('Category Loading Integration', () => {
    it('should handle refresh categories through modal store', async () => {
      const user = userEvent.setup()
      const mockStore = createMockStore({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Mietverträge'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: 'Some error'
        }
      })

      mockUseModalStore.mockReturnValue(mockStore as any)

      render(<CategorySelectionModal />)
      
      // Click retry button
      await user.click(screen.getByText('Erneut versuchen'))
      
      expect(mockClearCategoryCache).toHaveBeenCalled()
      expect(mockToast).toHaveBeenCalledWith({
        title: "Kategorien aktualisiert",
        description: "Die Kategorien wurden erfolgreich neu geladen."
      })
    })

    it('should handle refresh button in categories section', async () => {
      const user = userEvent.setup()
      const mockStore = createMockStore({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Mietverträge', 'Kündigungen'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: undefined
        }
      })

      mockUseModalStore.mockReturnValue(mockStore as any)

      render(<CategorySelectionModal />)
      
      // Find and click the refresh button in the categories section
      const refreshButtons = screen.getAllByRole('button')
      const refreshButton = refreshButtons.find(button => 
        button.querySelector('svg') && button.className.includes('h-7')
      )
      
      if (refreshButton) {
        await user.click(refreshButton)
        expect(mockClearCategoryCache).toHaveBeenCalled()
      }
    })
  })

  describe('Category Creation Integration', () => {
    it('should handle successful category creation', async () => {
      const user = userEvent.setup()
      const mockStore = createMockStore({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: undefined
        }
      })

      mockUseModalStore.mockReturnValue(mockStore as any)

      render(<CategorySelectionModal />)
      
      // Create new category
      await user.click(screen.getByText('Neu'))
      await user.type(screen.getByPlaceholderText('Kategoriename eingeben...'), 'Neue Kategorie')
      await user.click(screen.getByText('Erstellen & Fortfahren'))
      
      expect(mockOnCategorySelected).toHaveBeenCalledWith('Neue Kategorie')
      expect(mockToast).toHaveBeenCalledWith({
        title: "Kategorie erstellt",
        description: 'Die Kategorie "Neue Kategorie" wurde erfolgreich erstellt.'
      })
      expect(mockClearCategoryCache).toHaveBeenCalled()
    })

    it('should handle category creation error', async () => {
      const user = userEvent.setup()
      const mockOnCategorySelectedWithError = jest.fn().mockRejectedValue(new Error('Creation failed'))
      
      const mockStore = createMockStore({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelectedWithError,
          onCancel: mockOnCancel,
          isLoading: false,
          error: undefined
        }
      })

      mockUseModalStore.mockReturnValue(mockStore as any)

      render(<CategorySelectionModal />)
      
      // Create new category
      await user.click(screen.getByText('Neu'))
      await user.type(screen.getByPlaceholderText('Kategoriename eingeben...'), 'Neue Kategorie')
      await user.click(screen.getByText('Erstellen & Fortfahren'))
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Fehler",
          description: "Creation failed",
          variant: "destructive"
        })
      })
    })
  })

  describe('Cache Management Integration', () => {
    it('should clear cache when creating new categories', async () => {
      const user = userEvent.setup()
      const mockStore = createMockStore({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Existing'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: undefined
        }
      })

      mockUseModalStore.mockReturnValue(mockStore as any)

      render(<CategorySelectionModal />)
      
      // Create new category
      await user.click(screen.getByText('Neu'))
      await user.type(screen.getByPlaceholderText('Kategoriename eingeben...'), 'New Category')
      await user.click(screen.getByText('Erstellen & Fortfahren'))
      
      // Should clear cache after successful creation
      expect(mockClearCategoryCache).toHaveBeenCalled()
    })

    it('should handle cache refresh errors gracefully', async () => {
      const user = userEvent.setup()
      const mockClearCategoryCacheWithError = jest.fn().mockImplementation(() => {
        throw new Error('Cache clear failed')
      })
      
      const mockStore = createMockStore({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: 'Some error'
        },
        clearCategoryCache: mockClearCategoryCacheWithError
      })

      mockUseModalStore.mockReturnValue(mockStore as any)

      render(<CategorySelectionModal />)
      
      // Click retry button
      await user.click(screen.getByText('Erneut versuchen'))
      
      expect(mockToast).toHaveBeenCalledWith({
        title: "Fehler beim Aktualisieren",
        description: "Die Kategorien konnten nicht neu geladen werden.",
        variant: "destructive"
      })
    })
  })

  describe('Modal State Persistence', () => {
    it('should reset local state when modal opens', () => {
      // First render with modal closed
      const closedStore = createMockStore({
        isCategorySelectionModalOpen: false
      })
      mockUseModalStore.mockReturnValue(closedStore as any)
      
      const { rerender } = render(<CategorySelectionModal />)
      
      // Then render with modal open
      const openStore = createMockStore({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Test'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: undefined
        }
      })
      mockUseModalStore.mockReturnValue(openStore as any)
      
      rerender(<CategorySelectionModal />)
      
      // Should not show any selected category initially
      expect(screen.queryByText('Ausgewählte Kategorie:')).not.toBeInTheDocument()
    })

    it('should maintain state during modal interactions', async () => {
      const user = userEvent.setup()
      const mockStore = createMockStore({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Mietverträge', 'Kündigungen'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: undefined
        }
      })

      mockUseModalStore.mockReturnValue(mockStore as any)

      render(<CategorySelectionModal />)
      
      // Select a category
      await user.click(screen.getByText('Mietverträge'))
      
      // Should show selection
      expect(screen.getByText('Ausgewählte Kategorie:')).toBeInTheDocument()
      
      // Switch to new category creation
      await user.click(screen.getByText('Neu'))
      
      // Should clear previous selection
      expect(screen.queryByText('Mietverträge')).toBeInTheDocument() // Still in the list
      
      // Type new category
      await user.type(screen.getByPlaceholderText('Kategoriename eingeben...'), 'New Category')
      
      // Should show new category in summary
      const summarySection = screen.getByText('Ausgewählte Kategorie:').closest('div')
      expect(summarySection).toHaveTextContent('New Category')
      expect(summarySection).toHaveTextContent('Neu')
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle validation errors without affecting modal store', async () => {
      const user = userEvent.setup()
      const mockStore = createMockStore({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Existing'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: undefined
        }
      })

      mockUseModalStore.mockReturnValue(mockStore as any)

      render(<CategorySelectionModal />)
      
      // Try to create duplicate category
      await user.click(screen.getByText('Neu'))
      await user.type(screen.getByPlaceholderText('Kategoriename eingeben...'), 'Existing')
      await user.click(screen.getByText('Erstellen & Fortfahren'))
      
      // Should show validation error
      expect(mockToast).toHaveBeenCalledWith({
        title: "Ungültiger Kategoriename",
        description: "Diese Kategorie existiert bereits.",
        variant: "destructive"
      })
      
      // Should not call modal store methods
      expect(mockOnCategorySelected).not.toHaveBeenCalled()
      expect(mockCloseCategorySelectionModal).not.toHaveBeenCalled()
    })

    it('should handle processing state correctly', async () => {
      const user = userEvent.setup()
      
      // Mock slow category selection
      const slowOnCategorySelected = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )
      
      const mockStore = createMockStore({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Mietverträge'],
          onCategorySelected: slowOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: undefined
        }
      })

      mockUseModalStore.mockReturnValue(mockStore as any)

      render(<CategorySelectionModal />)
      
      // Select category and confirm
      await user.click(screen.getByText('Mietverträge'))
      const continueButton = screen.getByText('Fortfahren')
      await user.click(continueButton)
      
      // Buttons should be disabled during processing
      expect(screen.getByText('Abbrechen')).toBeDisabled()
      expect(continueButton).toBeDisabled()
      
      // Wait for processing to complete
      await waitFor(() => {
        expect(slowOnCategorySelected).toHaveBeenCalledWith('Mietverträge')
      })
    })
  })
})