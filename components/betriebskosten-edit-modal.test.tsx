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
    expect(screen.getAllByPlaceholderText('Art der Kosten')).toHaveLength(1);
    expect(screen.getAllByPlaceholderText('Betrag (€)')).toHaveLength(1);
    // Check for the select trigger for Berechnungsart, assuming one is rendered
    expect(screen.getAllByRole('combobox', { name: /Berechnungsart/i })).toHaveLength(1);
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
    expect(screen.getAllByPlaceholderText('Art der Kosten')).toHaveLength(2);

    const removeButtons = screen.getAllByText('Entfernen');
    expect(removeButtons[0]).not.toBeDisabled(); // First remove button should be enabled
    fireEvent.click(removeButtons[0]);
    expect(screen.getAllByPlaceholderText('Art der Kosten')).toHaveLength(1);
    // Check if the remaining remove button is now disabled
    expect(screen.getByText('Entfernen')).toBeDisabled();
  });
  
  it('updates cost item fields on user input', () => {
    render(<BetriebskostenEditModal {...defaultProps} />);
    const artInputs = screen.getAllByPlaceholderText('Art der Kosten');
    fireEvent.change(artInputs[0], { target: { value: 'Heizung' } });
    expect(artInputs[0]).toHaveValue('Heizung');

    const betragInputs = screen.getAllByPlaceholderText('Betrag (€)');
    fireEvent.change(betragInputs[0], { target: { value: '200' } });
    expect(betragInputs[0]).toHaveValue(200); // Input type number

    // To test select, you might need to open it and click an option
    // This is a simplified check, more robust tests might use user-event library
    const selectTriggers = screen.getAllByRole('combobox', { name: /Berechnungsart/i });
    fireEvent.mouseDown(selectTriggers[0]); // Open the select
    // Assuming 'pauschal' is an option
    const optionPauschal = screen.getByText('pauschal'); // This depends on how options are rendered
    fireEvent.click(optionPauschal);
    // The visual selected value might be tricky to assert directly without knowing the exact Select implementation details
    // We'd typically check the underlying state or form data if possible, or the effect of this change on submission
  });

  describe('handleSubmit', () => {
    it('shows error if jahr or haus is missing', async () => {
      render(<BetriebskostenEditModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Jahr'), { target: { value: '' } });
      fireEvent.click(screen.getByText('Speichern'));
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', description: "Jahr und Haus sind Pflichtfelder." }));
      expect(createNebenkosten).not.toHaveBeenCalled();
    });

    it('shows error for invalid cost item (e.g., empty art)', async () => {
      render(<BetriebskostenEditModal {...defaultProps} />);
      // Default item has empty art
      fireEvent.click(screen.getByText('Speichern'));
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Validierungsfehler", description: expect.stringContaining("Art der Kosten darf nicht leer sein") }));
      expect(createNebenkosten).not.toHaveBeenCalled();
    });
    
    it('shows error for invalid betrag in cost item', async () => {
      render(<BetriebskostenEditModal {...defaultProps} />);
      fireEvent.change(screen.getAllByPlaceholderText('Art der Kosten')[0], { target: { value: 'Test Art' } });
      fireEvent.change(screen.getAllByPlaceholderText('Betrag (€)')[0], { target: { value: 'abc' } });
      fireEvent.click(screen.getByText('Speichern'));
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Validierungsfehler", description: expect.stringContaining('Betrag "abc" ist keine gültige Zahl') }));
      expect(createNebenkosten).not.toHaveBeenCalled();
    });

    it('calls createNebenkosten with transformed data for new entry', async () => {
      (createNebenkosten as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<BetriebskostenEditModal {...defaultProps} />);
      
      fireEvent.change(screen.getByLabelText('Jahr'), { target: { value: '2024' } });
      // Select a house (assuming first house is 'Haus A' with id 'h1') - this needs more robust select testing
      
      const artInputs = screen.getAllByPlaceholderText('Art der Kosten');
      fireEvent.change(artInputs[0], { target: { value: 'Müll' } });
      const betragInputs = screen.getAllByPlaceholderText('Betrag (€)');
      fireEvent.change(betragInputs[0], { target: { value: '150' } });
      // Select Berechnungsart (e.g. 'pro Flaeche')
      const selectTriggers = screen.getAllByRole('combobox', { name: /Berechnungsart/i });
      fireEvent.mouseDown(selectTriggers[0]);
      fireEvent.click(screen.getByText('pro Fläche')); // Assumes this option is available and clickable

      fireEvent.click(screen.getByText('Speichern'));

      await screen.findByText('Speichern'); // Wait for potential async updates

      expect(createNebenkosten).toHaveBeenCalledWith({
        jahr: '2024',
        nebenkostenart: ['Müll'],
        betrag: [150],
        berechnungsart: ['pro Flaeche'],
        wasserkosten: null, // Or parseFloat('') which is NaN, then nullified if empty
        haeuser_id: 'h1', // Default from useEffect if not changed
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
        berechnungsart: ['pauschal' as const], // Ensure the type matches BerechnungsartValue
        wasserkosten: 20,
        Haeuser: { name: 'Haus A' },
        user_id: 'u1'
      };
      render(<BetriebskostenEditModal {...defaultProps} nebenkostenToEdit={mockEntry} />);
      
      fireEvent.change(screen.getByLabelText('Jahr'), { target: { value: '2023 Updated' } });
      // Modify the first cost item
      fireEvent.change(screen.getByDisplayValue('Strom'), { target: { value: 'Strom Updated' } });
      fireEvent.change(screen.getByDisplayValue('100'), { target: { value: '120' } });
      // Change select (example, assumes 'pro Mieter' is an option)
      const selectTriggers = screen.getAllByRole('combobox', { name: /Berechnungsart/i });
      fireEvent.mouseDown(selectTriggers[0]);
      fireEvent.click(screen.getByText('pro Mieter'));


      fireEvent.click(screen.getByText('Speichern'));
      await screen.findByText('Speichern'); 

      expect(updateNebenkosten).toHaveBeenCalledWith('test-id-123', {
        jahr: '2023 Updated',
        nebenkostenart: ['Strom Updated'],
        betrag: [120],
        berechnungsart: ['pro Mieter'],
        wasserkosten: 20, // Assuming wasserrkosten input is not changed from initial
        haeuser_id: 'h1',
        user_id: mockUserId,
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
