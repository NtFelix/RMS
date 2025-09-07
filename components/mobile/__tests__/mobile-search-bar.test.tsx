import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MobileSearchBar } from '../mobile-search-bar'

// Mock the useIsMobile hook
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn()
}))

const mockUseIsMobile = require('@/hooks/use-mobile').useIsMobile

describe('MobileSearchBar', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    placeholder: 'Search...'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Desktop behavior', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(false)
    })

    it('should not render on desktop', () => {
      render(<MobileSearchBar {...defaultProps} />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('Mobile behavior', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true)
    })

    it('should render collapsed search icon initially', () => {
      render(<MobileSearchBar {...defaultProps} />)
      
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      expect(searchButton).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('should expand when search icon is clicked', async () => {
      const user = userEvent.setup()
      render(<MobileSearchBar {...defaultProps} />)
      
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /suchfeld/i })).toBeInTheDocument()
      })
    })

    it('should auto-focus input when expanded', async () => {
      const user = userEvent.setup()
      render(<MobileSearchBar {...defaultProps} />)
      
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      await waitFor(() => {
        const input = screen.getByRole('textbox', { name: /suchfeld/i })
        expect(input).toHaveFocus()
      })
    })

    it('should call onChange when typing in input', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()
      render(<MobileSearchBar {...defaultProps} onChange={onChange} />)
      
      // Expand search
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      // Type in input - userEvent.type simulates individual keystrokes
      const input = await screen.findByRole('textbox', { name: /suchfeld/i })
      await user.type(input, 'a')
      
      expect(onChange).toHaveBeenCalledWith('a')
      
      // Clear and type multiple characters to test cumulative behavior
      onChange.mockClear()
      await user.clear(input)
      await user.type(input, 'test')
      
      // Should be called for each character
      expect(onChange).toHaveBeenCalledTimes(4)
    })

    it('should show clear button when there is a value', async () => {
      const user = userEvent.setup()
      render(<MobileSearchBar {...defaultProps} value="test" />)
      
      // Expand search
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /suche löschen/i })).toBeInTheDocument()
      })
    })

    it('should clear value when clear button is clicked', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()
      render(<MobileSearchBar {...defaultProps} value="test" onChange={onChange} />)
      
      // Expand search
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      // Click clear button
      const clearButton = await screen.findByRole('button', { name: /suche löschen/i })
      await user.click(clearButton)
      
      expect(onChange).toHaveBeenCalledWith('')
    })

    it('should collapse when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<MobileSearchBar {...defaultProps} />)
      
      // Expand search
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      // Click close button
      const closeButton = await screen.findByRole('button', { name: /suche schließen/i })
      await user.click(closeButton)
      
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: /suche öffnen/i })).toBeInTheDocument()
      })
    })

    it('should collapse when escape key is pressed', async () => {
      const user = userEvent.setup()
      render(<MobileSearchBar {...defaultProps} />)
      
      // Expand search
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      // Press escape
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: /suche öffnen/i })).toBeInTheDocument()
      })
    })

    it('should not collapse on blur if there is a value', async () => {
      const user = userEvent.setup()
      render(<MobileSearchBar {...defaultProps} value="test" />)
      
      // Expand search
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      // Blur input
      const input = await screen.findByRole('textbox', { name: /suchfeld/i })
      fireEvent.blur(input)
      
      // Should still be expanded because there's a value
      expect(screen.getByRole('textbox', { name: /suchfeld/i })).toBeInTheDocument()
    })

    it('should collapse on blur if there is no value', async () => {
      const user = userEvent.setup()
      render(<MobileSearchBar {...defaultProps} />)
      
      // Expand search
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      // Blur input
      const input = await screen.findByRole('textbox', { name: /suchfeld/i })
      fireEvent.blur(input)
      
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: /suche öffnen/i })).toBeInTheDocument()
      })
    })

    it('should call onFocus and onBlur callbacks', async () => {
      const user = userEvent.setup()
      const onFocus = jest.fn()
      const onBlur = jest.fn()
      render(<MobileSearchBar {...defaultProps} onFocus={onFocus} onBlur={onBlur} />)
      
      // Expand search
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      const input = await screen.findByRole('textbox', { name: /suchfeld/i })
      
      // Focus should be called automatically
      await waitFor(() => {
        expect(onFocus).toHaveBeenCalled()
      })
      
      // Blur input
      fireEvent.blur(input)
      expect(onBlur).toHaveBeenCalled()
    })

    it('should blur input on Enter key', async () => {
      const user = userEvent.setup()
      render(<MobileSearchBar {...defaultProps} />)
      
      // Expand search
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      const input = await screen.findByRole('textbox', { name: /suchfeld/i })
      
      // Wait for auto-focus to happen
      await waitFor(() => {
        expect(input).toHaveFocus()
      })
      
      // Press Enter key
      await user.keyboard('{Enter}')
      
      // Input should lose focus
      expect(input).not.toHaveFocus()
    })

    it('should apply custom className', () => {
      render(<MobileSearchBar {...defaultProps} className="custom-class" />)
      
      const container = screen.getByRole('button', { name: /suche öffnen/i }).parentElement
      expect(container).toHaveClass('custom-class')
    })

    it('should use custom placeholder', async () => {
      const user = userEvent.setup()
      render(<MobileSearchBar {...defaultProps} placeholder="Custom placeholder" />)
      
      // Expand search
      const searchButton = screen.getByRole('button', { name: /suche öffnen/i })
      await user.click(searchButton)
      
      const input = await screen.findByRole('textbox', { name: /suchfeld/i })
      expect(input).toHaveAttribute('placeholder', 'Custom placeholder')
    })
  })
})