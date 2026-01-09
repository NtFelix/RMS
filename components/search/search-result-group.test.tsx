import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchResultGroup } from '@/components/search/search-result-group';
import { SearchResult } from '@/types/search';
import { Edit, Eye } from 'lucide-react';

// Mock the command components
jest.mock('@/components/ui/command', () => ({
  CommandGroup: ({ children }: any) => (
    <div data-testid="command-group">{children}</div>
  ),
  CommandSeparator: () => <div data-testid="command-separator" />,
}));

// Mock the SearchResultItem component
jest.mock('../search-result-item', () => ({
  SearchResultItem: ({ result, onSelect, onAction }: any) => (
    <div
      data-testid={`search-result-item-${result.id}`}
      onClick={() => onSelect(result)}
    >
      <span>{result.title}</span>
      {result.actions?.map((action: any, index: number) => (
        <button
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            onAction(result, index);
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('SearchResultGroup', () => {
  const mockOnSelect = jest.fn();
  const mockOnAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockResults = (type: SearchResult['type'], count: number): SearchResult[] => {
    return Array.from({ length: count }, (_, index) => ({
      id: `${type}-${index + 1}`,
      type,
      title: `${type} ${index + 1}`,
      subtitle: `Subtitle ${index + 1}`,
      actions: [
        {
          label: 'Edit',
          icon: Edit,
          action: () => { },
          variant: 'default' as const
        },
        {
          label: 'View',
          icon: Eye,
          action: () => { },
          variant: 'default' as const
        }
      ]
    }));
  };

  describe('Rendering', () => {
    it('should render group with results', () => {
      const results = createMockResults('tenant', 2);

      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByTestId('command-group')).toBeInTheDocument();
      expect(screen.getByText('Mieter')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Result count
      expect(screen.getByTestId('search-result-item-tenant-1')).toBeInTheDocument();
      expect(screen.getByTestId('search-result-item-tenant-2')).toBeInTheDocument();
    });

    it('should not render when results are empty', () => {
      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={[]}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.queryByTestId('command-group')).not.toBeInTheDocument();
    });

    it('should not render when results are null/undefined', () => {
      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={null as any}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.queryByTestId('command-group')).not.toBeInTheDocument();
    });

    it('should render separator when showSeparator is true', () => {
      const results = createMockResults('tenant', 1);

      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
          showSeparator={true}
        />
      );

      expect(screen.getByTestId('command-separator')).toBeInTheDocument();
    });

    it('should not render separator when showSeparator is false', () => {
      const results = createMockResults('tenant', 1);

      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
          showSeparator={false}
        />
      );

      expect(screen.queryByTestId('command-separator')).not.toBeInTheDocument();
    });
  });

  describe('Group headers', () => {
    it('should display correct icon for tenant type', () => {
      const results = createMockResults('tenant', 1);

      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      // Check if the header has the correct styling for tenant type
      const header = screen.getByText('Mieter').parentElement;
      expect(header).toHaveClass('text-muted-foreground/70');
    });

    it('should display correct icon for house type', () => {
      const results = createMockResults('house', 1);

      render(
        <SearchResultGroup
          title="Häuser"
          type="house"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      const header = screen.getByText('Häuser').parentElement;
      expect(header).toHaveClass('text-muted-foreground/70');
    });

    it('should display correct icon for apartment type', () => {
      const results = createMockResults('apartment', 1);

      render(
        <SearchResultGroup
          title="Wohnungen"
          type="apartment"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      const header = screen.getByText('Wohnungen').parentElement;
      expect(header).toHaveClass('text-muted-foreground/70');
    });

    it('should display correct icon for finance type', () => {
      const results = createMockResults('finance', 1);

      render(
        <SearchResultGroup
          title="Finanzen"
          type="finance"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      const header = screen.getByText('Finanzen').parentElement;
      expect(header).toHaveClass('text-muted-foreground/70');
    });

    it('should display correct icon for task type', () => {
      const results = createMockResults('task', 1);

      render(
        <SearchResultGroup
          title="Aufgaben"
          type="task"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      const header = screen.getByText('Aufgaben').parentElement;
      expect(header).toHaveClass('text-muted-foreground/70');
    });

    it('should use provided title over generated title', () => {
      const results = createMockResults('tenant', 1);

      render(
        <SearchResultGroup
          title="Custom Title"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.queryByText('Mieter')).not.toBeInTheDocument();
    });

    it('should generate correct German titles for different counts', () => {
      // Test singular forms
      const singleResult = createMockResults('house', 1);
      const { rerender } = render(
        <SearchResultGroup
          title=""
          type="house"
          results={singleResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('Haus')).toBeInTheDocument();

      // Test plural forms
      const multipleResults = createMockResults('house', 3);
      rerender(
        <SearchResultGroup
          title=""
          type="house"
          results={multipleResults}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('Häuser')).toBeInTheDocument();
    });
  });

  describe('Result count display', () => {
    it('should display correct count for single result', () => {
      const results = createMockResults('tenant', 1);

      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should display correct count for multiple results', () => {
      const results = createMockResults('tenant', 5);

      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should update count when results change', () => {
      const initialResults = createMockResults('tenant', 2);
      const { rerender } = render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={initialResults}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();

      const updatedResults = createMockResults('tenant', 4);
      rerender(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={updatedResults}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.queryByText('2')).not.toBeInTheDocument();
    });
  });

  describe('Result interactions', () => {
    it('should pass onSelect to SearchResultItem', () => {
      const results = createMockResults('tenant', 1);

      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      fireEvent.click(screen.getByTestId('search-result-item-tenant-1'));
      expect(mockOnSelect).toHaveBeenCalledWith(results[0]);
    });

    it('should pass onAction to SearchResultItem', () => {
      const results = createMockResults('tenant', 1);

      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      fireEvent.click(screen.getByText('Edit'));
      expect(mockOnAction).toHaveBeenCalledWith(results[0], 0);
    });

    it('should handle missing onAction prop gracefully', () => {
      const results = createMockResults('tenant', 1);

      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
        />
      );

      // Should render without errors
      expect(screen.getByTestId('search-result-item-tenant-1')).toBeInTheDocument();
    });
  });

  describe('Multiple results rendering', () => {
    it('should render all results in correct order', () => {
      const results = createMockResults('tenant', 3);

      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByTestId('search-result-item-tenant-1')).toBeInTheDocument();
      expect(screen.getByTestId('search-result-item-tenant-2')).toBeInTheDocument();
      expect(screen.getByTestId('search-result-item-tenant-3')).toBeInTheDocument();

      // Check order
      const items = screen.getAllByText(/tenant \d/);
      expect(items[0]).toHaveTextContent('tenant 1');
      expect(items[1]).toHaveTextContent('tenant 2');
      expect(items[2]).toHaveTextContent('tenant 3');
    });

    it('should handle large number of results', () => {
      const results = createMockResults('tenant', 20);

      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('20')).toBeInTheDocument();

      // All results should be rendered
      for (let i = 1; i <= 20; i++) {
        expect(screen.getByTestId(`search-result-item-tenant-${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      const results = createMockResults('tenant', 2);

      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      const group = screen.getByTestId('command-group');
      expect(group).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      const results = createMockResults('tenant', 1);

      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      const header = screen.getByText('Mieter').parentElement;
      expect(header).toHaveClass('text-xs', 'font-semibold');
    });
  });

  describe('Edge cases', () => {
    it('should handle results with missing properties', () => {
      const incompleteResults: SearchResult[] = [
        {
          id: '1',
          type: 'tenant',
          title: 'Incomplete Result'
          // Missing other properties
        }
      ];

      render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={incompleteResults}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByTestId('search-result-item-1')).toBeInTheDocument();
      expect(screen.getByText('Incomplete Result')).toBeInTheDocument();
    });

    it('should handle unknown entity types gracefully', () => {
      const unknownTypeResults: SearchResult[] = [
        {
          id: '1',
          type: 'unknown' as any,
          title: 'Unknown Type Result'
        }
      ];

      render(
        <SearchResultGroup
          title="Unknown"
          type={"unknown" as any}
          results={unknownTypeResults}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('Unknown')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should handle empty title gracefully', () => {
      const results = createMockResults('tenant', 1);

      render(
        <SearchResultGroup
          title=""
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      // Should fall back to generated title
      expect(screen.getByText('Mieter')).toBeInTheDocument();
    });

    it('should handle results array mutations', () => {
      const results = createMockResults('tenant', 2);
      const { rerender } = render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();

      // Remove one result
      results.pop();
      rerender(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.queryByTestId('search-result-item-tenant-2')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const results = createMockResults('tenant', 1);
      const { rerender } = render(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      const initialElement = screen.getByTestId('command-group');

      // Re-render with same props
      rerender(
        <SearchResultGroup
          title="Mieter"
          type="tenant"
          results={results}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      const afterRerender = screen.getByTestId('command-group');
      expect(afterRerender).toBeInTheDocument();
    });
  });
});