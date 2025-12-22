import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileRenameModal } from '@/components/modals/file-rename-modal'
import { useToast } from '@/hooks/use-toast'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn()
}))

const mockToast = jest.fn()
const mockOnRename = jest.fn()
const mockOnClose = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
})

describe('FileRenameModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    fileName: 'test-document.pdf',
    onRename: mockOnRename
  }

  it('renders with correct initial values', () => {
    render(<FileRenameModal {...defaultProps} />)
    
    expect(screen.getByText('Datei umbenennen')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test-document')).toBeInTheDocument()
    expect(screen.getByText('.pdf')).toBeInTheDocument()
    expect(screen.getByText('Aktueller Name: test-document.pdf')).toBeInTheDocument()
  })

  it('handles successful rename', async () => {
    const user = userEvent.setup()
    mockOnRename.mockResolvedValue(undefined)
    
    render(<FileRenameModal {...defaultProps} />)
    
    const input = screen.getByDisplayValue('test-document')
    await user.clear(input)
    await user.type(input, 'renamed-document')
    
    const submitButton = screen.getByText('Umbenennen')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnRename).toHaveBeenCalledWith('renamed-document.pdf')
    })
    
    expect(mockToast).toHaveBeenCalledWith({
      description: 'Datei wurde erfolgreich zu "renamed-document.pdf" umbenannt.'
    })
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('validates empty filename', async () => {
    const user = userEvent.setup()
    
    render(<FileRenameModal {...defaultProps} />)
    
    const input = screen.getByDisplayValue('test-document')
    await user.clear(input)
    
    const submitButton = screen.getByText('Umbenennen')
    expect(submitButton).toBeDisabled() // Button should be disabled when input is empty
    
    expect(mockOnRename).not.toHaveBeenCalled()
  })

  it('validates invalid characters', async () => {
    const user = userEvent.setup()
    
    render(<FileRenameModal {...defaultProps} />)
    
    const input = screen.getByDisplayValue('test-document')
    await user.clear(input)
    await user.type(input, 'invalid<name>')
    
    const submitButton = screen.getByText('Umbenennen')
    await user.click(submitButton)
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Ungültiger Name',
      description: 'Der Dateiname darf keine der folgenden Zeichen enthalten: < > : " / \\ | ? *',
      variant: 'destructive'
    })
    expect(mockOnRename).not.toHaveBeenCalled()
  })

  it('handles rename error', async () => {
    const user = userEvent.setup()
    const error = new Error('Rename failed')
    mockOnRename.mockRejectedValue(error)
    
    render(<FileRenameModal {...defaultProps} />)
    
    const input = screen.getByDisplayValue('test-document')
    await user.clear(input)
    await user.type(input, 'new-name')
    
    const submitButton = screen.getByText('Umbenennen')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Fehler beim Umbenennen',
        description: 'Rename failed',
        variant: 'destructive'
      })
    })
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('closes modal without renaming if name unchanged', async () => {
    const user = userEvent.setup()
    
    render(<FileRenameModal {...defaultProps} />)
    
    const submitButton = screen.getByText('Umbenennen')
    await user.click(submitButton)
    
    expect(mockOnRename).not.toHaveBeenCalled()
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('handles files without extension', () => {
    render(<FileRenameModal {...defaultProps} fileName="README" />)
    
    expect(screen.getByDisplayValue('README')).toBeInTheDocument()
    // For files without extension, there should be no extension span
    expect(screen.queryByText(/^\..*$/)).not.toBeInTheDocument()
  })
})