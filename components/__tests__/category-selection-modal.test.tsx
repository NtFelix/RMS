import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CategorySelectionModal } from '@/components/category-selection-modal'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

describe('CategorySelectionModal', () => {
  const mockCloseCategorySelectionModal = jest.fn()
  const mockOnCategorySelected = jest.fn()
  const mockOnCancel = jest.fn()

  const defaultStoreState = {
    isCategorySelectionModalOpen: false,
    categorySelectionData: undefined,
    closeCategorySelectionModal: mockCloseCategorySelectionModal,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseModalStore.mockReturnValue(defaultStoreState as any)
  })

  it('should not render when modal is closed', () => {
    render(<CategorySelectionModal />)
    
    // Modal should not be visible
    expect(screen.queryByText('Kategorie auswählen')).not.toBeInTheDocument()
  })

  it('should render when modal is open with existing categories', () => {
    mockUseModalStore.mockReturnValue({
      ...defaultStoreState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: ['Mietverträge', 'Kündigungen'],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    // Modal should be visible
    expect(screen.getByText('Kategorie auswählen')).toBeInTheDocument()
    expect(screen.getByText('Wählen Sie eine Kategorie für Ihre neue Vorlage aus oder erstellen Sie eine neue.')).toBeInTheDocument()
    
    // Existing categories should be shown
    expect(screen.getByText('Mietverträge')).toBeInTheDocument()
    expect(screen.getByText('Kündigungen')).toBeInTheDocument()
  })

  it('should handle category selection', async () => {
    mockUseModalStore.mockReturnValue({
      ...defaultStoreState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: ['Mietverträge', 'Kündigungen'],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    // Click on a category
    const categoryBadge = screen.getByText('Mietverträge')
    fireEvent.click(categoryBadge)
    
    // Category should be selected (badge should change appearance)
    expect(categoryBadge.closest('.bg-primary')).toBeTruthy()
    
    // Click confirm button
    const confirmButton = screen.getByText('Weiter')
    expect(confirmButton).not.toBeDisabled()
    fireEvent.click(confirmButton)
    
    // Should call the callback and close modal
    await waitFor(() => {
      expect(mockOnCategorySelected).toHaveBeenCalledWith('Mietverträge')
      expect(mockCloseCategorySelectionModal).toHaveBeenCalled()
    })
  })

  it('should handle new category creation', async () => {
    mockUseModalStore.mockReturnValue({
      ...defaultStoreState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: ['Mietverträge'],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    // Click "Neue Kategorie erstellen" button
    const createNewButton = screen.getByRole('button', { name: /neue kategorie erstellen/i })
    fireEvent.click(createNewButton)
    
    // Input field should appear
    const input = screen.getByPlaceholderText('Kategoriename eingeben...')
    expect(input).toBeInTheDocument()
    
    // Type new category name
    fireEvent.change(input, { target: { value: 'Neue Kategorie' } })
    
    // Confirm button should be enabled
    const confirmButton = screen.getByText('Weiter')
    expect(confirmButton).not.toBeDisabled()
    
    // Click confirm
    fireEvent.click(confirmButton)
    
    // Should call callback with new category name
    await waitFor(() => {
      expect(mockOnCategorySelected).toHaveBeenCalledWith('Neue Kategorie')
      expect(mockCloseCategorySelectionModal).toHaveBeenCalled()
    })
  })

  it('should handle Enter key in new category input', async () => {
    mockUseModalStore.mockReturnValue({
      ...defaultStoreState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: [],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    // Click "Neue Kategorie erstellen" button
    const createNewButton = screen.getByRole('button', { name: /neue kategorie erstellen/i })
    fireEvent.click(createNewButton)
    
    // Type in input and press Enter
    const input = screen.getByPlaceholderText('Kategoriename eingeben...')
    fireEvent.change(input, { target: { value: 'Test Kategorie' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    
    // Should call callback
    await waitFor(() => {
      expect(mockOnCategorySelected).toHaveBeenCalledWith('Test Kategorie')
      expect(mockCloseCategorySelectionModal).toHaveBeenCalled()
    })
  })

  it('should handle cancel action', () => {
    mockUseModalStore.mockReturnValue({
      ...defaultStoreState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: ['Mietverträge'],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    // Click cancel button
    const cancelButton = screen.getByText('Abbrechen')
    fireEvent.click(cancelButton)
    
    // Should call cancel callback and close modal
    expect(mockOnCancel).toHaveBeenCalled()
    expect(mockCloseCategorySelectionModal).toHaveBeenCalled()
  })

  it('should disable confirm button when no category is selected', () => {
    mockUseModalStore.mockReturnValue({
      ...defaultStoreState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: ['Mietverträge'],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    // Confirm button should be disabled initially
    const confirmButton = screen.getByText('Weiter')
    expect(confirmButton).toBeDisabled()
  })

  it('should disable confirm button when new category input is empty', () => {
    mockUseModalStore.mockReturnValue({
      ...defaultStoreState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: [],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    // Click "Neue Kategorie erstellen" button
    const createNewButton = screen.getByRole('button', { name: /neue kategorie erstellen/i })
    fireEvent.click(createNewButton)
    
    // Confirm button should be disabled when input is empty
    const confirmButton = screen.getByText('Weiter')
    expect(confirmButton).toBeDisabled()
    
    // Type something and it should be enabled
    const input = screen.getByPlaceholderText('Kategoriename eingeben...')
    fireEvent.change(input, { target: { value: 'Test' } })
    expect(confirmButton).not.toBeDisabled()
    
    // Clear input and it should be disabled again
    fireEvent.change(input, { target: { value: '' } })
    expect(confirmButton).toBeDisabled()
  })
})