import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MentionSuggestionList } from '@/components/ai/mention-suggestion-list';
import { MENTION_VARIABLES } from '@/lib/template-constants';
import '@testing-library/jest-dom';

// Mock the editor and range objects
const mockEditor = {} as any;
const mockRange = {} as any;
const mockCommand = jest.fn();

describe('MentionSuggestionList Styling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply correct CSS classes for the modal container', () => {
    render(
      <MentionSuggestionList
        items={MENTION_VARIABLES.slice(0, 3)}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    const modal = screen.getByRole('listbox');
    expect(modal).toHaveClass('mention-suggestion-modal');
  });

  it('should display loading state with correct styling', () => {
    render(
      <MentionSuggestionList
        items={[]}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
        loading={true}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading suggestions...')).toBeInTheDocument();
    
    // Check for skeleton items
    const skeletons = document.querySelectorAll('.mention-suggestion-skeleton');
    expect(skeletons).toHaveLength(3);
  });

  it('should display empty state with correct styling', () => {
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
    expect(screen.getByText('No variables match "nonexistent"')).toBeInTheDocument();
    
    const emptyState = screen.getByRole('status');
    expect(emptyState).toHaveClass('mention-suggestion-empty');
  });

  it('should apply category-specific styling', () => {
    const mieterVariables = MENTION_VARIABLES.filter(v => v.category === 'mieter').slice(0, 2);
    
    render(
      <MentionSuggestionList
        items={mieterVariables}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    const categoryHeader = document.querySelector('.mention-category-mieter');
    expect(categoryHeader).toBeInTheDocument();
    expect(categoryHeader).toHaveClass('mention-category-header');
  });

  it('should apply selected state styling', () => {
    render(
      <MentionSuggestionList
        items={MENTION_VARIABLES.slice(0, 3)}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    const firstItem = screen.getAllByRole('option')[0];
    expect(firstItem).toHaveClass('mention-suggestion-item');
    expect(firstItem).toHaveClass('selected'); // First item should be selected by default
  });

  it('should highlight matching text in query', () => {
    const testItems = [
      {
        id: 'test.name',
        label: 'Test.Name',
        description: 'Test name variable',
        category: 'mieter' as const
      }
    ];

    render(
      <MentionSuggestionList
        items={testItems}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query="name"
      />
    );

    // Check if mark elements are created for highlighting
    const marks = document.querySelectorAll('mark');
    expect(marks.length).toBeGreaterThan(0);
  });

  it('should handle hover interactions', () => {
    render(
      <MentionSuggestionList
        items={MENTION_VARIABLES.slice(0, 3)}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    const items = screen.getAllByRole('option');
    const secondItem = items[1];

    // Hover should change selection
    fireEvent.mouseEnter(secondItem);
    expect(secondItem).toHaveClass('selected');
  });

  it('should apply proper ARIA attributes', () => {
    render(
      <MentionSuggestionList
        items={MENTION_VARIABLES.slice(0, 3)}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    const modal = screen.getByRole('listbox');
    expect(modal).toHaveAttribute('aria-label', 'Variable suggestions');
    expect(modal).toHaveAttribute('aria-expanded', 'true');
    expect(modal).toHaveAttribute('aria-multiselectable', 'false');

    const items = screen.getAllByRole('option');
    items.forEach((item, index) => {
      expect(item).toHaveAttribute('aria-selected', index === 0 ? 'true' : 'false');
    });
  });

  it('should handle category separators correctly', () => {
    // Get items from different categories
    const mixedItems = [
      ...MENTION_VARIABLES.filter(v => v.category === 'mieter').slice(0, 1),
      ...MENTION_VARIABLES.filter(v => v.category === 'wohnung').slice(0, 1),
    ];

    render(
      <MentionSuggestionList
        items={mixedItems}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    // Should have category separator between different categories
    const separator = document.querySelector('.mention-category-separator');
    expect(separator).toBeInTheDocument();
  });
});