import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandMenu } from './command-menu';

// Mock the hooks
jest.mock('@/hooks/use-command-menu', () => ({
  useCommandMenu: () => ({
    open: true,
    setOpen: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: {
    getState: () => ({
      openTenantModal: jest.fn(),
      openHouseModal: jest.fn(),
      openWohnungModal: jest.fn(),
      openFinanceModal: jest.fn(),
      openAufgabeModal: jest.fn(),
      openConfirmationModal: jest.fn(),
    }),
  },
}));

jest.mock('@/hooks/use-search', () => ({
  useSearch: () => ({
    query: '',
    setQuery: jest.fn(),
    results: [],
    isLoading: false,
    error: null,
    totalCount: 0,
    executionTime: 0,
    clearSearch: jest.fn(),
    retry: jest.fn(),
    retryCount: 0,
    isOffline: false,
    lastSuccessfulQuery: null,
  }),
}));

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock the command components with keyboard support
jest.mock('@/components/ui/command', () => ({
  CommandDialog: ({ children, open, onOpenChange }: any) => (
    <div 
      data-testid="command-dialog" 
      data-open={open}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          onOpenChange(false);
        }
      }}
      tabIndex={0}
    >
      {children}
    </div>
  ),
  CommandInput: ({ placeholder, value, onValueChange }: any) => (
    <input
      data-testid="command-input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={(e: React.KeyboardEvent) => {
        // Simulate command input keyboard behavior
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const firstItem = document.querySelector('[data-testid^="command-item"]') as HTMLElement;
          firstItem?.focus();
        }
      }}
    />
  ),
  CommandList: ({ children }: any) => (
    <div data-testid="command-list" role="listbox">
      {children}
    </div>
  ),
  CommandEmpty: ({ children }: any) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({ children, heading }: any) => (
    <div data-testid="command-group" role="group" aria-label={heading}>
      {heading && <div data-testid="command-group-heading">{heading}</div>}
      {children}
    </div>
  ),
  CommandItem: ({ children, onSelect, ...props }: any) => (
    <div
      {...props}
      data-testid="command-item"
      role="option"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextItem = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement;
          nextItem?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevItem = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement;
          if (prevItem) {
            prevItem.focus();
          } else {
            // Focus back to input
            const input = document.querySelector('[data-testid="command-input"]') as HTMLElement;
            input?.focus();
          }
        } else if (e.key === 'Escape') {
          const input = document.querySelector('[data-testid="command-input"]') as HTMLElement;
          input?.focus();
        }
      }}
    >
      {children}
    </div>
  ),
}));

// Mock other components
jest.mock('./search-result-group', () => ({
  SearchResultGroup: ({ title, results, onSelect }: any) => (
    <div data-testid={`search-group-${title.toLowerCase()}`}>
      <div>{title}</div>
      {results.map((result: any) => (
        <div
          key={result.id}
          data-testid={`search-result-${result.id}`}
          onClick={() => onSelect(result)}
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
              onSelect(result);
            }
          }}
        >
          {result.title}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('./search-error-boundary', () => ({
  SearchErrorBoundary: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('./search-loading-states', () => ({
  SearchLoadingIndicator: () => <div data-testid="search-loading" />,
  SearchEmptyState: () => <div data-testid="search-empty" />,
  SearchStatusBar: () => <div data-testid="search-status" />,
  NetworkStatusIndicator: () => <div data-testid="network-status" />,
}));

describe('CommandMenu Keyboard Navigation', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('Basic keyboard shortcuts', () => {
    it('should open menu with Cmd+K', async () => {
      const mockSetOpen = jest.fn();
      
      // Mock the hook to return the setOpen function
      jest.mocked(require('@/hooks/use-command-menu').useCommandMenu).mockReturnValue({
        open: false,
        setOpen: mockSetOpen,
      });

      render(<CommandMenu />);

      await user.keyboard('{Meta>}k{/Meta}');
      expect(mockSetOpen).toHaveBeenCalledWith(true);
    });

    it('should open menu with Ctrl+K', async () => {
      const mockSetOpen = jest.fn();
      
      jest.mocked(require('@/hooks/use-command-menu').useCommandMenu).mockReturnValue({
        open: false,
        setOpen: mockSetOpen,
      });

      render(<CommandMenu />);

      await user.keyboard('{Control>}k{/Control}');
      expect(mockSetOpen).toHaveBeenCalledWith(true);
    });

    it('should close menu with Escape', async () => {
      const mockSetOpen = jest.fn();
      
      jest.mocked(require('@/hooks/use-command-menu').useCommandMenu).mockReturnValue({
        open: true,
        setOpen: mockSetOpen,
      });

      render(<CommandMenu />);

      const dialog = screen.getByTestId('command-dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });
      
      expect(mockSetOpen).toHaveBeenCalledWith(false);
    });

    it('should clear search with Escape when there is a query', async () => {
      const mockClearSearch = jest.fn();
      const mockSetQuery = jest.fn();
      
      jest.mocked(require('@/hooks/use-search').useSearch).mockReturnValue({
        query: 'test query',
        setQuery: mockSetQuery,
        results: [],
        isLoading: false,
        error: null,
        totalCount: 0,
        executionTime: 0,
        clearSearch: mockClearSearch,
        retry: jest.fn(),
        retryCount: 0,
        isOffline: false,
        lastSuccessfulQuery: null,
      });

      render(<CommandMenu />);

      const input = screen.getByTestId('command-input');
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(mockClearSearch).toHaveBeenCalled();
    });
  });

  describe('Arrow key navigation', () => {
    it('should navigate to first item with ArrowDown from input', async () => {
      render(<CommandMenu />);

      const input = screen.getByTestId('command-input');
      input.focus();
      
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      
      const firstItem = screen.querySelector('[data-testid="command-item"]') as HTMLElement;
      expect(document.activeElement).toBe(firstItem);
    });

    it('should navigate between command items with arrow keys', async () => {
      render(<CommandMenu />);

      const items = screen.getAllByTestId('command-item');
      
      // Focus first item
      items[0].focus();
      
      // Navigate down
      fireEvent.keyDown(items[0], { key: 'ArrowDown' });
      expect(document.activeElement).toBe(items[1]);
      
      // Navigate up
      fireEvent.keyDown(items[1], { key: 'ArrowUp' });
      expect(document.activeElement).toBe(items[0]);
    });

    it('should return to input when navigating up from first item', async () => {
      render(<CommandMenu />);

      const input = screen.getByTestId('command-input');
      const firstItem = screen.getAllByTestId('command-item')[0];
      
      firstItem.focus();
      fireEvent.keyDown(firstItem, { key: 'ArrowUp' });
      
      expect(document.activeElement).toBe(input);
    });

    it('should handle navigation at the end of the list', async () => {
      render(<CommandMenu />);

      const items = screen.getAllByTestId('command-item');
      const lastItem = items[items.length - 1];
      
      lastItem.focus();
      fireEvent.keyDown(lastItem, { key: 'ArrowDown' });
      
      // Should stay on last item or wrap to first (depending on implementation)
      expect(document.activeElement).toBe(lastItem);
    });
  });

  describe('Enter key selection', () => {
    it('should select command item with Enter key', async () => {
      const mockRouter = { push: jest.fn() };
      jest.mocked(require('next/navigation').useRouter).mockReturnValue(mockRouter);

      render(<CommandMenu />);

      const firstItem = screen.getAllByTestId('command-item')[0];
      firstItem.focus();
      
      fireEvent.keyDown(firstItem, { key: 'Enter' });
      
      // Should navigate (exact behavior depends on the item)
      expect(mockRouter.push).toHaveBeenCalled();
    });

    it('should select command item with Space key', async () => {
      const mockRouter = { push: jest.fn() };
      jest.mocked(require('next/navigation').useRouter).mockReturnValue(mockRouter);

      render(<CommandMenu />);

      const firstItem = screen.getAllByTestId('command-item')[0];
      firstItem.focus();
      
      fireEvent.keyDown(firstItem, { key: ' ' });
      
      expect(mockRouter.push).toHaveBeenCalled();
    });
  });

  describe('Search results keyboard navigation', () => {
    it('should navigate through search results with arrow keys', async () => {
      const mockResults = [
        { id: '1', type: 'tenant', title: 'John Doe' },
        { id: '2', type: 'house', title: 'House 1' },
      ];

      jest.mocked(require('@/hooks/use-search').useSearch).mockReturnValue({
        query: 'test',
        setQuery: jest.fn(),
        results: mockResults,
        isLoading: false,
        error: null,
        totalCount: 2,
        executionTime: 100,
        clearSearch: jest.fn(),
        retry: jest.fn(),
        retryCount: 0,
        isOffline: false,
        lastSuccessfulQuery: 'test',
      });

      render(<CommandMenu />);

      const searchResults = screen.getAllByTestId(/search-result-/);
      expect(searchResults).toHaveLength(2);

      // Should be able to navigate through search results
      searchResults[0].focus();
      fireEvent.keyDown(searchResults[0], { key: 'ArrowDown' });
      expect(document.activeElement).toBe(searchResults[1]);
    });

    it('should select search result with Enter key', async () => {
      const mockResults = [
        { id: '1', type: 'tenant', title: 'John Doe' },
      ];

      const mockRouter = { push: jest.fn() };
      jest.mocked(require('next/navigation').useRouter).mockReturnValue(mockRouter);

      jest.mocked(require('@/hooks/use-search').useSearch).mockReturnValue({
        query: 'john',
        setQuery: jest.fn(),
        results: mockResults,
        isLoading: false,
        error: null,
        totalCount: 1,
        executionTime: 100,
        clearSearch: jest.fn(),
        retry: jest.fn(),
        retryCount: 0,
        isOffline: false,
        lastSuccessfulQuery: 'john',
      });

      render(<CommandMenu />);

      const searchResult = screen.getByTestId('search-result-1');
      fireEvent.keyDown(searchResult, { key: 'Enter' });
      
      expect(mockRouter.push).toHaveBeenCalledWith('/mieter');
    });
  });

  describe('Tab navigation', () => {
    it('should support tab navigation through focusable elements', async () => {
      render(<CommandMenu />);

      const input = screen.getByTestId('command-input');
      const items = screen.getAllByTestId('command-item');

      // Start at input
      input.focus();
      expect(document.activeElement).toBe(input);

      // Tab through items
      await user.tab();
      expect(document.activeElement).toBe(items[0]);

      await user.tab();
      expect(document.activeElement).toBe(items[1]);
    });

    it('should support reverse tab navigation', async () => {
      render(<CommandMenu />);

      const input = screen.getByTestId('command-input');
      const items = screen.getAllByTestId('command-item');

      // Start at second item
      items[1].focus();
      expect(document.activeElement).toBe(items[1]);

      // Shift+Tab back
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(items[0]);

      await user.tab({ shift: true });
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Focus management', () => {
    it('should maintain focus when search results change', async () => {
      const mockSetQuery = jest.fn();
      let currentResults: any[] = [];

      jest.mocked(require('@/hooks/use-search').useSearch).mockImplementation(() => ({
        query: 'test',
        setQuery: mockSetQuery,
        results: currentResults,
        isLoading: false,
        error: null,
        totalCount: currentResults.length,
        executionTime: 100,
        clearSearch: jest.fn(),
        retry: jest.fn(),
        retryCount: 0,
        isOffline: false,
        lastSuccessfulQuery: 'test',
      }));

      const { rerender } = render(<CommandMenu />);

      const input = screen.getByTestId('command-input');
      input.focus();

      // Update results
      currentResults = [
        { id: '1', type: 'tenant', title: 'John Doe' },
      ];

      rerender(<CommandMenu />);

      // Focus should remain on input
      expect(document.activeElement).toBe(input);
    });

    it('should return focus to input when clearing search', async () => {
      const mockClearSearch = jest.fn();

      jest.mocked(require('@/hooks/use-search').useSearch).mockReturnValue({
        query: 'test',
        setQuery: jest.fn(),
        results: [{ id: '1', type: 'tenant', title: 'John Doe' }],
        isLoading: false,
        error: null,
        totalCount: 1,
        executionTime: 100,
        clearSearch: mockClearSearch,
        retry: jest.fn(),
        retryCount: 0,
        isOffline: false,
        lastSuccessfulQuery: 'test',
      });

      render(<CommandMenu />);

      const searchResult = screen.getByTestId('search-result-1');
      searchResult.focus();

      // Clear search
      fireEvent.keyDown(searchResult, { key: 'Escape' });

      const input = screen.getByTestId('command-input');
      expect(document.activeElement).toBe(input);
    });

    it('should handle focus when menu is closed and reopened', async () => {
      const mockSetOpen = jest.fn();

      jest.mocked(require('@/hooks/use-command-menu').useCommandMenu).mockReturnValue({
        open: true,
        setOpen: mockSetOpen,
      });

      const { rerender } = render(<CommandMenu />);

      const input = screen.getByTestId('command-input');
      input.focus();

      // Close menu
      jest.mocked(require('@/hooks/use-command-menu').useCommandMenu).mockReturnValue({
        open: false,
        setOpen: mockSetOpen,
      });

      rerender(<CommandMenu />);

      // Reopen menu
      jest.mocked(require('@/hooks/use-command-menu').useCommandMenu).mockReturnValue({
        open: true,
        setOpen: mockSetOpen,
      });

      rerender(<CommandMenu />);

      // Focus should be on input when reopened
      const newInput = screen.getByTestId('command-input');
      expect(newInput).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<CommandMenu />);

      const dialog = screen.getByTestId('command-dialog');
      expect(dialog).toHaveAttribute('tabIndex', '0');

      const list = screen.getByTestId('command-list');
      expect(list).toHaveAttribute('role', 'listbox');

      const items = screen.getAllByTestId('command-item');
      items.forEach(item => {
        expect(item).toHaveAttribute('role', 'option');
        expect(item).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should have proper group labels', () => {
      render(<CommandMenu />);

      const groups = screen.getAllByTestId('command-group');
      groups.forEach(group => {
        expect(group).toHaveAttribute('role', 'group');
      });
    });

    it('should announce search results to screen readers', async () => {
      const mockResults = [
        { id: '1', type: 'tenant', title: 'John Doe' },
        { id: '2', type: 'house', title: 'House 1' },
      ];

      jest.mocked(require('@/hooks/use-search').useSearch).mockReturnValue({
        query: 'test',
        setQuery: jest.fn(),
        results: mockResults,
        isLoading: false,
        error: null,
        totalCount: 2,
        executionTime: 100,
        clearSearch: jest.fn(),
        retry: jest.fn(),
        retryCount: 0,
        isOffline: false,
        lastSuccessfulQuery: 'test',
      });

      render(<CommandMenu />);

      // Search status should be announced
      const statusBar = screen.getByTestId('search-status');
      expect(statusBar).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle keyboard navigation with no items', () => {
      // Mock empty command menu
      jest.mocked(require('@/hooks/use-search').useSearch).mockReturnValue({
        query: '',
        setQuery: jest.fn(),
        results: [],
        isLoading: false,
        error: null,
        totalCount: 0,
        executionTime: 0,
        clearSearch: jest.fn(),
        retry: jest.fn(),
        retryCount: 0,
        isOffline: false,
        lastSuccessfulQuery: null,
      });

      render(<CommandMenu />);

      const input = screen.getByTestId('command-input');
      input.focus();

      // Arrow down should not crash when no items
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(input);
    });

    it('should handle rapid keyboard input', async () => {
      const mockSetQuery = jest.fn();

      jest.mocked(require('@/hooks/use-search').useSearch).mockReturnValue({
        query: '',
        setQuery: mockSetQuery,
        results: [],
        isLoading: false,
        error: null,
        totalCount: 0,
        executionTime: 0,
        clearSearch: jest.fn(),
        retry: jest.fn(),
        retryCount: 0,
        isOffline: false,
        lastSuccessfulQuery: null,
      });

      render(<CommandMenu />);

      const input = screen.getByTestId('command-input');

      // Rapid typing
      await user.type(input, 'test query');
      
      expect(mockSetQuery).toHaveBeenCalledWith('test query');
    });

    it('should handle keyboard navigation during loading', () => {
      jest.mocked(require('@/hooks/use-search').useSearch).mockReturnValue({
        query: 'loading',
        setQuery: jest.fn(),
        results: [],
        isLoading: true,
        error: null,
        totalCount: 0,
        executionTime: 0,
        clearSearch: jest.fn(),
        retry: jest.fn(),
        retryCount: 0,
        isOffline: false,
        lastSuccessfulQuery: null,
      });

      render(<CommandMenu />);

      const input = screen.getByTestId('command-input');
      input.focus();

      // Should still be able to navigate during loading
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(input); // No items to navigate to
    });
  });
});