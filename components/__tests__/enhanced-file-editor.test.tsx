import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EnhancedFileEditor } from '../enhanced-file-editor'
import { placeholderEngine } from '@/lib/template-system/placeholder-engine'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

// Mock fetch for file operations
global.fetch = jest.fn()

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
})

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url')
global.URL.revokeObjectURL = jest.fn()

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock window.confirm
global.confirm = jest.fn(() => true)

describe('EnhancedFileEditor', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    fileName: 'test.md',
    initialContent: 'Initial content',
    isNewFile: false,
    onSave: jest.fn(),
    enableAutocomplete: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: 'File content from server' })
    })
  })

  describe('Basic Editor Functionality', () => {
    it('renders the editor with initial content', () => {
      render(<EnhancedFileEditor {...defaultProps} />)
      
      expect(screen.getByDisplayValue('Initial content')).toBeInTheDocument()
      expect(screen.getByText('test.md')).toBeInTheDocument()
    })

    it('shows template editor badge when autocomplete is enabled', () => {
      render(<EnhancedFileEditor {...defaultProps} enableAutocomplete={true} />)
      
      expect(screen.getByText('Template Editor')).toBeInTheDocument()
    })

    it('handles content changes and marks as dirty', async () => {
      const user = userEvent.setup()
      render(<EnhancedFileEditor {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'New content')
      
      expect(screen.getByDisplayValue('New content')).toBeInTheDocument()
      expect(screen.getByText('•')).toBeInTheDocument() // Dirty indicator
    })

    it('saves content when save button is clicked', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()
      
      render(<EnhancedFileEditor {...defaultProps} onSave={onSave} />)
      
      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'Modified content')
      
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)
      
      expect(onSave).toHaveBeenCalledWith('Modified content')
    })

    it('handles keyboard shortcuts', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()
      
      render(<EnhancedFileEditor {...defaultProps} onSave={onSave} />)
      
      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'Content to save')
      
      // Test Ctrl+S for save
      await user.keyboard('{Control>}s{/Control}')
      
      expect(onSave).toHaveBeenCalledWith('Content to save')
    })
  })

  describe('Autocomplete Functionality', () => {
    const autocompleteProps = {
      ...defaultProps,
      enableAutocomplete: true,
      initialContent: ''
    }

    it('shows autocomplete suggestions when typing @', async () => {
      const user = userEvent.setup()
      render(<EnhancedFileEditor {...autocompleteProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@dat')
      
      await waitFor(() => {
        expect(screen.getByText('Platzhalter-Vorschläge')).toBeInTheDocument()
        expect(screen.getByText('@datum')).toBeInTheDocument()
      })
    })

    it('filters suggestions based on query', async () => {
      const user = userEvent.setup()
      render(<EnhancedFileEditor {...autocompleteProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@mieter')
      
      await waitFor(() => {
        expect(screen.getByText('@mieter.name')).toBeInTheDocument()
        expect(screen.getByText('@mieter.email')).toBeInTheDocument()
      })
    })

    it('inserts suggestion when clicked', async () => {
      const user = userEvent.setup()
      render(<EnhancedFileEditor {...autocompleteProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@dat')
      
      await waitFor(() => {
        expect(screen.getByText('@datum')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('@datum'))
      
      expect(textarea).toHaveValue('@datum')
    })

    it('navigates suggestions with arrow keys', async () => {
      const user = userEvent.setup()
      render(<EnhancedFileEditor {...autocompleteProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@')
      
      await waitFor(() => {
        expect(screen.getByText('Platzhalter-Vorschläge')).toBeInTheDocument()
      })
      
      // Test arrow key navigation
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowUp}')
      
      // The selected suggestion should be highlighted
      const suggestions = screen.getAllByRole('generic').filter(el => 
        el.className.includes('bg-blue-100') || el.className.includes('bg-blue-900')
      )
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('inserts suggestion with Enter key', async () => {
      const user = userEvent.setup()
      render(<EnhancedFileEditor {...autocompleteProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@dat')
      
      await waitFor(() => {
        expect(screen.getByText('@datum')).toBeInTheDocument()
      })
      
      await user.keyboard('{Enter}')
      
      expect(textarea).toHaveValue('@datum')
    })

    it('closes autocomplete with Escape key', async () => {
      const user = userEvent.setup()
      render(<EnhancedFileEditor {...autocompleteProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@dat')
      
      await waitFor(() => {
        expect(screen.getByText('Platzhalter-Vorschläge')).toBeInTheDocument()
      })
      
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(screen.queryByText('Platzhalter-Vorschläge')).not.toBeInTheDocument()
      })
    })

    it('hides autocomplete when typing space after @', async () => {
      const user = userEvent.setup()
      render(<EnhancedFileEditor {...autocompleteProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@dat ')
      
      await waitFor(() => {
        expect(screen.queryByText('Platzhalter-Vorschläge')).not.toBeInTheDocument()
      })
    })
  })

  describe('Placeholder Validation', () => {
    const validationProps = {
      ...defaultProps,
      enableAutocomplete: true,
      initialContent: ''
    }

    it('shows validation errors for invalid placeholders', async () => {
      const user = userEvent.setup()
      render(<EnhancedFileEditor {...validationProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@invalid.placeholder')
      
      await waitFor(() => {
        expect(screen.getByText(/Unbekannter Platzhalter/)).toBeInTheDocument()
      })
    })

    it('shows validation success when all placeholders are valid', async () => {
      const user = userEvent.setup()
      render(<EnhancedFileEditor {...validationProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@datum and @mieter.name')
      
      await waitFor(() => {
        expect(screen.getByText('Platzhalter validiert')).toBeInTheDocument()
      })
    })

    it('validates placeholder syntax', async () => {
      const user = userEvent.setup()
      render(<EnhancedFileEditor {...validationProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@123invalid')
      
      await waitFor(() => {
        expect(screen.getByText(/Ungültige Platzhalter-Syntax/)).toBeInTheDocument()
      })
    })
  })

  describe('File Operations', () => {
    it('loads file content for existing files', async () => {
      render(<EnhancedFileEditor {...defaultProps} filePath="/test/path" />)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/dateien/read-file'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('test/path')
          })
        )
      })
    })

    it('saves file content to server', async () => {
      const user = userEvent.setup()
      render(<EnhancedFileEditor {...defaultProps} filePath="/test/path" />)
      
      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'New content')
      
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/dateien/update-file'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('New content')
          })
        )
      })
    })

    it('handles file loading errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
      
      render(<EnhancedFileEditor {...defaultProps} filePath="/test/path" />)
      
      // Wait for the error to be handled
      await waitFor(() => {
        expect(screen.getByDisplayValue('Initial content')).toBeInTheDocument()
      })
    })

    it('reloads file content when reload button is clicked', async () => {
      const user = userEvent.setup()
      render(<EnhancedFileEditor {...defaultProps} filePath="/test/path" />)
      
      // Wait for initial load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })
      
      const reloadButton = screen.getByRole('button', { name: /neu laden/i })
      await user.click(reloadButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2) // Initial load + reload
      })
    })
  })

  describe('Preview Functionality', () => {
    it('switches between edit and preview tabs', async () => {
      const user = userEvent.setup()
      render(<EnhancedFileEditor {...defaultProps} initialContent="# Test Header" />)
      
      const previewTab = screen.getByRole('tab', { name: /vorschau/i })
      await user.click(previewTab)
      
      expect(screen.getByText('Test Header')).toBeInTheDocument()
    })

    it('renders markdown content in preview', async () => {
      const user = userEvent.setup()
      const markdownContent = '# Header\n\n**Bold text** and *italic text*'
      
      render(<EnhancedFileEditor {...defaultProps} initialContent={markdownContent} />)
      
      const previewTab = screen.getByRole('tab', { name: /vorschau/i })
      await user.click(previewTab)
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Header')
    })
  })

  describe('Utility Functions', () => {
    it('downloads file content', async () => {
      const user = userEvent.setup()
      
      // Mock document.createElement and appendChild
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn()
      }
      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
      jest.spyOn(document.body, 'appendChild').mockImplementation()
      jest.spyOn(document.body, 'removeChild').mockImplementation()
      
      render(<EnhancedFileEditor {...defaultProps} />)
      
      const downloadButton = screen.getByRole('button', { name: /download/i })
      await user.click(downloadButton)
      
      expect(mockAnchor.click).toHaveBeenCalled()
      expect(mockAnchor.download).toBe('test.md')
    })

    it('copies content to clipboard', async () => {
      const user = userEvent.setup()
      render(<EnhancedFileEditor {...defaultProps} />)
      
      const copyButton = screen.getByRole('button', { name: /kopieren/i })
      await user.click(copyButton)
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Initial content')
    })
  })

  describe('Modal Behavior', () => {
    it('shows confirmation dialog when closing with unsaved changes', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      // Mock window.confirm to return false (cancel close)
      global.confirm = jest.fn(() => false)
      
      render(<EnhancedFileEditor {...defaultProps} onClose={onClose} />)
      
      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'Modified content')
      
      // Try to close the modal
      fireEvent.keyDown(textarea, { key: 'w', ctrlKey: true })
      
      expect(global.confirm).toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })

    it('closes without confirmation when no changes', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<EnhancedFileEditor {...defaultProps} onClose={onClose} />)
      
      const textarea = screen.getByRole('textbox')
      
      // Try to close the modal
      fireEvent.keyDown(textarea, { key: 'w', ctrlKey: true })
      
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Custom Placeholder Definitions', () => {
    const customPlaceholders = [
      {
        key: '@custom.placeholder',
        label: 'Custom Placeholder',
        description: 'A custom placeholder for testing',
        category: 'datum' as const
      }
    ]

    it('uses custom placeholder definitions when provided', async () => {
      const user = userEvent.setup()
      render(
        <EnhancedFileEditor 
          {...defaultProps} 
          enableAutocomplete={true}
          placeholderDefinitions={customPlaceholders}
        />
      )
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@custom')
      
      await waitFor(() => {
        expect(screen.getByText('@custom.placeholder')).toBeInTheDocument()
        expect(screen.getByText('Custom Placeholder')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles save errors gracefully', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Save failed'))
      
      render(<EnhancedFileEditor {...defaultProps} filePath="/test/path" />)
      
      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'Content to save')
      
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)
      
      // Should handle the error without crashing
      await waitFor(() => {
        expect(screen.getByDisplayValue('Content to save')).toBeInTheDocument()
      })
    })

    it('handles clipboard copy errors gracefully', async () => {
      const user = userEvent.setup()
      const mockWriteText = jest.fn().mockRejectedValueOnce(new Error('Copy failed'))
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText
        }
      })
      
      render(<EnhancedFileEditor {...defaultProps} />)
      
      const copyButton = screen.getByRole('button', { name: /kopieren/i })
      await user.click(copyButton)
      
      // Should handle the error without crashing
      expect(screen.getByDisplayValue('Initial content')).toBeInTheDocument()
    })
  })
})