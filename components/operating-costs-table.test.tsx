// components/operating-costs-table.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { OperatingCostsTable } from './operating-costs-table';
import { Edit } from 'lucide-react'; // Ensure lucide-react is mockable or handled

// Mock lucide-react if it causes issues in test environment
jest.mock('lucide-react', () => ({
    Edit: () => <span>EditIcon</span>,
}));


describe('OperatingCostsTable', () => {
  const onEditMock = jest.fn();

  beforeEach(() => {
    onEditMock.mockClear();
  });

  const mockNebenkostenSingleItem = [
    { id: '1', jahr: '2023', Haeuser: { name: 'Haus A' }, nebenkostenart: ['Strom'], betrag: [100], berechnungsart: ['Verbrauch'], wasserrkosten: 50 },
  ];

  const mockNebenkostenMultiItems = [
    { 
      id: '2', 
      jahr: '2024', 
      Haeuser: { name: 'Haus B' }, 
      nebenkostenart: ['Heizung', 'Wasser', 'Müll'], 
      betrag: [150.75, 60.50, 25.00], 
      berechnungsart: ['pro Flaeche', 'pro Mieter', 'pauschal'], 
      wasserrkosten: 100 
    },
     { 
      id: '3', 
      jahr: '2024', 
      Haeuser: { name: 'Haus C' }, 
      nebenkostenart: ['Versicherung'], 
      betrag: [200], 
      berechnungsart: ['pauschal'], 
      wasserrkosten: null // Test null wasserrkosten
    },
  ];

  it('renders table with single cost item data and edit button', () => {
    render(<OperatingCostsTable nebenkosten={mockNebenkostenSingleItem} onEdit={onEditMock} />);
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('Haus A')).toBeInTheDocument();
    expect(screen.getByText('Strom')).toBeInTheDocument();
    expect(screen.getByText('100,00 €')).toBeInTheDocument(); // Check formatted currency
    expect(screen.getByText('Verbrauch')).toBeInTheDocument();
    
    // Test for edit button click
    fireEvent.click(screen.getByText('Bearbeiten'));
    expect(onEditMock).toHaveBeenCalledWith(mockNebenkostenSingleItem[0]);
  });

  it('renders table with multiple cost items displayed on separate lines', () => {
    render(<OperatingCostsTable nebenkosten={mockNebenkostenMultiItems} onEdit={onEditMock} />);
    
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
    render(<OperatingCostsTable nebenkosten={[]} />);
    expect(screen.getByText('Keine Betriebskostenabrechnungen gefunden.')).toBeInTheDocument();
  });
});
