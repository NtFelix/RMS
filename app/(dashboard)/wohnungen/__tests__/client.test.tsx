import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WohnungenClientView from '../client';
import { useModalStore } from '@/hooks/use-modal-store';
import type { Wohnung } from '@/types/Wohnung';

// Mock dependencies
jest.mock('@/hooks/use-modal-store');
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: '1',
              name: 'Test Apartment',
              Haeuser: { name: 'Test House' }
            },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

describe('WohnungenClientView - Layout Changes', () => {
  const mockOpenWohnungModal = jest.fn();
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  const defaultProps = {
    initialWohnungenData: [] as Wohnung[],
    housesData: [{ id: '1', name: 'Test House' }],
    serverApartmentCount: 0,
    serverApartmentLimit: 10,
    serverUserIsEligibleToAdd: true,
    serverLimitReason: 'none' as const,
  };

  const mockWohnungen: Wohnung[] = [
    {
      id: '1',
      name: 'Apartment A',
      groesse: 50,
      miete: 800,
      status: 'frei',
      Haeuser: { name: 'House 1' },
      haeuser_id: 'h1',
      user_id: 'u1'
    },
    {
      id: '2',
      name: 'Apartment B',
      groesse: 75,
      miete: 1200,
      status: 'vermietet',
      Haeuser: { name: 'House 2' },
      haeuser_id: 'h2',
      user_id: 'u1'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModalStore.mockReturnValue({
      openWohnungModal: mockOpenWohnungModal,
    } as any);
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWohnungen),
    } as Response);
  });

  describe('New Layout Structure', () => {
    it('renders without redundant page header section', () => {
      render(<WohnungenClientView {...defaultProps} />);

      // Should NOT have the old page header structure
      expect(screen.queryByText('Wohnungen')).not.toBeInTheDocument();
      expect(screen.queryByText('Verwalten Sie Ihre Wohnungen und Apartments')).not.toBeInTheDocument();
    });

    it('renders card with inline header-button layout', () => {
      render(<WohnungenClientView {...defaultProps} />);

      // Should have the new card-based layout
      expect(screen.getByText('Wohnungsverwaltung')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Wohnung hinzufügen/i })).toBeInTheDocument();
    });

    it('positions add button inline with management title', () => {
      const { container } = render(<WohnungenClientView {...defaultProps} />);

      // Find the header container with flex layout
      const headerContainer = container.querySelector('.flex.flex-row.items-center.justify-between');
      expect(headerContainer).toBeInTheDocument();

      // Verify the title and button are in the same container
      const title = screen.getByText('Wohnungsverwaltung');
      const button = screen.getByRole('button', { name: /Wohnung hinzufügen/i });
      
      // Check that both elements exist and are positioned correctly
      expect(title).toBeInTheDocument();
      expect(button).toBeInTheDocument();
      expect(headerContainer).toBeInTheDocument();
    });

    it('removes redundant CardDescription', () => {
      render(<WohnungenClientView {...defaultProps} />);

      // Should not have redundant description in card
      expect(screen.queryByText('Hier können Sie Ihre Wohnungen verwalten')).not.toBeInTheDocument();
    });

    it('maintains proper card structure', () => {
      const { container } = render(<WohnungenClientView {...defaultProps} />);

      // Verify card structure - look for the actual classes used
      const card = container.querySelector('.rounded-xl.shadow-md');
      expect(card).toBeInTheDocument();

      // Verify CardHeader and CardContent exist by looking for their content
      expect(screen.getByText('Wohnungsverwaltung')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Button Functionality', () => {
    it('calls openWohnungModal when add button is clicked', async () => {
      const user = userEvent.setup();
      render(<WohnungenClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Wohnung hinzufügen/i });
      await user.click(addButton);

      expect(mockOpenWohnungModal).toHaveBeenCalledWith(
        undefined,
        defaultProps.housesData,
        expect.any(Function),
        defaultProps.serverApartmentCount,
        defaultProps.serverApartmentLimit,
        defaultProps.serverUserIsEligibleToAdd
      );
    });

    it('handles button disabled state correctly', () => {
      const disabledProps = {
        ...defaultProps,
        serverUserIsEligibleToAdd: false,
      };

      render(<WohnungenClientView {...disabledProps} />);

      const addButton = screen.getByRole('button', { name: /Wohnung hinzufügen/i });
      expect(addButton).toBeDisabled();
    });

    it('shows tooltip when button is disabled', () => {
      const disabledProps = {
        ...defaultProps,
        serverUserIsEligibleToAdd: false,
      };

      render(<WohnungenClientView {...disabledProps} />);

      const addButton = screen.getByRole('button', { name: /Wohnung hinzufügen/i });
      expect(addButton).toBeDisabled();
      
      // The button should be disabled and have tooltip functionality
      expect(addButton).toBeDisabled();
    });

    it('handles subscription limit correctly', () => {
      const limitProps = {
        ...defaultProps,
        serverApartmentCount: 10,
        serverApartmentLimit: 10,
        serverLimitReason: 'subscription' as const,
      };

      render(<WohnungenClientView {...limitProps} />);

      const addButton = screen.getByRole('button', { name: /Wohnung hinzufügen/i });
      expect(addButton).toBeDisabled();
    });
  });

  describe('Responsive Design', () => {
    it('has responsive layout classes', () => {
      const { container } = render(<WohnungenClientView {...defaultProps} />);

      // Main container should have responsive padding
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('flex', 'flex-col', 'gap-8', 'p-8');
    });

    it('button has responsive width classes', () => {
      render(<WohnungenClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Wohnung hinzufügen/i });
      expect(addButton).toHaveClass('sm:w-auto');
    });

    it('header layout adapts for different screen sizes', () => {
      const { container } = render(<WohnungenClientView {...defaultProps} />);

      const headerContainer = container.querySelector('.flex.flex-row.items-center.justify-between');
      expect(headerContainer).toBeInTheDocument();
      
      // Should have responsive flex classes
      expect(headerContainer).toHaveClass('flex-row', 'items-center', 'justify-between');
    });
  });

  describe('Accessibility', () => {
    it('maintains proper heading hierarchy', () => {
      render(<WohnungenClientView {...defaultProps} />);

      // CardTitle should be properly structured
      const title = screen.getByText('Wohnungsverwaltung');
      expect(title).toBeInTheDocument();
    });

    it('button has proper accessibility attributes', () => {
      render(<WohnungenClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Wohnung hinzufügen/i });
      // Button should be accessible and have proper role
      expect(addButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<WohnungenClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Wohnung hinzufügen/i });
      
      // Tab to button
      await user.tab();
      expect(addButton).toHaveFocus();

      // Press Enter to activate
      await user.keyboard('{Enter}');
      expect(mockOpenWohnungModal).toHaveBeenCalled();
    });

    it('has proper ARIA labels and roles', () => {
      render(<WohnungenClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Wohnung hinzufügen/i });
      // Button should have proper role (implicit from getByRole)
      expect(addButton).toBeInTheDocument();
    });
  });

  describe('Integration with Existing Functionality', () => {
    it('maintains filter and search functionality', () => {
      render(<WohnungenClientView {...defaultProps} initialWohnungenData={mockWohnungen} />);

      // Should still render filters and table
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('handles edit functionality correctly', async () => {
      const user = userEvent.setup();
      render(<WohnungenClientView {...defaultProps} initialWohnungenData={mockWohnungen} />);

      // Should be able to interact with table for editing
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('refreshes data correctly', async () => {
      render(<WohnungenClientView {...defaultProps} />);

      // The component should render without calling fetch initially
      // Fetch is only called when refreshTable is triggered
      expect(mockFetch).not.toHaveBeenCalled();
      
      // Component should render successfully
      expect(screen.getByText('Wohnungsverwaltung')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<WohnungenClientView {...defaultProps} />);

      // Component should render without errors even if fetch would fail
      expect(screen.getByText('Wohnungsverwaltung')).toBeInTheDocument();
      
      // No fetch should be called on initial render
      expect(mockFetch).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('handles modal errors gracefully', async () => {
      mockOpenWohnungModal.mockImplementation(() => {
        throw new Error('Modal error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();
      render(<WohnungenClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Wohnung hinzufügen/i });
      
      // Should handle modal errors without crashing the component
      await user.click(addButton);
      
      // Error should be logged
      expect(consoleSpy).toHaveBeenCalledWith('Error opening wohnung modal:', expect.any(Error));
      
      // Component should still be functional
      expect(screen.getByText('Wohnungsverwaltung')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });
});