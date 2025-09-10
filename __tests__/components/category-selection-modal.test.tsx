import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategorySelectionModal } from '@/components/category-selection-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { useToast } from '@/hooks/use-toast'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Mock the toast hook
jest.mock('@/hooks/use-toast')
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>

describe('CategorySelectionModal', () => {
  const mockToast = jest.fn()
  const mockCloseCategorySelectionModal = jest.fn()
  const mockLoadUserCategories = jest.fn()
  const mockClearCategoryCache = jest.fn()
  const mockOnCategorySelected = jest.fn()
  const mockOnCancel = jest.fn()

  const defaultModalState = {
    isCategorySelectionModalOpen: false,
    categorySelectionData: undefined,
    categoryCache: new Map(),
    categoryLoadingState: new Map(),
    closeCategorySelectionModal: mockCloseCategorySelectionModal,
    loadUserCategories: mockLoadUserCategories,
    clearCategoryCache: mockClearCategoryCache,
    openCategorySelectionModal: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: jest.fn(),
      toasts: []
    })

    mockUseModalStore.mockReturnValue({
      ...defaultModalState
    } as any)
  })

  describe('Modal Visibility', () => {
    it('should not render when modal is closed', () => {
      render(<CategorySelectionModal />)
      
      expect(screen.queryByText('Kategorie auswählen')).not.toBeInTheDocument()
    })

    it('should render when modal is open', () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      expect(screen.getByText('Kategorie auswählen')).toBeInTheDocument()
      expect(screen.getByText('Wählen Sie eine bestehende Kategorie aus oder erstellen Sie eine neue für Ihre Vorlage.')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading state when categories are being loaded', () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: true
        }
      } as any)

      render(<CategorySelectionModal />)
      
      expect(screen.getByText('Kategorien werden geladen...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /fortfahren/i })).toBeDisabled()
    })

    it('should hide loading state when categories are loaded', () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Test Category'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      expect(screen.queryByText('Kategorien werden geladen...')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should show error state when category loading fails', () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: 'Failed to load categories'
        }
      } as any)

      render(<CategorySelectionModal />)
      
      expect(screen.getByText('Fehler beim Laden der Kategorien')).toBeInTheDocument()
      expect(screen.getByText('Failed to load categories')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
    })

    it('should handle retry button click', async () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: 'Failed to load categories'
        }
      } as any)

      render(<CategorySelectionModal />)
      
      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      await userEvent.click(retryButton)
      
      expect(mockClearCategoryCache).toHaveBeenCalled()
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Kategorien aktualisiert',
        description: 'Die Kategorien wurden erfolgreich neu geladen.'
      })
    })
  })

  describe('Existing Categories', () => {
    it('should display existing categories as badges', () => {
      const categories = ['Mietverträge', 'Kündigungen', 'Sonstiges']
      
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: categories,
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      categories.forEach(category => {
        expect(screen.getByText(category)).toBeInTheDocument()
      })
      
      expect(screen.getByText(`Bestehende Kategorien (${categories.length})`)).toBeInTheDocument()
    })

    it('should allow selecting existing categories', async () => {
      const categories = ['Mietverträge', 'Kündigungen']
      
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: categories,
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      const categoryBadge = screen.getByText('Mietverträge')
      await userEvent.click(categoryBadge)
      
      expect(screen.getByText('Ausgewählte Kategorie:')).toBeInTheDocument()
      // Use getAllByText since the category appears in both the badge and the summary
      const categoryTexts = screen.getAllByText('Mietverträge')
      expect(categoryTexts.length).toBeGreaterThan(0)
    })

    it('should show empty state when no categories exist', () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      expect(screen.getByText('Noch keine Kategorien vorhanden')).toBeInTheDocument()
      expect(screen.getByText('Erstellen Sie Ihre erste Kategorie unten')).toBeInTheDocument()
    })
  })

  describe('New Category Creation', () => {
    it('should toggle new category input when "Neu" button is clicked', async () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      const newButton = screen.getByRole('button', { name: /neu/i })
      await userEvent.click(newButton)
      
      expect(screen.getByPlaceholderText('Kategoriename eingeben...')).toBeInTheDocument()
      expect(screen.getByText('2-50 Zeichen, nur Buchstaben, Zahlen, Leerzeichen, Bindestriche und Unterstriche')).toBeInTheDocument()
    })

    it('should validate new category name', async () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Existing Category'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      // Enable new category mode
      const newButton = screen.getByRole('button', { name: /neu/i })
      await userEvent.click(newButton)
      
      const input = screen.getByPlaceholderText('Kategoriename eingeben...')
      
      // Test empty name - button should be disabled
      const confirmButton = screen.getByRole('button', { name: /erstellen & fortfahren/i })
      expect(confirmButton).toBeDisabled()
      
      // Test valid name enables button
      await userEvent.type(input, 'Valid Category Name')
      expect(confirmButton).not.toBeDisabled()
    })

    it('should show selection summary for new category', async () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      // Enable new category mode
      const newButton = screen.getByRole('button', { name: /neu/i })
      await userEvent.click(newButton)
      
      const input = screen.getByPlaceholderText('Kategoriename eingeben...')
      await userEvent.type(input, 'New Category')
      
      expect(screen.getByText('Ausgewählte Kategorie:')).toBeInTheDocument()
      expect(screen.getByText('New Category')).toBeInTheDocument()
      expect(screen.getByText('Neu')).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should call onCategorySelected with existing category', async () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Test Category'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      // Select existing category
      const categoryBadge = screen.getByText('Test Category')
      await userEvent.click(categoryBadge)
      
      // Confirm selection
      const confirmButton = screen.getByRole('button', { name: /fortfahren/i })
      await userEvent.click(confirmButton)
      
      expect(mockOnCategorySelected).toHaveBeenCalledWith('Test Category')
    })

    it('should call onCategorySelected with new category', async () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      // Enable new category mode
      const newButton = screen.getByRole('button', { name: /neu/i })
      await userEvent.click(newButton)
      
      // Enter new category name
      const input = screen.getByPlaceholderText('Kategoriename eingeben...')
      await userEvent.type(input, 'New Category')
      
      // Confirm creation
      const confirmButton = screen.getByRole('button', { name: /erstellen & fortfahren/i })
      await userEvent.click(confirmButton)
      
      expect(mockOnCategorySelected).toHaveBeenCalledWith('New Category')
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Kategorie erstellt',
        description: 'Die Kategorie "New Category" wurde erfolgreich erstellt.'
      })
      expect(mockClearCategoryCache).toHaveBeenCalled()
    })

    it('should show error when no category is selected', async () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Test Category'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      // Button should be disabled when no category is selected
      const confirmButton = screen.getByRole('button', { name: /fortfahren/i })
      expect(confirmButton).toBeDisabled()
    })

    it('should handle errors during category selection', async () => {
      const errorMessage = 'Selection failed'
      mockOnCategorySelected.mockRejectedValueOnce(new Error(errorMessage))
      
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Test Category'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      // Select category
      const categoryBadge = screen.getByText('Test Category')
      await userEvent.click(categoryBadge)
      
      // Confirm selection
      const confirmButton = screen.getByRole('button', { name: /fortfahren/i })
      await userEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Fehler',
          description: errorMessage,
          variant: 'destructive'
        })
      })
    })
  })

  describe('Modal Controls', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      const cancelButton = screen.getByRole('button', { name: /abbrechen/i })
      await userEvent.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalled()
      expect(mockCloseCategorySelectionModal).toHaveBeenCalled()
    })

    it('should close modal when dialog is closed', async () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      // Simulate dialog close (ESC key or clicking outside)
      const dialog = screen.getByRole('dialog')
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' })
      
      expect(mockCloseCategorySelectionModal).toHaveBeenCalled()
    })

    it('should disable buttons during processing', async () => {
      mockOnCategorySelected.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
      
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Test Category'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      // Select category
      const categoryBadge = screen.getByText('Test Category')
      await userEvent.click(categoryBadge)
      
      // Start confirmation
      const confirmButton = screen.getByRole('button', { name: /fortfahren/i })
      await userEvent.click(confirmButton)
      
      // Buttons should be disabled during processing
      expect(screen.getByRole('button', { name: /abbrechen/i })).toBeDisabled()
      expect(confirmButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Test Category'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /fortfahren/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /abbrechen/i })).toBeInTheDocument()
    })

    it('should focus new category input when opened', async () => {
      mockUseModalStore.mockReturnValue({
        ...defaultModalState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false
        }
      } as any)

      render(<CategorySelectionModal />)
      
      // Enable new category mode
      const newButton = screen.getByRole('button', { name: /neu/i })
      await userEvent.click(newButton)
      
      const input = screen.getByPlaceholderText('Kategoriename eingeben...')
      expect(input).toHaveFocus()
    })
  })
})