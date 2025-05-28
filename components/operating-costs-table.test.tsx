// components/operating-costs-table.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { OperatingCostsTable } from './operating-costs-table';
import { Edit } from 'lucide-react'; // Ensure lucide-react is mockable or handled

// Mock lucide-react if it causes issues in test environment
jest.mock('lucide-react', () => ({
    Edit: () => <span>EditIcon</span>,
}));


describe('OperatingCostsTable', () => {
  const mockNebenkosten = [
    { id: '1', jahr: '2023', Haeuser: { name: 'Haus A' }, nebenkostenart: ['Strom'], betrag: [100], berechnungsart: ['Verbrauch'], wasserrkosten: 50 },
  ];
  const onEditMock = jest.fn();

  it('renders table with data and edit button', () => {
    render(<OperatingCostsTable nebenkosten={mockNebenkosten} onEdit={onEditMock} />);
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('Haus A')).toBeInTheDocument();
    expect(screen.getByText('Strom')).toBeInTheDocument();
    // Test for edit button click
    fireEvent.click(screen.getByText('Bearbeiten'));
    expect(onEditMock).toHaveBeenCalledWith(mockNebenkosten[0]);
  });
   it('renders empty state message when no data is provided', () => {
    render(<OperatingCostsTable nebenkosten={[]} />);
    expect(screen.getByText('Keine Betriebskostenabrechnungen gefunden.')).toBeInTheDocument();
  });
});
