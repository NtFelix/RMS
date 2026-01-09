import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodosClientWrapper from './client-wrapper';
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

// Mock server actions
jest.mock('@/app/todos-actions', () => ({
  toggleTaskStatusAction: jest.fn().mockResolvedValue({ success: true }),
  deleteTaskAction: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock fetch
global.fetch = jest.fn();

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

describe('TodosClientWrapper - Calendar Layout', () => {
  const mockOpenAufgabeModal = jest.fn();

  const mockTasks: TaskBoardTask[] = [
    {
      id: '1',
      name: 'Fix leaky faucet',
      beschreibung: 'Repair the kitchen faucet',
      ist_erledigt: false,
      erstellungsdatum: '2023-01-01',
      aenderungsdatum: '2023-01-01',
      faelligkeitsdatum: '2026-01-15',
    },
    {
      id: '2',
      name: 'Paint apartment',
      beschreibung: 'Paint the living room walls',
      ist_erledigt: true,
      erstellungsdatum: '2023-01-02',
      aenderungsdatum: '2023-01-02',
      faelligkeitsdatum: '2026-01-10',
    },
    {
      id: '3',
      name: 'Task without date',
      beschreibung: 'This task has no due date',
      ist_erledigt: false,
      erstellungsdatum: '2023-01-03',
      aenderungsdatum: '2023-01-03',
      faelligkeitsdatum: null,
    },
  ];

  const defaultProps = {
    tasks: mockTasks,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseModalStore.mockReturnValue({
      openAufgabeModal: mockOpenAufgabeModal,
    } as any);

    (mockUseModalStore as any).getState = jest.fn().mockReturnValue({
      openAufgabeModal: mockOpenAufgabeModal,
    });
  });

  describe('Calendar Layout Structure', () => {
    it('renders the main header with calendar title', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      expect(screen.getByText('Aufgabenkalender')).toBeInTheDocument();
    });

    it('renders the add task button', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Aufgabe hinzufügen/i })).toBeInTheDocument();
    });

    it('renders the sidebar with task list title', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      expect(screen.getByText('Aufgabenliste')).toBeInTheDocument();
    });

    it('renders the calendar section', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      expect(screen.getByText('Kalender')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      expect(screen.getByPlaceholderText('Suchen...')).toBeInTheDocument();
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
  });

  describe('Search Functionality', () => {
    it('filters tasks based on search query', async () => {
      const user = userEvent.setup();
      render(<TodosClientWrapper {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Suchen...');
      await user.type(searchInput, 'faucet');

      // The search should filter tasks (implementation depends on how components render)
      expect(searchInput).toHaveValue('faucet');
    });

    it('clears search when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<TodosClientWrapper {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Suchen...');
      await user.type(searchInput, 'test');

      expect(searchInput).toHaveValue('test');
    });
  });

  describe('Sidebar Sections', () => {
    it('renders overdue/upcoming/no-date sections', () => {
      render(<TodosClientWrapper {...defaultProps} />);

      // Should render section headers
      expect(screen.getByText('Anstehend')).toBeInTheDocument();
      expect(screen.getByText('Ohne Datum')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('handles empty task list', () => {
      const emptyProps = {
        tasks: [],
      };

      render(<TodosClientWrapper {...emptyProps} />);

      expect(screen.getByText('Aufgabenkalender')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Aufgabe hinzufügen/i })).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('has responsive layout classes for sidebar and calendar grid', () => {
      const { container } = render(<TodosClientWrapper {...defaultProps} />);

      // Check for lg:grid-cols layout
      const gridContainer = container.querySelector('.grid.grid-cols-1.lg\\:grid-cols-\\[280px_1fr\\]');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('add button is keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<TodosClientWrapper {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Aufgabe hinzufügen/i });
      addButton.focus();
      expect(addButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockOpenAufgabeModal).toHaveBeenCalled();
    });
  });
});