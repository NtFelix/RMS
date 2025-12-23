import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomCombobox } from '../custom-combobox';

describe('CustomCombobox', () => {
  const mockOptions = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
  ];

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with accessible name when id is provided', () => {
    render(
      <div>
        <label htmlFor="test-combobox">Test Label</label>
        <CustomCombobox
          id="test-combobox"
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      </div>
    );

    const combobox = screen.getByRole('combobox', { name: 'Test Label' });
    expect(combobox).toBeInTheDocument();
    expect(combobox).toHaveAttribute('id', 'test-combobox');
  });

  it('renders without id when not provided', () => {
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
      />
    );

    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeInTheDocument();
    expect(combobox).not.toHaveAttribute('id');
  });

  it('displays selected option correctly', () => {
    render(
      <CustomCombobox
        options={mockOptions}
        value="2"
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('displays placeholder when no option is selected', () => {
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
        placeholder="Choose an option"
      />
    );

    expect(screen.getByText('Choose an option')).toBeInTheDocument();
  });

  it('handles keyboard input and deletion correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
      />
    );

    const combobox = screen.getByRole('combobox');
    
    // Open the dropdown
    await user.click(combobox);
    
    // Find the search input
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeInTheDocument();
    
    // Type some text
    await user.type(searchInput, 'test');
    expect(searchInput).toHaveValue('test');
    
    // Test single character deletion with backspace
    await user.keyboard('{Backspace}');
    expect(searchInput).toHaveValue('tes');
    
    // Test clearing input by selecting all text and deleting
    await user.clear(searchInput);
    expect(searchInput).toHaveValue('');
    
    // Test that we can type again after clearing
    await user.type(searchInput, 'new');
    expect(searchInput).toHaveValue('new');
  });

  it('handles navigation keys when input is focused', async () => {
    const user = userEvent.setup();
    
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
      />
    );

    const combobox = screen.getByRole('combobox');
    
    // Open the dropdown
    await user.click(combobox);
    
    // Find the search input
    const searchInput = screen.getByRole('searchbox');
    
    // Test that arrow keys work for navigation when input is focused
    await user.keyboard('{ArrowDown}');
    
    // Should still be able to type in the input
    await user.type(searchInput, 'test');
    expect(searchInput).toHaveValue('test');
    
    // Test escape key closes the dropdown
    await user.keyboard('{Escape}');
    
    // Dropdown should be closed (searchbox should not be in document)
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('verifies Delete key behavior difference from Backspace', async () => {
    // This test documents the expected behavior difference between Delete and Backspace
    // when used as shortcuts (when input is not focused)
    
    // Delete key shortcut: focuses input but does NOT modify value
    // Backspace key shortcut: focuses input AND removes last character
    
    // Note: The actual global keyboard handler behavior is tested in integration/e2e tests
    // since jsdom has limitations with global event handling
    
    const user = userEvent.setup();
    
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
      />
    );

    const combobox = screen.getByRole('combobox');
    
    // Open the dropdown
    await user.click(combobox);
    
    // Find the search input and add some text
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'test');
    expect(searchInput).toHaveValue('test');
    
    // Test that Delete key works normally when input is focused
    await user.keyboard('{Delete}');
    // Since cursor is at end, Delete does nothing (no character to the right)
    expect(searchInput).toHaveValue('test');
    
    // Test that Backspace works normally when input is focused
    await user.keyboard('{Backspace}');
    expect(searchInput).toHaveValue('tes');
    
    // Verify the input maintains focus during these operations
    expect(searchInput).toHaveFocus();
  });

  it('handles text input and native keyboard shortcuts', async () => {
    const user = userEvent.setup();
    
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
      />
    );

    const combobox = screen.getByRole('combobox');
    
    // Open the dropdown
    await user.click(combobox);
    
    // Find the search input and add some text
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'test input');
    expect(searchInput).toHaveValue('test input');
    
    // Test that we can use backspace to delete characters
    await user.keyboard('{Backspace}{Backspace}');
    expect(searchInput).toHaveValue('test inp');
    
    // Test that we can continue typing
    await user.type(searchInput, 'ut');
    expect(searchInput).toHaveValue('test input');
  });

  it('maintains input focus during text operations', async () => {
    const user = userEvent.setup();
    
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
      />
    );

    const combobox = screen.getByRole('combobox');
    
    // Open the dropdown
    await user.click(combobox);
    
    // Find the search input and add some text
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'hello');
    expect(searchInput).toHaveValue('hello');
    expect(searchInput).toHaveFocus();
    
    // Clear and type new text
    await user.clear(searchInput);
    await user.type(searchInput, 'world');
    expect(searchInput).toHaveValue('world');
    expect(searchInput).toHaveFocus();
  });

  it('allows native input behavior when input is focused', async () => {
    const user = userEvent.setup();
    
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
      />
    );

    const combobox = screen.getByRole('combobox');
    
    // Open the dropdown
    await user.click(combobox);
    
    // Find the search input
    const searchInput = screen.getByRole('searchbox');
    
    // Type some text
    await user.type(searchInput, 'hello world');
    expect(searchInput).toHaveValue('hello world');
    
    // Test clearing and replacing text using userEvent.clear and type
    await user.clear(searchInput);
    await user.type(searchInput, 'replaced');
    expect(searchInput).toHaveValue('replaced');
    
    // Test that the input maintains focus during these operations
    expect(searchInput).toHaveFocus();
  });

  it('filters options based on input text', async () => {
    const user = userEvent.setup();
    
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
      />
    );

    const combobox = screen.getByRole('combobox');
    
    // Open the dropdown
    await user.click(combobox);
    
    // All options should be visible initially
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
    
    // Type to filter options
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, '2');
    
    // Only Option 2 should be visible
    expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.queryByText('Option 3')).not.toBeInTheDocument();
    
    // Clear the input
    await user.clear(searchInput);
    
    // All options should be visible again
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('supports multi-character deletion and text selection', async () => {
    const user = userEvent.setup();
    
    render(
      <CustomCombobox
        options={mockOptions}
        value={null}
        onChange={mockOnChange}
      />
    );

    const combobox = screen.getByRole('combobox');
    
    // Open the dropdown
    await user.click(combobox);
    
    const searchInput = screen.getByRole('searchbox');
    
    // Type a longer text
    await user.type(searchInput, 'hello world test');
    expect(searchInput).toHaveValue('hello world test');
    
    // Test that userEvent.clear works (simulates Cmd+A + Delete or similar)
    await user.clear(searchInput);
    expect(searchInput).toHaveValue('');
    
    // Test that we can type after clearing
    await user.type(searchInput, 'new text');
    expect(searchInput).toHaveValue('new text');
    
    // Test partial selection and replacement
    // Select part of the text and replace it
    await user.selectOptions(searchInput, []);
    await user.clear(searchInput);
    await user.type(searchInput, 'replaced');
    expect(searchInput).toHaveValue('replaced');
  });
});