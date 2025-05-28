// app/(dashboard)/betriebskosten/client-wrapper.test.tsx
import { render, screen } from '@testing-library/react';
import BetriebskostenClientWrapper from './client-wrapper';
// Mock child components
jest.mock('@/components/operating-costs-filters', () => ({ OperatingCostsFilters: () => <div>Filters</div> }));
jest.mock('@/components/operating-costs-table', () => ({ OperatingCostsTable: () => <div>Table</div> }));
jest.mock('@/components/betriebskosten-edit-modal', () => ({ default: () => <div>Modal</div> }));
// Mock useToast
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));


describe('BetriebskostenClientWrapper', () => {
  const mockNebenkosten = [{ id: '1', jahr: '2023', Haeuser: { name: 'Haus A' }, nebenkostenart: ['Strom'], betrag: [100], berechnungsart: ['Einheit'], wasserrkosten: 50, haeuser_id: 'h1' }];
  const mockHaeuser = [{ id: 'h1', name: 'Haus A', ort: 'Ort A', strasse: 'Strasse A', user_id: 'u1'}];

  it('renders correctly with initial data', () => {
    render(<BetriebskostenClientWrapper initialNebenkosten={mockNebenkosten} initialHaeuser={mockHaeuser} userId="user1" />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Betriebskostenabrechnung erstellen')).toBeInTheDocument();
  });
  // Add more tests for filtering, opening modal etc.
});
