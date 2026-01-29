import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MentionSuggestionList, MentionSuggestionListRef } from '@/components/ai/mention-suggestion-list';
import { MentionVariable } from '@/lib/template-constants';
import { Editor } from '@tiptap/react';

// Mock the template constants
jest.mock('@/lib/template-constants', () => ({
  getCategoryConfig: jest.fn((categoryId: string) => ({
    id: categoryId,
    label: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
    icon: 'User',
    color: 'text-blue-600',
    order: 1,
  })),
}));

// Mock the mention utils
jest.mock('@/lib/mention-utils', () => ({
  groupMentionVariablesByCategory: jest.fn((items: MentionVariable[]) => {
    const grouped: Record<string, MentionVariable[]> = {};
    items.forEach(item => {
      const category = item.category || 'default';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    return grouped;
  }),
  getOrderedCategories: jest.fn((grouped: Record<string, MentionVariable[]>) => 
    Object.keys(grouped).sort()
  ),
}));

// Mock keyboard navigation hook
jest.mock('@/hooks/use-keyboard-navigation', () => ({
  useKeyboardNavigation: jest.fn(({ itemCount, onSelect, initialIndex = 0 }) => {
    const [selectedIndex, setSelectedIndex] = React.useState(initialIndex);
    
    const selectNext = React.useCallback(() => {
      if (itemCount > 0) {
        setSelectedIndex((prev: number) => (prev + 1) % itemCount);
      }
    }, [itemCount]);
    
    const selectPrevious = React.useCallback(() => {
      if (itemCount > 0) {
        setSelectedIndex((prev: number) => (prev - 1 + itemCount) % itemCount);
      }
    }, [itemCount]);
    
    const handleKeyDown = React.useCallback((event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          selectNext();
          return true;
        case 'ArrowUp':
          event.preventDefault();
          selectPrevious();
          return true;
        case 'Enter':
        case 'Tab':
          event.preventDefault();
          if (itemCount > 0 && selectedIndex >= 0 && selectedIndex < itemCount) {
            onSelect(selectedIndex);
          }
          return true;
        case 'Escape':
          event.preventDefault();
          return true;
        default:
          return false;
      }
    }, [selectedIndex, selectNext, selectPrevious, onSelect, itemCount]);
    
    return {
      selectedIndex,
      setSelectedIndex,
      selectNext,
      selectPrevious,
      selectCurrentItem: () => {
        if (itemCount > 0 && selectedIndex >= 0 && selectedIndex < itemCount) {
          onSelect(selectedIndex);
        }
      },
      handleKeyDown,
    };
  }),
}));

describe('MentionSuggestionList Keyboard Navigation', () => {
  const mockCommand = jest.fn();
  const mockEditor = {} as Editor;
  const mockRange = {} as any;

  const mockItems: MentionVariable[] = [
    {
      id: 'mieter.name',
      label: 'Mieter Name',
      description: 'Name des Mieters',
      category: 'mieter',
    },
    {
      id: 'mieter.email',
      label: 'Mieter E-Mail',
      description: 'E-Mail-Adresse des Mieters',
      category: 'mieter',
    },
    {
      id: 'wohnung.nummer',
      label: 'Wohnungsnummer',
      description: 'Nummer der Wohnung',
      category: 'wohnung',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with proper ARIA attributes', () => {
    render(
      <MentionSuggestionList
        items={mockItems}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-label', 'Variable suggestions');
    expect(listbox).toHaveAttribute('aria-expanded', 'true');
    expect(listbox).toHaveAttribute('aria-multiselectable', 'false');
  });

  it('should highlight first item by default', () => {
    render(
      <MentionSuggestionList
        items={mockItems}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    const firstItem = screen.getByText('Mieter Name').closest('[role="option"]');
    expect(firstItem).toHaveAttribute('aria-selected', 'true');
    expect(firstItem).toHaveAttribute('tabIndex', '0');
  });

  it('should handle arrow key navigation', () => {
    const ref = React.createRef<MentionSuggestionListRef>();
    
    render(
      <MentionSuggestionList
        ref={ref}
        items={mockItems}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    // Simulate arrow down key
    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    const result = ref.current?.onKeyDown({ event: downEvent });
    
    expect(result).toBe(true);
  });

  it('should handle Enter key selection', () => {
    const ref = React.createRef<MentionSuggestionListRef>();
    
    render(
      <MentionSuggestionList
        ref={ref}
        items={mockItems}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    // Simulate Enter key
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    const result = ref.current?.onKeyDown({ event: enterEvent });
    
    expect(result).toBe(true);
    expect(mockCommand).toHaveBeenCalledWith(mockItems[0]);
  });

  it('should handle Tab key selection', () => {
    const ref = React.createRef<MentionSuggestionListRef>();
    
    render(
      <MentionSuggestionList
        ref={ref}
        items={mockItems}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    // Simulate Tab key
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    const result = ref.current?.onKeyDown({ event: tabEvent });
    
    expect(result).toBe(true);
    expect(mockCommand).toHaveBeenCalledWith(mockItems[0]);
  });

  it('should handle Escape key', () => {
    const ref = React.createRef<MentionSuggestionListRef>();
    
    render(
      <MentionSuggestionList
        ref={ref}
        items={mockItems}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    // Simulate Escape key
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    const result = ref.current?.onKeyDown({ event: escapeEvent });
    
    expect(result).toBe(true);
  });

  it('should handle mouse hover to update selection', async () => {
    const user = userEvent.setup();
    
    render(
      <MentionSuggestionList
        items={mockItems}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    const secondItem = screen.getByText('Mieter E-Mail').closest('[role="option"]');
    
    // Hover over second item
    await user.hover(secondItem!);
    
    // The second item should now be selected
    expect(secondItem).toHaveAttribute('aria-selected', 'true');
  });

  it('should handle click selection', async () => {
    const user = userEvent.setup();
    
    render(
      <MentionSuggestionList
        items={mockItems}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    const secondItem = screen.getByText('Mieter E-Mail').closest('[role="option"]');
    
    // Click on second item
    await user.click(secondItem!);
    
    expect(mockCommand).toHaveBeenCalledWith(mockItems[1]);
  });

  it('should show "No matches found" when items array is empty', () => {
    render(
      <MentionSuggestionList
        items={[]}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query="nonexistent"
      />
    );

    const noMatches = screen.getByText('No matches found');
    expect(noMatches).toBeInTheDocument();
    expect(noMatches).toHaveAttribute('role', 'option');
    expect(noMatches).toHaveAttribute('aria-selected', 'false');
    expect(noMatches).toHaveAttribute('aria-disabled', 'true');
  });

  it('should have proper accessibility descriptions', () => {
    render(
      <MentionSuggestionList
        items={mockItems}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    const firstItem = screen.getByText('Mieter Name').closest('[role="option"]');
    expect(firstItem).toHaveAttribute('aria-describedby', 'suggestion-mieter.name-description');
    
    const description = screen.getByText('Name des Mieters');
    expect(description).toHaveAttribute('id', 'suggestion-mieter.name-description');
  });

  it('should group items by category with proper visual separation', () => {
    render(
      <MentionSuggestionList
        items={mockItems}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    // Should have category headers
    expect(screen.getByText('Mieter')).toBeInTheDocument();
    expect(screen.getByText('Wohnung')).toBeInTheDocument();
    
    // Should have all items
    expect(screen.getByText('Mieter Name')).toBeInTheDocument();
    expect(screen.getByText('Mieter E-Mail')).toBeInTheDocument();
    expect(screen.getByText('Wohnungsnummer')).toBeInTheDocument();
  });

  it('should maintain focus management for screen readers', () => {
    render(
      <MentionSuggestionList
        items={mockItems}
        command={mockCommand}
        editor={mockEditor}
        range={mockRange}
        query=""
      />
    );

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('tabIndex', '-1');
    
    const firstItem = screen.getByText('Mieter Name').closest('[role="option"]');
    expect(firstItem).toHaveAttribute('tabIndex', '0');
    
    const secondItem = screen.getByText('Mieter E-Mail').closest('[role="option"]');
    expect(secondItem).toHaveAttribute('tabIndex', '-1');
  });
});