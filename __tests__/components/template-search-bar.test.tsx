import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateSearchBar, highlightSearchTerms, extractSearchTerms } from '@/components/template-search-bar'

// Mock the debounce hook to return the value immediately
jest.mock('@/hooks/use-debounce', () => ({
  useDebounce: jest.fn((value) => value)
}))

describe('TemplateSearchBar', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render search input with default placeholder', () => {
      render(<TemplateSearchBar {...defaultProps} />)
      
      expect(screen.getByPlaceholderText('Vorlagen durchsuchen...')).toBeInTheDocument()
      expect(screen.getByLabelText('Vorlagen suchen')).toBeInTheDocument()
    })

    it('should render with custom placeholder', () => {
      render(<TemplateSearchBar {...defaultProps} placeholder="Custom placeholder" />)
      
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
    })

    it('should render search icon', () => {
      render(<TemplateSearchBar {...defaultProps} />)
      
      const searchIcon = screen.getByRole('textbox').parentElement?.querySelector('svg')
      expect(searchIcon).toBeInTheDocument()
    })

    it('should not show clear button when input is empty', () => {
      render(<TemplateSearchBar {...defaultProps} />)
      
      expect(screen.queryByLabelText('Suche löschen')).not.toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should update local value when user types', async () => {
      const user = userEvent.setup()
      render(<TemplateSearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      
      expect(input).toHaveValue('test')
    })

    it('should call onChange when user types', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      render(<TemplateSearchBar {...defaultProps} onChange={mockOnChange} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      
      // Should be called with sanitized value
      expect(mockOnChange).toHaveBeenCalledWith('test')
    })

    it('should show clear button when input has value', async () => {
      const user = userEvent.setup()
      render(<TemplateSearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      
      await waitFor(() => {
        expect(screen.getByLabelText('Suche löschen')).toBeInTheDocument()
      })
    })

    it('should clear input when clear button is clicked', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      render(<TemplateSearchBar {...defaultProps} onChange={mockOnChange} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      
      await waitFor(() => {
        expect(screen.getByLabelText('Suche löschen')).toBeInTheDocument()
      })
      
      const clearButton = screen.getByLabelText('Suche löschen')
      await user.click(clearButton)
      
      expect(input).toHaveValue('')
      expect(mockOnChange).toHaveBeenCalledWith('')
    })
  })

  describe('Keyboard Navigation', () => {
    it('should clear input when Escape is pressed', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      render(<TemplateSearchBar {...defaultProps} onChange={mockOnChange} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      mockOnChange.mockClear() // Clear previous calls
      
      await user.keyboard('{Escape}')
      
      expect(input).toHaveValue('')
      expect(mockOnChange).toHaveBeenCalledWith('')
    })

    it('should trigger immediate search when Enter is pressed', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      const mockOnSearchHighlight = jest.fn()
      
      render(
        <TemplateSearchBar 
          {...defaultProps} 
          onChange={mockOnChange}
          onSearchHighlight={mockOnSearchHighlight}
        />
      )
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      mockOnChange.mockClear() // Clear previous calls
      
      await user.keyboard('{Enter}')
      
      expect(mockOnChange).toHaveBeenCalledWith('test')
      expect(mockOnSearchHighlight).toHaveBeenCalledWith('test')
    })

    it('should not clear input on Escape if input is empty', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      render(<TemplateSearchBar {...defaultProps} onChange={mockOnChange} />)
      
      const input = screen.getByRole('textbox')
      await user.keyboard('{Escape}')
      
      expect(mockOnChange).not.toHaveBeenCalled()
    })
  })

  describe('Input Validation and Sanitization', () => {
    it('should sanitize dangerous characters', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      render(<TemplateSearchBar {...defaultProps} onChange={mockOnChange} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test<script>')
      
      // Check that dangerous characters are removed
      expect(mockOnChange).toHaveBeenCalledWith('testscript')
    })

    it('should remove object notation characters', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      render(<TemplateSearchBar {...defaultProps} onChange={mockOnChange} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test{object}')
      
      expect(mockOnChange).toHaveBeenCalledWith('testobject')
    })

    it('should trim whitespace', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      render(<TemplateSearchBar {...defaultProps} onChange={mockOnChange} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, '  test  ')
      
      expect(mockOnChange).toHaveBeenCalledWith('test')
    })
  })

  describe('External Value Changes', () => {
    it('should update local value when prop value changes', () => {
      const { rerender } = render(<TemplateSearchBar {...defaultProps} value="" />)
      
      rerender(<TemplateSearchBar {...defaultProps} value="external update" />)
      
      expect(screen.getByRole('textbox')).toHaveValue('external update')
    })

    it('should show clear button when prop value is provided', () => {
      render(<TemplateSearchBar {...defaultProps} value="test" />)
      
      expect(screen.getByLabelText('Suche löschen')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TemplateSearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-label', 'Vorlagen suchen')
      expect(input).toHaveAttribute('aria-describedby', 'search-help')
    })

    it('should have screen reader help text', () => {
      render(<TemplateSearchBar {...defaultProps} />)
      
      expect(screen.getByText(/Geben Sie Suchbegriffe ein/)).toBeInTheDocument()
    })

    it('should have proper tabIndex for clear button', async () => {
      const user = userEvent.setup()
      render(<TemplateSearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      
      await waitFor(() => {
        const clearButton = screen.getByLabelText('Suche löschen')
        expect(clearButton).toHaveAttribute('tabIndex', '0')
      })
    })
  })

  describe('Search Highlighting Callback', () => {
    it('should call onSearchHighlight when search term changes', async () => {
      const user = userEvent.setup()
      const mockOnSearchHighlight = jest.fn()
      render(
        <TemplateSearchBar 
          {...defaultProps} 
          onSearchHighlight={mockOnSearchHighlight}
        />
      )
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      
      expect(mockOnSearchHighlight).toHaveBeenCalledWith('test')
    })

    it('should not call onSearchHighlight for empty search', async () => {
      const user = userEvent.setup()
      const mockOnSearchHighlight = jest.fn()
      render(
        <TemplateSearchBar 
          {...defaultProps} 
          onSearchHighlight={mockOnSearchHighlight}
        />
      )
      
      const input = screen.getByRole('textbox')
      await user.type(input, '   ')
      
      expect(mockOnSearchHighlight).not.toHaveBeenCalled()
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(<TemplateSearchBar {...defaultProps} className="custom-class" />)
      
      const container = screen.getByRole('textbox').closest('.custom-class')
      expect(container).toBeInTheDocument()
    })
  })
})

describe('Utility Functions', () => {
  describe('highlightSearchTerms', () => {
    it('should highlight matching terms', () => {
      const text = 'This is a test template'
      const query = 'test'
      const result = highlightSearchTerms(text, query)
      
      expect(result).toContain('<mark')
      expect(result).toContain('test')
    })

    it('should handle case insensitive matching', () => {
      const text = 'This is a TEST template'
      const query = 'test'
      const result = highlightSearchTerms(text, query)
      
      expect(result).toContain('<mark')
      expect(result).toContain('TEST')
    })

    it('should escape regex special characters', () => {
      const text = 'Price: $100 (special)'
      const query = '$100'
      const result = highlightSearchTerms(text, query)
      
      expect(result).toContain('<mark')
      expect(result).toContain('$100')
    })

    it('should return original text for empty query', () => {
      const text = 'This is a test'
      const result = highlightSearchTerms(text, '')
      
      expect(result).toBe(text)
    })

    it('should return original text for empty text', () => {
      const result = highlightSearchTerms('', 'test')
      
      expect(result).toBe('')
    })
  })

  describe('extractSearchTerms', () => {
    it('should extract individual terms', () => {
      const query = 'test search terms'
      const result = extractSearchTerms(query)
      
      expect(result).toEqual(['test', 'search', 'terms'])
    })

    it('should handle extra whitespace', () => {
      const query = '  test   search   terms  '
      const result = extractSearchTerms(query)
      
      expect(result).toEqual(['test', 'search', 'terms'])
    })

    it('should convert to lowercase', () => {
      const query = 'Test SEARCH Terms'
      const result = extractSearchTerms(query)
      
      expect(result).toEqual(['test', 'search', 'terms'])
    })

    it('should limit to 10 terms', () => {
      const query = 'one two three four five six seven eight nine ten eleven twelve'
      const result = extractSearchTerms(query)
      
      expect(result).toHaveLength(10)
      expect(result).toEqual(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'])
    })

    it('should return empty array for empty query', () => {
      const result = extractSearchTerms('')
      
      expect(result).toEqual([])
    })

    it('should filter out empty terms', () => {
      const query = 'test  search'
      const result = extractSearchTerms(query)
      
      expect(result).toEqual(['test', 'search'])
    })
  })
})