import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WohnungenClientView from './client';

// Mock the modal store
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({
    openWohnungModal: jest.fn(),
  }),
}));

// Mock the Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

// Mock the components
jest.mock('@/components/apartment-filters', () => ({
  ApartmentFilters: ({ onFilterChange, onSearchChange }: any) => (
    <div data-testid="apartment-filters">Filters</div>
  ),
}));

jest.mock('@/components/apartment-table', () => ({
  ApartmentTable: (props: any) => <div data-testid="apartment-table">Table</div>,
}));

describe('WohnungenClientView', () => {
  const defaultProps = {
    initialWohnungenData: [],
    housesData: [{ id: '1', name: 'Test House' }],
    serverApartmentCount: 0,
    serverApartmentLimit: 5,
    serverUserIsEligibleToAdd: true,
    serverLimitReason: 'none' as const,
  };

  it('renders add button enabled when under limit', () => {
    render(<WohnungenClientView {...defaultProps} />);
    
    const addButton = screen.getByRole('button', { name: /wohnung hinzufügen/i });
    expect(addButton).not.toBeDisabled();
  });

  it('renders add button disabled when limit reached', () => {
    const props = {
      ...defaultProps,
      serverApartmentCount: 5,
      serverApartmentLimit: 5,
    };
    
    render(<WohnungenClientView {...props} />);
    
    const addButton = screen.getByRole('button', { name: /wohnung hinzufügen/i });
    expect(addButton).toBeDisabled();
  });

  it('shows subscription limit tooltip when hovering disabled button', async () => {
    const user = userEvent.setup();
    const props = {
      ...defaultProps,
      serverApartmentCount: 5,
      serverApartmentLimit: 5,
      serverLimitReason: 'subscription' as const,
    };
    
    render(<WohnungenClientView {...props} />);
    
    const addButton = screen.getByRole('button', { name: /wohnung hinzufügen/i });
    expect(addButton).toBeDisabled();
    
    // Hover over the disabled button
    await user.hover(addButton);
    
    // Wait for tooltip to appear
    await waitFor(() => {
      expect(screen.getAllByText(/Sie haben die maximale Anzahl an Wohnungen \(5\) für Ihr aktuelles Abonnement erreicht/)).toHaveLength(2);
    });
  });

  it('shows trial limit tooltip when hovering disabled button', async () => {
    const user = userEvent.setup();
    const props = {
      ...defaultProps,
      serverApartmentCount: 3,
      serverApartmentLimit: 3,
      serverLimitReason: 'trial' as const,
    };
    
    render(<WohnungenClientView {...props} />);
    
    const addButton = screen.getByRole('button', { name: /wohnung hinzufügen/i });
    expect(addButton).toBeDisabled();
    
    // Hover over the disabled button
    await user.hover(addButton);
    
    // Wait for tooltip to appear
    await waitFor(() => {
      expect(screen.getAllByText(/Maximale Anzahl an Wohnungen \(3\) für Ihre Testphase erreicht/)).toHaveLength(2);
    });
  });

  it('shows no subscription tooltip when user not eligible', async () => {
    const user = userEvent.setup();
    const props = {
      ...defaultProps,
      serverUserIsEligibleToAdd: false,
    };
    
    render(<WohnungenClientView {...props} />);
    
    const addButton = screen.getByRole('button', { name: /wohnung hinzufügen/i });
    expect(addButton).toBeDisabled();
    
    // Hover over the disabled button
    await user.hover(addButton);
    
    // Wait for tooltip to appear
    await waitFor(() => {
      expect(screen.getAllByText(/Ein aktives Abonnement oder eine gültige Testphase ist erforderlich/)).toHaveLength(2);
    });
  });

  it('does not show tooltip when button is enabled', async () => {
    const user = userEvent.setup();
    
    render(<WohnungenClientView {...defaultProps} />);
    
    const addButton = screen.getByRole('button', { name: /wohnung hinzufügen/i });
    expect(addButton).not.toBeDisabled();
    
    // Hover over the enabled button
    await user.hover(addButton);
    
    // No tooltip should appear
    await waitFor(() => {
      expect(screen.queryByText(/maximale anzahl/i)).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });
});