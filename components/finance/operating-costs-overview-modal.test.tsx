import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OperatingCostsOverviewModal } from './operating-costs-overview-modal';
import { OptimizedNebenkosten } from '@/types/optimized-betriebskosten';
import { getAbrechnungModalDataAction } from '@/app/betriebskosten-actions';

// The modal loads its tenant data on open; tests that don't set it keep it loading
jest.mock('@/app/betriebskosten-actions', () => ({
  getAbrechnungModalDataAction: jest.fn(() => new Promise(() => {})),
}));

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
    erstellt_von: 'user-1',
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

    const zählerkostenSection = screen.getByText('Zählerabhängige Kosten').closest('div');
    expect(zählerkostenSection).toBeInTheDocument();
    if (!zählerkostenSection) return;

    expect(within(zählerkostenSection).getByText('Kaltwasserzähler')).toBeInTheDocument();
    expect(within(zählerkostenSection).getByText('10 m³')).toBeInTheDocument();
    expect(within(zählerkostenSection).getByText('100,00 €')).toBeInTheDocument();
    expect(within(zählerkostenSection).getByText('10,00 €')).toBeInTheDocument();

    expect(within(zählerkostenSection).queryByText('Keine Zählerkosten erfasst.')).not.toBeInTheDocument();
  });

  test('does not display "Kosten pro m²" in the Zählerkosten section', () => {
    const mockData = createMockNebenkosten({
      zaehlerkosten: { 'kaltwasser': 100 },
      zaehlerverbrauch: { 'kaltwasser': 10 },
    });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    const zählerkostenSection = screen.getByText('Zählerabhängige Kosten').closest('div');
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

    const zählerkostenSection = screen.getByText('Zählerabhängige Kosten').closest('div');
    expect(zählerkostenSection).toBeInTheDocument();
    if (!zählerkostenSection) return;

    expect(within(zählerkostenSection).getByText('0 m³')).toBeInTheDocument();
    expect(within(zählerkostenSection).getByText('50,00 €')).toBeInTheDocument();
    
    // Should not show "pro m³" if consumption is 0, price/m³ is '-'
    expect(within(zählerkostenSection).getByText('-')).toBeInTheDocument();
  });

  test('handles completely missing Zählerdaten', () => {
    const mockData = createMockNebenkosten({
      zaehlerkosten: null,
      zaehlerverbrauch: null,
    });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    const zählerkostenSection = screen.getByText('Zählerabhängige Kosten').closest('div');
    expect(zählerkostenSection).toBeInTheDocument();
    if (!zählerkostenSection) return;

    expect(within(zählerkostenSection).getByText('Keine Zählerkosten erfasst.')).toBeInTheDocument();
  });

  test('shows calendar days for a settlement on the default (kalendertage) basis', () => {
    const mockData = createMockNebenkosten({ rechenbasis: 'kalendertage' });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    expect(screen.getByText('365 Tage')).toBeInTheDocument();
    expect(screen.queryByText(/gerechnet mit 360 Tagen/)).not.toBeInTheDocument();
  });

  test('shows Rechentage and the 360-day note for a settlement on the 360-day basis', () => {
    const mockData = createMockNebenkosten({ rechenbasis: '360_tage' });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    expect(screen.getByText('360 Rechentage')).toBeInTheDocument();
    expect(screen.getByText(/gerechnet mit 360 Tagen, 30-Tage-Monate/)).toBeInTheDocument();
  });

  test('shows the vacancy costs of an empty apartment', async () => {
    const mockData = createMockNebenkosten();
    (getAbrechnungModalDataAction as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        // Apartment B (40 of 100 m²) is empty all year: 40/100 × 200 € Grundsteuer = 80 €
        nebenkosten_data: {
          ...mockData,
          nebenkostenart: ['Grundsteuer'],
          betrag: [200],
          berechnungsart: ['pro Flaeche'],
          gesamtFlaeche: 100,
          anzahlWohnungen: 2,
        },
        tenants: [{ id: 't1', name: 'A', wohnung_id: 'wa', einzug: '2022-01-01', auszug: null, Wohnungen: { name: 'A', groesse: 60 } }],
        rechnungen: [],
        meters: [],
        readings: [],
        houseApartments: [{ id: 'wa', name: 'A', groesse: 60 }, { id: 'wb', name: 'B', groesse: 40 }],
      },
    });

    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    expect(await screen.findByRole('button', { name: /Leerstandskosten 80,00/ })).toBeInTheDocument();
  });
});
