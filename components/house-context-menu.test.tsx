import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HouseContextMenu, House } from './house-context-menu';
import { deleteHouseAction } from '@/app/(dashboard)/haeuser/actions';

// Mock dependencies
jest.mock('@/app/(dashboard)/haeuser/actions');

import { toast } from '@/hooks/use-toast';
const mockToast = toast as jest.MockedFunction<typeof toast>;

const mockDeleteHouseAction = deleteHouseAction as jest.MockedFunction<typeof deleteHouseAction>;

describe('HouseContextMenu', () => {
  const mockOnEdit = jest.fn();
  const mockOnRefresh = jest.fn();

  const mockHouse: House = {
    id: '1',
    name: 'Test House',
    ort: 'Berlin',
    strasse: 'Test Street 1',
    size: '150',
    rent: '2500',
    pricePerSqm: '16.67',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteHouseAction.mockResolvedValue({ success: true });
  });

  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="child-content">Test Content</div>
        </HouseContextMenu>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('shows context menu on right click', async () => {
      const user = userEvent.setup();
      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');
      await user.pointer({ keys: '[MouseRight]', target: trigger });

      expect(screen.getByRole('menuitem', { name: /Bearbeiten/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /Löschen/i })).toBeInTheDocument();
    });

    it('renders edit menu item with correct icon and text', async () => {
      const user = userEvent.setup();
      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');
      await user.pointer({ keys: '[MouseRight]', target: trigger });

      const editItem = screen.getByRole('menuitem', { name: /Bearbeiten/i });
      expect(editItem).toBeInTheDocument();
      expect(editItem).toHaveClass('flex', 'items-center', 'gap-2', 'cursor-pointer');
    });

    it('renders delete menu item with correct styling', async () => {
      const user = userEvent.setup();
      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');
      await user.pointer({ keys: '[MouseRight]', target: trigger });

      const deleteItem = screen.getByRole('menuitem', { name: /Löschen/i });
      expect(deleteItem).toBeInTheDocument();
      expect(deleteItem).toHaveClass('text-red-600', 'focus:text-red-600');
    });
  });

  describe('Edit functionality', () => {
    it('calls onEdit when edit menu item is clicked', async () => {
      const user = userEvent.setup();
      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');
      await user.pointer({ keys: '[MouseRight]', target: trigger });

      const editItem = screen.getByRole('menuitem', { name: /Bearbeiten/i });
      await user.click(editItem);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Delete functionality', () => {
    it('opens delete confirmation dialog when delete menu item is clicked', async () => {
      const user = userEvent.setup();
      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');
      await user.pointer({ keys: '[MouseRight]', target: trigger });

      const deleteItem = screen.getByRole('menuitem', { name: /Löschen/i });
      await user.click(deleteItem);

      expect(screen.getByText('Haus löschen?')).toBeInTheDocument();
      expect(screen.getByText(`Möchten Sie das Haus "${mockHouse.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)).toBeInTheDocument();
    });

    it('shows correct buttons in delete confirmation dialog', async () => {
      const user = userEvent.setup();
      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');
      await user.pointer({ keys: '[MouseRight]', target: trigger });

      const deleteItem = screen.getByRole('menuitem', { name: /Löschen/i });
      await user.click(deleteItem);

      expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Löschen' })).toBeInTheDocument();
    });

    it('closes dialog when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');
      await user.pointer({ keys: '[MouseRight]', target: trigger });

      const deleteItem = screen.getByRole('menuitem', { name: /Löschen/i });
      await user.click(deleteItem);

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      await user.click(cancelButton);

      expect(screen.queryByText('Haus löschen?')).not.toBeInTheDocument();
    });

    it('calls deleteHouseAction when delete is confirmed', async () => {
      const user = userEvent.setup();
      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');
      await user.pointer({ keys: '[MouseRight]', target: trigger });

      const deleteItem = screen.getByRole('menuitem', { name: /Löschen/i });
      await user.click(deleteItem);

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      await user.click(deleteButton);

      expect(mockDeleteHouseAction).toHaveBeenCalledWith(mockHouse.id);
    });

    it('shows success toast and calls onRefresh after successful deletion', async () => {
      // Set up fake timers at the beginning of the test
      jest.useFakeTimers();
      
      const user = userEvent.setup();
      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');
      await user.pointer({ keys: '[MouseRight]', target: trigger });

      const deleteItem = screen.getByRole('menuitem', { name: /Löschen/i });
      await user.click(deleteItem);

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Erfolg',
          description: `Das Haus "${mockHouse.name}" wurde erfolgreich gelöscht.`,
          variant: 'success',
        });
      });

      // Fast-forward until all timers have been executed
      jest.runAllTimers();
      
      // Verify onRefresh was called
      expect(mockOnRefresh).toHaveBeenCalled();
      
      // Restore real timers
      jest.useRealTimers();
    });

    it('shows error toast when deletion fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Database error occurred';
      mockDeleteHouseAction.mockResolvedValue({
        success: false,
        error: { message: errorMessage },
      });

      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');
      await user.pointer({ keys: '[MouseRight]', target: trigger });

      const deleteItem = screen.getByRole('menuitem', { name: /Löschen/i });
      await user.click(deleteItem);

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Fehler',
          description: errorMessage,
          variant: 'destructive',
        });
      });

      expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    it('shows generic error toast when deletion fails without specific message', async () => {
      const user = userEvent.setup();
      mockDeleteHouseAction.mockResolvedValue({
        success: false,
        error: undefined,
      });

      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');
      await user.pointer({ keys: '[MouseRight]', target: trigger });

      const deleteItem = screen.getByRole('menuitem', { name: /Löschen/i });
      await user.click(deleteItem);

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Fehler',
          description: 'Das Haus konnte nicht gelöscht werden.',
          variant: 'destructive',
        });
      });
    });

    it('handles unexpected errors during deletion', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDeleteHouseAction.mockRejectedValue(new Error('Network error'));

      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');
      await user.pointer({ keys: '[MouseRight]', target: trigger });

      const deleteItem = screen.getByRole('menuitem', { name: /Löschen/i });
      await user.click(deleteItem);

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Unerwarteter Fehler beim Löschen des Hauses:',
          expect.any(Error)
        );
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Systemfehler',
          description: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
          variant: 'destructive',
        });
      });

      consoleErrorSpy.mockRestore();
    });

    it('calls deleteHouseAction and handles loading state', async () => {
      const user = userEvent.setup();
      
      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');
      await user.pointer({ keys: '[MouseRight]', target: trigger });

      const deleteItem = screen.getByRole('menuitem', { name: /Löschen/i });
      await user.click(deleteItem);

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      await user.click(deleteButton);

      // Verify the action was called
      expect(mockDeleteHouseAction).toHaveBeenCalledWith(mockHouse.id);

      // Dialog should close after completion
      await waitFor(() => {
        expect(screen.queryByText('Haus löschen?')).not.toBeInTheDocument();
      });
    });

    it('closes dialog after successful deletion', async () => {
      const user = userEvent.setup();
      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');
      await user.pointer({ keys: '[MouseRight]', target: trigger });

      const deleteItem = screen.getByRole('menuitem', { name: /Löschen/i });
      await user.click(deleteItem);

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText('Haus löschen?')).not.toBeInTheDocument();
      });
    });

    it('closes dialog after failed deletion', async () => {
      const user = userEvent.setup();
      mockDeleteHouseAction.mockResolvedValue({
        success: false,
        error: { message: 'Error' },
      });

      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');
      await user.pointer({ keys: '[MouseRight]', target: trigger });

      const deleteItem = screen.getByRole('menuitem', { name: /Löschen/i });
      await user.click(deleteItem);

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText('Haus löschen?')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dialog state management', () => {
    it('dialog is initially closed', () => {
      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      expect(screen.queryByText('Haus löschen?')).not.toBeInTheDocument();
    });

    it('can open and close dialog multiple times', async () => {
      const user = userEvent.setup();
      render(
        <HouseContextMenu
          house={mockHouse}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
        >
          <div data-testid="trigger">Right click me</div>
        </HouseContextMenu>
      );

      const trigger = screen.getByTestId('trigger');

      // Open dialog first time
      await user.pointer({ keys: '[MouseRight]', target: trigger });
      const deleteItem = screen.getByRole('menuitem', { name: /Löschen/i });
      await user.click(deleteItem);
      expect(screen.getByText('Haus löschen?')).toBeInTheDocument();

      // Close dialog
      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      await user.click(cancelButton);
      expect(screen.queryByText('Haus löschen?')).not.toBeInTheDocument();

      // Open dialog second time
      await user.pointer({ keys: '[MouseRight]', target: trigger });
      const deleteItem2 = screen.getByRole('menuitem', { name: /Löschen/i });
      await user.click(deleteItem2);
      expect(screen.getByText('Haus löschen?')).toBeInTheDocument();
    });
  });
});