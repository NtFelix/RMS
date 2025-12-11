import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { SearchResultItem } from '../search-result-item';
import { SearchResult } from '@/types/search';
import { Edit, Eye, Trash2 } from 'lucide-react';

// Mock the command components
jest.mock('@/components/ui/command', () => ({
  CommandItem: ({ children, onSelect, className, ...props }: any) => (
    <div
      data-testid="command-item"
      onClick={onSelect}
      className={className}
      {...props}
    >
      {children}
    </div>
  ),
}));

// Mock the button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock the badge component
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>
      {children}
    </span>
  ),
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('SearchResultItem', () => {
  const mockOnSelect = jest.fn();
  const mockOnAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tenant results', () => {
    const tenantResult: SearchResult = {
      id: '1',
      type: 'tenant',
      title: 'John Doe',
      subtitle: 'john@example.com',
      context: 'Apartment 1 - House 1',
      metadata: {
        status: 'active',
        email: 'john@example.com',
        phone: '123456789',
        address: 'Test Address 1'
      },
      actions: [
        {
          label: 'Bearbeiten',
          icon: Edit,
          action: () => { },
          variant: 'default'
        },
        {
          label: 'Anzeigen',
          icon: Eye,
          action: () => { },
          variant: 'default'
        }
      ]
    };

    it('should render tenant result correctly', () => {
      render(
        <SearchResultItem
          result={tenantResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      // Title should be visible
      expect(screen.getByText('John Doe')).toBeInTheDocument();

      // Metadata (email/phone) should be visible
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Test Address 1')).toBeInTheDocument();

      // Status badge
      expect(screen.getByText('Aktiv')).toBeInTheDocument();

      // Subtitle is hidden for tenants in the new design in favor of metadata
    });

    it('should display tenant metadata correctly', () => {
      render(
        <SearchResultItem
          result={tenantResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('123456789')).toBeInTheDocument();
    });

    it('should handle moved out tenant status', () => {
      const movedOutTenant = {
        ...tenantResult,
        metadata: { ...tenantResult.metadata, status: 'moved_out' }
      };

      render(
        <SearchResultItem
          result={movedOutTenant}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('Ausgezogen')).toBeInTheDocument();
    });
  });

  describe('House results', () => {
    const houseResult: SearchResult = {
      id: '2',
      type: 'house',
      title: 'House 1',
      subtitle: 'Main Street 1, Berlin',
      context: '3 Wohnungen • 1 frei',
      metadata: {
        address: 'Main Street 1, Berlin',
        apartment_count: 3,
        free_apartments: 1
      },
      actions: [
        {
          label: 'Bearbeiten',
          icon: Edit,
          action: () => { },
          variant: 'default'
        }
      ]
    };

    it('should render house result correctly', () => {
      render(
        <SearchResultItem
          result={houseResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('House 1')).toBeInTheDocument();
      // Address appears in metadata
      expect(screen.getByText('Main Street 1, Berlin')).toBeInTheDocument();
    });

    it('should display house metadata correctly', () => {
      render(
        <SearchResultItem
          result={houseResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      // We look for text content including the labels
      expect(screen.getAllByText((content) => content.includes('3 Wohnungen')).length).toBeGreaterThan(0);
    });
  });

  describe('Apartment results', () => {
    const apartmentResult: SearchResult = {
      id: '3',
      type: 'apartment',
      title: 'Apartment 1',
      subtitle: 'House 1',
      context: 'Vermietet an John Doe',
      metadata: {
        house_name: 'House 1',
        size: 75,
        rent: 800,
        status: 'rented',
        current_tenant: {
          name: 'John Doe',
          move_in_date: '2023-01-01'
        }
      },
      actions: []
    };

    it('should render apartment result correctly', () => {
      render(
        <SearchResultItem
          result={apartmentResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('Apartment 1')).toBeInTheDocument();
      // House name appears in metadata
      expect(screen.getByText('House 1')).toBeInTheDocument();
      // Tenant name appears
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display apartment metadata correctly', () => {
      render(
        <SearchResultItem
          result={apartmentResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('75m²')).toBeInTheDocument();
      // Rent formatting
      expect(screen.getByText('800')).toBeInTheDocument();
      expect(screen.getByText('Vermietet')).toBeInTheDocument();
    });

    it('should handle free apartment status', () => {
      const freeApartment = {
        ...apartmentResult,
        context: 'Frei • 800€/Monat',
        metadata: { ...apartmentResult.metadata, status: 'free', current_tenant: undefined }
      };

      render(
        <SearchResultItem
          result={freeApartment}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('Frei')).toBeInTheDocument();
    });
  });

  describe('Finance results', () => {
    const financeResult: SearchResult = {
      id: '4',
      type: 'finance',
      title: 'Rent Payment',
      subtitle: '+800€',
      context: 'Apartment 1 - House 1',
      metadata: {
        amount: 800,
        date: '2023-12-01',
        type: 'income',
        apartment: {
          name: 'Apartment 1',
          house_name: 'House 1'
        }
      },
      actions: [
        {
          label: 'Löschen',
          icon: Trash2,
          action: () => { },
          variant: 'destructive'
        }
      ]
    };

    it('should render finance result correctly', () => {
      render(
        <SearchResultItem
          result={financeResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('Rent Payment')).toBeInTheDocument();
      expect(screen.getAllByText('800€')).toHaveLength(1);
      expect(screen.getByText('Apartment 1')).toBeInTheDocument();
    });

    it('should display finance metadata with correct colors', () => {
      render(
        <SearchResultItem
          result={financeResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      const amountElement = screen.getByText('800€');
      // Parent container typically carries the color class or the span itself
      expect(amountElement).toHaveClass('font-medium');
      expect(amountElement.className).toContain('text-emerald-600');
    });

    it('should handle expense type correctly', () => {
      const expenseResult = {
        ...financeResult,
        subtitle: '-500€',
        metadata: { ...financeResult.metadata, amount: -500, type: 'expense' }
      };

      render(
        <SearchResultItem
          result={expenseResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      const amountElement = screen.getByText('-500€');
      expect(amountElement.className).toContain('text-rose-600');
    });

    it('should format dates correctly', () => {
      render(
        <SearchResultItem
          result={financeResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('1.12.2023')).toBeInTheDocument();
    });
  });

  describe('Task results', () => {
    const taskResult: SearchResult = {
      id: '5',
      type: 'task',
      title: 'Fix heating',
      subtitle: 'Repair heating system in apartment 1',
      context: 'Offen',
      metadata: {
        description: 'Repair heating system in apartment 1',
        completed: false,
        created_date: '2023-12-01',
        due_date: '2023-12-15'
      },
      actions: []
    };

    it('should render task result correctly', () => {
      render(
        <SearchResultItem
          result={taskResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('Fix heating')).toBeInTheDocument();
      expect(screen.getByText('Repair heating system in apartment 1')).toBeInTheDocument();
      expect(screen.getAllByText('Offen').length).toBeGreaterThan(0);
    });

    it('should display task completion status correctly', () => {
      render(
        <SearchResultItem
          result={taskResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getAllByText('Offen').length).toBeGreaterThan(0);
    });

    it('should handle completed task status', () => {
      const completedTask = {
        ...taskResult,
        context: 'Erledigt',
        metadata: { ...taskResult.metadata, completed: true }
      };

      render(
        <SearchResultItem
          result={completedTask}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getAllByText('Erledigt').length).toBeGreaterThan(0);
    });
  });

  describe('Interactions', () => {
    const basicResult: SearchResult = {
      id: '1',
      type: 'tenant',
      title: 'Test Result',
      actions: [
        {
          label: 'Edit',
          icon: Edit,
          action: () => { },
          variant: 'default'
        },
        {
          label: 'Delete',
          icon: Trash2,
          action: () => { },
          variant: 'destructive'
        }
      ]
    };

    it('should call onSelect when item is clicked', () => {
      render(
        <SearchResultItem
          result={basicResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      fireEvent.click(screen.getByTestId('command-item'));
      expect(mockOnSelect).toHaveBeenCalledWith(basicResult);
    });

    it('should call onAction when action button is clicked', () => {
      render(
        <SearchResultItem
          result={basicResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      const actionButtons = screen.getAllByRole('button');
      fireEvent.click(actionButtons[0]);

      expect(mockOnAction).toHaveBeenCalledWith(basicResult, 0);
      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('should prevent event propagation on action button clicks', () => {
      render(
        <SearchResultItem
          result={basicResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      const actionButtons = screen.getAllByRole('button');
      fireEvent.click(actionButtons[0]);

      // onSelect should not be called when action button is clicked
      expect(mockOnSelect).not.toHaveBeenCalled();
      expect(mockOnAction).toHaveBeenCalledWith(basicResult, 0);
    });

    it('should show action buttons', () => {
      render(
        <SearchResultItem
          result={basicResult}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      const actionButtons = screen.getAllByRole('button');
      expect(actionButtons).toHaveLength(2);
    });

    it('should limit displayed actions to 3', () => {
      const resultWithManyActions = {
        ...basicResult,
        actions: [
          { label: 'Action 1', icon: Edit, action: () => { }, variant: 'default' as const },
          { label: 'Action 2', icon: Eye, action: () => { }, variant: 'default' as const },
          { label: 'Action 3', icon: Trash2, action: () => { }, variant: 'destructive' as const },
          { label: 'Action 4', icon: Edit, action: () => { }, variant: 'default' as const },
        ]
      };

      render(
        <SearchResultItem
          result={resultWithManyActions}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      const actionButtons = screen.getAllByRole('button');
      // Should show exactly 3 action buttons
      expect(actionButtons).toHaveLength(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle result without actions', () => {
      const resultWithoutActions: SearchResult = {
        id: '1',
        type: 'tenant',
        title: 'No Actions Result'
      };

      render(
        <SearchResultItem
          result={resultWithoutActions}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('No Actions Result')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should handle result without metadata', () => {
      const resultWithoutMetadata: SearchResult = {
        id: '1',
        type: 'tenant',
        title: 'No Metadata Result'
      };

      render(
        <SearchResultItem
          result={resultWithoutMetadata}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('No Metadata Result')).toBeInTheDocument();
    });

    it('should truncate long text content', () => {
      const resultWithLongText: SearchResult = {
        id: '1',
        type: 'finance', // finance type shows subtitle in header
        title: 'This is a very long title that should be truncated',
        subtitle: 'This is also a very long subtitle that should be truncated'
      };

      render(
        <SearchResultItem
          result={resultWithLongText}
          onSelect={mockOnSelect}
          onAction={mockOnAction}
        />
      );

      const titleElement = screen.getByText(resultWithLongText.title);
      expect(titleElement).toHaveClass('truncate');

      // Subtitle should be visible and truncated for Finance type
      // Note: Subtitle text is prefixed with bullet point in display
      const subtitleElement = screen.getByText((content) => content.includes(resultWithLongText.subtitle!));
      expect(subtitleElement).toHaveClass('truncate');
    });
  });
});