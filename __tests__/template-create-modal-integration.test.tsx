import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateCreateModal } from '@/components/template-create-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { useToast } from '@/hooks/use-toast'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Mock the toast hook
jest.mock('@/hooks/use-toast')
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>

// Mock the enhanced file editor
jest.mock('@/components/enhanced-file-editor', () => ({
  EnhancedFileEditor: ({ isOpen, onClose, onSave, initialContent }: any) => (
    <div data-testid="enhanced-file-editor" style={{ display: isOpen ? 'block' : 'none' }}>
      <textarea
        data-testid="editor-textarea"
        defaultValue={initialContent}
        onChange={(e) => {
          // Simulate editor content change
        }}
      />
      <button
        data-testid="editor-save"
        onClick={() => onSave('Test template content with @mieter.name placeholder')}
      >
        Save
      </button>
      <button data-testid="editor-close" onClick={onClose}>
        Close
      </button>
    </div>
  )
}))

// Mock fetch globally
global.fetch = jest.fn()

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

describe('TemplateCreateModal Integration Tests', () => {
  const mockToast = jest.fn()
  const mockCloseModal = jest.fn()
  const mockSetDirty = jest.fn()
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: jest.fn(),
      toasts: []
    })

    mockUseModalStore.mockReturnValue({
      isTemplateCreateModalOpen: true,
      templateCreateModalData: {
        currentPath: '/templates',
        onSuccess: mockOnSuccess
      },
      isTemplateCreateModalDirty: false,
      closeTemplateCreateModal: mockCloseModal,
      setTemplateCreateModalDirty: mockSetDirty,
      // Add other required modal store properties
      openTemplateCreateModal: jest.fn(),
    } as any)

    // Mock successful API responses by default
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isUnique: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: '123',
          titel: 'Test Template',
          inhalt: 'Test content',
          kategorie: 'mail',
          kontext_anforderungen: ['mieter']
        })
      })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should render template creation form when modal is open', () => {
    render(<TemplateCreateModal />)

    expect(screen.getByText('Neues Template erstellen')).toBeInTheDocument()
    expect(screen.getByLabelText(/Template-Name/)).toBeInTheDocument()
    expect(screen.getByText('Kategorie *')).toBeInTheDocument()
    expect(screen.getByText('Kontext-Anforderungen')).toBeInTheDocument()
    expect(screen.getByText('Template-Inhalt *')).toBeInTheDocument()
  })

  it('should not render when modal is closed', () => {
    mockUseModalStore.mockReturnValue({
      isTemplateCreateModalOpen: false,
      templateCreateModalData: undefined,
      isTemplateCreateModalDirty: false,
      closeTemplateCreateModal: mockCloseModal,
      setTemplateCreateModalDirty: mockSetDirty,
      openTemplateCreateModal: jest.fn(),
    } as any)

    render(<TemplateCreateModal />)

    expect(screen.queryByText('Neues Template erstellen')).not.toBeInTheDocument()
  })

  it('should validate required fields', async () => {
    const user = userEvent.setup()
    render(<TemplateCreateModal />)

    const submitButton = screen.getByRole('button', { name: /Template erstellen/ })
    
    // Try to submit without filling required fields
    await user.click(submitButton)

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Template-Name ist erforderlich')).toBeInTheDocument()
    })
  })

  it('should suggest context requirements based on category selection', async () => {
    const user = userEvent.setup()
    render(<TemplateCreateModal />)

    // Select "E-Mail" category
    const mailCategory = screen.getByText('E-Mail')
    await user.click(mailCategory)

    // Should automatically suggest mieter and vermieter contexts
    await waitFor(() => {
      expect(screen.getByText(/Automatisch vorgeschlagen basierend auf der Kategorie/)).toBeInTheDocument()
    })

    // Check that mieter checkbox is checked
    const mieterCheckbox = screen.getByRole('checkbox', { name: /Mieter/ })
    expect(mieterCheckbox).toBeChecked()
  })

  it('should open enhanced file editor when clicking editor button', async () => {
    const user = userEvent.setup()
    render(<TemplateCreateModal />)

    const editorButton = screen.getByRole('button', { name: /Editor öffnen/ })
    await user.click(editorButton)

    expect(screen.getByTestId('enhanced-file-editor')).toBeVisible()
  })

  it('should save content from enhanced file editor', async () => {
    const user = userEvent.setup()
    render(<TemplateCreateModal />)

    // Open editor
    const editorButton = screen.getByRole('button', { name: /Editor öffnen/ })
    await user.click(editorButton)

    // Save content in editor
    const saveButton = screen.getByTestId('editor-save')
    await user.click(saveButton)

    // Editor should close and content should be saved
    expect(screen.getByTestId('enhanced-file-editor')).not.toBeVisible()
    
    // Content preview should show the saved content
    expect(screen.getByText(/Test template content with @mieter.name placeholder/)).toBeInTheDocument()
  })

  it('should check template name uniqueness before submission', async () => {
    const user = userEvent.setup()
    render(<TemplateCreateModal />)

    // Fill in the form
    await user.type(screen.getByLabelText(/Template-Name/), 'Test Template')
    
    // Select category
    await user.click(screen.getByText('E-Mail'))
    
    // Add content via editor
    await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
    await user.click(screen.getByTestId('editor-save'))

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Template erstellen/ })
    await user.click(submitButton)

    // Should call the check-name API
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/vorlagen/check-name?titel=Test%20Template')
      )
    })
  })

  it('should show error when template name already exists', async () => {
    const user = userEvent.setup()
    
    // Mock API to return name not unique
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isUnique: false })
      })

    render(<TemplateCreateModal />)

    // Fill in the form
    await user.type(screen.getByLabelText(/Template-Name/), 'Existing Template')
    await user.click(screen.getByText('E-Mail'))
    await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
    await user.click(screen.getByTestId('editor-save'))

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Template erstellen/ })
    await user.click(submitButton)

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Ein Template mit diesem Namen existiert bereits')).toBeInTheDocument()
    })
  })

  it('should successfully create template and call success callback', async () => {
    const user = userEvent.setup()
    render(<TemplateCreateModal />)

    // Fill in the form
    await user.type(screen.getByLabelText(/Template-Name/), 'New Template')
    await user.click(screen.getByText('E-Mail'))
    await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
    await user.click(screen.getByTestId('editor-save'))

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Template erstellen/ })
    await user.click(submitButton)

    // Should call both APIs
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/vorlagen/check-name')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vorlagen',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('New Template')
        })
      )
    })

    // Should show success toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Template erstellt',
        description: 'Das Template "New Template" wurde erfolgreich erstellt.'
      })
    })

    // Should call success callback
    expect(mockOnSuccess).toHaveBeenCalledWith({
      id: '123',
      titel: 'Test Template',
      inhalt: 'Test content',
      kategorie: 'mail',
      kontext_anforderungen: ['mieter']
    })

    // Should close modal
    expect(mockCloseModal).toHaveBeenCalled()
  })

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock API to return error
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isUnique: true })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Database error' })
      })

    render(<TemplateCreateModal />)

    // Fill in the form
    await user.type(screen.getByLabelText(/Template-Name/), 'Test Template')
    await user.click(screen.getByText('E-Mail'))
    await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
    await user.click(screen.getByTestId('editor-save'))

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Template erstellen/ })
    await user.click(submitButton)

    // Should show error toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Fehler beim Erstellen',
        description: 'Database error',
        variant: 'destructive'
      })
    })

    // Should not close modal
    expect(mockCloseModal).not.toHaveBeenCalled()
  })

  it('should track dirty state when form changes', async () => {
    const user = userEvent.setup()
    render(<TemplateCreateModal />)

    // Initially should not be dirty
    expect(mockSetDirty).toHaveBeenCalledWith(false)

    // Type in template name
    await user.type(screen.getByLabelText(/Template-Name/), 'Test')

    // Should set dirty state
    await waitFor(() => {
      expect(mockSetDirty).toHaveBeenCalledWith(true)
    })
  })

  it('should reset form when modal opens', () => {
    // First render with modal closed
    mockUseModalStore.mockReturnValue({
      isTemplateCreateModalOpen: false,
      templateCreateModalData: undefined,
      isTemplateCreateModalDirty: false,
      closeTemplateCreateModal: mockCloseModal,
      setTemplateCreateModalDirty: mockSetDirty,
      openTemplateCreateModal: jest.fn(),
    } as any)

    const { rerender } = render(<TemplateCreateModal />)

    // Then open modal
    mockUseModalStore.mockReturnValue({
      isTemplateCreateModalOpen: true,
      templateCreateModalData: {
        currentPath: '/templates',
        onSuccess: mockOnSuccess
      },
      isTemplateCreateModalDirty: false,
      closeTemplateCreateModal: mockCloseModal,
      setTemplateCreateModalDirty: mockSetDirty,
      openTemplateCreateModal: jest.fn(),
    } as any)

    rerender(<TemplateCreateModal />)

    // Should reset dirty state
    expect(mockSetDirty).toHaveBeenCalledWith(false)
  })

  it('should display context requirement badges when selected', async () => {
    const user = userEvent.setup()
    render(<TemplateCreateModal />)

    // Select mieter context
    const mieterCheckbox = screen.getByRole('checkbox', { name: /Mieter/ })
    await user.click(mieterCheckbox)

    // Should show badge
    expect(screen.getByText('Mieter')).toBeInTheDocument()

    // Select wohnung context
    const wohnungCheckbox = screen.getByRole('checkbox', { name: /Wohnung/ })
    await user.click(wohnungCheckbox)

    // Should show both badges
    expect(screen.getAllByText('Mieter')).toHaveLength(2) // One in checkbox label, one in badge
    expect(screen.getAllByText('Wohnung')).toHaveLength(2) // One in checkbox label, one in badge
  })
})