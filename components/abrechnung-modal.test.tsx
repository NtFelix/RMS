import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AbrechnungModal } from './abrechnung-modal'; // Adjust path as needed
import { Nebenkosten, Mieter, Rechnung, Wohnung } from '@/lib/data-fetching'; // For type annotations

// Mock for jsPDF and its methods
const mockSave = jest.fn();
const mockAutoTable = jest.fn(); // This will be used by jspdf-autotable

jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => {
    const instance = {
      internal: {
        pageSize: { height: 297, width: 210 }
      },
      setFontSize: jest.fn(),
      setFont: jest.fn(),
      text: jest.fn(),
      addPage: jest.fn(),
      save: mockSave,
      // Mock any other methods that might be called on the doc instance
    };
    // Allow autoTable to be dynamically assigned to the instance
    (instance as any).autoTable = mockAutoTable;
    return instance;
  });
});

// Mock for jspdf-autotable (handling dynamic import)
// This mock structure handles both applyPlugin and default export scenarios
jest.mock('jspdf-autotable', () => ({
  __esModule: true,
  default: mockAutoTable, // If the component uses the default export
  applyPlugin: jest.fn((jsPDFAPI) => { // If the component uses applyPlugin
    if (jsPDFAPI && jsPDFAPI.API) {
      jsPDFAPI.API.autoTable = mockAutoTable; // Simulate plugin attaching autoTable
    }
  }),
}));

// Mock for useToast (as it's used in generateSettlementPDF)
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock data
const mockNebenkostenItemDefault: Nebenkosten = {
  id: 'nk1',
  jahr: 2023,
  nebenkostenart: ['Grundsteuer', 'Versicherung'],
  betrag: [200, 150],
  berechnungsart: ['pro qm', 'pro einheit'],
  wasserkosten: 100,
  gesamtFlaeche: 200,
  Haeuser: { id: 'h1', name: 'Central Park Towers', adresse: '123 Main St', baujahr: 1990, anzahl_wohnungen: 10, notizen: '' },
  haus_id: 'h1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  beschreibung: 'Standard Nebenkosten',
  faelligkeit: new Date().toISOString(),
  zeitraum_start: new Date(2023, 0, 1).toISOString(),
  zeitraum_ende: new Date(2023, 11, 31).toISOString(),
  status: 'offen',
  umlage_einheiten: 2,
};

const mockWohnung1: Wohnung = {
  id: 'w1', name: 'Apt 101', groesse: 80, haus_id: 'h1', mieter_id: 't1',
  beschreibung: 'Schöne Wohnung', anzahl_zimmer: 3, etage: '1', kaltmiete: 700, nebenkosten: 150,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ist_vermietet: true,
};
const mockWohnung2: Wohnung = {
  id: 'w2', name: 'Apt 102', groesse: 120, haus_id: 'h1', mieter_id: 't2',
  beschreibung: 'Große Wohnung', anzahl_zimmer: 4, etage: '1', kaltmiete: 900, nebenkosten: 200,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ist_vermietet: true,
};


const mockSingleTenantList: Mieter[] = [
  {
    id: 't1',
    name: 'Alice Wonderland',
    wohnung_id: 'w1',
    haus_id: 'h1',
    Wohnungen: mockWohnung1,
    email: 'alice@example.com', phone: '123', mietbeginn: '2023-01-01', mietende: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), notizen: '', kaution: 500, ist_aktiv: true
  },
];

const mockMultipleTenantsList: Mieter[] = [
  {
    id: 't1',
    name: 'Alice Wonderland',
    wohnung_id: 'w1',
    haus_id: 'h1',
    Wohnungen: mockWohnung1,
    email: 'alice@example.com', phone: '123', mietbeginn: '2023-01-01', mietende: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), notizen: '', kaution: 500, ist_aktiv: true
 },
  {
    id: 't2',
    name: 'Bob The Builder',
    wohnung_id: 'w2',
    haus_id: 'h1',
    Wohnungen: mockWohnung2,
    email: 'bob@example.com', phone: '456', mietbeginn: '2023-01-01', mietende: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), notizen: '', kaution: 700, ist_aktiv: true
 },
];

const mockRechnungenDefault: Rechnung[] = [
    // {id: 'r1', mieter_id: 't1', name: 'Heizung', betrag: 50, datum: '2023-05-01', nebenkosten_abrechnung_id: 'nk1', beschreibung: '', kategorie: '', datei_url: null, created_at: '', updated_at: ''},
];


describe('AbrechnungModal', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockSave.mockClear();
    mockAutoTable.mockClear();
    mockToast.mockClear();
    // If jsPDF constructor itself is a jest.fn(), clear it too:
    (require('jspdf') as jest.Mock).mockClear();
  });

  // Helper function to render the modal with common props
  const renderModal = (props: Partial<React.ComponentProps<typeof AbrechnungModal>>) => {
    const defaultProps: React.ComponentProps<typeof AbrechnungModal> = {
      isOpen: true,
      onClose: jest.fn(),
      nebenkostenItem: mockNebenkostenItemDefault,
      tenants: [], // Default to empty, override in tests
      rechnungen: mockRechnungenDefault,
      ...props,
    };
    return render(<AbrechnungModal {...defaultProps} />);
  };

  it('should render the modal with the PDF export button including an icon', () => {
    renderModal({ tenants: mockSingleTenantList });
    const exportButton = screen.getByRole('button', { name: /Als PDF exportieren/i });
    expect(exportButton).toBeInTheDocument();
    // Check for icon presence (lucide icons render as <svg>)
    // The icon is a child of the button.
    const svgIcon = exportButton.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
    // Optionally, check for a class specific to your icon if needed, e.g., from lucide
    // expect(svgIcon).toHaveClass('lucide-file-down'); // This depends on lucide-react's output
  });

  it('should generate PDF with tenant name in filename for single tenant export', async () => {
     renderModal({
         tenants: mockSingleTenantList,
         nebenkostenItem: { ...mockNebenkostenItemDefault, jahr: 2024 }
     });

     fireEvent.click(screen.getByRole('button', { name: /Alle relevanten Mieter laden/i }));

     await waitFor(() => {
         expect(screen.getByText(/Mieter: Alice Wonderland/i)).toBeInTheDocument();
     });

     const exportButton = screen.getByRole('button', { name: /Als PDF exportieren/i });
     fireEvent.click(exportButton);

     await waitFor(() => {
         expect(mockSave).toHaveBeenCalledTimes(1);
     });

     expect(mockSave).toHaveBeenCalledWith('Abrechnung_2024_Alice_Wonderland.pdf');
  });

  it('should generate PDF with "Alle_Mieter" in filename for multiple tenants export', async () => {
     renderModal({
         tenants: mockMultipleTenantsList,
         nebenkostenItem: { ...mockNebenkostenItemDefault, jahr: 2025 }
     });

     fireEvent.click(screen.getByRole('button', { name: /Alle relevanten Mieter laden/i }));

     await waitFor(() => {
         expect(screen.getByText(/Mieter: Alice Wonderland/i)).toBeInTheDocument();
         expect(screen.getByText(/Mieter: Bob The Builder/i)).toBeInTheDocument();
     });

     const exportButton = screen.getByRole('button', { name: /Als PDF exportieren/i });
     fireEvent.click(exportButton);

     await waitFor(() => {
         expect(mockSave).toHaveBeenCalledTimes(1);
     });
     expect(mockSave).toHaveBeenCalledWith('Abrechnung_2025_Alle_Mieter.pdf');
  });

 it('should show a toast message if no tenant data is available for export', async () => {
     renderModal({
         tenants: [], // No tenants
         nebenkostenItem: { ...mockNebenkostenItemDefault, jahr: 2026 }
     });

     fireEvent.click(screen.getByRole('button', { name: /Alle relevanten Mieter laden/i }));

     await waitFor(() => {
        // Check for the message indicating no tenants are loaded or relevant for calculation
        // This might be a specific paragraph or based on the absence of tenant details sections
        // For this test, we assume the component correctly sets calculatedTenantData to empty.
        // The crucial part is clicking export and verifying the toast.
     });

     const exportButton = screen.getByRole('button', { name: /Als PDF exportieren/i });
     fireEvent.click(exportButton);

     await waitFor(() => {
         expect(mockToast).toHaveBeenCalledWith({
             title: "Fehler bei PDF-Generierung",
             description: "Keine Mieterdaten für den Export vorhanden.",
             variant: "destructive",
         });
     });
     expect(mockSave).not.toHaveBeenCalled();
 });
});
