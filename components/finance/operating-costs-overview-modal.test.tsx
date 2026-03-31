import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OperatingCostsOverviewModal } from './operating-costs-overview-modal';
import { OptimizedNebenkosten } from '@/types/optimized-betriebskosten';

// Default props for the modal
const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
};

// Helper to create mock OptimizedNebenkosten data
const createMockNebenkosten = (overrides: Partial<OptimizedNebenkosten> = {}): OptimizedNebenkosten => {
  return {
    id: 'nk-1',
    startdatum: '2023-01-01',
    enddatum: '2023-12-31',
    nebenkostenart: ['Grundsteuer', 'Versicherung'],
    betrag: [200, 150],
    berechnungsart: ['qm', 'Einheit'],
    haeuser_id: 'haus-1',
    user_id: 'user-1',
    haus_name: 'Musterhaus',
    gesamt_flaeche: 100,
    anzahl_wohnungen: 5,
    anzahl_mieter: 10,
    zaehlerkosten: {},
    zaehlerverbrauch: {},
    Haeuser: {
      name: 'Musterhaus',
    },
    ...overrides,
  };
};

describe('OperatingCostsOverviewModal', () => {
  test('renders with Wasserkosten (Zählerkosten) data and calculates correctly', () => {
    const mockData = createMockNebenkosten({
      zaehlerkosten: { 'kaltwasser': 100 },
      zaehlerverbrauch: { 'kaltwasser': 10 },
    });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    const zählerkostenSection = screen.getByText('Zählerkosten').closest('div');
    expect(zählerkostenSection).toBeInTheDocument();
    if (!zählerkostenSection) return;

    expect(within(zählerkostenSection).getByText('Kaltwasserzähler')).toBeInTheDocument();
    expect(within(zählerkostenSection).getByText(/Verbrauch: 10 m³/)).toBeInTheDocument();
    expect(within(zählerkostenSection).getByText(/Kosten: 100,00\s*€/)).toBeInTheDocument();
    expect(within(zählerkostenSection).getByText(/pro m³: 10,00\s*€/)).toBeInTheDocument();

    expect(within(zählerkostenSection).queryByText('Keine Zählerdaten erfasst.')).not.toBeInTheDocument();
  });

  test('does not display "Kosten pro m²" in the Zählerkosten section', () => {
    const mockData = createMockNebenkosten({
      zaehlerkosten: { 'kaltwasser': 100 },
      zaehlerverbrauch: { 'kaltwasser': 10 },
    });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    const zählerkostenSection = screen.getByText('Zählerkosten').closest('div');
    expect(zählerkostenSection).toBeInTheDocument();
    if (!zählerkostenSection) return;

    const kostenProSqmText = within(zählerkostenSection).queryByText('Kosten pro m²');
    expect(kostenProSqmText).not.toBeInTheDocument();
  });

  test('handles zero consumption correctly', () => {
    const mockData = createMockNebenkosten({
      zaehlerkosten: { 'kaltwasser': 50 },
      zaehlerverbrauch: { 'kaltwasser': 0 },
    });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    const zählerkostenSection = screen.getByText('Zählerkosten').closest('div');
    expect(zählerkostenSection).toBeInTheDocument();
    if (!zählerkostenSection) return;

    expect(within(zählerkostenSection).getByText(/Verbrauch: 0 m³/)).toBeInTheDocument();
    expect(within(zählerkostenSection).getByText(/Kosten: 50,00\s*€/)).toBeInTheDocument();
    
    // Should not show "pro m³" if consumption is 0
    expect(within(zählerkostenSection).queryByText(/pro m³/)).not.toBeInTheDocument();
  });

  test('handles completely missing Zählerdaten', () => {
    const mockData = createMockNebenkosten({
      zaehlerkosten: null,
      zaehlerverbrauch: null,
    });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    const zählerkostenSection = screen.getByText('Zählerkosten').closest('div');
    expect(zählerkostenSection).toBeInTheDocument();
    if (!zählerkostenSection) return;

    expect(within(zählerkostenSection).getByText('Keine Zählerdaten erfasst.')).toBeInTheDocument();
  });
});