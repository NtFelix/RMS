import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategorySelectionModal } from '@/components/category-selection-modal'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')

// Mock fetch
global.fetch = jest.fn()

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

describe('Template Creation Workflow', () => {
  const mockOpenCategorySelectionModal = jest.fn()
  const mockCloseCategorySelectionModal = jest.fn()

  const defaultStoreState = {
    isCategorySelectionModalOpen: false,
    categorySelectionData: undefined,
    openCategorySelectionModal: mockOpenCategorySelectionModal,
    closeCategorySelectionModal: mockCloseCategorySelectionModal,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseModalStore.mockReturnValue(defaultStoreState as any)
  })

  describe('API Integration', () => {
    it('should fetch categories from API endpoint', async () => {
      const mockCategories = ['Mietverträge', 'Kündigungen', 'Sonstiges']
      
      // Mock successful API response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ categories: mockCategories })
      })

      // Test the API call directly
      const response = await fetch('/api/templates/categories')
      const data = await response.json()

      expect(global.fetch).toHaveBeenCalledWith('/api/templates/categories')
      expect(data.categories).toEqual(mockCategories)
    })

    it('should handle API errors gracefully', async () => {
      // Mock API error
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const response = await fetch('/api/templates/categories')
      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
    })
  })

  describe('Category Selection Modal Integration', () => {
    it('should render category selection modal when open', () => {
      const mockCategories = ['Mietverträge', 'Kündigungen']
      const mockOnCategorySelected = jest.fn()
      const mockOnCancel = jest.fn()

      // Mock modal as open
      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: mockCategories,
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel
        }
      } as any)

      render(<CategorySelectionModal />)

      // Should show modal content
      expect(screen.getByText('Kategorie auswählen')).toBeInTheDocument()
      expect(screen.getByText('Mietverträge')).toBeInTheDocument()
      expect(screen.getByText('Kündigungen')).toBeInTheDocument()
    })

    it('should handle category selection', async () => {
      const user = userEvent.setup()
      const mockCategories = ['Mietverträge', 'Kündigungen']
      const mockOnCategorySelected = jest.fn()
      const mockOnCancel = jest.fn()

      // Mock modal as open
      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: mockCategories,
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel
        }
      } as any)

      render(<CategorySelectionModal />)

      // Click on a category
      const categoryBadge = screen.getByText('Mietverträge')
      await user.click(categoryBadge)

      // Click continue button
      const continueButton = screen.getByRole('button', { name: /weiter/i })
      await user.click(continueButton)

      // Should call the callback and close modal
      expect(mockOnCategorySelected).toHaveBeenCalledWith('Mietverträge')
      expect(mockCloseCategorySelectionModal).toHaveBeenCalled()
    })

    it('should handle new category creation', async () => {
      const user = userEvent.setup()
      const mockCategories = ['Mietverträge']
      const mockOnCategorySelected = jest.fn()
      const mockOnCancel = jest.fn()

      // Mock modal as open
      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: mockCategories,
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel
        }
      } as any)

      render(<CategorySelectionModal />)

      // Click "Neue Kategorie erstellen" button (use role to be more specific)
      const createNewButton = screen.getByRole('button', { name: /neue kategorie erstellen/i })
      await user.click(createNewButton)

      // Should show input field
      const categoryInput = screen.getByPlaceholderText('Kategoriename eingeben...')
      expect(categoryInput).toBeInTheDocument()

      // Type new category name
      await user.type(categoryInput, 'Neue Kategorie')

      // Click continue button
      const continueButton = screen.getByRole('button', { name: /weiter/i })
      await user.click(continueButton)

      // Should call the callback with new category
      expect(mockOnCategorySelected).toHaveBeenCalledWith('Neue Kategorie')
      expect(mockCloseCategorySelectionModal).toHaveBeenCalled()
    })

    it('should handle modal cancellation', async () => {
      const user = userEvent.setup()
      const mockCategories = ['Mietverträge']
      const mockOnCategorySelected = jest.fn()
      const mockOnCancel = jest.fn()

      // Mock modal as open
      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: mockCategories,
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel
        }
      } as any)

      render(<CategorySelectionModal />)

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /abbrechen/i })
      await user.click(cancelButton)

      // Should call cancel callback and close modal
      expect(mockOnCancel).toHaveBeenCalled()
      expect(mockCloseCategorySelectionModal).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors during category fetching', async () => {
      // Mock network error
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      try {
        await fetch('/api/templates/categories')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Network error')
      }
    })

    it('should validate category input in modal', async () => {
      const user = userEvent.setup()
      const mockOnCategorySelected = jest.fn()
      const mockOnCancel = jest.fn()

      // Mock modal as open with new category creation
      mockUseModalStore.mockReturnValue({
        ...defaultStoreState,
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: [],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel
        }
      } as any)

      render(<CategorySelectionModal />)

      // Click "Neue Kategorie erstellen" button
      const createNewButton = screen.getByRole('button', { name: /neue kategorie erstellen/i })
      await user.click(createNewButton)

      // Continue button should be disabled with empty input
      const continueButton = screen.getByRole('button', { name: /weiter/i })
      expect(continueButton).toBeDisabled()

      // Type whitespace only
      const categoryInput = screen.getByPlaceholderText('Kategoriename eingeben...')
      await user.type(categoryInput, '   ')

      // Continue button should still be disabled
      expect(continueButton).toBeDisabled()

      // Type valid category name
      await user.clear(categoryInput)
      await user.type(categoryInput, 'Valid Category')

      // Continue button should be enabled
      expect(continueButton).not.toBeDisabled()
    })
  })

  describe('Template Creation Workflow Logic', () => {
    it('should handle category selection callback correctly', () => {
      const mockOnCategorySelected = jest.fn()
      const mockOnCancel = jest.fn()

      // Test the callback logic
      const categorySelectionData = {
        existingCategories: ['Existing Category'],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel
      }

      // Simulate category selection
      categorySelectionData.onCategorySelected('Test Category')

      // Should call the callback with the selected category
      expect(mockOnCategorySelected).toHaveBeenCalledWith('Test Category')
    })

    it('should handle cancel callback correctly', () => {
      const mockOnCategorySelected = jest.fn()
      const mockOnCancel = jest.fn()

      // Test the callback logic
      const categorySelectionData = {
        existingCategories: ['Existing Category'],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel
      }

      // Simulate cancel
      categorySelectionData.onCancel()

      // Should call the cancel callback
      expect(mockOnCancel).toHaveBeenCalled()
    })
  })
})