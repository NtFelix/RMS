import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OperatingCostsOverviewModal } from './operating-costs-overview-modal';
import { Nebenkosten } from '@/lib/data-fetching';

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
    gesamtFlaeche: 100,
    anzahlWohnungen: 5,
    anzahlMieter: 10,
    wasserkosten: null,
    wasserverbrauch: null,
    Haeuser: {
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

    const wasserkostenSection = screen.getByText('Wasserkosten').closest('div');
    expect(wasserkostenSection).toBeInTheDocument();
    if (!wasserkostenSection) return;

    expect(within(wasserkostenSection).getByText('Gesamtverbrauch')).toBeInTheDocument();
    expect(within(wasserkostenSection).getByText('10 m³')).toBeInTheDocument();

    expect(within(wasserkostenSection).getByText('Gesamtkosten')).toBeInTheDocument();
    expect(within(wasserkostenSection).getByText(/100,00\s*€/)).toBeInTheDocument();

    expect(within(wasserkostenSection).getByText('Kosten pro m³')).toBeInTheDocument();
    expect(within(wasserkostenSection).getByText(/10,00\s*€/)).toBeInTheDocument();

    expect(within(wasserkostenSection).queryByText('Keine Wasserdaten erfasst.')).not.toBeInTheDocument();
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

    expect(within(wasserkostenSection).getByText('Gesamtverbrauch')).toBeInTheDocument();
    expect(within(wasserkostenSection).getByText('0 m³')).toBeInTheDocument();

    expect(within(wasserkostenSection).getByText('Gesamtkosten')).toBeInTheDocument();
    expect(within(wasserkostenSection).getByText(/50,00\s*€/)).toBeInTheDocument();

    expect(within(wasserkostenSection).getByText('Kosten pro m³')).toBeInTheDocument();
    expect(within(wasserkostenSection).getByText('-')).toBeInTheDocument(); // 50 / 0 is invalid for cost per m³

    expect(within(wasserkostenSection).queryByText('Keine Wasserdaten erfasst.')).not.toBeInTheDocument();
  });

  test('wasserkosten is null, wasserverbrauch has value', () => {
    const mockData = createMockNebenkosten({
      wasserkosten: null,
      wasserverbrauch: 50,
    });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    const wasserkostenSection = screen.getByText('Wasserkosten').closest('div');
    expect(wasserkostenSection).toBeInTheDocument();
    if (!wasserkostenSection) return;

    expect(within(wasserkostenSection).getByText('Gesamtverbrauch')).toBeInTheDocument();
    expect(within(wasserkostenSection).getByText('50 m³')).toBeInTheDocument();

    const gesamtkostenDiv = within(wasserkostenSection).getByText('Gesamtkosten').parentElement;
    expect(gesamtkostenDiv).not.toBeNull();
    if (gesamtkostenDiv) expect(within(gesamtkostenDiv).getByText('-')).toBeInTheDocument();


    const kostenProM3Div = within(wasserkostenSection).getByText('Kosten pro m³').parentElement;
    expect(kostenProM3Div).not.toBeNull();
    if (kostenProM3Div) expect(within(kostenProM3Div).getByText('-')).toBeInTheDocument();


    expect(within(wasserkostenSection).queryByText('Keine Wasserdaten erfasst.')).not.toBeInTheDocument();
  });

  test('wasserkosten is zero, wasserverbrauch has value', () => {
    const mockData = createMockNebenkosten({
      wasserkosten: 0,
      wasserverbrauch: 50,
    });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    const wasserkostenSection = screen.getByText('Wasserkosten').closest('div');
    expect(wasserkostenSection).toBeInTheDocument();
    if (!wasserkostenSection) return;

    expect(within(wasserkostenSection).getByText('Gesamtverbrauch')).toBeInTheDocument();
    expect(within(wasserkostenSection).getByText('50 m³')).toBeInTheDocument();

    expect(within(wasserkostenSection).getByText('Gesamtkosten')).toBeInTheDocument();
    expect(within(wasserkostenSection).getByText(/0,00\s*€/)).toBeInTheDocument(); // Wasserkosten is 0

    expect(within(wasserkostenSection).getByText('Kosten pro m³')).toBeInTheDocument();
    // 0 / 50 = 0. Component logic: (wasserkosten > 0 && wasserverbrauch > 0) ? ... : '-'
    // Correction: (wasserkosten && wasserverbrauch && wasserverbrauch > 0)
    // With wasserrkosten = 0, (0 && 50 && 50 > 0) is false, so it shows '-'
    // If component logic were (wasserkosten != null && wasserverbrauch > 0), it would be 0,00 €
    // Current component logic for Kosten pro m³ is:
    // (nebenkosten.wasserkosten && nebenkosten.wasserkosten > 0 && nebenkosten.wasserverbrauch && nebenkosten.wasserverbrauch > 0)
    // So, if wasserrkosten is 0, this condition is false, leading to '-'.
    expect(within(wasserkostenSection).getByText('-')).toBeInTheDocument();


    expect(within(wasserkostenSection).queryByText('Keine Wasserdaten erfasst.')).not.toBeInTheDocument();
  });

  test('wasserkosten has value, wasserverbrauch is null', () => {
    const mockData = createMockNebenkosten({
      wasserkosten: 100,
      wasserverbrauch: null,
    });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    const wasserkostenSection = screen.getByText('Wasserkosten').closest('div');
    expect(wasserkostenSection).toBeInTheDocument();
    if (!wasserkostenSection) return;

    const gesamtverbrauchDiv = within(wasserkostenSection).getByText('Gesamtverbrauch').parentElement;
    expect(gesamtverbrauchDiv).not.toBeNull();
    if (gesamtverbrauchDiv) expect(within(gesamtverbrauchDiv).getByText('-')).toBeInTheDocument();


    expect(within(wasserkostenSection).getByText('Gesamtkosten')).toBeInTheDocument();
    expect(within(wasserkostenSection).getByText(/100,00\s*€/)).toBeInTheDocument();

    const kostenProM3Div = within(wasserkostenSection).getByText('Kosten pro m³').parentElement;
    expect(kostenProM3Div).not.toBeNull();
    if (kostenProM3Div) expect(within(kostenProM3Div).getByText('-')).toBeInTheDocument();


    expect(within(wasserkostenSection).queryByText('Keine Wasserdaten erfasst.')).not.toBeInTheDocument();
  });

  test('handles completely missing Wasserdaten (both null)', () => {
    const mockData = createMockNebenkosten({
      wasserkosten: null,
      wasserverbrauch: null,
    });
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    const wasserkostenSection = screen.getByText('Wasserkosten').closest('div');
    expect(wasserkostenSection).toBeInTheDocument();
    if (!wasserkostenSection) return;

    expect(within(wasserkostenSection).getByText('Keine Wasserdaten erfasst.')).toBeInTheDocument();

    expect(within(wasserkostenSection).queryByText('Gesamtverbrauch')).not.toBeInTheDocument();
    expect(within(wasserkostenSection).queryByText('Gesamtkosten')).not.toBeInTheDocument();
    expect(within(wasserkostenSection).queryByText('Kosten pro m³')).not.toBeInTheDocument();
  });

  test('handles undefined Wasserdaten (both undefined)', () => {
    const mockData = createMockNebenkosten({
       wasserkosten: undefined, // Explicitly undefined
       wasserverbrauch: undefined, // Explicitly undefined
    });
    // Or createMockNebenkosten({}) and rely on defaults if they were undefined
    render(<OperatingCostsOverviewModal {...defaultProps} nebenkosten={mockData} />);

    const wasserkostenSection = screen.getByText('Wasserkosten').closest('div');
    expect(wasserkostenSection).toBeInTheDocument();
    if (!wasserkostenSection) return;

    expect(within(wasserkostenSection).getByText('Keine Wasserdaten erfasst.')).toBeInTheDocument();
    expect(within(wasserkostenSection).queryByText('Gesamtverbrauch')).not.toBeInTheDocument();
    expect(within(wasserkostenSection).queryByText('Gesamtkosten')).not.toBeInTheDocument();
    expect(within(wasserkostenSection).queryByText('Kosten pro m³')).not.toBeInTheDocument();
  });
});
