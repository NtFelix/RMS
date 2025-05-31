import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OperatingCostsOverviewModal } from './operating-costs-overview-modal'; // Adjust path if necessary
import { Nebenkosten } from '@/lib/data-fetching'; // Adjust path if necessary

// Default props for the modal
const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
};

// Helper to create mock Nebenkosten data
const createMockNebenkosten = (overrides: Partial<Nebenkosten>): Nebenkosten => {
  return {
    id: 'nk-1',
    jahr: '2023',
    nebenkostenart: ['Grundsteuer', 'Versicherung'],
    betrag: [200, 150],
    berechnungsart: ['qm', 'Einheit'],
    haeuser_id: 'haus-1',
    user_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    gesamtFlaeche: 100, // Default total area for other calculations in modal
    anzahlWohnungen: 5,
    anzahlMieter: 10,
    // Default Wasserkosten related fields (can be overridden)
    wasserkosten: null,
    wasserverbrauch: null,
    Haeuser: { // Mocked Haeuser relation
      id: 'haus-1',
      name: 'Musterhaus',
      adresse: 'Musterstraße 1',
      plz: '12345',
      stadt: 'Musterstadt',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    ...overrides,
  };
};

describe('OperatingCostsOverviewModal', () => {
  test('renders with Wasserkosten data and calculates correctly', () => {
    const mockData = createMockNebenkosten({
      wasserkosten: 100,
      wasserverbrauch: 10,
    });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    // Find the Wasserkosten section to scope queries
    const wasserkostenSection = screen.getByText('Wasserkosten').closest('div');
    expect(wasserkostenSection).toBeInTheDocument();

    if (!wasserkostenSection) return; // Type guard

    // Check Gesamtverbrauch
    expect(within(wasserkostenSection).getByText('Gesamtverbrauch')).toBeInTheDocument();
    expect(within(wasserkostenSection).getByText('10 m³')).toBeInTheDocument();

    // Check Gesamtkosten for water
    expect(within(wasserkostenSection).getByText('Gesamtkosten')).toBeInTheDocument();
    // Note: The component uses new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
    // This will format 100 to "100,00 €" (with non-breaking space for € on some systems/browsers)
    // We use a regex to be more flexible with spacing.
    expect(within(wasserkostenSection).getByText(/100,00\s*€/)).toBeInTheDocument();

    // Check Kosten pro m³
    expect(within(wasserkostenSection).getByText('Kosten pro m³')).toBeInTheDocument();
    expect(within(wasserkostenSection).getByText(/10,00\s*€/)).toBeInTheDocument(); // 100 / 10 = 10
  });

  test('does not display "Kosten pro m²" in the Wasserkosten section', () => {
    const mockData = createMockNebenkosten({
      wasserkosten: 100,
      wasserverbrauch: 10,
    });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    const wasserkostenSection = screen.getByText('Wasserkosten').closest('div');
    expect(wasserkostenSection).toBeInTheDocument();
    if (!wasserkostenSection) return;

    // Explicitly query for "Kosten pro m²" within the Wasserkosten section
    const kostenProSqmText = within(wasserkostenSection).queryByText('Kosten pro m²');
    expect(kostenProSqmText).not.toBeInTheDocument();
  });

  test('handles zero wasserverbrauch correctly', () => {
    const mockData = createMockNebenkosten({
      wasserkosten: 50,
      wasserverbrauch: 0,
    });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    const wasserkostenSection = screen.getByText('Wasserkosten').closest('div');
    expect(wasserkostenSection).toBeInTheDocument();
    if (!wasserkostenSection) return;

    // Check Gesamtverbrauch (could be "0 m³" or "-")
    // The component currently renders "0 m³" if wasserberbrauch is 0 (and not null)
    expect(within(wasserkostenSection).getByText('Gesamtverbrauch')).toBeInTheDocument();
    expect(within(wasserkostenSection).getByText('0 m³')).toBeInTheDocument();

    // Check Kosten pro m³ (should display "-" or "N/A")
    expect(within(wasserkostenSection).getByText('Kosten pro m³')).toBeInTheDocument();
    expect(within(wasserkostenSection).getByText('-')).toBeInTheDocument();
  });

  test('handles missing Wasserkosten data', () => {
    const mockData = createMockNebenkosten({
      wasserkosten: null,
      wasserverbrauch: null,
    });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    const wasserkostenSection = screen.getByText('Wasserkosten').closest('div');
    expect(wasserkostenSection).toBeInTheDocument();
    if (!wasserkostenSection) return;

    // Check for "Keine Wasserkosten gespeichert" message
    // This message appears if nebenkosten.wasserkosten is null/undefined
    expect(within(wasserkostenSection).getByText('Keine Wasserkosten gespeichert')).toBeInTheDocument();

    // Ensure other fields are not showing actual values or calculations
    expect(within(wasserkostenSection).queryByText('Gesamtverbrauch')).not.toBeInTheDocument();
    expect(within(wasserkostenSection).queryByText('Gesamtkosten')).not.toBeInTheDocument();
    expect(within(wasserkostenSection).queryByText('Kosten pro m³')).not.toBeInTheDocument();
  });

  test('handles undefined Wasserkosten data (alternative to null)', () => {
    const mockData = createMockNebenkosten({
      // wasserrkosten and wasserverbrauch will be undefined if not set in overrides
    });
     // Or explicitly:
    // const mockData = createMockNebenkosten({
    //   wasserkosten: undefined,
    //   wasserverbrauch: undefined,
    // });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    const wasserkostenSection = screen.getByText('Wasserkosten').closest('div');
    expect(wasserkostenSection).toBeInTheDocument();
    if (!wasserkostenSection) return;

    expect(within(wasserkostenSection).getByText('Keine Wasserkosten gespeichert')).toBeInTheDocument();
    expect(within(wasserkostenSection).queryByText('Gesamtverbrauch')).not.toBeInTheDocument();
    expect(within(wasserkostenSection).queryByText('Gesamtkosten')).not.toBeInTheDocument();
    expect(within(wasserkostenSection).queryByText('Kosten pro m³')).not.toBeInTheDocument();
  });
});
