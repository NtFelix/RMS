import { render, screen, fireEvent, within } from '@testing-library/react';
import { OperatingCostsTable } from './operating-costs-table';
// Edit icon is no longer used, ContextMenu components are internal to Shadcn
// So no need to mock lucide-react for Edit specifically for this component anymore.

describe('OperatingCostsTable', () => {
  const onEditMock = jest.fn();
  const onDeleteItemMock = jest.fn();

  beforeEach(() => {
    onEditMock.mockClear();
    onDeleteItemMock.mockClear();
  });

  const mockNebenkostenSingleItem = [
    { id: 'item1', jahr: '2023', Haeuser: { name: 'Haus A' }, nebenkostenart: ['Strom'], betrag: [100], berechnungsart: ['Verbrauch'], wasserrkosten: 50, haeuser_id: 'h1', user_id: 'u1' },
  ];

  const mockNebenkostenMultiItems = [
    { 
      id: 'item2', 
      jahr: '2024', 
      Haeuser: { name: 'Haus B' }, 
      nebenkostenart: ['Heizung', 'Wasser', 'Müll'], 
      betrag: [150.75, 60.50, 25.00], 
      berechnungsart: ['pro Flaeche', 'pro Mieter', 'pauschal'], 
      wasserrkosten: 100,
      haeuser_id: 'h2', user_id: 'u1'
    },
     { 
      id: 'item3', 
      jahr: '2024', 
      Haeuser: { name: 'Haus C' }, 
      nebenkostenart: ['Versicherung'], 
      betrag: [200], 
      berechnungsart: ['pauschal'], 
      wasserrkosten: null, // Test null wasserrkosten
      haeuser_id: 'h3', user_id: 'u1'
    },
  ];

  it('renders table with single cost item data and correct headers', () => {
    render(<OperatingCostsTable nebenkosten={mockNebenkostenSingleItem} onEdit={onEditMock} onDeleteItem={onDeleteItemMock} />);
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('Haus A')).toBeInTheDocument();
    expect(screen.getByText('Strom')).toBeInTheDocument();
    expect(screen.getByText('100,00 €')).toBeInTheDocument(); 
    expect(screen.getByText('Verbrauch')).toBeInTheDocument();
    expect(screen.queryByText('Aktionen')).not.toBeInTheDocument(); // "Aktionen" column removed
  });

  it('calls onEdit when a row is clicked', () => {
    render(<OperatingCostsTable nebenkosten={mockNebenkostenSingleItem} onEdit={onEditMock} onDeleteItem={onDeleteItemMock} />);
    const row = screen.getByText('Haus A').closest('tr');
    expect(row).not.toBeNull();
    if (row) {
      fireEvent.click(row);
      expect(onEditMock).toHaveBeenCalledWith(mockNebenkostenSingleItem[0]);
    }
  });
  
  it('handles context menu actions for edit and delete', () => {
    render(<OperatingCostsTable nebenkosten={mockNebenkostenSingleItem} onEdit={onEditMock} onDeleteItem={onDeleteItemMock} />);
    const row = screen.getByText('Haus A').closest('tr');
    expect(row).not.toBeNull();

    if (row) {
      fireEvent.contextMenu(row);
      
      const editMenuItem = screen.getByRole('menuitem', { name: /Bearbeiten/i });
      fireEvent.click(editMenuItem);
      expect(onEditMock).toHaveBeenCalledWith(mockNebenkostenSingleItem[0]);
      
      // Re-trigger context menu for delete, as it closes after click
      fireEvent.contextMenu(row); 
      const deleteMenuItem = screen.getByRole('menuitem', { name: /Löschen/i });
      fireEvent.click(deleteMenuItem);
      expect(onDeleteItemMock).toHaveBeenCalledWith('item1');
    }
  });


  it('renders table with multiple cost items displayed on separate lines', () => {
    render(<OperatingCostsTable nebenkosten={mockNebenkostenMultiItems} onEdit={onEditMock} onDeleteItem={onDeleteItemMock} />);
    
    // Check data for the first entry with multiple items
    expect(screen.getByText('Haus B')).toBeInTheDocument();
    // Kostenarten
    expect(screen.getByText('Heizung')).toBeInTheDocument();
    expect(screen.getByText('Wasser')).toBeInTheDocument();
    expect(screen.getByText('Müll')).toBeInTheDocument();
    // Beträge - check formatted currency
    expect(screen.getByText('150,75 €')).toBeInTheDocument();
    expect(screen.getByText('60,50 €')).toBeInTheDocument();
    expect(screen.getByText('25,00 €')).toBeInTheDocument();
    // Berechnungsarten
    expect(screen.getByText('pro Flaeche')).toBeInTheDocument();
    expect(screen.getByText('pro Mieter')).toBeInTheDocument();
    expect(screen.getAllByText('pauschal')).toHaveLength(2); // 'pauschal' appears twice on the page now for two different entries

    // Check wasserrkosten for Haus B
     expect(screen.getByText('100,00 €')).toBeInTheDocument();

    // Check a part of the second entry to ensure it's also rendered
    expect(screen.getByText('Haus C')).toBeInTheDocument();
    expect(screen.getByText('Versicherung')).toBeInTheDocument();
    expect(screen.getByText('200,00 €')).toBeInTheDocument();
    // For wasserrkosten: null should render as '-'
    const hausCRow = screen.getByText('Haus C').closest('tr');
    expect(within(hausCRow!).getByText('-')).toBeInTheDocument(); // Wasserkosten cell for Haus C
  });

  it('renders empty state message when no data is provided', () => {
    render(<OperatingCostsTable nebenkosten={[]} onEdit={onEditMock} onDeleteItem={onDeleteItemMock}/>);
    const cellWithColspan = screen.getByText('Keine Betriebskostenabrechnungen gefunden.');
    expect(cellWithColspan).toBeInTheDocument();
    expect(cellWithColspan.getAttribute('colSpan')).toBe('6'); // Verify colSpan is 6
  });
});
