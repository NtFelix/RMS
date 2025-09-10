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

describe('CategorySelectionModal User Interactions', () => {
  const mockToast = jest.fn()
  const mockCloseCategorySelectionModal = jest.fn()
  const mockLoadUserCategories = jest.fn()
  const mockClearCategoryCache = jest.fn()
  const mockOnCategorySelected = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: jest.fn(),
      toasts: []
    })

    mockUseModalStore.mockReturnValue({
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: ['Mietverträge', 'Kündigungen', 'Sonstiges'],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
        isLoading: false,
        error: undefined
      },
      closeCategorySelectionModal: mockCloseCategorySelectionModal,
      loadUserCategories: mockLoadUserCategories,
      clearCategoryCache: mockClearCategoryCache,
      // Add other required properties with default values
      categoryCache: new Map(),
      categoryLoadingState: new Map(),
      openCategorySelectionModal: jest.fn(),
    } as any)
  })

  it('should render modal with existing categories', () => {
    render(<CategorySelectionModal />)

    expect(screen.getByText('Kategorie auswählen')).toBeInTheDocument()
    expect(screen.getByText('Bestehende Kategorien (3)')).toBeInTheDocument()
    expect(screen.getByText('Mietverträge')).toBeInTheDocument()
    expect(screen.getByText('Kündigungen')).toBeInTheDocument()
    expect(screen.getByText('Sonstiges')).toBeInTheDocument()
  })

  it('should allow selecting an existing category', async () => {
    const user = userEvent.setup()
    render(<CategorySelectionModal />)

    // Click on a category
    await user.click(screen.getByText('Mietverträge'))

    // Verify category is selected (should have different styling)
    const selectedBadge = screen.getByText('Mietverträge')
    expect(selectedBadge).toHaveClass('bg-primary')

    // Verify selection summary appears
    expect(screen.getByText('Ausgewählte Kategorie:')).toBeInTheDocument()
    expect(screen.getByText('Mietverträge')).toBeInTheDocument()

    // Click continue button
    await user.click(screen.getByText('Fortfahren'))

    expect(mockOnCategorySelected).toHaveBeenCalledWith('Mietverträge')
  })

  it('should allow creating a new category', async () => {
    const user = userEvent.setup()
    render(<CategorySelectionModal />)

    // Click "Neu" button to create new category
    await user.click(screen.getByText('Neu'))

    // Input field should appear
    const input = screen.getByPlaceholderText('Kategoriename eingeben...')
    expect(input).toBeInTheDocument()

    // Type new category name
    await user.type(input, 'Neue Kategorie')

    // Verify selection summary shows new category
    expect(screen.getByText('Ausgewählte Kategorie:')).toBeInTheDocument()
    expect(screen.getByText('Neue Kategorie')).toBeInTheDocument()
    expect(screen.getByText('Neu')).toBeInTheDocument() // Badge indicating it's new

    // Click create button
    await user.click(screen.getByText('Erstellen & Fortfahren'))

    expect(mockOnCategorySelected).toHaveBeenCalledWith('Neue Kategorie')
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Kategorie erstellt',
      description: 'Die Kategorie "Neue Kategorie" wurde erfolgreich erstellt.'
    })
    expect(mockClearCategoryCache).toHaveBeenCalled()
  })

  it('should validate new category names', async () => {
    const user = userEvent.setup()
    render(<CategorySelectionModal />)

    // Click "Neu" button
    await user.click(screen.getByText('Neu'))

    const input = screen.getByPlaceholderText('Kategoriename eingeben...')

    // Test empty name
    await user.click(screen.getByText('Erstellen & Fortfahren'))
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Ungültiger Kategoriename',
      description: 'Bitte geben Sie einen Kategorienamen ein.',
      variant: 'destructive'
    })

    // Test too short name
    await user.clear(input)
    await user.type(input, 'A')
    await user.click(screen.getByText('Erstellen & Fortfahren'))
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Ungültiger Kategoriename',
      description: 'Der Kategoriename muss mindestens 2 Zeichen lang sein.',
      variant: 'destructive'
    })

    // Test duplicate name
    await user.clear(input)
    await user.type(input, 'Mietverträge') // Existing category
    await user.click(screen.getByText('Erstellen & Fortfahren'))
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Ungültiger Kategoriename',
      description: 'Diese Kategorie existiert bereits.',
      variant: 'destructive'
    })

    // Test invalid characters
    await user.clear(input)
    await user.type(input, 'Invalid@Category!')
    await user.click(screen.getByText('Erstellen & Fortfahren'))
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Ungültiger Kategoriename',
      description: 'Der Kategoriename darf nur Buchstaben, Zahlen, Leerzeichen, Bindestriche und Unterstriche enthalten.',
      variant: 'destructive'
    })
  })

  it('should handle loading state', () => {
    mockUseModalStore.mockReturnValue({
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: [],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
        isLoading: true,
        error: undefined
      },
      closeCategorySelectionModal: mockCloseCategorySelectionModal,
      loadUserCategories: mockLoadUserCategories,
      clearCategoryCache: mockClearCategoryCache,
      categoryCache: new Map(),
      categoryLoadingState: new Map(),
      openCategorySelectionModal: jest.fn(),
    } as any)

    render(<CategorySelectionModal />)

    expect(screen.getByText('Kategorien werden geladen...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fortfahren/i })).toBeDisabled()
  })

  it('should handle error state with retry option', async () => {
    const user = userEvent.setup()
    
    mockUseModalStore.mockReturnValue({
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: [],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
        isLoading: false,
        error: 'Network connection failed'
      },
      closeCategorySelectionModal: mockCloseCategorySelectionModal,
      loadUserCategories: mockLoadUserCategories,
      clearCategoryCache: mockClearCategoryCache,
      categoryCache: new Map(),
      categoryLoadingState: new Map(),
      openCategorySelectionModal: jest.fn(),
    } as any)

    render(<CategorySelectionModal />)

    expect(screen.getByText('Fehler beim Laden der Kategorien')).toBeInTheDocument()
    expect(screen.getByText('Network connection failed')).toBeInTheDocument()

    // Click retry button
    await user.click(screen.getByText('Erneut versuchen'))

    expect(mockClearCategoryCache).toHaveBeenCalled()
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Kategorien aktualisiert',
      description: 'Die Kategorien wurden erfolgreich neu geladen.'
    })
  })

  it('should show empty state when no categories exist', () => {
    mockUseModalStore.mockReturnValue({
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: [],
        onCategorySelected: mockOnCategorySelected,
        onCancel: mockOnCancel,
        isLoading: false,
        error: undefined
      },
      closeCategorySelectionModal: mockCloseCategorySelectionModal,
      loadUserCategories: mockLoadUserCategories,
      clearCategoryCache: mockClearCategoryCache,
      categoryCache: new Map(),
      categoryLoadingState: new Map(),
      openCategorySelectionModal: jest.fn(),
    } as any)

    render(<CategorySelectionModal />)

    expect(screen.getByText('Noch keine Kategorien vorhanden')).toBeInTheDocument()
    expect(screen.getByText('Erstellen Sie Ihre erste Kategorie unten')).toBeInTheDocument()
  })

  it('should handle cancel action', async () => {
    const user = userEvent.setup()
    render(<CategorySelectionModal />)

    await user.click(screen.getByText('Abbrechen'))

    expect(mockOnCancel).toHaveBeenCalled()
    expect(mockCloseCategorySelectionModal).toHaveBeenCalled()
  })

  it('should prevent action when no category is selected', async () => {
    const user = userEvent.setup()
    render(<CategorySelectionModal />)

    // Try to continue without selecting anything
    await user.click(screen.getByText('Fortfahren'))

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Keine Kategorie ausgewählt',
      description: 'Bitte wählen Sie eine Kategorie aus oder erstellen Sie eine neue.',
      variant: 'destructive'
    })
    expect(mockOnCategorySelected).not.toHaveBeenCalled()
  })

  it('should toggle between existing and new category modes', async () => {
    const user = userEvent.setup()
    render(<CategorySelectionModal />)

    // Select existing category first
    await user.click(screen.getByText('Mietverträge'))
    expect(screen.getByText('Fortfahren')).toBeInTheDocument()

    // Switch to new category mode
    await user.click(screen.getByText('Neu'))
    expect(screen.getByPlaceholderText('Kategoriename eingeben...')).toBeInTheDocument()
    expect(screen.getByText('Erstellen & Fortfahren')).toBeInTheDocument()

    // Cancel new category mode
    await user.click(screen.getByText('Abbrechen')) // The "Abbrechen" next to "Neu"
    expect(screen.queryByPlaceholderText('Kategoriename eingeben...')).not.toBeInTheDocument()
    expect(screen.getByText('Fortfahren')).toBeInTheDocument()
  })

  it('should handle processing state during category creation', async () => {
    const user = userEvent.setup()
    
    // Mock a slow onCategorySelected function
    mockOnCategorySelected.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    )

    render(<CategorySelectionModal />)

    // Create new category
    await user.click(screen.getByText('Neu'))
    await user.type(screen.getByPlaceholderText('Kategoriename eingeben...'), 'Test Category')
    
    // Click create button
    const createButton = screen.getByText('Erstellen & Fortfahren')
    await user.click(createButton)

    // Button should be disabled and show loading state
    expect(createButton).toBeDisabled()
    expect(screen.getByRole('button', { name: /abbrechen/i })).toBeDisabled()
  })

  it('should handle category refresh functionality', async () => {
    const user = userEvent.setup()
    render(<CategorySelectionModal />)

    // Find and click the refresh button (small loader icon)
    const refreshButton = screen.getByRole('button', { name: '' }) // Button with just icon
    await user.click(refreshButton)

    expect(mockClearCategoryCache).toHaveBeenCalled()
  })
})