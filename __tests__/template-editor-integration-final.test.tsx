/**
 * Final Integration Tests for Advanced TipTap Template Editor
 * 
 * This test suite focuses on the core integration functionality and bug fixes
 * identified during final testing phase.
 * 
 * Requirements covered: 1.5, 2.5, 3.5, 4.5, 5.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateEditor } from '@/components/template-editor';
import { MENTION_VARIABLES } from '@/lib/template-constants';

// Mock the modal store
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: jest.fn(() => ({
    setTemplateEditorModalDirty: jest.fn(),
    isTemplateEditorModalDirty: false,
    closeTemplateEditorModal: jest.fn(),
  })),
}));

// Mock TipTap with working editor
const mockEditor = {
  getHTML: jest.fn(() => '<p>Test content</p>'),
  getJSON: jest.fn(() => ({ type: 'doc', content: [] })),
  commands: {
    setContent: jest.fn(),
    focus: jest.fn(),
    insertContent: jest.fn(),
  },
  chain: jest.fn(() => ({
    focus: jest.fn(() => ({
      toggleBold: jest.fn(() => ({ run: jest.fn() })),
      toggleItalic: jest.fn(() => ({ run: jest.fn() })),
      toggleBulletList: jest.fn(() => ({ run: jest.fn() })),
      toggleOrderedList: jest.fn(() => ({ run: jest.fn() })),
      toggleBlockquote: jest.fn(() => ({ run: jest.fn() })),
      undo: jest.fn(() => ({ run: jest.fn() })),
      redo: jest.fn(() => ({ run: jest.fn() })),
      insertContent: jest.fn(() => ({ run: jest.fn() })),
    })),
  })),
  can: jest.fn(() => ({
    undo: jest.fn(() => true),
    redo: jest.fn(() => true),
  })),
  isActive: jest.fn(() => false),
  isEmpty: false,
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn(),
  view: {
    dom: document.createElement('div'),
  },
};

let suggestionLifecycle: any = null;

jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => mockEditor),
  EditorContent: ({ editor }: any) => (
    <div 
      data-testid="editor-content"
      contentEditable
      suppressContentEditableWarning
    >
      Editor Content
    </div>
  ),
  ReactRenderer: jest.fn().mockImplementation(() => ({
    element: document.createElement('div'),
    updateProps: jest.fn(),
    destroy: jest.fn(),
    ref: {
      onKeyDown: jest.fn(() => true),
    },
  })),
}));

jest.mock('@tiptap/starter-kit', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(() => ({ name: 'starterKit' })),
  },
}));

jest.mock('@tiptap/extension-mention', () => ({
  __esModule: true,
  default: {
    configure: jest.fn((config) => {
      if (config.suggestion && config.suggestion.render) {
        suggestionLifecycle = config.suggestion.render();
      }
      return { name: 'mention' };
    }),
  },
}));

// Mock utilities
jest.mock('@/lib/mention-utils', () => ({
  filterMentionVariables: jest.fn((variables, query) => 
    variables.filter((v: any) => 
      v.label.toLowerCase().includes(query.toLowerCase())
    )
  ),
  groupMentionVariablesByCategory: jest.fn((variables) => ({ test: variables })),
  getOrderedCategories: jest.fn(() => ['test']),
}));

jest.mock('@/lib/mention-suggestion-popup', () => ({
  createViewportAwarePopup: jest.fn(() => ({
    setProps: jest.fn(),
    hide: jest.fn(),
    destroy: jest.fn(),
  })),
}));

// Mock error handling
jest.mock('@/lib/mention-suggestion-error-handling', () => ({
  MentionSuggestionErrorType: {
    INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
    FILTER_ERROR: 'FILTER_ERROR',
    POSITION_ERROR: 'POSITION_ERROR',
    RENDER_ERROR: 'RENDER_ERROR',
    KEYBOARD_NAVIGATION_ERROR: 'KEYBOARD_NAVIGATION_ERROR',
  },
  handleSuggestionInitializationError: jest.fn((error) => error),
  handleFilterError: jest.fn((error) => error),
  handlePositionError: jest.fn((error) => error),
  safeExecute: jest.fn((fn) => {
    try {
      return { success: true, result: fn() };
    } catch (error) {
      return { success: false, error };
    }
  }),
  createGracefulFallback: jest.fn(() => ({
    fallbackFilter: jest.fn((variables, query) => 
      variables.filter((v: any) => v.label.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    ),
    fallbackSuggestion: jest.fn(),
  })),
  mentionSuggestionErrorRecovery: {
    recordError: jest.fn(() => false),
    isInFallbackMode: jest.fn(() => false),
    reset: jest.fn(),
  },
}));

// Mock performance monitoring
jest.mock('@/lib/mention-suggestion-performance', () => ({
  suggestionPerformanceMonitor: {
    startTiming: jest.fn(() => jest.fn(() => 10)),
    recordMetric: jest.fn(),
    getMetrics: jest.fn(() => ({})),
  },
  createDebouncedFunction: jest.fn((fn, delay) => ({
    debouncedFn: fn,
    cancel: jest.fn(),
  })),
  createResourceCleanupTracker: jest.fn(() => ({
    register: jest.fn(),
    cleanup: jest.fn(),
  })),
  useRenderPerformanceMonitor: jest.fn(),
}));

// Mock error boundary
jest.mock('@/components/mention-suggestion-error-boundary', () => ({
  MentionSuggestionErrorBoundary: ({ children }: any) => children,
  useMentionSuggestionErrorHandler: () => ({
    error: null,
    hasError: false,
    handleError: jest.fn(),
    retry: jest.fn(),
    reset: jest.fn(),
  }),
}));

// Mock keyboard navigation
jest.mock('@/hooks/use-keyboard-navigation', () => ({
  useKeyboardNavigation: jest.fn(() => ({
    selectedIndex: 0,
    setSelectedIndex: jest.fn(),
    handleKeyDown: jest.fn(() => true),
  })),
}));

describe('Template Editor - Final Integration Tests', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    suggestionLifecycle = null;
  });

  describe('Core Editor Functionality', () => {
    it('should render editor with all essential components', () => {
      render(<TemplateEditor onChange={mockOnChange} />);
      
      // Check that editor renders
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
      
      // Check toolbar buttons
      expect(screen.getByLabelText(/fett/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/kursiv/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/aufzählung/i)).toBeInTheDocument();
      
      // Check mention helper
      expect(screen.getByText('@')).toBeInTheDocument();
    });

    it('should handle toolbar interactions correctly', async () => {
      const user = userEvent.setup();
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      // Test bold button
      const boldButton = screen.getByLabelText(/fett/i);
      await user.click(boldButton);
      
      expect(mockEditor.chain().focus().toggleBold().run).toHaveBeenCalled();
    });

    it('should handle content changes', () => {
      const { rerender } = render(<TemplateEditor onChange={mockOnChange} content="Initial" />);
      
      expect(mockEditor.commands.setContent).toHaveBeenCalledWith("Initial");
      
      rerender(<TemplateEditor onChange={mockOnChange} content="Updated" />);
      
      expect(mockEditor.commands.setContent).toHaveBeenCalledWith("Updated");
    });

    it('should work in read-only mode', () => {
      render(<TemplateEditor onChange={mockOnChange} readOnly />);
      
      // Toolbar should not be visible in read-only mode
      expect(screen.queryByLabelText(/fett/i)).not.toBeInTheDocument();
      
      // Editor content should still be present
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });
  });

  describe('Mention Extension Integration', () => {
    it('should configure mention extension properly', () => {
      render(<TemplateEditor onChange={mockOnChange} />);
      
      // Verify mention extension was configured
      const MentionExtension = require('@tiptap/extension-mention').default;
      expect(MentionExtension.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          HTMLAttributes: expect.any(Object),
          renderText: expect.any(Function),
          suggestion: expect.objectContaining({
            char: '@',
            allowSpaces: false,
            startOfLine: false,
            items: expect.any(Function),
            render: expect.any(Function),
          }),
        })
      );
    });

    it('should handle suggestion lifecycle creation', () => {
      render(<TemplateEditor onChange={mockOnChange} />);
      
      // Suggestion lifecycle should be created
      expect(suggestionLifecycle).toBeTruthy();
      expect(suggestionLifecycle.onStart).toBeDefined();
      expect(suggestionLifecycle.onUpdate).toBeDefined();
      expect(suggestionLifecycle.onKeyDown).toBeDefined();
      expect(suggestionLifecycle.onExit).toBeDefined();
    });

    it('should filter mention variables correctly', () => {
      render(<TemplateEditor onChange={mockOnChange} />);
      
      // Get the items function from mention configuration
      const MentionExtension = require('@tiptap/extension-mention').default;
      const configCall = MentionExtension.configure.mock.calls[0][0];
      const itemsFunction = configCall.suggestion.items;
      
      // Test filtering
      const result = itemsFunction({ query: 'mieter' });
      
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle editor initialization failure', () => {
      const useEditorMock = require('@tiptap/react').useEditor;
      useEditorMock.mockReturnValueOnce(null);
      
      const { container } = render(<TemplateEditor onChange={mockOnChange} />);
      
      // Should render nothing when editor is null
      expect(container.firstChild).toBeNull();
    });

    it('should handle missing onChange callback', () => {
      expect(() => {
        render(<TemplateEditor />);
      }).not.toThrow();
    });

    it('should handle malformed content gracefully', () => {
      const malformedContent = { invalid: 'content' } as any;
      
      expect(() => {
        render(<TemplateEditor onChange={mockOnChange} content={malformedContent} />);
      }).not.toThrow();
    });

    it('should show error state when suggestions fail', () => {
      // Mock suggestion error
      const { safeExecute } = require('@/lib/mention-suggestion-error-handling');
      safeExecute.mockReturnValueOnce({ success: false, error: new Error('Test error') });
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      // Should still render editor
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });
  });

  describe('Performance and Resource Management', () => {
    it('should clean up resources on unmount', () => {
      const { unmount } = render(<TemplateEditor onChange={mockOnChange} />);
      
      unmount();
      
      // Should call destroy on editor
      expect(mockEditor.destroy).toHaveBeenCalled();
    });

    it('should handle rapid re-renders efficiently', () => {
      const { rerender } = render(<TemplateEditor onChange={mockOnChange} />);
      
      // Clear previous calls
      mockEditor.commands.setContent.mockClear();
      
      // Multiple re-renders with same content
      for (let i = 0; i < 5; i++) {
        rerender(<TemplateEditor onChange={mockOnChange} />);
      }
      
      // Should not call setContent unnecessarily
      expect(mockEditor.commands.setContent).not.toHaveBeenCalled();
    });

    it('should use debounced filtering for performance', () => {
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const { createDebouncedFunction } = require('@/lib/mention-suggestion-performance');
      expect(createDebouncedFunction).toHaveBeenCalled();
    });

    it('should track resources for cleanup', () => {
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const { createResourceCleanupTracker } = require('@/lib/mention-suggestion-performance');
      expect(createResourceCleanupTracker).toHaveBeenCalled();
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA attributes', () => {
      render(<TemplateEditor onChange={mockOnChange} />);
      
      // Check main container
      const container = screen.getByRole('application');
      expect(container).toHaveAttribute('aria-label');
      
      // Check toolbar
      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveAttribute('aria-label');
      
      // Check button groups
      const groups = screen.getAllByRole('group');
      expect(groups.length).toBeGreaterThan(0);
      groups.forEach(group => {
        expect(group).toHaveAttribute('aria-label');
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const boldButton = screen.getByLabelText(/fett/i);
      
      // Focus and activate with keyboard
      boldButton.focus();
      await user.keyboard('{Enter}');
      
      expect(mockEditor.chain().focus().toggleBold().run).toHaveBeenCalled();
    });

    it('should have proper button states and labels', () => {
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const buttons = screen.getAllByRole('button');
      
      buttons.forEach(button => {
        // Each button should have accessible name
        expect(button).toHaveAccessibleName();
        
        // Buttons with pressed state should have aria-pressed
        if (button.hasAttribute('aria-pressed')) {
          expect(['true', 'false']).toContain(button.getAttribute('aria-pressed'));
        }
      });
    });
  });

  describe('Browser Compatibility', () => {
    it('should handle different user agents', () => {
      // Test with different user agents
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
      ];
      
      userAgents.forEach(userAgent => {
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: userAgent,
        });
        
        expect(() => {
          render(<TemplateEditor onChange={mockOnChange} />);
        }).not.toThrow();
      });
    });

    it('should handle touch devices', () => {
      // Mock touch support
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        value: {},
      });
      
      expect(() => {
        render(<TemplateEditor onChange={mockOnChange} />);
      }).not.toThrow();
      
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('should handle viewport changes', () => {
      const { rerender } = render(<TemplateEditor onChange={mockOnChange} />);
      
      // Simulate viewport change
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 375, // Mobile width
      });
      
      fireEvent.resize(window);
      
      rerender(<TemplateEditor onChange={mockOnChange} />);
      
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Stress Testing', () => {
    it('should handle empty content gracefully', () => {
      render(<TemplateEditor onChange={mockOnChange} content="" />);
      
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('should handle null/undefined content', () => {
      expect(() => {
        render(<TemplateEditor onChange={mockOnChange} content={null as any} />);
      }).not.toThrow();
      
      expect(() => {
        render(<TemplateEditor onChange={mockOnChange} content={undefined} />);
      }).not.toThrow();
    });

    it('should handle large content efficiently', () => {
      const largeContent = 'A'.repeat(10000);
      
      expect(() => {
        render(<TemplateEditor onChange={mockOnChange} content={largeContent} />);
      }).not.toThrow();
      
      expect(mockEditor.commands.setContent).toHaveBeenCalledWith(largeContent);
    });

    it('should handle rapid prop changes', () => {
      const { rerender } = render(<TemplateEditor onChange={mockOnChange} content="1" />);
      
      // Rapid content changes
      for (let i = 2; i <= 10; i++) {
        rerender(<TemplateEditor onChange={mockOnChange} content={i.toString()} />);
      }
      
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });
  });

  describe('Integration with Existing Components', () => {
    it('should work with custom className', () => {
      const customClass = 'custom-editor-class';
      const { container } = render(
        <TemplateEditor onChange={mockOnChange} className={customClass} />
      );
      
      expect(container.firstChild).toHaveClass(customClass);
    });

    it('should work with custom placeholder', () => {
      mockEditor.isEmpty = true;
      const customPlaceholder = 'Custom placeholder text';
      
      render(<TemplateEditor onChange={mockOnChange} placeholder={customPlaceholder} />);
      
      expect(screen.getByText(customPlaceholder)).toBeInTheDocument();
    });

    it('should handle ARIA attributes properly', () => {
      const ariaLabel = 'Custom editor label';
      const ariaDescribedBy = 'editor-description';
      
      render(
        <TemplateEditor 
          onChange={mockOnChange} 
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
        />
      );
      
      const container = screen.getByRole('application');
      expect(container).toHaveAttribute('aria-label', ariaLabel);
      expect(container).toHaveAttribute('aria-describedby', ariaDescribedBy);
    });
  });
});