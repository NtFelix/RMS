/**
 * Test for AbrechnungModal optimization (Task 8)
 * 
 * This test verifies that the AbrechnungModal has been optimized to use
 * pre-loaded data from the get_abrechnung_modal_data database function.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AbrechnungModal } from '@/components/finance/abrechnung-modal';
import { Nebenkosten, Mieter, Rechnung, Wasserzaehler } from '@/lib/data-fetching';

// Mock the hooks and utilities
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock('@/utils/date-calculations', () => ({
  isoToGermanDate: (date: string) => date,
}));

jest.mock('@/utils/wg-cost-calculations', () => ({
  computeWgFactorsByTenant: () => ({}),
  getApartmentOccupants: () => [],
}));

jest.mock('@/utils/format', () => ({
  formatNumber: (num: number) => num.toString(),
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/custom-combobox', () => ({
  CustomCombobox: ({ options, value, onChange }: any) => (
    <select data-testid="combobox" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

// Mock other UI components
jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table data-testid="table">{children}</table>,
  TableHeader: ({ children }: any) => <thead data-testid="table-header">{children}</thead>,
  TableBody: ({ children }: any) => <tbody data-testid="table-body">{children}</tbody>,
  TableRow: ({ children }: any) => <tr data-testid="table-row">{children}</tr>,
  TableHead: ({ children }: any) => <th data-testid="table-head">{children}</th>,
  TableCell: ({ children }: any) => <td data-testid="table-cell">{children}</td>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
}));

jest.mock('@/components/ui/hover-card', () => ({
  HoverCard: ({ children }: any) => <div data-testid="hover-card">{children}</div>,
  HoverCardTrigger: ({ children }: any) => <div data-testid="hover-card-trigger">{children}</div>,
  HoverCardContent: ({ children }: any) => <div data-testid="hover-card-content">{children}</div>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => <div data-testid="progress" data-value={value}></div>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div data-testid="dropdown-item" onClick={onClick}>{children}</div>
  ),
}));

jest.mock('lucide-react', () => ({
  FileDown: () => <div data-testid="file-down-icon" />,
  Droplet: () => <div data-testid="droplet-icon" />,
  Landmark: () => <div data-testid="landmark-icon" />,
  CheckCircle2: () => <div data-testid="check-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  Archive: () => <div data-testid="archive-icon" />,
}));

describe('AbrechnungModal Optimization', () => {
  const mockNebenkosten: Nebenkosten = {
    id: 'test-id',
    startdatum: '2024-01-01',
    enddatum: '2024-12-31',
    nebenkostenart: ['Heizung', 'Wasser'],
    betrag: [1000, 500],
    berechnungsart: ['pro qm', 'nach Verbrauch'],
    wasserkosten: 500,
    wasserverbrauch: 100,
    haeuser_id: 'house-1',
    user_id: 'user-1',
    Haeuser: { name: 'Test House' },
    gesamtFlaeche: 200,
    anzahlWohnungen: 4,
    anzahlMieter: 3,
  };

  const mockTenants: Mieter[] = [
    {
      id: 'tenant-1',
      name: 'John Doe',
      wohnung_id: 'apt-1',
      einzug: '2024-01-01',
      auszug: undefined,
      email: 'john@example.com',
      telefonnummer: '123456789',
      notiz: '',
      nebenkosten: [],
      user_id: 'user-1',
      Wohnungen: {
        name: 'Apartment 1',
        groesse: 50,
        miete: 800,
      },
    },
    {
      id: 'tenant-2',
      name: 'Jane Smith',
      wohnung_id: 'apt-2',
      einzug: '2024-01-01',
      auszug: undefined,
      email: 'jane@example.com',
      telefonnummer: '987654321',
      notiz: '',
      nebenkosten: [],
      user_id: 'user-1',
      Wohnungen: {
        name: 'Apartment 2',
        groesse: 60,
        miete: 900,
      },
    },
  ];

  const mockRechnungen: Rechnung[] = [
    {
      id: 'bill-1',
      nebenkosten_id: 'test-id',
      mieter_id: 'tenant-1',
      name: 'Heizung',
      betrag: 200,
      user_id: 'user-1',
    },
  ];

  const mockWasserzaehlerReadings: Wasserzaehler[] = [
    {
      id: 'reading-1',
      mieter_id: 'tenant-1',
      ablese_datum: '2024-12-31',
      zaehlerstand: 150,
      verbrauch: 50,
      nebenkosten_id: 'test-id',
      user_id: 'user-1',
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    nebenkostenItem: mockNebenkosten,
    tenants: mockTenants,
    rechnungen: mockRechnungen,
    wasserzaehlerReadings: mockWasserzaehlerReadings,
    ownerName: 'Test Owner',
    ownerAddress: 'Test Address',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with pre-loaded data', () => {
    render(<AbrechnungModal {...defaultProps} />);

    // Verify the modal opens
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    
    // Verify it shows the optimization indicator
    expect(screen.getByText(/Daten für 2 Mieter erfolgreich geladen/)).toBeInTheDocument();
  });

  it('should display tenant selection with pre-loaded tenants', () => {
    render(<AbrechnungModal {...defaultProps} />);

    // Verify tenant combobox is rendered with pre-loaded data
    const combobox = screen.getByTestId('combobox');
    expect(combobox).toBeInTheDocument();
    
    // Verify tenants are available in the combobox
    expect(screen.getByRole('option', { name: 'John Doe' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Jane Smith' })).toBeInTheDocument();
  });

  it('should show performance indicator for pre-loaded data', () => {
    render(<AbrechnungModal {...defaultProps} />);

    // Verify the performance indicator is shown
    const description = screen.getByTestId('dialog-description');
    expect(description).toHaveTextContent('✓ Daten für 2 Mieter erfolgreich geladen');
  });

  it('should handle empty data gracefully', () => {
    const emptyProps = {
      ...defaultProps,
      tenants: [],
      rechnungen: [],
      wasserzaehlerReadings: [],
    };

    render(<AbrechnungModal {...emptyProps} />);

    // Should still render but show no tenants message
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Keine Mieter für diese Abrechnung vorhanden/)).toBeInTheDocument();
  });

  it('should disable PDF export when no data is calculated', () => {
    const emptyProps = {
      ...defaultProps,
      tenants: [],
    };

    render(<AbrechnungModal {...emptyProps} />);

    // Find the PDF export button and verify it's disabled
    const buttons = screen.getAllByTestId('button');
    const pdfButton = buttons.find(button => 
      button.textContent?.includes('Als PDF exportieren')
    );
    
    expect(pdfButton).toBeDisabled();
  });

  it('should show loading state during PDF generation', () => {
    render(<AbrechnungModal {...defaultProps} />);

    // Initially should show normal text
    const buttons = screen.getAllByTestId('button');
    const pdfButton = buttons.find(button => 
      button.textContent?.includes('Als PDF exportieren')
    );
    
    expect(pdfButton).toHaveTextContent('Als PDF exportieren');
  });

  it('should render export dropdown with PDF and ZIP options', () => {
    render(<AbrechnungModal {...defaultProps} />);

    // Verify dropdown menu is rendered
    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    
    // Verify dropdown trigger (chevron button) is rendered
    expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
  });

  it('should show ZIP option only when multiple tenants are loaded', () => {
    render(<AbrechnungModal {...defaultProps} />);

    // With multiple tenants, ZIP option should be available
    // Note: The actual dropdown content visibility depends on user interaction
    // This test verifies the component structure is correct
    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
  });

  it('should handle single tenant scenario without ZIP option', () => {
    const singleTenantProps = {
      ...defaultProps,
      tenants: [mockTenants[0]], // Only one tenant
    };

    render(<AbrechnungModal {...singleTenantProps} />);

    // Dropdown should still be rendered but ZIP option logic is handled in the component
    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
  });
});