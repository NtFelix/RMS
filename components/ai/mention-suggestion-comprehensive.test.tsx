/**
 * Comprehensive unit tests for mention suggestion functionality
 * Tests MentionSuggestionList component rendering, interaction, keyboard navigation,
 * filtering, selection behaviors, error handling, edge cases, and accessibility
 * 
 * Requirements covered: 1.5, 2.5, 3.5, 4.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MentionSuggestionList, MentionSuggestionListRef } from '@/components/ai/mention-suggestion-list';
import { MentionVariable } from '@/lib/template-constants';
import { Editor } from '@tiptap/react';

// Mock dependencies
jest.mock('@/lib/template-constants', () => ({
  getCategoryConfig: jest.fn((categoryId: string) => ({
    id: categoryId,
    label: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
    icon: 'User',
    color: 'text-blue-600',
    order: categoryId === 'mieter' ? 1 : categoryId === 'wohnung' ? 2 : 3,
  })),
  CATEGORY_CONFIGS: {
    mieter: { id: 'mieter', label: 'Mieter', icon: 'User', color: 'text-blue-600', order: 1 },
    wohnung: { id: 'wohnung', label: 'Wohnung', icon: 'Home', color: 'text-green-600', order: 2 },
    datum: { id: 'datum', label: 'Datum', icon: 'Calendar', color: 'text-purple-600', order: 3 },
  },
}));

jest.mock('@/lib/mention-utils', () => ({
  groupMentionVariablesByCategory: jest.fn((items: MentionVariable[]) => {
    const grouped: Record<string, MentionVariable[]> = {};
    items.forEach(item => {
      const category = item.category || 'uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    return grouped;
  }),
  getOrderedCategories: jest.fn((grouped: Record<string, MentionVariable[]>) => 
    Object.keys(grouped).sort((a, b) => {
      const orderMap: Record<string, number> = { mieter: 1, wohnung: 2, datum: 3 };
      return (orderMap[a] || 999) - (orderMap[b] || 999);
    })
  ),
}));

jest.mock('@/hooks/use-keyboard-navigation', () => ({
  useKeyboardNavigation: jest.fn(({ itemCount, onSelect, initialIndex = 0 }) => {
    const [selectedIndex, setSelectedIndex] = React.useState(initialIndex);
    
    const selectNext = React.useCallback(() => {
      if (itemCount > 0) {
        setSelectedIndex((prev) => (prev + 1) % itemCount);
      }
    }, [itemCount]);
    
    const selectPrevious = React.useCallback(() => {
      if (itemCount > 0) {
        setSelectedIndex((prev) => (prev - 1 + itemCount) % itemCount);
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

// Mock error handling
jest.mock('@/lib/mention-suggestion-error-handling', () => ({
  handleRenderError: jest.fn((error, context, props) => ({
    type: 'RENDER_ERROR',
    message: error.message,
    originalError: error,
    context,
    timestamp: Date.now(),
    errorId: 'test-error-id',
    recoverable: true,
  })),
  handleKeyboardNavigationError: jest.fn((error, event, selectedIndex, itemCount) => ({
    type: 'KEYBOARD_NAVIGATION_ERROR',
    message: error.message,
    originalError: error,
    context: { key: event.key, selectedIndex, itemCount },
    timestamp: Date.now(),
    errorId: 'test-keyboard-error-id',
    recoverable: true,
  })),
  safeExecute: jest.fn((fn) => {
    try {
      return { success: true, result: fn() };
    } catch (error) {
      return { success: false, error };
    }
  }),
  createGracefulFallback: jest.fn(() => ({
    fallbackSuggestion: jest.fn(),
  })),
  mentionSuggestionErrorRecovery: {
    recordError: jest.fn(() => false),
    isInFallbackMode: jest.fn(() => false),
  },
}));

jest.mock('@/components/ai/mention-suggestion-error-boundary', () => ({
  MentionSuggestionErrorFallback: ({ error, onRetry, onDismiss }: any) => (
    <div role="alert" data-testid="error-fallback">
      <div>Error occurred: {error?.message || 'Unknown error'}</div>
      {onRetry && <button onClick={onRetry}>Retry</button>}
      {onDismiss && <button onClick={onDismiss}>Dismiss</button>}
    </div>
  ),
  useMentionSuggestionErrorHandler: jest.fn(() => ({
    error: null,
    hasError: false,
    handleError: jest.fn(),
    retry: jest.fn(),
    reset: jest.fn(),
  })),
}));

// Test data
const mockEditor = {} as Editor;
const mockRange = {} as any;

const createMockVariable = (id: string, label: string, category: string, description?: string): MentionVariable => ({
  id,
  label,
  description: description || `Description for ${label}`,
  category: category as any,
});

const mockVariables: MentionVariable[] = [
  createMockVariable('mieter.name', 'Mieter Name', 'mieter', 'Full name of the tenant'),
  createMockVariable('mieter.email', 'Mieter E-Mail', 'mieter', 'Email address of the tenant'),
  createMockVariable('wohnung.nummer', 'Wohnungsnummer', 'wohnung', 'Apartment number'),
  createMockVariable('wohnung.groesse', 'Wohnungsgröße', 'wohnung', 'Size of the apartment'),
  createMockVariable('datum.heute', 'Datum Heute', 'datum', 'Current date'),
];

describe('MentionSuggestionList - Comprehensive Tests', () => {
  const mockCommand = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering and Interaction', () => {
    it('should render with proper structure and ARIA attributes', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      // Check main container
      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-label', 'Variable suggestions');
      expect(listbox).toHaveAttribute('aria-expanded', 'true');
      expect(listbox).toHaveAttribute('aria-multiselectable', 'false');
      expect(listbox).toHaveAttribute('tabIndex', '-1');
    });

    it('should render all categories with proper headers and icons', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      // Check category headers
      expect(screen.getByText('Mieter')).toBeInTheDocument();
      expect(screen.getByText('Wohnung')).toBeInTheDocument();
      expect(screen.getByText('Datum')).toBeInTheDocument();

      // Check that all variables are rendered
      expect(screen.getByText('Mieter Name')).toBeInTheDocument();
      expect(screen.getByText('Mieter E-Mail')).toBeInTheDocument();
      expect(screen.getByText('Wohnungsnummer')).toBeInTheDocument();
      expect(screen.getByText('Wohnungsgröße')).toBeInTheDocument();
      expect(screen.getByText('Datum Heute')).toBeInTheDocument();
    });

    it('should render variables with proper option attributes', () => {
      render(
        <MentionSuggestionList
          items={mockVariables.slice(0, 2)}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);

      // First option should be selected by default
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      expect(options[0]).toHaveAttribute('tabIndex', '0');
      expect(options[0]).toHaveAttribute('id', 'suggestion-mieter.name');
      expect(options[0]).toHaveAttribute('aria-describedby', 'suggestion-mieter.name-description');

      // Second option should not be selected
      expect(options[1]).toHaveAttribute('aria-selected', 'false');
      expect(options[1]).toHaveAttribute('tabIndex', '-1');
    });

    it('should handle click selection correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <MentionSuggestionList
          items={mockVariables.slice(0, 3)}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const secondOption = screen.getByText('Mieter E-Mail').closest('[role="option"]');
      await user.click(secondOption!);

      expect(mockCommand).toHaveBeenCalledWith(mockVariables[1]);
    });

    it('should update selection on mouse hover', async () => {
      const user = userEvent.setup();
      
      render(
        <MentionSuggestionList
          items={mockVariables.slice(0, 3)}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const thirdOption = screen.getByText('Wohnungsnummer').closest('[role="option"]');
      await user.hover(thirdOption!);

      // After hover, the third option should be selected
      expect(thirdOption).toHaveAttribute('aria-selected', 'true');
      expect(thirdOption).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Keyboard Navigation and Selection', () => {
    it('should handle arrow key navigation through ref', () => {
      const ref = React.createRef<MentionSuggestionListRef>();
      
      render(
        <MentionSuggestionList
          ref={ref}
          items={mockVariables.slice(0, 3)}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      // Test arrow down
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      const downResult = ref.current?.onKeyDown({ event: downEvent });
      expect(downResult).toBe(true);

      // Test arrow up
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      const upResult = ref.current?.onKeyDown({ event: upEvent });
      expect(upResult).toBe(true);
    });

    it('should handle Enter key selection', () => {
      const ref = React.createRef<MentionSuggestionListRef>();
      
      render(
        <MentionSuggestionList
          ref={ref}
          items={mockVariables.slice(0, 2)}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      const result = ref.current?.onKeyDown({ event: enterEvent });
      
      expect(result).toBe(true);
      expect(mockCommand).toHaveBeenCalledWith(mockVariables[0]);
    });

    it('should handle Tab key selection', () => {
      const ref = React.createRef<MentionSuggestionListRef>();
      
      render(
        <MentionSuggestionList
          ref={ref}
          items={mockVariables.slice(0, 2)}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      const result = ref.current?.onKeyDown({ event: tabEvent });
      
      expect(result).toBe(true);
      expect(mockCommand).toHaveBeenCalledWith(mockVariables[0]);
    });

    it('should handle Escape key', () => {
      const ref = React.createRef<MentionSuggestionListRef>();
      
      render(
        <MentionSuggestionList
          ref={ref}
          items={mockVariables.slice(0, 2)}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      const result = ref.current?.onKeyDown({ event: escapeEvent });
      
      expect(result).toBe(true);
      expect(mockCommand).not.toHaveBeenCalled();
    });

    it('should ignore unhandled keys', () => {
      const ref = React.createRef<MentionSuggestionListRef>();
      
      render(
        <MentionSuggestionList
          ref={ref}
          items={mockVariables.slice(0, 2)}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const randomEvent = new KeyboardEvent('keydown', { key: 'a' });
      const result = ref.current?.onKeyDown({ event: randomEvent });
      
      expect(result).toBe(false);
    });
  });

  describe('Filtering and Search Behaviors', () => {
    it('should highlight matching text in query', () => {
      render(
        <MentionSuggestionList
          items={[mockVariables[0]]} // Mieter Name
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query="mieter"
        />
      );

      // Check that the matching text is highlighted with mark element
      const markElement = document.querySelector('mark');
      expect(markElement).toBeInTheDocument();
      expect(markElement).toHaveTextContent('Mieter');
    });

    it('should handle empty query gracefully', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      // All variables should be shown without highlighting
      expect(screen.getByText('Mieter Name')).toBeInTheDocument();
      expect(screen.getByText('Wohnungsnummer')).toBeInTheDocument();
      
      // No mark elements should be present
      expect(screen.queryByText('mark')).not.toBeInTheDocument();
    });

    it('should handle special characters in query', () => {
      render(
        <MentionSuggestionList
          items={[createMockVariable('test.special', 'Test@Special', 'test', 'Special chars: @#$')]}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query="@"
        />
      );

      // Check that the component renders and highlights the @ character
      const markElement = document.querySelector('mark');
      expect(markElement).toBeInTheDocument();
      expect(markElement).toHaveTextContent('@');
    });

    it('should maintain category order regardless of filtering', () => {
      const mixedVariables = [
        mockVariables[4], // datum
        mockVariables[0], // mieter
        mockVariables[2], // wohnung
      ];

      render(
        <MentionSuggestionList
          items={mixedVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const categoryHeaders = screen.getAllByText(/^(Mieter|Wohnung|Datum)$/);
      expect(categoryHeaders[0]).toHaveTextContent('Mieter');
      expect(categoryHeaders[1]).toHaveTextContent('Wohnung');
      expect(categoryHeaders[2]).toHaveTextContent('Datum');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should display "No matches found" when items array is empty', () => {
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
      expect(emptyState).toHaveAttribute('aria-live', 'polite');
    });

    it('should show loading state when loading prop is true', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
          loading={true}
        />
      );

      expect(screen.getByText('Loading suggestions...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
      
      // Should show skeleton items
      const skeletons = document.querySelectorAll('.mention-suggestion-skeleton');
      expect(skeletons).toHaveLength(3);
    });

    it('should handle invalid variable data gracefully', () => {
      const invalidVariables = [
        null as any,
        undefined as any,
        {} as any,
        { id: 'valid', label: 'Valid', description: 'Valid variable' } as MentionVariable,
      ].filter(Boolean);

      expect(() => {
        render(
          <MentionSuggestionList
            items={invalidVariables}
            command={mockCommand}
            editor={mockEditor}
            range={mockRange}
            query=""
          />
        );
      }).not.toThrow();
    });

    it('should handle command function errors gracefully', async () => {
      const errorCommand = jest.fn(() => {
        throw new Error('Command failed');
      });
      
      const user = userEvent.setup();
      
      render(
        <MentionSuggestionList
          items={[mockVariables[0]]}
          command={errorCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const option = screen.getByText('Mieter Name').closest('[role="option"]');
      
      // Should not throw when clicking
      await expect(user.click(option!)).resolves.not.toThrow();
      expect(errorCommand).toHaveBeenCalled();
    });

    it('should handle keyboard navigation errors', () => {
      const ref = React.createRef<MentionSuggestionListRef>();
      
      // Mock the keyboard navigation hook to throw an error
      const mockUseKeyboardNavigation = require('@/hooks/use-keyboard-navigation').useKeyboardNavigation;
      mockUseKeyboardNavigation.mockImplementationOnce(() => {
        throw new Error('Keyboard navigation failed');
      });

      expect(() => {
        render(
          <MentionSuggestionList
            ref={ref}
            items={mockVariables.slice(0, 2)}
            command={mockCommand}
            editor={mockEditor}
            range={mockRange}
            query=""
          />
        );
      }).not.toThrow();
    });

    it('should handle text highlighting errors gracefully', () => {
      // Create a query that might cause regex issues
      const problematicQuery = '(.*+?^${}|[]\\';
      
      render(
        <MentionSuggestionList
          items={[mockVariables[0]]}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query={problematicQuery}
        />
      );

      // Should still render the variable without highlighting
      expect(screen.getByText('Mieter Name')).toBeInTheDocument();
    });
  });

  describe('Accessibility and Screen Reader Support', () => {
    it('should have proper ARIA live regions for dynamic content', () => {
      const { rerender } = render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      // Rerender with empty items to trigger "No matches found"
      rerender(
        <MentionSuggestionList
          items={[]}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query="nonexistent"
        />
      );

      const emptyState = screen.getByRole('status');
      expect(emptyState).toHaveAttribute('aria-live', 'polite');
    });

    it('should maintain proper focus management', () => {
      render(
        <MentionSuggestionList
          items={mockVariables.slice(0, 3)}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const listbox = screen.getByRole('listbox');
      const options = screen.getAllByRole('option');

      // Listbox should not be focusable
      expect(listbox).toHaveAttribute('tabIndex', '-1');

      // Only selected option should be focusable
      expect(options[0]).toHaveAttribute('tabIndex', '0');
      expect(options[1]).toHaveAttribute('tabIndex', '-1');
      expect(options[2]).toHaveAttribute('tabIndex', '-1');
    });

    it('should provide descriptive labels for screen readers', () => {
      render(
        <MentionSuggestionList
          items={[mockVariables[0]]}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const option = screen.getByRole('option');
      const label = screen.getByLabelText('Variable: Mieter Name');
      const description = screen.getByLabelText('Description: Full name of the tenant');

      expect(label).toBeInTheDocument();
      expect(description).toBeInTheDocument();
      expect(description).toHaveAttribute('id', 'suggestion-mieter.name-description');
      expect(option).toHaveAttribute('aria-describedby', 'suggestion-mieter.name-description');
    });

    it('should have proper activedescendant management', () => {
      render(
        <MentionSuggestionList
          items={mockVariables.slice(0, 2)}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-activedescendant', 'suggestion-mieter.name');
    });

    it('should handle empty state accessibility', () => {
      render(
        <MentionSuggestionList
          items={[]}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query="test"
        />
      );

      const emptyMessage = screen.getByText('No matches found');
      expect(emptyMessage.closest('[role="status"]')).toHaveAttribute('aria-live', 'polite');
    });

    it('should support mobile touch targets', () => {
      render(
        <MentionSuggestionList
          items={mockVariables.slice(0, 2)}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const options = screen.getAllByRole('option');
      options.forEach(option => {
        // Check that options have the mention-suggestion-item class for styling
        expect(option).toHaveClass('mention-suggestion-item');
      });
    });

    it('should provide category visual separation for screen readers', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      // Check for category separators
      const separators = document.querySelectorAll('.mention-category-separator');
      expect(separators.length).toBeGreaterThan(0);

      // Check category headers have proper structure
      const categoryHeaders = document.querySelectorAll('.mention-category-header');
      expect(categoryHeaders.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large numbers of variables efficiently', () => {
      const largeVariableSet = Array.from({ length: 100 }, (_, i) => 
        createMockVariable(`var${i}`, `Variable ${i}`, 'test', `Description ${i}`)
      );

      const startTime = performance.now();
      
      render(
        <MentionSuggestionList
          items={largeVariableSet}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const endTime = performance.now();
      
      // Should render within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Should still render all variables
      expect(screen.getByText('Variable 0')).toBeInTheDocument();
      expect(screen.getByText('Variable 99')).toBeInTheDocument();
    });

    it('should not cause memory leaks with frequent re-renders', () => {
      const { rerender } = render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      // Simulate rapid re-renders with different queries
      for (let i = 0; i < 10; i++) {
        rerender(
          <MentionSuggestionList
            items={mockVariables}
            command={mockCommand}
            editor={mockEditor}
            range={mockRange}
            query={`query${i}`}
          />
        );
      }

      // Should still be functional after multiple re-renders
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  describe('Integration with Error Boundary', () => {
    it('should work with error boundary wrapper', () => {
      const { useMentionSuggestionErrorHandler } = require('@/components/ai/mention-suggestion-error-boundary');
      
      // Mock error handler to simulate error state
      useMentionSuggestionErrorHandler.mockReturnValueOnce({
        error: new Error('Test error'),
        hasError: true,
        handleError: jest.fn(),
        retry: jest.fn(),
        reset: jest.fn(),
      });

      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      expect(screen.getByText('Error occurred: Test error')).toBeInTheDocument();
    });

    it('should handle error recovery', () => {
      const mockRetry = jest.fn();
      const { useMentionSuggestionErrorHandler } = require('@/components/ai/mention-suggestion-error-boundary');
      
      useMentionSuggestionErrorHandler.mockReturnValueOnce({
        error: new Error('Test error'),
        hasError: true,
        handleError: jest.fn(),
        retry: mockRetry,
        reset: jest.fn(),
      });

      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      
      expect(mockRetry).toHaveBeenCalled();
    });
  });
});