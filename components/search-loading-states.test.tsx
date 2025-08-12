import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  SearchLoadingIndicator,
  SearchEmptyState,
  SearchStatusBar,
  NetworkStatusIndicator
} from './search-loading-states';

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, ...props }: any) => (
    <button 
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>
      {children}
    </span>
  ),
}));

// Mock lucide icons
jest.mock('lucide-react', () => ({
  Loader2: ({ className }: any) => <div className={`loader2 ${className}`} data-testid="loader2" />,
  Search: ({ className }: any) => <div className={`search ${className}`} data-testid="search-icon" />,
  AlertCircle: ({ className }: any) => <div className={`alert-circle ${className}`} data-testid="alert-circle" />,
  WifiOff: ({ className }: any) => <div className={`wifi-off ${className}`} data-testid="wifi-off" />,
  RefreshCw: ({ className }: any) => <div className={`refresh-cw ${className}`} data-testid="refresh-cw" />,
  Clock: ({ className }: any) => <div className={`clock ${className}`} data-testid="clock" />,
  Hash: ({ className }: any) => <div className={`hash ${className}`} data-testid="hash" />,
}));

describe('SearchLoadingIndicator', () => {
  it('should render loading state with query', () => {
    render(
      <SearchLoadingIndicator
        query="test query"
        isLoading={true}
        retryCount={0}
        maxRetries={3}
      />
    );

    expect(screen.getByText('Suche nach "test query"...')).toBeInTheDocument();
    expect(screen.getByTestId('loader2')).toBeInTheDocument();
  });

  it('should show retry count when retrying', () => {
    render(
      <SearchLoadingIndicator
        query="test query"
        isLoading={true}
        retryCount={2}
        maxRetries={3}
      />
    );

    expect(screen.getByText('Wiederholung 2/3...')).toBeInTheDocument();
  });

  it('should not render when not loading', () => {
    const { container } = render(
      <SearchLoadingIndicator
        query="test query"
        isLoading={false}
        retryCount={0}
        maxRetries={3}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should handle empty query', () => {
    render(
      <SearchLoadingIndicator
        query=""
        isLoading={true}
        retryCount={0}
        maxRetries={3}
      />
    );

    expect(screen.getByText('Suche läuft...')).toBeInTheDocument();
  });

  it('should show animated loading indicator', () => {
    render(
      <SearchLoadingIndicator
        query="test"
        isLoading={true}
        retryCount={0}
        maxRetries={3}
      />
    );

    const loader = screen.getByTestId('loader2');
    expect(loader).toHaveClass('animate-spin');
  });
});

describe('SearchEmptyState', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render no results state', () => {
    render(
      <SearchEmptyState
        query="test query"
        hasError={false}
        isOffline={false}
        suggestions={['suggestion1', 'suggestion2']}
      />
    );

    expect(screen.getByText('Keine Ergebnisse gefunden')).toBeInTheDocument();
    expect(screen.getByText(/test query/)).toBeInTheDocument();
    expect(screen.getByText('Versuchen Sie es mit:')).toBeInTheDocument();
    expect(screen.getByText('suggestion1')).toBeInTheDocument();
    expect(screen.getByText('suggestion2')).toBeInTheDocument();
  });

  it('should render error state with retry button', () => {
    render(
      <SearchEmptyState
        query="test query"
        hasError={true}
        isOffline={false}
        onRetry={mockOnRetry}
        suggestions={[]}
      />
    );

    expect(screen.getByText('Fehler bei der Suche')).toBeInTheDocument();
    expect(screen.getByTestId('alert-circle')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Erneut versuchen');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should render offline state', () => {
    render(
      <SearchEmptyState
        query="test query"
        hasError={true}
        isOffline={true}
        onRetry={mockOnRetry}
        suggestions={[]}
      />
    );

    expect(screen.getByText('Keine Internetverbindung')).toBeInTheDocument();
    expect(screen.getByTestId('wifi-off')).toBeInTheDocument();
    expect(screen.getByText('Bitte überprüfen Sie Ihre Netzwerkverbindung und versuchen Sie es erneut.')).toBeInTheDocument();
  });

  it('should handle empty query gracefully', () => {
    render(
      <SearchEmptyState
        query=""
        hasError={false}
        isOffline={false}
        suggestions={[]}
      />
    );

    expect(screen.getByText('Keine Ergebnisse')).toBeInTheDocument();
  });

  it('should not show suggestions when there are none', () => {
    render(
      <SearchEmptyState
        query="test"
        hasError={false}
        isOffline={false}
        suggestions={[]}
      />
    );

    expect(screen.queryByText('Versuchen Sie es mit:')).not.toBeInTheDocument();
  });

  it('should not show retry button when onRetry is not provided', () => {
    render(
      <SearchEmptyState
        query="test"
        hasError={true}
        isOffline={false}
        suggestions={[]}
      />
    );

    expect(screen.queryByText('Erneut versuchen')).not.toBeInTheDocument();
  });

  it('should show search tips for no results', () => {
    render(
      <SearchEmptyState
        query="test"
        hasError={false}
        isOffline={false}
        suggestions={[]}
      />
    );

    expect(screen.getByText('Überprüfen Sie die Rechtschreibung oder verwenden Sie allgemeinere Begriffe.')).toBeInTheDocument();
  });
});

describe('SearchStatusBar', () => {
  it('should render status with results count and execution time', () => {
    render(
      <SearchStatusBar
        totalCount={5}
        executionTime={150}
        query="test"
        isLoading={false}
        retryCount={0}
        isOffline={false}
      />
    );

    expect(screen.getByText(/5 Ergebnisse/)).toBeInTheDocument();
    expect(screen.getByText('150ms')).toBeInTheDocument();
  });

  it('should handle singular result count', () => {
    render(
      <SearchStatusBar
        totalCount={1}
        executionTime={100}
        query="test"
        isLoading={false}
        retryCount={0}
        isOffline={false}
      />
    );

    expect(screen.getByText(/1 Ergebnis/)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <SearchStatusBar
        totalCount={0}
        executionTime={0}
        query="test"
        isLoading={true}
        retryCount={0}
        isOffline={false}
      />
    );

    expect(screen.getByText('Suche läuft...')).toBeInTheDocument();
    expect(screen.getByTestId('loader2')).toBeInTheDocument();
  });

  it('should show retry status', () => {
    render(
      <SearchStatusBar
        totalCount={0}
        executionTime={0}
        query="test"
        isLoading={false}
        retryCount={2}
        isOffline={false}
      />
    );

    expect(screen.getByText('Wiederholung 2')).toBeInTheDocument();
  });

  it('should show offline indicator', () => {
    render(
      <SearchStatusBar
        totalCount={0}
        executionTime={0}
        query="test"
        isLoading={false}
        retryCount={0}
        isOffline={true}
      />
    );

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByTestId('wifi-off')).toBeInTheDocument();
  });

  it('should format execution time correctly', () => {
    const { rerender } = render(
      <SearchStatusBar
        totalCount={1}
        executionTime={1500}
        query="test"
        isLoading={false}
        retryCount={0}
        isOffline={false}
      />
    );

    expect(screen.getByText('1.5s')).toBeInTheDocument();

    rerender(
      <SearchStatusBar
        totalCount={1}
        executionTime={500}
        query="test"
        isLoading={false}
        retryCount={0}
        isOffline={false}
      />
    );

    expect(screen.getByText('500ms')).toBeInTheDocument();
  });

  it('should not render when no meaningful status to show', () => {
    const { container } = render(
      <SearchStatusBar
        totalCount={0}
        executionTime={0}
        query=""
        isLoading={false}
        retryCount={0}
        isOffline={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});

describe('NetworkStatusIndicator', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render offline indicator with retry button', () => {
    render(
      <NetworkStatusIndicator
        isOffline={true}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('Keine Internetverbindung')).toBeInTheDocument();
    expect(screen.getByTestId('wifi-off')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Erneut versuchen');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should not render when online', () => {
    const { container } = render(
      <NetworkStatusIndicator
        isOffline={false}
        onRetry={mockOnRetry}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should not show retry button when onRetry is not provided', () => {
    render(
      <NetworkStatusIndicator
        isOffline={true}
      />
    );

    expect(screen.getByText('Keine Internetverbindung')).toBeInTheDocument();
    expect(screen.queryByText('Erneut versuchen')).not.toBeInTheDocument();
  });

  it('should have proper styling for offline state', () => {
    render(
      <NetworkStatusIndicator
        isOffline={true}
        onRetry={mockOnRetry}
      />
    );

    const container = screen.getByText('Keine Internetverbindung').closest('[class*="bg-destructive"]');
    expect(container).toHaveClass('bg-destructive/10', 'text-destructive');
  });
});

describe('Component integration', () => {
  it('should work together in search flow', () => {
    const mockOnRetry = jest.fn();
    
    // Start with loading state
    const { rerender } = render(
      <div>
        <NetworkStatusIndicator isOffline={false} />
        <SearchLoadingIndicator
          query="test"
          isLoading={true}
          retryCount={0}
          maxRetries={3}
        />
      </div>
    );

    expect(screen.getByText('Suche nach "test"...')).toBeInTheDocument();

    // Show results with status bar
    rerender(
      <div>
        <NetworkStatusIndicator isOffline={false} />
        <SearchStatusBar
          totalCount={3}
          executionTime={200}
          query="test"
          isLoading={false}
          retryCount={0}
          isOffline={false}
        />
      </div>
    );

    expect(screen.getByText(/3 Ergebnisse/)).toBeInTheDocument();
    expect(screen.getByText('200ms')).toBeInTheDocument();

    // Show error state
    rerender(
      <div>
        <NetworkStatusIndicator isOffline={false} />
        <SearchEmptyState
          query="test"
          hasError={true}
          isOffline={false}
          onRetry={mockOnRetry}
          suggestions={['suggestion']}
        />
      </div>
    );

    expect(screen.getByText('Fehler bei der Suche')).toBeInTheDocument();
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();

    // Show offline state
    rerender(
      <div>
        <NetworkStatusIndicator isOffline={true} onRetry={mockOnRetry} />
        <SearchEmptyState
          query="test"
          hasError={true}
          isOffline={true}
          onRetry={mockOnRetry}
          suggestions={[]}
        />
      </div>
    );

    expect(screen.getAllByText('Keine Internetverbindung')).toHaveLength(2);
    expect(screen.getAllByText('Erneut versuchen')).toHaveLength(2);
  });
});

describe('Accessibility', () => {
  it('should have proper ARIA attributes for loading states', () => {
    render(
      <SearchLoadingIndicator
        query="test"
        isLoading={true}
        retryCount={0}
        maxRetries={3}
      />
    );

    const loadingElement = screen.getByText('Suche nach "test"...');
    const statusContainer = loadingElement.closest('[role="status"]');
    expect(statusContainer).toHaveAttribute('role', 'status');
    expect(statusContainer).toHaveAttribute('aria-live', 'polite');
  });

  it('should have proper ARIA attributes for error states', () => {
    render(
      <SearchEmptyState
        query="test"
        hasError={true}
        isOffline={false}
        onRetry={() => {}}
        suggestions={[]}
      />
    );

    const errorElement = screen.getByText('Fehler bei der Suche');
    expect(errorElement).toHaveAttribute('role', 'alert');
  });

  it('should have accessible retry buttons', () => {
    const mockOnRetry = jest.fn();
    render(
      <SearchEmptyState
        query="test"
        hasError={true}
        isOffline={false}
        onRetry={mockOnRetry}
        suggestions={[]}
      />
    );

    const retryButton = screen.getByText('Erneut versuchen');
    expect(retryButton).toHaveAttribute('type', 'button');
  });

  it('should announce status changes to screen readers', () => {
    render(
      <SearchStatusBar
        totalCount={5}
        executionTime={150}
        query="test"
        isLoading={false}
        retryCount={0}
        isOffline={false}
      />
    );

    const statusElement = screen.getByText(/5 Ergebnisse/).closest('[aria-live]');
    expect(statusElement).toHaveAttribute('aria-live', 'polite');
  });
});

describe('Performance', () => {
  it('should not re-render unnecessarily', () => {
    const { rerender } = render(
      <SearchStatusBar
        totalCount={5}
        executionTime={150}
        query="test"
        isLoading={false}
        retryCount={0}
        isOffline={false}
      />
    );

    const initialElement = screen.getByText(/5 Ergebnisse/);

    // Re-render with same props
    rerender(
      <SearchStatusBar
        totalCount={5}
        executionTime={150}
        query="test"
        isLoading={false}
        retryCount={0}
        isOffline={false}
      />
    );

    const afterRerender = screen.getByText(/5 Ergebnisse/);
    expect(afterRerender).toBe(initialElement);
  });

  it('should handle rapid state changes', () => {
    const { rerender } = render(
      <SearchLoadingIndicator
        query="test"
        isLoading={true}
        retryCount={0}
        maxRetries={3}
      />
    );

    expect(screen.getByText('Suche nach "test"...')).toBeInTheDocument();

    // Rapid state changes
    for (let i = 0; i < 10; i++) {
      rerender(
        <SearchLoadingIndicator
          query="test"
          isLoading={i % 2 === 0}
          retryCount={i}
          maxRetries={3}
        />
      );
    }

    // Should handle without errors
    expect(screen.queryByText('Wiederholung 9/3...')).toBeInTheDocument();
  });
});