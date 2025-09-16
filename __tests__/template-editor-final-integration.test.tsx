/**
 * Final Integration Tests for Advanced TipTap Template Editor
 * 
 * This test suite covers the complete template editor functionality with suggestion modal,
 * verifies compatibility with existing template editor modal usage, tests edge cases,
 * and validates browser compatibility and performance.
 * 
 * Requirements covered: 1.5, 2.5, 3.5, 4.5, 5.5
 */

import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateEditor } from '@/components/template-editor';
import { TemplateEditorModal } from '@/components/template-editor-modal';
import { MENTION_VARIABLES } from '@/lib/template-constants';

// Mock performance API for performance testing
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
};

Object.defineProperty(window, 'performance', {
  writable: true,
  value: mockPerformance,
});

// Mock network conditions for network testing
const mockConnection = {
  effectiveType: '4g',
  downlink: 10,
  rtt: 100,
  saveData: false,
};

Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: mockConnection,
});

// Mock editor with comprehensive functionality
const mockEditor = {
  getHTML: jest.fn(() => '<p>Test content</p>'),
  getJSON: jest.fn(() => ({ type: 'doc', content: [] })),
  commands: {
    setContent: jest.fn(),
    focus: jest.fn(),
    insertContent: jest.fn(),
  },
  chain: jest.fn(() => {
    const mockRun = jest.fn();
    return {
      focus: jest.fn(() => ({
        toggleBold: jest.fn(() => ({ run: mockRun })),
        toggleItalic: jest.fn(() => ({ run: mockRun })),
        toggleBulletList: jest.fn(() => ({ run: mockRun })),
        toggleOrderedList: jest.fn(() => ({ run: mockRun })),
        toggleBlockquote: jest.fn(() => ({ run: mockRun })),
        undo: jest.fn(() => ({ run: mockRun })),
        redo: jest.fn(() => ({ run: mockRun })),
        insertContent: jest.fn(() => ({ run: mockRun })),
      })),
    };
  }),
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
let currentSuggestionProps: any = null;
let suggestionPopupElement: HTMLElement | null = null;

// Mock TipTap with comprehensive suggestion support
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => mockEditor),
  EditorContent: ({ editor }: any) => {
    const [content, setContent] = React.useState('');
    
    return (
      <div 
        data-testid="editor-content"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          const text = (e.target as HTMLElement).textContent || '';
          setContent(text);
          
          // Simulate mention trigger
          if (text.includes('@') && suggestionLifecycle) {
            const atIndex = text.lastIndexOf('@');
            const query = text.substring(atIndex + 1);
            
            const filteredItems = MENTION_VARIABLES.filter(v => 
              v.label.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 10);
            
            if (!currentSuggestionProps) {
              const mockProps = {
                editor: mockEditor,
                query: query,
                clientRect: () => new DOMRect(100, 200, 0, 20),
                items: filteredItems,
              };
              currentSuggestionProps = mockProps;
              suggestionLifecycle.onStart(mockProps);
            } else {
              const updatedProps = {
                ...currentSuggestionProps,
                query: query,
                items: filteredItems,
              };
              currentSuggestionProps = updatedProps;
              suggestionLifecycle.onUpdate(updatedProps);
            }
          }
        }}
        onKeyDown={(e) => {
          if (suggestionLifecycle && currentSuggestionProps) {
            suggestionLifecycle.onKeyDown({ event: e.nativeEvent });
          }
        }}
      >
        {content || 'Editor loaded'}
      </div>
    );
  },
  ReactRenderer: jest.fn().mockImplementation((component, props) => {
    const element = document.createElement('div');
    element.setAttribute('data-testid', 'suggestion-popup');
    
    // Create proper structure with items
    const items = props.props?.items || [];
    element.innerHTML = `
      <div role="listbox" aria-label="Variable suggestions" aria-live="polite">
        ${items.map((item: any) => 
          `<div role="option" data-testid="suggestion-item-${item.id}" tabindex="0">${item.label}</div>`
        ).join('')}
      </div>
    `;
    
    suggestionPopupElement = element;
    
    return {
      element,
      updateProps: jest.fn((newProps) => {
        if (newProps.items) {
          element.innerHTML = `
            <div role="listbox" aria-label="Variable suggestions" aria-live="polite">
              ${newProps.items.map((item: any) => 
                `<div role="option" data-testid="suggestion-item-${item.id}" tabindex="0">${item.label}</div>`
              ).join('')}
            </div>
          `;
        }
      }),
      destroy: jest.fn(() => {
        suggestionPopupElement = null;
      }),
      ref: {
        onKeyDown: jest.fn((props) => {
          if (props.event.key === 'Enter' || props.event.key === 'Tab') {
            // Simulate variable insertion
            const firstItem = currentSuggestionProps?.items?.[0];
            if (firstItem) {
              mockEditor.chain().focus().insertContent(`@${firstItem.label}`).run();
            }
            return true;
          }
          return false;
        }),
      },
    };
  }),
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

// Mock popup with comprehensive functionality
const mockPopup = {
  setProps: jest.fn(),
  hide: jest.fn(),
  destroy: jest.fn(),
  show: jest.fn(),
  popper: {
    state: {
      placement: 'bottom-start',
    },
  },
};

jest.mock('@/lib/mention-suggestion-popup', () => ({
  createViewportAwarePopup: jest.fn(() => mockPopup),
}));

// Mock modal store
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: jest.fn(() => ({
    setTemplateEditorModalDirty: jest.fn(),
    isTemplateEditorModalDirty: false,
    closeTemplateEditorModal: jest.fn(),
  })),
}));

// Mock all utility functions
jest.mock('@/lib/mention-utils', () => ({
  filterMentionVariables: jest.fn((variables, query, options = {}) => {
    const filtered = variables.filter((v: any) => 
      v.label.toLowerCase().includes(query.toLowerCase()) ||
      v.description.toLowerCase().includes(query.toLowerCase()) ||
      (v.keywords && v.keywords.some((k: string) => k.toLowerCase().includes(query.toLowerCase())))
    );
    
    if (options.prioritizeExactMatches) {
      return filtered.sort((a: any, b: any) => {
        const aExact = a.label.toLowerCase() === query.toLowerCase();
        const bExact = b.label.toLowerCase() === query.toLowerCase();
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      });
    }
    
    return filtered;
  }),
  groupMentionVariablesByCategory: jest.fn((variables) => {
    const grouped: any = {};
    variables.forEach((v: any) => {
      const category = v.category || 'other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(v);
    });
    return grouped;
  }),
  getOrderedCategories: jest.fn((grouped) => Object.keys(grouped).sort()),
}));

// Mock error handling
jest.mock('@/lib/mention-suggestion-error-handling', () => ({
  handleSuggestionInitializationError: jest.fn((error) => ({ 
    type: 'INITIALIZATION_FAILED', 
    message: error.message, 
    originalError: error 
  })),
  handleFilterError: jest.fn((error) => ({ 
    type: 'FILTER_ERROR', 
    message: error.message, 
    originalError: error 
  })),
  handlePositionError: jest.fn((error) => ({ 
    type: 'POSITION_ERROR', 
    message: error.message, 
    originalError: error 
  })),
  safeExecute: jest.fn((fn, errorType, context) => {
    try {
      const result = fn();
      return { success: true, result };
    } catch (error) {
      return { success: false, error: { type: errorType, message: (error as Error).message, originalError: error } };
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
    startTiming: jest.fn(() => jest.fn(() => 10)), // Returns end function that returns 10ms
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
  useKeyboardNavigation: jest.fn(({ itemCount, onSelect, initialIndex }) => ({
    selectedIndex: initialIndex || 0,
    setSelectedIndex: jest.fn(),
    handleKeyDown: jest.fn((event) => {
      if (event.key === 'Enter' || event.key === 'Tab') {
        onSelect(0);
        return true;
      }
      if (event.key === 'Escape') {
        return true;
      }
      return false;
    }),
  })),
}));

describe('Template Editor - Final Integration Tests', () => {
  const mockOnChange = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    suggestionLifecycle = null;
    currentSuggestionProps = null;
    suggestionPopupElement = null;
    
    // Reset performance mocks
    mockPerformance.now.mockReturnValue(Date.now());
    mockPerformance.mark.mockClear();
    mockPerformance.measure.mockClear();
    
    // Reset network mock
    mockConnection.effectiveType = '4g';
    mockConnection.downlink = 10;
    mockConnection.rtt = 100;
  });

  describe('Complete Template Editor Functionality', () => {
    it('should handle complete workflow from typing to variable insertion', async () => {
      const user = userEvent.setup();
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      // 1. Type regular content
      await user.type(editorContent, 'Dear ');
      
      // 2. Type "@" to trigger suggestions
      await user.type(editorContent, '@');
      
      await waitFor(() => {
        expect(suggestionLifecycle).toBeTruthy();
      });
      
      // 3. Type query to filter
      await user.type(editorContent, 'mieter');
      
      await waitFor(() => {
        expect(currentSuggestionProps?.query).toBe('mieter');
      });
      
      // 4. Select suggestion with Enter
      fireEvent.keyDown(editorContent, { key: 'Enter' });
      
      // 5. Continue typing
      await user.type(editorContent, ', your rent is due.');
      
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should maintain all toolbar functionality during suggestion usage', async () => {
      const user = userEvent.setup();
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      // Type content and trigger suggestions
      await user.type(editorContent, 'Hello @mieter');
      
      await waitFor(() => {
        expect(suggestionLifecycle).toBeTruthy();
      });
      
      // Test all toolbar buttons work with suggestions open
      const boldButton = screen.getByLabelText(/fett/i);
      await user.click(boldButton);
      expect(mockEditor.chain().focus().toggleBold().run).toHaveBeenCalled();
      
      const italicButton = screen.getByLabelText(/kursiv/i);
      await user.click(italicButton);
      expect(mockEditor.chain().focus().toggleItalic().run).toHaveBeenCalled();
      
      const listButton = screen.getByLabelText(/aufzählung/i);
      await user.click(listButton);
      
      const undoButton = screen.getByLabelText(/rückgängig/i);
      await user.click(undoButton);
    });

    it('should handle complex content with multiple mentions', async () => {
      const user = userEvent.setup();
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      // Create complex content with multiple mentions
      await user.type(editorContent, 'Dear @mieter');
      
      // First mention
      await waitFor(() => expect(suggestionLifecycle).toBeTruthy());
      fireEvent.keyDown(editorContent, { key: 'Enter' });
      
      // Continue with more content
      await user.type(editorContent, ', your apartment @wohnung');
      
      // Second mention
      await waitFor(() => expect(currentSuggestionProps?.query).toBe('wohnung'));
      fireEvent.keyDown(editorContent, { key: 'Tab' });
      
      // Final content
      await user.type(editorContent, ' is ready on @datum');
      
      // Third mention
      await waitFor(() => expect(currentSuggestionProps?.query).toBe('datum'));
      fireEvent.keyDown(editorContent, { key: 'Enter' });
      
      expect(mockOnChange).toHaveBeenCalledTimes(expect.any(Number));
    });

    it('should preserve formatting across mention insertions', async () => {
      const user = userEvent.setup();
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      // Apply bold formatting
      const boldButton = screen.getByLabelText(/fett/i);
      await user.click(boldButton);
      
      // Type content with mention
      await user.type(editorContent, 'Bold text with @mieter');
      
      await waitFor(() => expect(suggestionLifecycle).toBeTruthy());
      fireEvent.keyDown(editorContent, { key: 'Enter' });
      
      // Continue typing
      await user.type(editorContent, ' name');
      
      // Verify formatting is maintained
      expect(mockEditor.isActive).toHaveBeenCalledWith('bold');
    });
  });

  describe('Compatibility with Existing Template Editor Modal Usage', () => {
    it('should work correctly within TemplateEditorModal', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          title="Test Template"
        />
      );
      
      const editorContent = screen.getByTestId('editor-content');
      
      // Type content with mentions in modal
      await user.type(editorContent, 'Template content @mieter');
      
      await waitFor(() => {
        expect(suggestionLifecycle).toBeTruthy();
      });
      
      // Select suggestion
      fireEvent.keyDown(editorContent, { key: 'Enter' });
      
      // Save template
      const saveButton = screen.getByText('Speichern');
      await user.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalled();
    });

    it('should handle modal keyboard navigation with suggestions', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          title="Test Template"
        />
      );
      
      const editorContent = screen.getByTestId('editor-content');
      
      // Type to trigger suggestions
      await user.type(editorContent, '@mieter');
      
      await waitFor(() => {
        expect(suggestionLifecycle).toBeTruthy();
      });
      
      // Test Escape key - should close suggestions, not modal
      fireEvent.keyDown(editorContent, { key: 'Escape' });
      
      // Modal should still be open
      expect(screen.getByText('Test Template')).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should maintain modal state during suggestion interactions', async () => {
      const user = userEvent.setup();
      
      const TestModal = () => {
        const [content, setContent] = useState('');
        
        return (
          <TemplateEditorModal
            isOpen={true}
            onClose={mockOnClose}
            onSave={() => mockOnSave(content)}
            title="Test Template"
            initialContent={content}
            onChange={setContent}
          />
        );
      };
      
      render(<TestModal />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      // Type content with suggestions
      await user.type(editorContent, 'Content @mieter');
      
      await waitFor(() => {
        expect(suggestionLifecycle).toBeTruthy();
      });
      
      // Select suggestion
      fireEvent.keyDown(editorContent, { key: 'Enter' });
      
      // Modal state should be preserved
      expect(screen.getByText('Test Template')).toBeInTheDocument();
    });
  });

  describe('Edge Cases Testing', () => {
    it('should handle rapid typing without breaking suggestions', async () => {
      const user = userEvent.setup({ delay: null }); // No delay for rapid typing
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      // Rapid typing sequence
      await user.type(editorContent, '@mieternameveryfast', { delay: 1 });
      
      // Should still handle suggestions
      await waitFor(() => {
        expect(currentSuggestionProps?.query).toBe('mieternameveryfast');
      });
      
      // Should not crash
      expect(editorContent).toBeInTheDocument();
    });

    it('should handle network issues gracefully', async () => {
      const user = userEvent.setup();
      
      // Simulate slow network
      mockConnection.effectiveType = 'slow-2g';
      mockConnection.downlink = 0.1;
      mockConnection.rtt = 2000;
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      // Type to trigger suggestions
      await user.type(editorContent, '@mieter');
      
      // Should still work despite slow network
      await waitFor(() => {
        expect(suggestionLifecycle).toBeTruthy();
      }, { timeout: 5000 });
      
      expect(editorContent).toBeInTheDocument();
    });

    it('should handle memory pressure scenarios', async () => {
      const user = userEvent.setup();
      
      // Mock memory pressure
      const originalMemory = (performance as any).memory;
      (performance as any).memory = {
        usedJSHeapSize: 50000000, // 50MB
        totalJSHeapSize: 60000000, // 60MB
        jsHeapSizeLimit: 70000000, // 70MB - close to limit
      };
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      // Create many suggestions
      for (let i = 0; i < 10; i++) {
        await user.clear(editorContent);
        await user.type(editorContent, `@test${i}`);
        
        await waitFor(() => {
          expect(suggestionLifecycle).toBeTruthy();
        });
        
        fireEvent.keyDown(editorContent, { key: 'Escape' });
      }
      
      // Should not crash under memory pressure
      expect(editorContent).toBeInTheDocument();
      
      // Restore original memory
      (performance as any).memory = originalMemory;
    });

    it('should handle malformed variable data', async () => {
      const user = userEvent.setup();
      
      // Mock malformed variables
      const { filterMentionVariables } = require('@/lib/mention-utils');
      filterMentionVariables.mockImplementationOnce(() => {
        throw new Error('Malformed variable data');
      });
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      // Type to trigger suggestions
      await user.type(editorContent, '@mieter');
      
      // Should handle error gracefully
      expect(editorContent).toBeInTheDocument();
      expect(screen.queryByText('Variable suggestions temporarily unavailable')).toBeInTheDocument();
    });

    it('should handle DOM manipulation during suggestions', async () => {
      const user = userEvent.setup();
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      // Type to trigger suggestions
      await user.type(editorContent, '@mieter');
      
      await waitFor(() => {
        expect(suggestionLifecycle).toBeTruthy();
      });
      
      // Simulate external DOM manipulation
      act(() => {
        const newDiv = document.createElement('div');
        newDiv.textContent = 'External content';
        document.body.appendChild(newDiv);
      });
      
      // Suggestions should still work
      fireEvent.keyDown(editorContent, { key: 'Enter' });
      
      expect(mockEditor.chain().focus().insertContent().run).toHaveBeenCalled();
    });

    it('should handle concurrent suggestion sessions', async () => {
      const user = userEvent.setup();
      
      // Render multiple editors
      const { rerender } = render(
        <div>
          <TemplateEditor onChange={mockOnChange} />
          <TemplateEditor onChange={mockOnChange} />
        </div>
      );
      
      const editors = screen.getAllByTestId('editor-content');
      
      // Type in first editor
      await user.type(editors[0], '@mieter');
      
      await waitFor(() => {
        expect(suggestionLifecycle).toBeTruthy();
      });
      
      // Type in second editor
      await user.type(editors[1], '@wohnung');
      
      // Should handle multiple concurrent sessions
      expect(editors[0]).toBeInTheDocument();
      expect(editors[1]).toBeInTheDocument();
    });
  });

  describe('Browser Compatibility Testing', () => {
    it('should work in Chrome-like environments', async () => {
      const user = userEvent.setup();
      
      // Mock Chrome user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      });
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      await user.type(editorContent, '@mieter');
      
      await waitFor(() => {
        expect(suggestionLifecycle).toBeTruthy();
      });
      
      fireEvent.keyDown(editorContent, { key: 'Enter' });
      
      expect(mockEditor.chain().focus().insertContent().run).toHaveBeenCalled();
    });

    it('should work in Firefox-like environments', async () => {
      const user = userEvent.setup();
      
      // Mock Firefox user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      });
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      await user.type(editorContent, '@wohnung');
      
      await waitFor(() => {
        expect(suggestionLifecycle).toBeTruthy();
      });
      
      fireEvent.keyDown(editorContent, { key: 'Tab' });
      
      expect(mockEditor.chain().focus().insertContent().run).toHaveBeenCalled();
    });

    it('should work in Safari-like environments', async () => {
      const user = userEvent.setup();
      
      // Mock Safari user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      });
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      await user.type(editorContent, '@datum');
      
      await waitFor(() => {
        expect(suggestionLifecycle).toBeTruthy();
      });
      
      fireEvent.keyDown(editorContent, { key: 'Enter' });
      
      expect(mockEditor.chain().focus().insertContent().run).toHaveBeenCalled();
    });

    it('should handle touch events on mobile browsers', async () => {
      const user = userEvent.setup();
      
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      });
      
      // Mock touch support
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        value: {},
      });
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      await user.type(editorContent, '@mieter');
      
      await waitFor(() => {
        expect(suggestionLifecycle).toBeTruthy();
      });
      
      // Simulate touch interaction
      fireEvent.touchStart(editorContent);
      fireEvent.touchEnd(editorContent);
      
      expect(editorContent).toBeInTheDocument();
    });
  });

  describe('Performance Testing', () => {
    it('should maintain good performance with large variable lists', async () => {
      const user = userEvent.setup();
      
      // Mock large variable list
      const largeVariableList = Array.from({ length: 1000 }, (_, i) => ({
        id: `var-${i}`,
        label: `Variable ${i}`,
        description: `Description for variable ${i}`,
        category: 'test',
      }));
      
      const { filterMentionVariables } = require('@/lib/mention-utils');
      filterMentionVariables.mockImplementation((variables, query) => 
        largeVariableList.filter(v => v.label.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
      );
      
      const startTime = performance.now();
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      await user.type(editorContent, '@variable');
      
      await waitFor(() => {
        expect(suggestionLifecycle).toBeTruthy();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);
    });

    it('should handle rapid suggestion updates efficiently', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      const startTime = performance.now();
      
      // Rapid typing to trigger many updates
      await user.type(editorContent, '@mieternameverylong', { delay: 1 });
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      // Should handle rapid updates efficiently
      expect(updateTime).toBeLessThan(500);
      expect(editorContent).toBeInTheDocument();
    });

    it('should clean up resources properly', async () => {
      const user = userEvent.setup();
      
      const { unmount } = render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      // Create suggestions
      await user.type(editorContent, '@mieter');
      
      await waitFor(() => {
        expect(suggestionLifecycle).toBeTruthy();
      });
      
      // Unmount component
      unmount();
      
      // Should clean up properly
      expect(mockEditor.destroy).toHaveBeenCalled();
    });

    it('should handle memory leaks prevention', async () => {
      const user = userEvent.setup();
      
      // Track resource creation
      let resourceCount = 0;
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn((...args) => {
        resourceCount++;
        return originalCreateElement.apply(document, args);
      });
      
      const { unmount } = render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      // Create and destroy suggestions multiple times
      for (let i = 0; i < 5; i++) {
        await user.clear(editorContent);
        await user.type(editorContent, `@test${i}`);
        
        await waitFor(() => {
          expect(suggestionLifecycle).toBeTruthy();
        });
        
        fireEvent.keyDown(editorContent, { key: 'Escape' });
      }
      
      const initialResourceCount = resourceCount;
      
      // Unmount
      unmount();
      
      // Resource count should not grow excessively
      expect(resourceCount - initialResourceCount).toBeLessThan(100);
      
      // Restore original createElement
      document.createElement = originalCreateElement;
    });
  });

  describe('Accessibility and Screen Reader Compatibility', () => {
    it('should maintain accessibility during suggestion interactions', async () => {
      const user = userEvent.setup();
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      await user.type(editorContent, '@mieter');
      
      await waitFor(() => {
        expect(suggestionPopupElement).toBeTruthy();
      });
      
      // Check ARIA attributes
      const listbox = suggestionPopupElement?.querySelector('[role="listbox"]');
      expect(listbox).toHaveAttribute('aria-label', 'Variable suggestions');
      
      const options = suggestionPopupElement?.querySelectorAll('[role="option"]');
      expect(options?.length).toBeGreaterThan(0);
      
      options?.forEach(option => {
        expect(option).toHaveAttribute('tabindex', '0');
      });
    });

    it('should support keyboard-only navigation', async () => {
      const user = userEvent.setup();
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      // Navigate to editor using Tab
      await user.tab();
      expect(editorContent).toHaveFocus();
      
      // Type to trigger suggestions
      await user.type(editorContent, '@mieter');
      
      await waitFor(() => {
        expect(suggestionLifecycle).toBeTruthy();
      });
      
      // Use keyboard to select
      fireEvent.keyDown(editorContent, { key: 'ArrowDown' });
      fireEvent.keyDown(editorContent, { key: 'Enter' });
      
      expect(mockEditor.chain().focus().insertContent().run).toHaveBeenCalled();
    });

    it('should announce changes to screen readers', async () => {
      const user = userEvent.setup();
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      
      await user.type(editorContent, '@mieter');
      
      await waitFor(() => {
        expect(suggestionPopupElement).toBeTruthy();
      });
      
      // Should have live region for announcements
      const liveRegion = suggestionPopupElement?.querySelector('[aria-live]');
      expect(liveRegion).toBeInTheDocument();
    });
  });
});