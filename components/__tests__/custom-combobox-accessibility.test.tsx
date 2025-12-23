import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomCombobox, ComboboxOption } from '@/components/ui/custom-combobox'

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

  it('should capture typing when combobox button is focused and dropdown is open', async () => {
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

    // Focus the combobox button and open with keyboard
    combobox.focus()
    fireEvent.keyDown(combobox, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Type character while button is focused - should focus input and add character
    fireEvent.keyDown(document, { key: 'O' })

    await waitFor(() => {
      const searchInput = screen.getByRole('searchbox')
      expect(searchInput).toHaveValue('O')
      expect(searchInput).toHaveFocus()
    })

    // Now that input is focused, type directly into it
    const searchInput = screen.getByRole('searchbox')
    await user.type(searchInput, 'p')

    await waitFor(() => {
      expect(searchInput).toHaveValue('Op')
    })
  })

  it('should NOT open dropdown when typing on closed combobox (click-to-open behavior)', async () => {
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

    // Type a character on the closed combobox - should NOT open
    fireEvent.keyDown(combobox, { key: 'O' })

    // Dropdown should remain closed
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('should open dropdown with navigation keys and clicks', async () => {
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

    // Should open with click
    await user.click(combobox)
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Close it
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    // Should open with Enter key
    combobox.focus()
    fireEvent.keyDown(combobox, { key: 'Enter' })
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Close it
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    // Should open with ArrowDown key
    combobox.focus()
    fireEvent.keyDown(combobox, { key: 'ArrowDown' })
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
  })

  it('should NOT capture global typing when dropdown is open but focus is elsewhere', async () => {
    const user = userEvent.setup()

    render(
      <div>
        <input data-testid="other-input" placeholder="Other input" />
        <CustomCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
          placeholder="Select option"
        />
      </div>
    )

    const combobox = screen.getByRole('combobox')
    const otherInput = screen.getByTestId('other-input')

    // Focus the other input first
    otherInput.focus()

    // Open the combobox with keyboard while other input is focused
    combobox.focus()
    fireEvent.keyDown(combobox, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Move focus back to the other input using Tab (simulating user navigation)
    otherInput.focus()

    await waitFor(() => {
      expect(otherInput).toHaveFocus()
      // Dropdown should still be open
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Type characters - should go to the focused input, not be captured by combobox
    fireEvent.keyDown(document, { key: 't' })
    fireEvent.keyDown(document, { key: 'e' })
    fireEvent.keyDown(document, { key: 's' })
    fireEvent.keyDown(document, { key: 't' })

    // The combobox search input should remain empty since focus is elsewhere
    const searchInput = screen.getByRole('searchbox')
    expect(searchInput).toHaveValue('')

    // This test verifies that global typing is not captured when focus is elsewhere
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

    // Get the search input and type into it directly
    const searchInput = screen.getByRole('searchbox')
    await user.type(searchInput, 'Op')

    await waitFor(() => {
      expect(searchInput).toHaveValue('Op')
    })

    // Use backspace
    await user.keyboard('{Backspace}')

    await waitFor(() => {
      expect(searchInput).toHaveValue('O')
    })
  })
})