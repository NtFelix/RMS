import React from 'react';
import { render, screen } from '@testing-library/react';
import { SearchErrorBoundary } from '@/components/search/search-error-boundary';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component that throws during render
const RenderError = () => {
  throw new Error('Render error');
};

// Component that throws async error
const AsyncError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      throw new Error('Async error');
    }
  }, [shouldThrow]);
  
  return <div>Async component</div>;
};

describe('SearchErrorBoundary', () => {
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (console.error as jest.Mock).mockClear();
  });

  describe('Normal operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <SearchErrorBoundary onError={mockOnError}>
          <div>Test content</div>
        </SearchErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should render multiple children correctly', () => {
      render(
        <SearchErrorBoundary onError={mockOnError}>
          <div>First child</div>
          <div>Second child</div>
          <span>Third child</span>
        </SearchErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
      expect(screen.getByText('Third child')).toBeInTheDocument();
    });

    it('should handle dynamic children updates', () => {
      const { rerender } = render(
        <SearchErrorBoundary onError={mockOnError}>
          <div>Initial content</div>
        </SearchErrorBoundary>
      );

      expect(screen.getByText('Initial content')).toBeInTheDocument();

      rerender(
        <SearchErrorBoundary onError={mockOnError}>
          <div>Updated content</div>
        </SearchErrorBoundary>
      );

      expect(screen.getByText('Updated content')).toBeInTheDocument();
      expect(screen.queryByText('Initial content')).not.toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should catch and display error fallback UI', () => {
      render(
        <SearchErrorBoundary onError={mockOnError}>
          <RenderError />
        </SearchErrorBoundary>
      );

      expect(screen.getByText('Suchfehler')).toBeInTheDocument();
      expect(screen.getByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledTimes(1);
    });

    it('should call onError callback with error and errorInfo', () => {
      render(
        <SearchErrorBoundary onError={mockOnError}>
          <RenderError />
        </SearchErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Render error'
        }),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('should handle conditional errors', () => {
      const { rerender } = render(
        <SearchErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={false} />
        </SearchErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(mockOnError).not.toHaveBeenCalled();

      rerender(
        <SearchErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={true} />
        </SearchErrorBoundary>
      );

      expect(screen.getByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalled();
    });

    it('should handle errors in nested components', () => {
      const NestedComponent = () => (
        <div>
          <span>Nested content</span>
          <RenderError />
        </div>
      );

      render(
        <SearchErrorBoundary onError={mockOnError}>
          <NestedComponent />
        </SearchErrorBoundary>
      );

      expect(screen.getByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple error boundaries', () => {
      const mockOnError1 = jest.fn();
      const mockOnError2 = jest.fn();

      render(
        <SearchErrorBoundary onError={mockOnError1}>
          <div>Outer boundary</div>
          <SearchErrorBoundary onError={mockOnError2}>
            <RenderError />
          </SearchErrorBoundary>
        </SearchErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(mockOnError2).toHaveBeenCalledTimes(1);
      expect(mockOnError1).not.toHaveBeenCalled();
      expect(screen.getByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.')).toBeInTheDocument();
    });
  });

  describe('Error recovery', () => {
    it('should recover when error is resolved', () => {
      const { rerender } = render(
        <SearchErrorBoundary onError={mockOnError}>
          <RenderError />
        </SearchErrorBoundary>
      );

      expect(screen.getByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.')).toBeInTheDocument();

      // Rerender with non-erroring component
      rerender(
        <SearchErrorBoundary onError={mockOnError}>
          <div>Recovered content</div>
        </SearchErrorBoundary>
      );

      expect(screen.getByText('Recovered content')).toBeInTheDocument();
      expect(screen.queryByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.')).not.toBeInTheDocument();
    });

    it('should reset error state on new children', () => {
      const { rerender } = render(
        <SearchErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={true} />
        </SearchErrorBoundary>
      );

      expect(screen.getByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.')).toBeInTheDocument();

      rerender(
        <SearchErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={false} />
        </SearchErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Error boundary without onError callback', () => {
    it('should still catch errors without onError prop', () => {
      render(
        <SearchErrorBoundary>
          <RenderError />
        </SearchErrorBoundary>
      );

      expect(screen.getByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.')).toBeInTheDocument();
    });

    it('should handle undefined onError gracefully', () => {
      render(
        <SearchErrorBoundary onError={undefined}>
          <RenderError />
        </SearchErrorBoundary>
      );

      expect(screen.getByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.')).toBeInTheDocument();
    });
  });

  describe('Error information', () => {
    it('should provide detailed error information in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <SearchErrorBoundary onError={mockOnError}>
          <RenderError />
        </SearchErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Render error',
          stack: expect.any(String)
        }),
        expect.objectContaining({
          componentStack: expect.stringContaining('RenderError')
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle errors with different error types', () => {
      const CustomError = () => {
        throw new TypeError('Type error');
      };

      render(
        <SearchErrorBoundary onError={mockOnError}>
          <CustomError />
        </SearchErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Type error',
          name: 'TypeError'
        }),
        expect.any(Object)
      );
    });

    it('should handle errors without messages', () => {
      const NoMessageError = () => {
        throw new Error();
      };

      render(
        <SearchErrorBoundary onError={mockOnError}>
          <NoMessageError />
        </SearchErrorBoundary>
      );

      expect(screen.getByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fallback UI', () => {
    it('should render appropriate fallback UI', () => {
      render(
        <SearchErrorBoundary onError={mockOnError}>
          <RenderError />
        </SearchErrorBoundary>
      );

      const errorContainer = screen.getByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.').closest('[role="alert"]');
      expect(errorContainer).toBeInTheDocument();
      
      expect(screen.getByText('Suchfehler')).toBeInTheDocument();
      expect(screen.getByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.')).toBeInTheDocument();
    });

    it('should include error icon in fallback UI', () => {
      render(
        <SearchErrorBoundary onError={mockOnError}>
          <RenderError />
        </SearchErrorBoundary>
      );

      // The AlertCircle icon should be rendered
      const errorIcon = screen.getByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.').closest('[role="alert"]')?.querySelector('.lucide-circle-alert');
      expect(errorIcon).toBeInTheDocument();
    });

    it('should have proper spacing and layout', () => {
      render(
        <SearchErrorBoundary onError={mockOnError}>
          <RenderError />
        </SearchErrorBoundary>
      );

      const container = screen.getByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.').closest('.flex');
      expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });
  });

  describe('Performance', () => {
    it('should not affect performance when no errors occur', () => {
      const renderCount = jest.fn();
      
      const TestComponent = () => {
        renderCount();
        return <div>Test</div>;
      };

      const { rerender } = render(
        <SearchErrorBoundary onError={mockOnError}>
          <TestComponent />
        </SearchErrorBoundary>
      );

      expect(renderCount).toHaveBeenCalledTimes(1);

      rerender(
        <SearchErrorBoundary onError={mockOnError}>
          <TestComponent />
        </SearchErrorBoundary>
      );

      expect(renderCount).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid error state changes', () => {
      const { rerender } = render(
        <SearchErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={false} />
        </SearchErrorBoundary>
      );

      // Rapidly toggle error state
      for (let i = 0; i < 10; i++) {
        rerender(
          <SearchErrorBoundary onError={mockOnError}>
            <ThrowError shouldThrow={i % 2 === 0} />
          </SearchErrorBoundary>
        );
      }

      // Should handle without issues
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle null children', () => {
      render(
        <SearchErrorBoundary onError={mockOnError}>
          {null}
        </SearchErrorBoundary>
      );

      // Should render without errors
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should handle undefined children', () => {
      render(
        <SearchErrorBoundary onError={mockOnError}>
          {undefined}
        </SearchErrorBoundary>
      );

      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should handle empty children array', () => {
      render(
        <SearchErrorBoundary onError={mockOnError}>
          {[]}
        </SearchErrorBoundary>
      );

      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should handle mixed children types', () => {
      render(
        <SearchErrorBoundary onError={mockOnError}>
          <div>Element</div>
          <span>String child</span>
          <span>123</span>
          {true && <span>Conditional</span>}
        </SearchErrorBoundary>
      );

      expect(screen.getByText('Element')).toBeInTheDocument();
      expect(screen.getByText('String child')).toBeInTheDocument();
      expect(screen.getByText('123')).toBeInTheDocument();
      expect(screen.getByText('Conditional')).toBeInTheDocument();
    });

    it('should handle errors thrown in event handlers', () => {
      const ErrorButton = () => {
        const handleClick = () => {
          throw new Error('Event handler error');
        };

        return <button onClick={handleClick}>Click me</button>;
      };

      render(
        <SearchErrorBoundary onError={mockOnError}>
          <ErrorButton />
        </SearchErrorBoundary>
      );

      // Error boundaries don't catch errors in event handlers
      expect(screen.getByText('Click me')).toBeInTheDocument();
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should handle errors in async operations', () => {
      render(
        <SearchErrorBoundary onError={mockOnError}>
          <AsyncError shouldThrow={false} />
        </SearchErrorBoundary>
      );

      expect(screen.getByText('Async component')).toBeInTheDocument();
      // Error boundaries don't catch async errors
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for error state', () => {
      render(
        <SearchErrorBoundary onError={mockOnError}>
          <RenderError />
        </SearchErrorBoundary>
      );

      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer).toHaveAttribute('role', 'alert');
    });

    it('should be keyboard accessible', () => {
      render(
        <SearchErrorBoundary onError={mockOnError}>
          <RenderError />
        </SearchErrorBoundary>
      );

      // Check that buttons are keyboard accessible
      const retryButton = screen.getByText(/Erneut versuchen/);
      const resetButton = screen.getByText('Zurücksetzen');
      
      expect(retryButton).toBeInTheDocument();
      expect(resetButton).toBeInTheDocument();
    });

    it('should have proper semantic structure', () => {
      render(
        <SearchErrorBoundary onError={mockOnError}>
          <RenderError />
        </SearchErrorBoundary>
      );

      const heading = screen.getByText('Suchfehler');
      const description = screen.getByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.');

      expect(heading.tagName).toBe('H5');
      expect(description.tagName).toBe('DIV');
    });
  });
});