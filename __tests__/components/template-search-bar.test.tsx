import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateSearchBar, highlightSearchTerms, extractSearchTerms } from '@/components/template-search-bar'

describe('TemplateSearchBar', () => {
  const mockOnChange = jest.fn()
  const mockOnSearchHighlight = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should render search input with placeholder', () => {
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
          placeholder="Search templates..."
        />
      )

      expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument()
      expect(screen.getByLabelText('Vorlagen suchen')).toBeInTheDocument()
    })

    it('should display current value', () => {
      render(
        <TemplateSearchBar
          value="test query"
          onChange={mockOnChange}
        />
      )

      expect(screen.getByDisplayValue('test query')).toBeInTheDocument()
    })

    it('should call onChange when user types', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
          debounceMs={100}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      // Wait for debounce
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('test')
      }, { timeout: 200 })
    })

    it('should show clear button when there is a value', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      expect(screen.getByRole('button', { name: /suche löschen/i })).toBeInTheDocument()
    })

    it('should clear input when clear button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateSearchBar
          value="test"
          onChange={mockOnChange}
        />
      )

      const clearButton = screen.getByRole('button', { name: /suche löschen/i })
      await user.click(clearButton)

      expect(mockOnChange).toHaveBeenCalledWith('')
    })
  })

  describe('Keyboard Navigation', () => {
    it('should clear input on Escape key', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateSearchBar
          value="test"
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.keyboard('{Escape}')

      expect(mockOnChange).toHaveBeenCalledWith('')
    })

    it('should trigger immediate search on Enter key', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
          onSearchHighlight={mockOnSearchHighlight}
          debounceMs={1000} // Long debounce to test immediate trigger
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      await user.keyboard('{Enter}')

      // Should trigger immediately, not wait for debounce
      expect(mockOnChange).toHaveBeenCalledWith('test')
      expect(mockOnSearchHighlight).toHaveBeenCalledWith('test')
    })

    it('should not clear on Escape if input is empty', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.keyboard('{Escape}')

      expect(mockOnChange).not.toHaveBeenCalled()
    })
  })

  describe('Debouncing', () => {
    it('should debounce onChange calls', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
          debounceMs={200}
        />
      )

      const input = screen.getByRole('textbox')
      
      // Type quickly
      await user.type(input, 'test', { delay: 50 })

      // Should not have called onChange yet
      expect(mockOnChange).not.toHaveBeenCalled()

      // Wait for debounce
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('test')
      }, { timeout: 300 })

      // Should only be called once after debounce
      expect(mockOnChange).toHaveBeenCalledTimes(1)
    })

    it('should show loading indicator while debouncing', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
          debounceMs={200}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'test', { delay: 50 })

      // Should show loading indicator
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()

      // Wait for debounce to complete
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('test')
      }, { timeout: 300 })

      // Loading indicator should be gone
      expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument()
    })
  })

  describe('Input Sanitization', () => {
    it('should sanitize dangerous characters', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
          debounceMs={100}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, '<script>alert("xss")</script>')

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('scriptalert("xss")/script')
      }, { timeout: 200 })
    })

    it('should limit input length', async () => {
      const user = userEvent.setup()
      const longString = 'a'.repeat(150) // Longer than 100 character limit
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
          debounceMs={100}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, longString)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('a'.repeat(100))
      }, { timeout: 200 })
    })

    it('should show validation error for invalid characters', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
          debounceMs={100}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, '<script>')

      // Should show validation error styling
      expect(input).toHaveClass('border-destructive')
      
      // Should announce error for screen readers
      expect(screen.getByRole('alert')).toHaveTextContent(/ungültige suchzeichen/i)
    })
  })

  describe('Search Highlighting', () => {
    it('should call onSearchHighlight when provided', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
          onSearchHighlight={mockOnSearchHighlight}
          debounceMs={100}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      await waitFor(() => {
        expect(mockOnSearchHighlight).toHaveBeenCalledWith('test')
      }, { timeout: 200 })
    })

    it('should not call onSearchHighlight for empty queries', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateSearchBar
          value="test"
          onChange={mockOnChange}
          onSearchHighlight={mockOnSearchHighlight}
        />
      )

      const clearButton = screen.getByRole('button', { name: /suche löschen/i })
      await user.click(clearButton)

      expect(mockOnSearchHighlight).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-label', 'Vorlagen suchen')
      expect(input).toHaveAttribute('aria-describedby', 'search-help')
    })

    it('should provide help text for screen readers', () => {
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText(/geben sie suchbegriffe ein/i)).toBeInTheDocument()
    })

    it('should have proper autocomplete attributes', () => {
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('autoComplete', 'off')
      expect(input).toHaveAttribute('spellCheck', 'false')
    })

    it('should focus input after clearing', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplateSearchBar
          value="test"
          onChange={mockOnChange}
        />
      )

      const clearButton = screen.getByRole('button', { name: /suche löschen/i })
      await user.click(clearButton)

      const input = screen.getByRole('textbox')
      expect(input).toHaveFocus()
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
          className="custom-class"
        />
      )

      expect(document.querySelector('.custom-class')).toBeInTheDocument()
    })
  })

  describe('External Value Changes', () => {
    it('should sync with external value changes', () => {
      const { rerender } = render(
        <TemplateSearchBar
          value="initial"
          onChange={mockOnChange}
        />
      )

      expect(screen.getByDisplayValue('initial')).toBeInTheDocument()

      rerender(
        <TemplateSearchBar
          value="updated"
          onChange={mockOnChange}
        />
      )

      expect(screen.getByDisplayValue('updated')).toBeInTheDocument()
    })
  })
})

describe('Search Utility Functions', () => {
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

    it('should return original text for empty query', () => {
      const text = 'This is a test template'
      const query = ''
      const result = highlightSearchTerms(text, query)

      expect(result).toBe(text)
    })

    it('should escape special regex characters', () => {
      const text = 'Price: $100 (special)'
      const query = '$100'
      const result = highlightSearchTerms(text, query)

      expect(result).toContain('<mark')
      expect(result).toContain('$100')
    })
  })

  describe('extractSearchTerms', () => {
    it('should extract individual terms', () => {
      const query = 'test template search'
      const terms = extractSearchTerms(query)

      expect(terms).toEqual(['test', 'template', 'search'])
    })

    it('should handle extra whitespace', () => {
      const query = '  test   template  search  '
      const terms = extractSearchTerms(query)

      expect(terms).toEqual(['test', 'template', 'search'])
    })

    it('should convert to lowercase', () => {
      const query = 'Test TEMPLATE Search'
      const terms = extractSearchTerms(query)

      expect(terms).toEqual(['test', 'template', 'search'])
    })

    it('should limit to 10 terms', () => {
      const query = 'one two three four five six seven eight nine ten eleven twelve'
      const terms = extractSearchTerms(query)

      expect(terms).toHaveLength(10)
      expect(terms).toEqual(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'])
    })

    it('should return empty array for empty query', () => {
      const query = ''
      const terms = extractSearchTerms(query)

      expect(terms).toEqual([])
    })
  })
})