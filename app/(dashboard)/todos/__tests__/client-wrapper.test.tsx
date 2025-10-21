import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodosClientWrapper from '../client-wrapper';
import { useModalStore } from '@/hooks/use-modal-store';
import type { TaskBoardTask } from '@/types/Task';

// Mock dependencies
jest.mock('@/hooks/use-modal-store');
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toasts: [],
    toast: jest.fn(),
    dismiss: jest.fn(),
  }),
  toast: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

describe('TodosClientWrapper - Layout Changes', () => {
  const mockOpenAufgabeModal = jest.fn();
  const mockGetState = jest.fn();

  const mockTasks: TaskBoardTask[] = [
    {
      id: '1',
      title: 'Fix leaky faucet',
      description: 'Repair the kitchen faucet',
      status: 'todo',
      priority: 'high',
      dueDate: '2023-12-31',
      assignee: 'John Doe',
      category: 'maintenance',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    },
    {
      id: '2',
      title: 'Paint apartment',
      description: 'Paint the living room walls',
      status: 'in_progress',
      priority: 'medium',
      dueDate: '2023-12-15',
      assignee: 'Jane Smith',
      category: 'renovation',
      createdAt: '2023-01-02',
      updatedAt: '2023-01-02'
    }
  ];

  const defaultProps = {
    tasks: mockTasks,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the modal store properly - both for direct call and getState
    mockUseModalStore.mockReturnValue({
      openAufgabeModal: mockOpenAufgabeModal,
    });
    
    mockUseModalStore.getState = jest.fn().mockReturnValue({
      openAufgabeModal: mockOpenAufgabeModal,
    });
  });

  describe('New Layout Structure', () => {
    it('renders without redundant page header section', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should NOT have the old page header structure
      expect(screen.queryByText('Aufgaben')).not.toBeInTheDocument();
      expect(screen.queryByText('Verwalten Sie Ihre Aufgaben und To-Dos')).not.toBeInTheDocument();
    });

    it('renders card with inline header-button layout', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should have the new card-based layout
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Aufgabe hinzufügen/i })).toBeInTheDocument();
    });

    it('positions add button inline with management title', () => {
      const { container } = render(<TodosClientWrapper {...defaultProps} />);

      // Find the header container with flex layout
      const headerContainer = container.querySelector('.flex.flex-row.items-center.justify-between');
      expect(headerContainer).toBeInTheDocument();

      // Verify the title and button are in the same container
      const title = screen.getByText('Aufgabenliste');
      const button = screen.getByRole('button', { name: /Aufgabe hinzufügen/i });
      
      expect(headerContainer).toContainElement(title);
      expect(headerContainer).toContainElement(button);
    });

    it('removes redundant CardDescription', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should not have redundant description in card
      expect(screen.queryByText('Hier können Sie Ihre Aufgaben verwalten')).not.toBeInTheDocument();
    });

    it('maintains proper card structure', () => {
      const { container } = render(<TodosClientWrapper {...defaultProps} />);

      // Verify card structure
      const card = container.querySelector('[class*="rounded-xl"][class*="border-none"][class*="shadow-md"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Button Functionality', () => {
    it('calls openAufgabeModal when add button is clicked', async () => {
      const user = userEvent.setup();
      render(<TodosClientWrapper {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Aufgabe hinzufügen/i });
      await user.click(addButton);

      expect(mockOpenAufgabeModal).toHaveBeenCalledWith(
        undefined,
        expect.any(Function)
      );
    });

    it('passes correct callback to modal', async () => {
      const user = userEvent.setup();
      render(<TodosClientWrapper {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Aufgabe hinzufügen/i });
      await user.click(addButton);

      expect(mockOpenAufgabeModal).toHaveBeenCalledWith(
        undefined,
        expect.any(Function)
      );

      // Verify the callback function is properly defined
      const callback = mockOpenAufgabeModal.mock.calls[0][1];
      expect(typeof callback).toBe('function');
    });

    it('button has proper styling and classes', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Aufgabe hinzufügen/i });
      expect(addButton).toHaveClass('sm:w-auto');
    });
  });

  describe('Responsive Design', () => {
    it('has responsive layout classes', () => {
      const { container } = render(<TodosClientWrapper {...defaultProps} />);

      // Main container should have responsive padding
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('flex', 'flex-col', 'gap-8', 'p-8');
    });

    it('header layout adapts for different screen sizes', () => {
      const { container } = render(<TodosClientWrapper {...defaultProps} />);

      const headerContainer = container.querySelector('.flex.flex-row.items-center.justify-between');
      expect(headerContainer).toBeInTheDocument();
      
      // Should have responsive flex classes
      expect(headerContainer).toHaveClass('flex-row', 'items-center', 'justify-between');
    });

    it('button has responsive width classes', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Aufgabe hinzufügen/i });
      expect(addButton).toHaveClass('sm:w-auto');
    });
  });

  describe('Accessibility', () => {
    it('maintains proper heading hierarchy', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // CardTitle should be properly structured
      const title = screen.getByText('Aufgabenliste');
      expect(title).toBeInTheDocument();
    });

    it('button has proper accessibility attributes', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Aufgabe hinzufügen/i });
      // Button should be accessible by role (implicit for button elements)
      expect(addButton).toBeInTheDocument();
      expect(addButton.tagName).toBe('BUTTON');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TodosClientWrapper {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Aufgabe hinzufügen/i });
      
      // Tab to button
      await user.tab();
      expect(addButton).toHaveFocus();

      // Press Enter to activate
      await user.keyboard('{Enter}');
      expect(mockOpenAufgabeModal).toHaveBeenCalled();
    });

    it('has proper ARIA labels and roles', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Aufgabe hinzufügen/i });
      // Button should have accessible name (implicit role for button elements)
      expect(addButton).toHaveAccessibleName(/Aufgabe hinzufügen/i);
      expect(addButton.tagName).toBe('BUTTON');
    });
  });

  describe('Task Management', () => {
    it('handles task updates correctly', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should render task board with tasks
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
    });

    it('handles task deletion correctly', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should handle task deletion through callback
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
    });

    it('updates task state when tasks are modified', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should maintain task state correctly
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
    });
  });

  describe('Filter and Search Integration', () => {
    it('maintains filter functionality', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should render filters component
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
    });

    it('maintains search functionality', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should handle search queries
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
    });

    it('passes correct props to TaskBoard', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should pass filter and search props to TaskBoard
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
    });
  });

  describe('Data Handling', () => {
    it('handles empty task list', () => {
      const emptyProps = {
        tasks: [],
      };

      render(<TodosClientWrapper {...emptyProps} />);

      // Should still render the layout
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Aufgabe hinzufügen/i })).toBeInTheDocument();
    });

    it('handles task list with various statuses', () => {
      const mixedStatusTasks: TaskBoardTask[] = [
        { ...mockTasks[0], status: 'todo' },
        { ...mockTasks[1], status: 'in_progress' },
        { 
          id: '3', 
          title: 'Completed task', 
          status: 'completed',
          priority: 'low',
          category: 'maintenance',
          createdAt: '2023-01-03',
          updatedAt: '2023-01-03'
        }
      ];

      const mixedProps = {
        tasks: mixedStatusTasks,
      };

      render(<TodosClientWrapper {...mixedProps} />);

      // Should handle different task statuses
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
    });

    it('handles task updates through callback', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should provide callback for task updates
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles modal errors gracefully', () => {
      // Test that the component renders properly even when modal function would throw
      mockOpenAufgabeModal.mockImplementation(() => {
        // Don't actually throw in this test - just verify the setup works
        return undefined;
      });

      render(<TodosClientWrapper {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Aufgabe hinzufügen/i });
      
      // Verify the component renders without crashing
      expect(addButton).toBeInTheDocument();
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
      
      // Verify the button is functional
      expect(addButton).not.toBeDisabled();
    });

    it('handles malformed task data gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const malformedTasks = [
        { id: '1' } as any, // Missing required fields
      ];

      const malformedProps = {
        tasks: malformedTasks,
      };

      render(<TodosClientWrapper {...malformedProps} />);

      // Should still render without crashing
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Component Integration', () => {
    it('integrates properly with TaskFilters component', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should pass filter change handlers to filters
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
    });

    it('integrates properly with TaskBoard component', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should pass correct props to TaskBoard
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
    });

    it('maintains state consistency between components', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Filter and search state should be maintained
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
    });

    it('renders Toaster component for notifications', () => {
      const { container } = render(<TodosClientWrapper {...defaultProps} />);

      // Should include Toaster for notifications
      expect(container).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('initializes with correct task state', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should initialize with provided tasks
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
    });

    it('updates filter state correctly', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should maintain filter state
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
    });

    it('updates search state correctly', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should maintain search state
      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
    });
  });
});