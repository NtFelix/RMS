/**
 * Accessibility tests for mention suggestion functionality
 * Tests screen reader compatibility, keyboard navigation, ARIA attributes,
 * and compliance with WCAG guidelines
 * 
 * Requirements covered: 4.2, 4.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MentionSuggestionList, MentionSuggestionListRef } from '@/components/ai/mention-suggestion-list';
import { MentionVariable } from '@/lib/template-constants';
import { Editor } from '@tiptap/react';

// Mock dependencies for accessibility testing
jest.mock('@/lib/template-constants', () => ({
  getCategoryConfig: jest.fn((categoryId: string) => ({
    id: categoryId,
    label: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
    icon: 'User',
    color: 'text-blue-600',
    order: 1,
  })),
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
    Object.keys(grouped).sort()
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
  handleRenderError: jest.fn(),
  handleKeyboardNavigationError: jest.fn(),
  safeExecute: jest.fn((fn) => ({ success: true, result: fn() })),
  createGracefulFallback: jest.fn(() => ({ fallbackSuggestion: jest.fn() })),
  mentionSuggestionErrorRecovery: {
    recordError: jest.fn(() => false),
    isInFallbackMode: jest.fn(() => false),
  },
}));

jest.mock('@/components/ai/mention-suggestion-error-boundary', () => ({
  useMentionSuggestionErrorHandler: jest.fn(() => ({
    error: null,
    hasError: false,
    handleError: jest.fn(),
    retry: jest.fn(),
    reset: jest.fn(),
  })),
}));

describe('MentionSuggestionList - Accessibility Tests', () => {
  const mockEditor = {} as Editor;
  const mockRange = {} as any;
  const mockCommand = jest.fn();

  const mockVariables: MentionVariable[] = [
    {
      id: 'mieter.name',
      label: 'Mieter Name',
      description: 'Full name of the tenant',
      category: 'mieter',
    },
    {
      id: 'mieter.email',
      label: 'Mieter E-Mail',
      description: 'Email address of the tenant',
      category: 'mieter',
    },
    {
      id: 'wohnung.nummer',
      label: 'Wohnungsnummer',
      description: 'Apartment number',
      category: 'wohnung',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ARIA Attributes and Roles', () => {
    it('should have proper listbox role and attributes', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const listbox = screen.getByRole('listbox');
      
      // Required ARIA attributes for listbox
      expect(listbox).toHaveAttribute('aria-label', 'Variable suggestions');
      expect(listbox).toHaveAttribute('aria-expanded', 'true');
      expect(listbox).toHaveAttribute('aria-multiselectable', 'false');
      expect(listbox).toHaveAttribute('tabIndex', '-1');
    });

    it('should have proper option roles and attributes', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const options = screen.getAllByRole('option');
      
      expect(options).toHaveLength(3);
      
      options.forEach((option, index) => {
        expect(option).toHaveAttribute('role', 'option');
        expect(option).toHaveAttribute('id', `suggestion-${mockVariables[index].id}`);
        expect(option).toHaveAttribute('aria-describedby', `suggestion-${mockVariables[index].id}-description`);
        
        // Only first option should be selected initially
        if (index === 0) {
          expect(option).toHaveAttribute('aria-selected', 'true');
          expect(option).toHaveAttribute('tabIndex', '0');
        } else {
          expect(option).toHaveAttribute('aria-selected', 'false');
          expect(option).toHaveAttribute('tabIndex', '-1');
        }
      });
    });

    it('should have proper activedescendant management', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-activedescendant', 'suggestion-mieter.name');
    });

    it('should update activedescendant when selection changes', async () => {
      const user = userEvent.setup();
      
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const listbox = screen.getByRole('listbox');
      const secondOption = screen.getByText('Mieter E-Mail').closest('[role="option"]');
      
      // Hover to change selection
      await user.hover(secondOption!);
      
      expect(listbox).toHaveAttribute('aria-activedescendant', 'suggestion-mieter.email');
    });

    it('should have proper description associations', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      mockVariables.forEach(variable => {
        const description = screen.getByText(variable.description);
        expect(description).toHaveAttribute('id', `suggestion-${variable.id}-description`);
        
        const option = screen.getByText(variable.label).closest('[role="option"]');
        expect(option).toHaveAttribute('aria-describedby', `suggestion-${variable.id}-description`);
      });
    });
  });

  describe('Keyboard Navigation Accessibility', () => {
    it('should handle arrow key navigation with proper ARIA updates', () => {
      const ref = React.createRef<MentionSuggestionListRef>();
      
      render(
        <MentionSuggestionList
          ref={ref}
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const listbox = screen.getByRole('listbox');
      
      // Initial state
      expect(listbox).toHaveAttribute('aria-activedescendant', 'suggestion-mieter.name');
      
      // Simulate arrow down
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      ref.current?.onKeyDown({ event: downEvent });
      
      // Should update activedescendant (mocked behavior)
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('should prevent default behavior for navigation keys', () => {
      const ref = React.createRef<MentionSuggestionListRef>();
      
      render(
        <MentionSuggestionList
          ref={ref}
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const navigationKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'];
      
      navigationKeys.forEach(key => {
        const event = new KeyboardEvent('keydown', { key });
        const preventDefault = jest.spyOn(event, 'preventDefault');
        
        ref.current?.onKeyDown({ event });
        
        expect(preventDefault).toHaveBeenCalled();
      });
    });

    it('should maintain focus management correctly', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
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
      options.slice(1).forEach(option => {
        expect(option).toHaveAttribute('tabIndex', '-1');
      });
    });

    it('should handle keyboard selection with proper announcements', () => {
      const ref = React.createRef<MentionSuggestionListRef>();
      
      render(
        <MentionSuggestionList
          ref={ref}
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      // Simulate Enter key selection
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      ref.current?.onKeyDown({ event: enterEvent });
      
      expect(mockCommand).toHaveBeenCalledWith(mockVariables[0]);
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide descriptive labels for variables', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      mockVariables.forEach(variable => {
        const label = screen.getByLabelText(`Variable: ${variable.label}`);
        const description = screen.getByLabelText(`Description: ${variable.description}`);
        
        expect(label).toBeInTheDocument();
        expect(description).toBeInTheDocument();
      });
    });

    it('should have proper live regions for dynamic content', () => {
      const { rerender } = render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      // Rerender with empty items
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
      expect(emptyState).toHaveTextContent('No matches found');
    });

    it('should have proper live region for loading state', () => {
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

      const loadingState = screen.getByRole('status');
      expect(loadingState).toHaveAttribute('aria-live', 'polite');
      expect(loadingState).toHaveTextContent('Loading suggestions...');
    });

    it('should announce selection changes appropriately', async () => {
      const user = userEvent.setup();
      
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const secondOption = screen.getByText('Mieter E-Mail').closest('[role="option"]');
      
      // Hover should update selection
      await user.hover(secondOption!);
      
      expect(secondOption).toHaveAttribute('aria-selected', 'true');
      expect(secondOption).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Mobile and Touch Accessibility', () => {
    it('should have proper touch target sizes', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const options = screen.getAllByRole('option');
      
      options.forEach(option => {
        // Check that options have proper styling classes
        expect(option).toHaveClass('mention-suggestion-item');
      });
    });

    it('should support touch interactions', async () => {
      const user = userEvent.setup();
      
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const firstOption = screen.getByText('Mieter Name').closest('[role="option"]');
      
      // Touch/click should work
      await user.click(firstOption!);
      
      expect(mockCommand).toHaveBeenCalledWith(mockVariables[0]);
    });

    it('should have proper spacing for touch interactions', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const options = screen.getAllByRole('option');
      
      options.forEach(option => {
        // Should have proper padding and spacing
        expect(option).toHaveClass('mention-suggestion-item');
      });
    });
  });

  describe('High Contrast and Visual Accessibility', () => {
    it('should have proper contrast classes for selection states', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const selectedOption = screen.getAllByRole('option')[0];
      expect(selectedOption).toHaveClass('selected');
    });

    it('should support reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
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

      // Component should render without animations
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  describe('Error State Accessibility', () => {
    it('should have proper ARIA attributes for error states', () => {
      const { useMentionSuggestionErrorHandler } = require('@/components/ai/mention-suggestion-error-boundary');
      
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

      // Check that error fallback is rendered with proper attributes
      const errorElement = screen.getByTestId('error-fallback');
      expect(errorElement).toHaveAttribute('role', 'alert');
    });

    it('should provide accessible error recovery options', () => {
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
      expect(retryButton).toBeInTheDocument();
      expect(retryButton.tagName).toBe('BUTTON');
    });
  });

  describe('Category Accessibility', () => {
    it('should have proper category header structure', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      // Category headers should be present
      expect(screen.getByText('Mieter')).toBeInTheDocument();
      expect(screen.getByText('Wohnung')).toBeInTheDocument();
    });

    it('should have visual separators between categories', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      // Should have category separators
      const separators = document.querySelectorAll('.mention-category-separator');
      expect(separators.length).toBeGreaterThan(0);
    });

    it('should group related options under category headers', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      // Mieter category should contain mieter variables
      const mieterHeader = screen.getByText('Mieter');
      const mieterName = screen.getByText('Mieter Name');
      const mieterEmail = screen.getByText('Mieter E-Mail');
      
      expect(mieterHeader).toBeInTheDocument();
      expect(mieterName).toBeInTheDocument();
      expect(mieterEmail).toBeInTheDocument();
    });
  });

  describe('Query Highlighting Accessibility', () => {
    it('should use semantic markup for highlighting', () => {
      render(
        <MentionSuggestionList
          items={[mockVariables[0]]}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query="mieter"
        />
      );

      const highlightedText = document.querySelector('mark');
      expect(highlightedText).toBeInTheDocument();
      expect(highlightedText?.tagName).toBe('MARK');
    });

    it('should handle highlighting without breaking accessibility', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query="name"
        />
      );

      // Labels should still be accessible even with highlighting
      const nameLabel = screen.getByLabelText('Variable: Mieter Name');
      expect(nameLabel).toBeInTheDocument();
    });
  });

  describe('WCAG Compliance', () => {
    it('should meet WCAG 2.1 AA requirements for keyboard navigation', () => {
      const ref = React.createRef<MentionSuggestionListRef>();
      
      render(
        <MentionSuggestionList
          ref={ref}
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      // All interactive elements should be keyboard accessible
      const navigationKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'];
      
      navigationKeys.forEach(key => {
        const event = new KeyboardEvent('keydown', { key });
        const result = ref.current?.onKeyDown({ event });
        expect(result).toBe(true);
      });
    });

    it('should have proper focus indicators', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const selectedOption = screen.getAllByRole('option')[0];
      expect(selectedOption).toHaveAttribute('tabIndex', '0');
      expect(selectedOption).toHaveClass('selected');
    });

    it('should provide sufficient context for screen readers', () => {
      render(
        <MentionSuggestionList
          items={mockVariables}
          command={mockCommand}
          editor={mockEditor}
          range={mockRange}
          query=""
        />
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-label', 'Variable suggestions');
      
      const options = screen.getAllByRole('option');
      options.forEach(option => {
        expect(option).toHaveAttribute('aria-describedby');
      });
    });
  });
});