import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomCombobox } from './custom-combobox';

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
    
    // Test multiple character deletion by selecting all and deleting
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('{Backspace}');
    expect(searchInput).toHaveValue('');
    
    // Test that we can type again after clearing
    await user.type(searchInput, 'new');
    expect(searchInput).toHaveValue('new');
  });
});