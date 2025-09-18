import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomCombobox, ComboboxOption } from '../ui/custom-combobox'

const mockOptions: ComboboxOption[] = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3', disabled: true },
  { value: '4', label: 'Option 4' },
]

describe('CustomCombobox Accessibility', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('should support keyboard navigation with arrow keys', async () => {
    const user = userEvent.setup()
    
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
        placeholder="Select option"
      />
    )

    const combobox = screen.getByRole('combobox')
    
    // Open dropdown with click
    await user.click(combobox)
    
    // Wait for dropdown to open
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Navigate with arrow keys - start from index 0, go to index 1
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    
    // Select with Enter
    fireEvent.keyDown(document, { key: 'Enter' })
    
    expect(mockOnChange).toHaveBeenCalledWith('2')
  })

  it('should handle Home and End keys', async () => {
    const user = userEvent.setup()
    
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
        placeholder="Select option"
      />
    )

    const combobox = screen.getByRole('combobox')
    await user.click(combobox)
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Test End key
    fireEvent.keyDown(document, { key: 'End' })
    fireEvent.keyDown(document, { key: 'Enter' })
    
    expect(mockOnChange).toHaveBeenCalledWith('4')
  })

  it('should close dropdown with Escape key', async () => {
    const user = userEvent.setup()
    
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
        placeholder="Select option"
      />
    )

    const combobox = screen.getByRole('combobox')
    await user.click(combobox)
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Close with Escape
    fireEvent.keyDown(document, { key: 'Escape' })
    
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it('should have proper ARIA attributes', async () => {
    const user = userEvent.setup()
    
    render(
      <CustomCombobox
        options={mockOptions}
        value="1"
        onChange={mockOnChange}
        placeholder="Select option"
      />
    )

    const combobox = screen.getByRole('combobox')
    
    expect(combobox).toHaveAttribute('aria-expanded', 'false')
    expect(combobox).toHaveAttribute('aria-haspopup', 'listbox')
    
    await user.click(combobox)
    
    await waitFor(() => {
      expect(combobox).toHaveAttribute('aria-expanded', 'true')
      const listbox = screen.getByRole('listbox')
      expect(listbox).toBeInTheDocument()
      
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
      expect(options[1]).toHaveAttribute('aria-selected', 'false')
    })
  })

  it('should skip disabled options during keyboard navigation', async () => {
    const user = userEvent.setup()
    
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
        placeholder="Select option"
      />
    )

    const combobox = screen.getByRole('combobox')
    await user.click(combobox)
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Navigate to disabled option and try to select
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    fireEvent.keyDown(document, { key: 'Enter' })
    
    // Should not select disabled option
    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('should automatically capture typing when dropdown is open', async () => {
    const user = userEvent.setup()
    
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
        placeholder="Select option"
      />
    )

    const combobox = screen.getByRole('combobox')
    await user.click(combobox)
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Type characters - should automatically update search input
    fireEvent.keyDown(document, { key: 'O' })
    fireEvent.keyDown(document, { key: 'p' })
    
    await waitFor(() => {
      const searchInput = screen.getByRole('searchbox')
      expect(searchInput).toHaveValue('Op')
    })
  })

  it('should open dropdown and start typing when typing on closed combobox', async () => {
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
        placeholder="Select option"
      />
    )

    const combobox = screen.getByRole('combobox')
    combobox.focus()
    
    // Type a character on the closed combobox
    fireEvent.keyDown(combobox, { key: 'O' })
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
  })

  it('should handle backspace in search input', async () => {
    const user = userEvent.setup()
    
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
        placeholder="Select option"
      />
    )

    const combobox = screen.getByRole('combobox')
    await user.click(combobox)
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Type and then backspace
    fireEvent.keyDown(document, { key: 'O' })
    fireEvent.keyDown(document, { key: 'p' })
    fireEvent.keyDown(document, { key: 'Backspace' })
    
    await waitFor(() => {
      const searchInput = screen.getByRole('searchbox')
      expect(searchInput).toHaveValue('O')
    })
  })
})