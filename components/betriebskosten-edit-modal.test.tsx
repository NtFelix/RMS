import { render, screen, fireEvent, within } from '@testing-library/react';
import { BetriebskostenEditModal } from './betriebskosten-edit-modal';
import { createNebenkosten, updateNebenkosten } from '../app/betriebskosten-actions';
import { useToast } from '../hooks/use-toast';

// Mock server actions
jest.mock('../app/betriebskosten-actions', () => ({
  createNebenkosten: jest.fn(),
  updateNebenkosten: jest.fn(),
}));

// Mock useToast
const mockToast = jest.fn();
jest.mock('../hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock constants
jest.mock('../lib/constants', () => ({
  BERECHNUNGSART_OPTIONS: [
    { value: 'pro Flaeche', label: 'pro Fläche' },
    { value: 'pro Mieter', label: 'pro Mieter' },
    { value: 'pauschal', label: 'pauschal' },
  ],
}));

describe('BetriebskostenEditModal', () => {
  const mockHaeuser = [{ id: 'h1', name: 'Haus A', ort: 'Ort', strasse: 'Strasse', user_id: 'u1' }];
  const mockOnClose = jest.fn();
  const mockUserId = "user1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    haeuser: mockHaeuser,
    userId: mockUserId,
  };

  it('renders for new entry with one default cost item', () => {
    render(<BetriebskostenEditModal {...defaultProps} />);
    expect(screen.getByText(/Neue Betriebskostenabrechnung/i)).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('Kostenart')).toHaveLength(1); // Updated placeholder
    expect(screen.getAllByPlaceholderText('Betrag (€)')).toHaveLength(1);
    // Check for the select trigger for Berechnungsart
    // The select trigger itself doesn't have an explicit accessible name by default from its placeholder in shadcn/ui
    // We can find all comboboxes and assume the ones in cost items are for Berechnungsart
    // Or, more robustly, find by a label if one were visible, or by a test-id if added.
    // For now, let's assume the number of comboboxes for cost items is what we expect.
    // The Haus select is one, so cost items will add to this.
    expect(screen.getAllByRole('combobox')).toHaveLength(1 + 1); // 1 for Haus, 1 for the default cost item
  });

  it('populates cost items when nebenkostenToEdit is provided', () => {
    const mockEntry = {
      id: '1',
      jahr: '2023',
      haeuser_id: 'h1',
      nebenkostenart: ['Strom', 'Wasser'],
      betrag: [100, 50],
      berechnungsart: ['pro Flaeche', 'pro Mieter'],
      wasserkosten: 20,
      Haeuser: { name: 'Haus A' }, 
      user_id: 'u1'
    };
    render(<BetriebskostenEditModal {...defaultProps} nebenkostenToEdit={mockEntry} />);
    expect(screen.getByDisplayValue('Strom')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Wasser')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    // Check that select elements are populated
    expect(screen.getByText('pro Fläche')).toBeInTheDocument(); // Check if the label for the selected value is rendered
    expect(screen.getByText('pro Mieter')).toBeInTheDocument();
  });

  it('allows adding and removing cost items', () => {
    render(<BetriebskostenEditModal {...defaultProps} />);
    const addCostItemButton = screen.getByText('Kostenposition hinzufügen');
    fireEvent.click(addCostItemButton);
    expect(screen.getAllByPlaceholderText('Kostenart')).toHaveLength(2); // Updated placeholder

    const removeButtons = screen.getAllByLabelText('Kostenposition entfernen'); // Updated selector
    expect(removeButtons[0]).not.toBeDisabled();
    fireEvent.click(removeButtons[0]);
    expect(screen.getAllByPlaceholderText('Kostenart')).toHaveLength(1);
    expect(screen.getByLabelText('Kostenposition entfernen')).toBeDisabled(); // Updated selector for single button
  });
  
  it('updates cost item fields on user input', () => {
    render(<BetriebskostenEditModal {...defaultProps} />);
    const artInputs = screen.getAllByPlaceholderText('Kostenart'); // Updated placeholder
    fireEvent.change(artInputs[0], { target: { value: 'Heizung' } });
    expect(artInputs[0]).toHaveValue('Heizung');

    const betragInputs = screen.getAllByPlaceholderText('Betrag (€)');
    fireEvent.change(betragInputs[0], { target: { value: '200' } });
    expect(betragInputs[0]).toHaveValue(200);

    // More robust Select interaction
    const costItemRows = screen.getAllByRole('group', { name: /Kostenposition \d+/i }); // Assuming we add aria-label to group rows
    // If not, we need a different way to scope the select. For now, assume we can get the first one.
    // Let's find all comboboxes. The first is Haus, the second is the first cost item's Berechnungsart.
    const allComboboxes = screen.getAllByRole('combobox');
    const firstCostItemBerechnungsartSelect = allComboboxes[1]; // 0 is Haus, 1 is first cost item

    fireEvent.mouseDown(firstCostItemBerechnungsartSelect);
    const optionPauschal = screen.getByText('pauschal'); 
    fireEvent.click(optionPauschal);
    // Check if the displayed value in the select trigger has updated.
    // This requires the SelectTrigger to update its displayed text.
    // For shadcn/ui, the SelectValue typically updates.
    expect(within(firstCostItemBerechnungsartSelect).getByText('pauschal')).toBeInTheDocument();
  });

  describe('handleSubmit', () => {
    it('shows error if jahr or haus is missing', async () => {
      render(<BetriebskostenEditModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Jahr *'), { target: { value: '' } }); // Updated label
      fireEvent.click(screen.getByText('Speichern'));
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', description: "Jahr und Haus sind Pflichtfelder." }));
      expect(createNebenkosten).not.toHaveBeenCalled();
    });

    it('shows error for invalid cost item (e.g., empty art)', async () => {
      render(<BetriebskostenEditModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Speichern'));
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Validierungsfehler", description: expect.stringContaining("Art der Kosten darf nicht leer sein") }));
      expect(createNebenkosten).not.toHaveBeenCalled();
    });
    
    it('shows error for invalid betrag in cost item', async () => {
      render(<BetriebskostenEditModal {...defaultProps} />);
      fireEvent.change(screen.getAllByPlaceholderText('Kostenart')[0], { target: { value: 'Test Art' } }); // Updated placeholder
      fireEvent.change(screen.getAllByPlaceholderText('Betrag (€)')[0], { target: { value: 'abc' } });
      fireEvent.click(screen.getByText('Speichern'));
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Validierungsfehler", description: expect.stringContaining('Betrag "abc" ist keine gültige Zahl') }));
      expect(createNebenkosten).not.toHaveBeenCalled();
    });

    it('calls createNebenkosten with transformed data for new entry', async () => {
      (createNebenkosten as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<BetriebskostenEditModal {...defaultProps} />);
      
      fireEvent.change(screen.getByLabelText('Jahr *'), { target: { value: '2024' } }); // Updated label
      // Haus is pre-selected by useEffect to mockHaeuser[0].id ('h1')
      
      const artInputs = screen.getAllByPlaceholderText('Kostenart'); // Updated placeholder
      fireEvent.change(artInputs[0], { target: { value: 'Müll' } });
      const betragInputs = screen.getAllByPlaceholderText('Betrag (€)');
      fireEvent.change(betragInputs[0], { target: { value: '150' } });
      
      const allComboboxes = screen.getAllByRole('combobox');
      const firstCostItemBerechnungsartSelect = allComboboxes[1];
      fireEvent.mouseDown(firstCostItemBerechnungsartSelect);
      fireEvent.click(screen.getByText('pro Fläche'));

      fireEvent.click(screen.getByText('Speichern'));
      await screen.findByText('Speichern'); 

      expect(createNebenkosten).toHaveBeenCalledWith({
        jahr: '2024',
        nebenkostenart: ['Müll'],
        betrag: [150],
        berechnungsart: ['pro Flaeche'],
        wasserkosten: null,
        haeuser_id: 'h1', 
        user_id: mockUserId,
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
    
    it('calls updateNebenkosten with transformed data for existing entry', async () => {
      (updateNebenkosten as jest.Mock).mockResolvedValueOnce({ success: true });
      const mockEntry = {
        id: 'test-id-123',
        jahr: '2023',
        haeuser_id: 'h1',
        nebenkostenart: ['Strom'],
        betrag: [100],
        berechnungsart: ['pauschal' as const],
        wasserkosten: 20,
        Haeuser: { name: 'Haus A' },
        user_id: 'u1'
      };
      render(<BetriebskostenEditModal {...defaultProps} nebenkostenToEdit={mockEntry} />);
      
      fireEvent.change(screen.getByLabelText('Jahr *'), { target: { value: '2023 Updated' } }); // Updated label
      fireEvent.change(screen.getByDisplayValue('Strom'), { target: { value: 'Strom Updated' } });
      fireEvent.change(screen.getByDisplayValue('100'), { target: { value: '120' } });
      
      const allComboboxes = screen.getAllByRole('combobox');
      const firstCostItemBerechnungsartSelect = allComboboxes[1]; // Haus is [0]
      fireEvent.mouseDown(firstCostItemBerechnungsartSelect);
      fireEvent.click(screen.getByText('pro Mieter'));

      fireEvent.click(screen.getByText('Speichern'));
      await screen.findByText('Speichern');

      expect(updateNebenkosten).toHaveBeenCalledWith('test-id-123', {
        jahr: '2023 Updated',
        nebenkostenart: ['Strom Updated'],
        betrag: [120],
        berechnungsart: ['pro Mieter'],
        wasserkosten: 20,
        haeuser_id: 'h1',
        user_id: mockUserId,
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
