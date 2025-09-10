import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategorySelectionModal } from '@/components/category-selection-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { useToast } from '@/hooks/use-toast'

// Mock the hooks
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-toast')

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>

describe('CategorySelectionModal', () => {
  const mockToast = jest.fn()
  const mockOnCategorySelected = jest.fn()
  const mockOnCancel = jest.fn()
  const mockCloseCategorySelectionModal = jest.fn()

  const defaultModalState = {
    isCategorySelectionModalOpen: false,
    categorySelectionData: undefined,
    closeCategorySelectionModal: mockCloseCategorySelectionModal,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
    })

    mockUseModalStore.mockReturnValue({
      ...defaultModalState,
    } as any)
  })

  it('should not render when modal is closed', () => {
    render(<CategorySelectionModal />)
    
    expect(screen.queryByText('Kategorie auswählen')).not.toBeInTheDocument()
  })

  it('should render when modal is open', () => {
    mockUseModalStore.mockReturnValue({
      ...defaultModalState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: ['Mietverträge', 'Kündigungen'],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    expect(screen.getByText('Kategorie auswählen')).toBeInTheDocument()
    expect(screen.getByText('Wählen Sie eine bestehende Kategorie aus oder erstellen Sie eine neue für Ihre Vorlage.')).toBeInTheDocument()
  })

  it('should display existing categories', () => {
    const existingCategories = ['Mietverträge', 'Kündigungen', 'Sonstiges']
    
    mockUseModalStore.mockReturnValue({
      ...defaultModalState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories,
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    expect(screen.getByText('Bestehende Kategorien (3)')).toBeInTheDocument()
    existingCategories.forEach(category => {
      expect(screen.getByText(category)).toBeInTheDocument()
    })
  })

  it('should allow selecting an existing category', async () => {
    const user = userEvent.setup()
    const existingCategories = ['Mietverträge', 'Kündigungen']
    
    mockUseModalStore.mockReturnValue({
      ...defaultModalState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories,
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    // Click on a category
    await user.click(screen.getByText('Mietverträge'))
    
    // Should show selection summary
    expect(screen.getByText('Ausgewählte Kategorie:')).toBeInTheDocument()
    // Check for the selected category in the summary section specifically
    const summarySection = screen.getByText('Ausgewählte Kategorie:').closest('div')
    expect(summarySection).toHaveTextContent('Mietverträge')
    
    // Should enable the continue button
    const continueButton = screen.getByText('Fortfahren')
    expect(continueButton).not.toBeDisabled()
    
    // Click continue
    await user.click(continueButton)
    
    expect(mockOnCategorySelected).toHaveBeenCalledWith('Mietverträge')
  })

  it('should allow creating a new category', async () => {
    const user = userEvent.setup()
    
    mockUseModalStore.mockReturnValue({
      ...defaultModalState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: ['Mietverträge'],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    // Click "Neu" button
    await user.click(screen.getByText('Neu'))
    
    // Should show input field
    const input = screen.getByPlaceholderText('Kategoriename eingeben...')
    expect(input).toBeInTheDocument()
    
    // Type new category name
    await user.type(input, 'Neue Kategorie')
    
    // Should show selection summary with "Neu" badge
    expect(screen.getByText('Ausgewählte Kategorie:')).toBeInTheDocument()
    const summarySection = screen.getByText('Ausgewählte Kategorie:').closest('div')
    expect(summarySection).toHaveTextContent('Neue Kategorie')
    expect(summarySection).toHaveTextContent('Neu')
    
    // Should enable the create button
    const createButton = screen.getByText('Erstellen & Fortfahren')
    expect(createButton).not.toBeDisabled()
    
    // Click create
    await user.click(createButton)
    
    expect(mockOnCategorySelected).toHaveBeenCalledWith('Neue Kategorie')
  })

  it('should validate new category name', async () => {
    const user = userEvent.setup()
    
    mockUseModalStore.mockReturnValue({
      ...defaultModalState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: ['Mietverträge'],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    // Click "Neu" button
    await user.click(screen.getByText('Neu'))
    
    const input = screen.getByPlaceholderText('Kategoriename eingeben...')
    
    // Test empty name - button should be disabled
    const createButton = screen.getByText('Erstellen & Fortfahren')
    expect(createButton).toBeDisabled()
    
    // Test too short name
    await user.clear(input)
    await user.type(input, 'A')
    await user.click(screen.getByText('Erstellen & Fortfahren'))
    expect(mockToast).toHaveBeenCalledWith({
      title: "Ungültiger Kategoriename",
      description: "Der Kategoriename muss mindestens 2 Zeichen lang sein.",
      variant: "destructive"
    })
    
    // Test duplicate name
    await user.clear(input)
    await user.type(input, 'Mietverträge')
    await user.click(screen.getByText('Erstellen & Fortfahren'))
    expect(mockToast).toHaveBeenCalledWith({
      title: "Ungültiger Kategoriename",
      description: "Diese Kategorie existiert bereits.",
      variant: "destructive"
    })
  })

  it('should handle invalid characters in category name', async () => {
    const user = userEvent.setup()
    
    mockUseModalStore.mockReturnValue({
      ...defaultModalState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: [],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    // Click "Neu" button
    await user.click(screen.getByText('Neu'))
    
    const input = screen.getByPlaceholderText('Kategoriename eingeben...')
    
    // Test invalid characters
    await user.type(input, 'Test@Category!')
    await user.click(screen.getByText('Erstellen & Fortfahren'))
    
    expect(mockToast).toHaveBeenCalledWith({
      title: "Ungültiger Kategoriename",
      description: "Der Kategoriename darf nur Buchstaben, Zahlen, Leerzeichen, Bindestriche und Unterstriche enthalten.",
      variant: "destructive"
    })
  })

  it('should handle cancel action', async () => {
    const user = userEvent.setup()
    
    mockUseModalStore.mockReturnValue({
      ...defaultModalState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: ['Mietverträge'],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    // Click cancel button
    await user.click(screen.getByText('Abbrechen'))
    
    expect(mockOnCancel).toHaveBeenCalled()
    expect(mockCloseCategorySelectionModal).toHaveBeenCalled()
  })

  it('should reset state when modal opens', () => {
    const { rerender } = render(<CategorySelectionModal />)
    
    // First render with modal closed
    mockUseModalStore.mockReturnValue({
      ...defaultModalState,
      isCategorySelectionModalOpen: false,
    } as any)
    
    rerender(<CategorySelectionModal />)
    
    // Then render with modal open
    mockUseModalStore.mockReturnValue({
      ...defaultModalState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: ['Test'],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)
    
    rerender(<CategorySelectionModal />)
    
    // Should not show any selected category initially
    expect(screen.queryByText('Ausgewählte Kategorie:')).not.toBeInTheDocument()
  })

  it('should disable buttons when processing', async () => {
    const user = userEvent.setup()
    
    // Mock a slow onCategorySelected function
    const slowOnCategorySelected = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    )
    
    mockUseModalStore.mockReturnValue({
      ...defaultModalState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: ['Mietverträge'],
        onCategorySelected: slowOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    // Select a category
    await user.click(screen.getByText('Mietverträge'))
    
    // Click continue
    const continueButton = screen.getByText('Fortfahren')
    await user.click(continueButton)
    
    // Buttons should be disabled while processing
    expect(screen.getByText('Abbrechen')).toBeDisabled()
    expect(continueButton).toBeDisabled()
    
    // Wait for processing to complete
    await waitFor(() => {
      expect(slowOnCategorySelected).toHaveBeenCalledWith('Mietverträge')
    })
  })

  it('should show success toast for new categories', async () => {
    const user = userEvent.setup()
    
    mockUseModalStore.mockReturnValue({
      ...defaultModalState,
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: [],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
      },
    } as any)

    render(<CategorySelectionModal />)
    
    // Create new category
    await user.click(screen.getByText('Neu'))
    await user.type(screen.getByPlaceholderText('Kategoriename eingeben...'), 'Neue Kategorie')
    await user.click(screen.getByText('Erstellen & Fortfahren'))
    
    expect(mockToast).toHaveBeenCalledWith({
      title: "Kategorie erstellt",
      description: 'Die Kategorie "Neue Kategorie" wurde erfolgreich erstellt.'
    })
  })
})