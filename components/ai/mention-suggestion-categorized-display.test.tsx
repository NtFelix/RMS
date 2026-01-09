import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MentionSuggestionList, MentionSuggestionListRef } from '@/components/ai/mention-suggestion-list';
import { MENTION_VARIABLES } from '@/lib/template-constants';
import { Editor } from '@tiptap/react';

// Mock the editor and range objects
const mockEditor = {} as Editor;
const mockRange = {} as any;
const mockCommand = jest.fn();

describe('MentionSuggestionList - Categorized Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display variables grouped by category with headers', () => {
    render(
      <MentionSuggestionList
        items={MENTION_VARIABLES.slice(0, 8)} // Test with first 8 variables
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    // Check for category headers
    expect(screen.getByText('Mieter')).toBeInTheDocument();
    expect(screen.getByText('Wohnung')).toBeInTheDocument();
    
    // Check for variables under categories
    expect(screen.getByText('Mieter.Name')).toBeInTheDocument();
    expect(screen.getByText('Wohnung.Adresse')).toBeInTheDocument();
  });

  it('should display category icons', () => {
    render(
      <MentionSuggestionList
        items={MENTION_VARIABLES.slice(0, 4)} // Test with mieter variables
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    // Check that category headers have icons (SVG elements)
    const categoryHeaders = screen.getAllByRole('generic');
    const iconsPresent = categoryHeaders.some(header => 
      header.querySelector('svg') !== null
    );
    expect(iconsPresent).toBe(true);
  });

  it('should show visual separators between categories', () => {
    render(
      <MentionSuggestionList
        items={MENTION_VARIABLES.slice(0, 8)} // Multiple categories
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    // Check for border elements (separators)
    const separators = document.querySelectorAll('.border-t');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('should handle keyboard navigation across categories', () => {
    const ref = React.createRef<MentionSuggestionListRef>();
    render(
      <MentionSuggestionList
        ref={ref}
        items={MENTION_VARIABLES.slice(0, 6)}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    // Simulate arrow down key press
    act(() => {
      const keyDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      const handled = ref.current?.onKeyDown({ event: keyDownEvent });
      expect(handled).toBe(true);
    });
  });

  it('should call command when item is clicked', () => {
    render(
      <MentionSuggestionList
        items={MENTION_VARIABLES.slice(0, 3)}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    // Click on first variable
    const firstVariable = screen.getByText('Mieter.Name');
    fireEvent.click(firstVariable);

    expect(mockCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mieter.name',
        label: 'Mieter.Name'
      })
    );
  });

  it('should show "No matches found" when no items provided', () => {
    render(
      <MentionSuggestionList
        items={[]}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query="nonexistent"
      />
    );

    expect(screen.getByText('No matches found')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes for accessibility', () => {
    render(
      <MentionSuggestionList
        items={MENTION_VARIABLES.slice(0, 3)}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    // Check for listbox role
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-label', 'Variable suggestions');
    expect(listbox).toHaveAttribute('aria-expanded', 'true');

    // Check for option roles
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
    
    // First option should be selected by default
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('should be responsive with mobile-friendly touch targets', () => {
    render(
      <MentionSuggestionList
        items={MENTION_VARIABLES.slice(0, 3)}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    // Check for mobile-friendly classes
    const options = screen.getAllByRole('option');
    options.forEach(option => {
      expect(option).toHaveClass('min-h-[44px]');
    });
  });
});