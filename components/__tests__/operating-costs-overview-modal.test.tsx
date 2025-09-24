import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OperatingCostsOverviewModal } from '../operating-costs-overview-modal';
import { OptimizedNebenkosten } from '@/types/optimized-betriebskosten';

// Mock the toast function
jest.mock('sonner', () => ({
  toast: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock jsPDF and jspdf-autotable
const mockSave = jest.fn();
const mockText = jest.fn();
const mockSetFontSize = jest.fn();
const mockSetFont = jest.fn();
const mockAutoTable = jest.fn();

const mockJsPDF = jest.fn().mockImplementation(() => {
  const instance = {
    save: mockSave,
    text: mockText,
    setFontSize: mockSetFontSize,
    setFont: mockSetFont,
    internal: {
      pageSize: {
        height: 297,
        getWidth: () => 210,
      },
    },
    lastAutoTable: { finalY: 100 },
    autoTable: mockAutoTable,
  };
  // Add API property for autoTable plugin
  (instance as any).API = {};
  return instance;
});

jest.mock('jspdf', () => ({
  __esModule: true,
  default: mockJsPDF,
}));

jest.mock('jspdf-autotable', () => ({
  __esModule: true,
  default: jest.fn(),
  applyPlugin: jest.fn((jsPDF) => {
    if (jsPDF.API) {
      jsPDF.API.autoTable = mockAutoTable;
    }
  }),
}));

const mockNebenkosten: OptimizedNebenkosten = {
  id: '1',
  startdatum: '2024-01-01',
  enddatum: '2024-12-31',
  haus_name: 'Test Haus',
  haeuser_id: 'haus1',
  nebenkostenart: ['Heizung', 'Wasser', 'Müll'],
  betrag: [1000, 500, 200],
  berechnungsart: ['pro Flaeche', 'pro Mieter', 'pro Wohnung'],
  wasserkosten: 500,
  wasserverbrauch: 100,
  gesamtFlaeche: 200,
  anzahlWohnungen: 4,
  anzahlMieter: 6,
};

describe('OperatingCostsOverviewModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with correct data', () => {
    render(
      <OperatingCostsOverviewModal
        isOpen={true}
        onClose={jest.fn()}
        nebenkosten={mockNebenkosten}
      />
    );

    expect(screen.getByText(/Übersicht der Betriebskosten für/)).toBeInTheDocument();
    expect(screen.getByText('Haus: Test Haus')).toBeInTheDocument();
    expect(screen.getByText('Heizung')).toBeInTheDocument();
    expect(screen.getByText('Wasser')).toBeInTheDocument();
    expect(screen.getByText('Müll')).toBeInTheDocument();
  });

  it('displays the export button', () => {
    render(
      <OperatingCostsOverviewModal
        isOpen={true}
        onClose={jest.fn()}
        nebenkosten={mockNebenkosten}
      />
    );

    const exportButton = screen.getByText('Kostenaufstellung exportieren');
    expect(exportButton).toBeInTheDocument();
  });

  it('handles PDF export when button is clicked', async () => {
    const { toast } = require('sonner');
    
    render(
      <OperatingCostsOverviewModal
        isOpen={true}
        onClose={jest.fn()}
        nebenkosten={mockNebenkosten}
      />
    );

    const exportButton = screen.getByText('Kostenaufstellung exportieren');
    fireEvent.click(exportButton);

    // Check that loading state is shown
    await waitFor(() => {
      expect(screen.getByText('PDF wird erstellt...')).toBeInTheDocument();
    });

    // Wait for the PDF generation to complete
    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith('PDF wird erstellt...');
    }, { timeout: 3000 });
  });

  it('calculates total costs correctly', () => {
    render(
      <OperatingCostsOverviewModal
        isOpen={true}
        onClose={jest.fn()}
        nebenkosten={mockNebenkosten}
      />
    );

    // Total should be 1000 + 500 + 200 = 1700 - check for multiple instances
    const totalCostElements = screen.getAllByText('1.700,00 €');
    expect(totalCostElements.length).toBeGreaterThan(0);
  });

  it('displays water costs information', () => {
    render(
      <OperatingCostsOverviewModal
        isOpen={true}
        onClose={jest.fn()}
        nebenkosten={mockNebenkosten}
      />
    );

    expect(screen.getByText('Wasserkosten')).toBeInTheDocument();
    expect(screen.getByText('100 m³')).toBeInTheDocument();
    // Check for water costs in the water section specifically
    const waterCostElements = screen.getAllByText('500,00 €');
    expect(waterCostElements.length).toBeGreaterThan(0);
  });

  it('does not render when nebenkosten is null', () => {
    const { container } = render(
      <OperatingCostsOverviewModal
        isOpen={true}
        onClose={jest.fn()}
        nebenkosten={null as any}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});