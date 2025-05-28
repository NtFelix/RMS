// components/betriebskosten-edit-modal.test.tsx
import { render, screen } from '@testing-library/react';
import { BetriebskostenEditModal } from './betriebskosten-edit-modal'; // Corrected import

// Mock server actions
jest.mock('../app/betriebskosten-actions', () => ({
  createNebenkosten: jest.fn(),
  updateNebenkosten: jest.fn(),
}));
// Mock useToast
jest.mock('../hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));


describe('BetriebskostenEditModal', () => {
  const mockHaeuser = [{ id: 'h1', name: 'Haus A', ort: 'Ort', strasse: 'Strasse', user_id: 'u1' }];
  
  it('renders for creating new entry', () => {
    render(<BetriebskostenEditModal isOpen={true} onClose={jest.fn()} haeuser={mockHaeuser} userId="user1" />);
    // Check for a more generic part of the title if the exact string is too brittle
    expect(screen.getByText(/Neue Betriebskostenabrechnung/i)).toBeInTheDocument(); 
    expect(screen.getByText('Speichern')).toBeInTheDocument();
  });

  it('renders for editing existing entry', () => {
    const mockEntry = { id: '1', jahr: '2023', haeuser_id: 'h1', nebenkostenart: [], betrag: [], berechnungsart: [], wasserrkosten: null, Haeuser: null };
    render(<BetriebskostenEditModal isOpen={true} onClose={jest.fn()} nebenkostenToEdit={mockEntry} haeuser={mockHaeuser} userId="user1" />);
    // Check for a more generic part of the title
    expect(screen.getByText(/Betriebskosten bearbeiten/i)).toBeInTheDocument(); 
    expect(screen.getByDisplayValue('2023')).toBeInTheDocument();
  });
  // Add more tests for form interaction and submission
});
