import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { AbrechnungModal } from './abrechnung-modal'; // Adjust path as needed
import { Nebenkosten, Mieter, Rechnung, Wohnung, Wasserzaehler } from '@/lib/data-fetching'; // For type annotations

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
  jahr: "2023", // Changed to string
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
      wasserzaehlerReadings: [], // Added default for wasserzaehlerReadings
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
         nebenkostenItem: { ...mockNebenkostenItemDefault, jahr: "2024" } // Changed to string
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
         nebenkostenItem: { ...mockNebenkostenItemDefault, jahr: "2025" } // Changed to string
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
         nebenkostenItem: { ...mockNebenkostenItemDefault, jahr: "2026" } // Changed to string
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

  // --- New tests for Vorauszahlungen and Final Settlement ---

  const mockNebenkostenItem2023: Nebenkosten = {
    ...mockNebenkostenItemDefault,
    id: 'nk2023',
    jahr: "2023", // Changed to string
    nebenkostenart: ['Grundsteuer', 'Versicherung', 'Müllgebühren'],
    betrag: [200, 150, 50], // Total: 400
    berechnungsart: ['pro qm', 'pro einheit', 'fix'], // Müllgebühren 'fix' means it applies directly
    wasserkosten: 100, // Total NK for house: 400 + 100 = 500
    wasserverbrauch: 20, // Added as per plan: 100 / 20 = 5 €/m³
    gesamtFlaeche: 200, // For 'pro qm' (Grundsteuer: 200 / 200 = 1/qm)
    umlage_einheiten: 2, // For 'pro einheit' (Versicherung: 150 / 2 = 75 per unit, but component logic changed this to full amount)
                        // Current component logic for 'pro einheit' and 'fix' applies the full 'betrag[index]' to the tenant.
                        // Grundsteuer (pro qm): 1/qm * 80qm = 80
                        // Versicherung (pro einheit): 150 (Current logic takes full amount)
                        // Müllgebühren (fix): 50 (Current logic takes full amount)
                        // Wasserkosten (pro qm, as gesamtFlaeche > 0): (100 / 200) * 80 = 40
                        // Total Tenant Cost for Alice (80qm apt): 80 (Grundsteuer) + 150 (Versicherung) + 50 (Müll) + 40 (Wasser) = 320
  };

  const mockWohnungAlice: Wohnung = {
      id: 'w_alice', name: 'Apt Alice', groesse: 80, haus_id: 'h_test', mieter_id: 't_alice',
      beschreibung: 'Wohnung Alice', anzahl_zimmer: 3, etage: '1', kaltmiete: 700, nebenkosten: 0, // nebenkosten here is the monthly payment, not used in this modal calculation directly for vorauszahlung.
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ist_vermietet: true,
  };

  const mockTenantNachzahlung: Mieter = {
    id: 't_alice_nachzahlung',
    name: 'Alice Nachzahlung',
    wohnung_id: 'w_alice',
    haus_id: 'h_test',
    Wohnungen: mockWohnungAlice,
    email: 'alice.nach@example.com', phone: '123', mietbeginn: '2023-01-01', mietende: null,
    nebenkosten: [50, 50, 50], // Total Vorauszahlung: 150
    nebenkosten_datum: ['2023-03-01', '2023-06-01', '2023-09-01'],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), notizen: '', kaution: 500, ist_aktiv: true
  }; // Expected Total Cost: 320, Vorauszahlung: 150 => Nachzahlung: 170

  const mockTenantGuthaben: Mieter = {
    id: 't_alice_guthaben',
    name: 'Alice Guthaben',
    wohnung_id: 'w_alice',
    haus_id: 'h_test',
    Wohnungen: mockWohnungAlice,
    email: 'alice.guth@example.com', phone: '123', mietbeginn: '2023-01-01', mietende: null,
    nebenkosten: [100, 100, 100, 100], // Total Vorauszahlung: 400
    nebenkosten_datum: ['2023-03-01', '2023-06-01', '2023-09-01', '2023-12-01'],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), notizen: '', kaution: 500, ist_aktiv: true
  }; // Expected Total Cost: 320, Vorauszahlung: 400 => Guthaben: -80

  const mockTenantMultiYear: Mieter = {
    id: 't_alice_multiyear',
    name: 'Alice MultiYear',
    wohnung_id: 'w_alice',
    haus_id: 'h_test',
    Wohnungen: mockWohnungAlice,
    email: 'alice.multi@example.com', phone: '123', mietbeginn: '2022-01-01', mietende: null,
    nebenkosten: [50, 60, 70, 80],
    nebenkosten_datum: ['2022-12-01', '2023-03-01', '2023-07-01', '2024-01-01'], // Vorauszahlung for 2023: 60 + 70 = 130
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), notizen: '', kaution: 500, ist_aktiv: true
  }; // Expected Total Cost for 2023: 320, Vorauszahlung for 2023: 130 => Nachzahlung: 190

  // Base total cost for mockWohnungAlice (80qm) with mockNebenkostenItem2023 is 320€
  // Grundsteuer (pro qm): (200 / 200qm) * 80qm = 80€
  // Versicherung (pro einheit, current logic takes full amount): 150€
  // Müllgebühren (fix, current logic takes full amount): 50€
  // Wasserkosten (pro qm): (100 / 200qm) * 80qm = 40€
  // Total = 80 + 150 + 50 + 40 = 320€
  const baseTotalTenantCost = 320;

  const mockWasserzaehlerReadingsNk2023: Wasserzaehler[] = [
    { id: 'wz1', user_id: 'user1', mieter_id: 't_alice_nachzahlung', ablese_datum: '2023-12-31', zaehlerstand: 100, verbrauch: 8, nebenkosten_id: 'nk2023' },
    { id: 'wz2', user_id: 'user1', mieter_id: 't_alice_guthaben', ablese_datum: '2023-12-31', zaehlerstand: 150, verbrauch: 7, nebenkosten_id: 'nk2023' },
    { id: 'wz3', user_id: 'user1', mieter_id: 't_alice_multiyear', ablese_datum: '2023-12-31', zaehlerstand: 200, verbrauch: 6, nebenkosten_id: 'nk2023' },
    { id: 'wzS1', user_id: 'user1', mieter_id: 'tS1', ablese_datum: '2023-12-31', zaehlerstand: 0, verbrauch: 8, nebenkosten_id: 'nk2023' },
    { id: 'wzS2', user_id: 'user1', mieter_id: 'tS2', ablese_datum: '2023-12-31', zaehlerstand: 0, verbrauch: 8, nebenkosten_id: 'nk2023' },
    { id: 'wzS3', user_id: 'user1', mieter_id: 'tS3', ablese_datum: '2023-12-31', zaehlerstand: 0, verbrauch: 8, nebenkosten_id: 'nk2023' },
    { id: 'wzS4', user_id: 'user1', mieter_id: 'tS4', ablese_datum: '2023-12-31', zaehlerstand: 0, verbrauch: 8, nebenkosten_id: 'nk2023' },
    { id: 'wzS5', user_id: 'user1', mieter_id: 'tS5', ablese_datum: '2023-12-31', zaehlerstand: 0, verbrauch: 8, nebenkosten_id: 'nk2023' },
    { id: 'wzS6', user_id: 'user1', mieter_id: 'tS6', ablese_datum: '2023-12-31', zaehlerstand: 0, verbrauch: 8, nebenkosten_id: 'nk2023' },
    { id: 'wzS7', user_id: 'user1', mieter_id: 'tS7', ablese_datum: '2023-12-31', zaehlerstand: 0, verbrauch: 8, nebenkosten_id: 'nk2023' },
    { id: 'wzS8', user_id: 'user1', mieter_id: 'tS8', ablese_datum: '2023-12-31', zaehlerstand: 0, verbrauch: 8, nebenkosten_id: 'nk2023' },
    { id: 'wzS9A', user_id: 'user1', mieter_id: 'tS9A', ablese_datum: '2023-12-31', zaehlerstand: 0, verbrauch: 8, nebenkosten_id: 'nk2023' },
    { id: 'wzS9B', user_id: 'user1', mieter_id: 'tS9B', ablese_datum: '2023-12-31', zaehlerstand: 0, verbrauch: 8, nebenkosten_id: 'nk2023' },
    { id: 'wzS10', user_id: 'user1', mieter_id: 'tS10', ablese_datum: '2023-12-31', zaehlerstand: 0, verbrauch: 8, nebenkosten_id: 'nk2023' },
    { id: 'wzS11', user_id: 'user1', mieter_id: 'tS11', ablese_datum: '2023-12-31', zaehlerstand: 0, verbrauch: 8, nebenkosten_id: 'nk2023' },
  ];

  describe('AbrechnungModal - Monthly Recurring Vorauszahlungen', () => {
    // beforeEach for this specific describe block to set up common props
    beforeEach(() => {
      // This is a bit redundant if renderModal is called in each test,
      // but if there were common setup before renderModal, it would go here.
      // For now, we'll ensure relevant props are passed in renderAndSelectTenant.
    });

    const renderAndSelectTenant = async (tenant: Mieter, customNkItem?: Nebenkosten, customWasserReadings?: Wasserzaehler[]) => {
      renderModal({
        tenants: [tenant],
        nebenkostenItem: customNkItem || mockNebenkostenItem2023, // Abrechnung for 2023
        wasserzaehlerReadings: customWasserReadings || mockWasserzaehlerReadingsNk2023,
      });
      fireEvent.click(screen.getByRole('button', { name: /Mieter auswählen/i }));
      fireEvent.click(screen.getByText(tenant.name));
      await waitFor(() => {
        expect(screen.getByText('Vorauszahlungen')).toBeInTheDocument();
      });
    };

    const assertPrepaymentsAndSettlement = (
      expectedVorauszahlungen: number,
      expectedSettlement: number,
      settlementType: 'Nachzahlung' | 'Guthaben'
    ) => {
      const cardBaseSelector = 'div[class*="min-w-"]'; // Common selector part for our Cards

      // Wasserkosten Info Card
      const wasserkostenTitle = screen.getByText("Wasserkosten");
      const wasserkostenCard = wasserkostenTitle.closest(cardBaseSelector);
      expect(wasserkostenCard).toBeInTheDocument();
      const wasserkostenHeader = wasserkostenTitle.closest('header'); // CardHeader is a header tag
      expect(wasserkostenHeader).toBeInTheDocument();
      expect(wasserkostenHeader!.querySelector('svg')).toBeInTheDocument(); // Check for Droplet icon
      // Assuming text-sm and font-medium are default for CardTitle via components/ui/card
      expect(wasserkostenTitle).toHaveClass("text-sm font-medium");
      const wasserkostenAmountEl = wasserkostenCard!.querySelector('div.text-2xl.font-semibold');
      expect(wasserkostenAmountEl).toHaveTextContent(formatCurrency(40).replace(/\s/g, ' ')); // Expected water cost for mockWohnungAlice
      expect(wasserkostenAmountEl).toHaveClass('text-gray-800');

      // Vorauszahlungen Info Card
      const vorauszahlungenTitle = screen.getByText('Vorauszahlungen');
      const vorauszahlungenCard = vorauszahlungenTitle.closest(cardBaseSelector);
      expect(vorauszahlungenCard).toBeInTheDocument();
      const vorauszahlungenHeader = vorauszahlungenTitle.closest('header');
      expect(vorauszahlungenHeader).toBeInTheDocument();
      expect(vorauszahlungenHeader!.querySelector('svg')).toBeInTheDocument(); // Check for Landmark icon
      expect(vorauszahlungenTitle).toHaveClass("text-sm font-medium");

      const vorauszahlungenAmountEl = vorauszahlungenCard!.querySelector('div.text-2xl.font-semibold');
      expect(vorauszahlungenAmountEl).toHaveTextContent(formatCurrency(expectedVorauszahlungen).replace(/\s/g, ' '));
      expect(vorauszahlungenAmountEl).toHaveClass('text-gray-800');

      // Final Settlement Info Card (Nachzahlung/Guthaben)
      const settlementTitleEl = screen.getByText(settlementType);
      const settlementCard = settlementTitleEl.closest(cardBaseSelector);
      expect(settlementCard).toBeInTheDocument();
      const settlementHeader = settlementTitleEl.closest('header');
      expect(settlementHeader).toBeInTheDocument();
      const settlementIcon = settlementHeader!.querySelector('svg');
      expect(settlementIcon).toBeInTheDocument();

      const isNachzahlung = expectedSettlement >= 0;
      // Check title color
      expect(settlementTitleEl).toHaveClass(isNachzahlung ? 'text-red-700' : 'text-green-700');
      // Check icon color
      expect(settlementIcon).toHaveClass(isNachzahlung ? 'text-red-500' : 'text-green-500');

      // Check amount value and color
      const settlementAmountEl = settlementCard!.querySelector('div.text-2xl.font-semibold');
      expect(settlementAmountEl).toHaveTextContent(formatCurrency(expectedSettlement).replace(/\s/g, ' '));
      expect(settlementAmountEl).toHaveClass(isNachzahlung ? 'text-red-700' : 'text-green-700');
    };

    // Helper for currency formatting in assertions
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    };

    it('Scenario 1: Simple Full-Year Prepayment', async () => {
      const tenantS1: Mieter = {
        id: 'tS1', name: 'Tenant S1 FullYear', einzug: '2023-01-01', auszug: null, Wohnungen: mockWohnungAlice,
        nebenkosten: [100], nebenkosten_datum: ['2023-01-01'],
        // other Mieter fields if necessary
      };
      await renderAndSelectTenant(tenantS1);
      const expectedVorauszahlungen = 100 * 12; // 1200
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, baseTotalTenantCost - expectedVorauszahlungen, 'Guthaben'); // 320 - 1200 = -880
    });

    it('Scenario 2: Prepayment Change Mid-Year', async () => {
      const tenantS2: Mieter = {
        id: 'tS2', name: 'Tenant S2 MidYearChange', einzug: '2023-01-01', auszug: null, Wohnungen: mockWohnungAlice,
        nebenkosten: [100, 120], nebenkosten_datum: ['2023-01-01', '2023-07-01'],
      };
      await renderAndSelectTenant(tenantS2);
      const expectedVorauszahlungen = (100 * 6) + (120 * 6); // 600 + 720 = 1320
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, baseTotalTenantCost - expectedVorauszahlungen, 'Guthaben'); // 320 - 1320 = -1000
    });

    it('Scenario 3: Tenant Moves In Mid-Year', async () => {
      const tenantS3: Mieter = {
        id: 'tS3', name: 'Tenant S3 MoveInMidYear', einzug: '2023-04-01', auszug: null, Wohnungen: mockWohnungAlice,
        nebenkosten: [100], nebenkosten_datum: ['2023-01-01'], // Rate active from before move-in
      };
      await renderAndSelectTenant(tenantS3);
      const expectedVorauszahlungen = 100 * 9; // April to Dec = 9 months = 900
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, baseTotalTenantCost - expectedVorauszahlungen, 'Guthaben'); // 320 - 900 = -580
    });

    it('Scenario 4: Tenant Moves Out Mid-Year', async () => {
      const tenantS4: Mieter = {
        id: 'tS4', name: 'Tenant S4 MoveOutMidYear', einzug: '2023-01-01', auszug: '2023-08-31', Wohnungen: mockWohnungAlice,
        nebenkosten: [100], nebenkosten_datum: ['2023-01-01'],
      };
      await renderAndSelectTenant(tenantS4);
      const expectedVorauszahlungen = 100 * 8; // Jan to Aug = 8 months = 800
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, baseTotalTenantCost - expectedVorauszahlungen, 'Guthaben'); // 320 - 800 = -480
    });

    it('Scenario 5: Tenant Moves In and Out Within Abrechnungsjahr', async () => {
      const tenantS5: Mieter = {
        id: 'tS5', name: 'Tenant S5 InOutYear', einzug: '2023-02-01', auszug: '2023-10-31', Wohnungen: mockWohnungAlice,
        nebenkosten: [100], nebenkosten_datum: ['2023-01-01'],
      };
      await renderAndSelectTenant(tenantS5);
      const expectedVorauszahlungen = 100 * 9; // Feb to Oct = 9 months = 900
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, baseTotalTenantCost - expectedVorauszahlungen, 'Guthaben'); // 320 - 900 = -580
    });

    it('Scenario 6: Prepayment Starts After Abrechnungsjahr Begins', async () => {
      const tenantS6: Mieter = {
        id: 'tS6', name: 'Tenant S6 LateStartPrepay', einzug: '2023-01-01', auszug: null, Wohnungen: mockWohnungAlice,
        nebenkosten: [100], nebenkosten_datum: ['2023-03-01'],
      };
      await renderAndSelectTenant(tenantS6);
      const expectedVorauszahlungen = 100 * 10; // Mar to Dec = 10 months = 1000
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, baseTotalTenantCost - expectedVorauszahlungen, 'Guthaben'); // 320 - 1000 = -680
    });

    it('Scenario 7: Effective Prepayment for month based on latest schedule before month start', async () => {
      const tenantS7: Mieter = {
        id: 'tS7', name: 'Tenant S7 EffectiveRate', einzug: '2023-03-01', auszug: '2023-06-30', Wohnungen: mockWohnungAlice, // Active Mar, Apr, May, Jun (4 months)
        nebenkosten: [50, 60], nebenkosten_datum: ['2023-01-01', '2023-05-01'],
      };
      await renderAndSelectTenant(tenantS7);
      // Mar: uses 50 (from 2023-01-01)
      // Apr: uses 50 (from 2023-01-01)
      // May: uses 60 (from 2023-05-01)
      // Jun: uses 60 (from 2023-05-01)
      const expectedVorauszahlungen = (50 * 2) + (60 * 2); // 100 + 120 = 220
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, baseTotalTenantCost - expectedVorauszahlungen, 'Nachzahlung'); // 320 - 220 = 100
    });

    it('Scenario 8: No nebenkosten or nebenkosten_datum', async () => {
      const tenantS8: Mieter = {
        id: 'tS8', name: 'Tenant S8 NoPrepayData', einzug: '2023-01-01', auszug: null, Wohnungen: mockWohnungAlice,
        nebenkosten: [], nebenkosten_datum: [],
      };
      await renderAndSelectTenant(tenantS8);
      const expectedVorauszahlungen = 0;
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, baseTotalTenantCost - expectedVorauszahlungen, 'Nachzahlung'); // 320 - 0 = 320
    });

    it('Scenario 9: Invalid dates in nebenkosten_datum or mismatch length', async () => {
      const tenantS9A: Mieter = { // Invalid date string
        id: 'tS9A', name: 'Tenant S9A InvalidDate', einzug: '2023-01-01', auszug: null, Wohnungen: mockWohnungAlice,
        nebenkosten: [100], nebenkosten_datum: ['invalid-date-string'],
      };
      await renderAndSelectTenant(tenantS9A);
      assertPrepaymentsAndSettlement(0, baseTotalTenantCost - 0, 'Nachzahlung');

      const tenantS9B: Mieter = { // Mismatched length
        id: 'tS9B', name: 'Tenant S9B Mismatch', einzug: '2023-01-01', auszug: null, Wohnungen: mockWohnungAlice,
        nebenkosten: [100, 120], nebenkosten_datum: ['2023-01-01'],
      };
      // Need to close the previous render if renderAndSelectTenant does not unmount/cleanup
      // For simplicity, assuming each renderAndSelectTenant is fresh or component handles this.
      // If not, separate renders would be needed.
      // Let's test this by rendering S9B in a new block to be safe, though it makes the helper less useful here.
       renderModal({
        tenants: [tenantS9B],
        nebenkostenItem: mockNebenkostenItem2023,
        wasserzaehlerReadings: mockWasserzaehlerReadingsNk2023, // Ensure readings are passed
      });
      fireEvent.click(screen.getByRole('button', { name: /Mieter auswählen/i }));
      fireEvent.click(screen.getByText(tenantS9B.name));
      await waitFor(() => {
        expect(screen.getByText('Vorauszahlungen')).toBeInTheDocument();
      });
      assertPrepaymentsAndSettlement(0, baseTotalTenantCost - 0, 'Nachzahlung');
    });

     it('Scenario 10: Tenant moves in, first prepayment starts later', async () => {
      const tenantS10: Mieter = {
        id: 'tS10', name: 'Tenant S10 MoveInPrepayLater',
        einzug: '2023-01-01', // Active Jan-Dec
        auszug: null,
        Wohnungen: mockWohnungAlice,
        nebenkosten: [100],
        nebenkosten_datum: ['2023-03-01'], // Prepayment starts in March
      };
      await renderAndSelectTenant(tenantS10);
      // Jan: 0, Feb: 0
      // Mar-Dec: 100 * 10 = 1000
      const expectedVorauszahlungen = 100 * 10;
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, baseTotalTenantCost - expectedVorauszahlungen, 'Guthaben'); // 320 - 1000 = -680
    });

    it('Scenario 11: Tenant moves out before any prepayment schedule starts', async () => {
      const tenantS11: Mieter = {
        id: 'tS11', name: 'Tenant S11 MoveOutBeforePrepay',
        einzug: '2023-01-01',
        auszug: '2023-03-31', // Active Jan, Feb, Mar
        Wohnungen: mockWohnungAlice,
        nebenkosten: [100],
        nebenkosten_datum: ['2023-05-01'], // Prepayment starts in May
      };
      await renderAndSelectTenant(tenantS11);
      // Jan: 0, Feb: 0, Mar: 0 (prepayment schedule starts May)
      const expectedVorauszahlungen = 0;
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, baseTotalTenantCost - expectedVorauszahlungen, 'Nachzahlung'); // 320 - 0 = 320
    });

    it('should correctly display water costs based on individual consumption', async () => {
      const testTenant: Mieter = {
         id: 't_water_test', name: 'Tenant Water Test', einzug: '2023-01-01', auszug: null,
         Wohnungen: mockWohnungAlice, // 80qm apartment
         nebenkosten: [0], nebenkosten_datum: ['2023-01-01'], // No prepayments for simplicity
      };
      const testWasserlesung: Wasserzaehler[] = [{
         id: 'wz_test', user_id: 'user1', mieter_id: 't_water_test',
         ablese_datum: '2023-12-31', zaehlerstand: 100, verbrauch: 10, // Specific consumption: 10 m³
         nebenkosten_id: 'nk2023',
      }];
      const nkItemWithWasserverbrauch = {
          ...mockNebenkostenItem2023, //wasserkosten:100, wasserverbrauch: 20 => pricePerM3 = 5
          wasserverbrauch: 20, // Explicitly ensure it's set for this test item
      };

      // Use the updated renderAndSelectTenant or call renderModal directly
      await renderAndSelectTenant(testTenant, nkItemWithWasserverbrauch, testWasserlesung);
      // Or direct render:
      // renderModal({
      //   tenants: [testTenant],
      //   nebenkostenItem: nkItemWithWasserverbrauch,
      //   wasserzaehlerReadings: testWasserlesung,
      // });
      // fireEvent.click(screen.getByRole('button', { name: /Mieter auswählen/i }));
      // fireEvent.click(screen.getByText(testTenant.name));


      await waitFor(() => {
        // Check for the Wasserkosten card elements
        const wasserkostenTitle = screen.getByText("Wasserkosten");
        // The card structure might be complex. Let's find a stable parent based on content.
        // Assuming CardTitle is a direct child of CardHeader, and CardHeader sibling to CardContent.
        // And the hover card trigger wraps the display card.
        // The actual displayed card is what we want to inspect.
        // Let's assume the card visible on screen (not the hover content initially)
        // contains the title "Wasserkosten" and its value.
        let currentElement: HTMLElement | null = wasserkostenTitle;
        let wasserkostenCard: HTMLElement | null = null;
        while(currentElement && !wasserkostenCard) {
            if (currentElement.classList.contains('min-w-[220px]') || currentElement.classList.contains('sm:min-w-[250px]')) {
                wasserkostenCard = currentElement;
                break;
            }
            currentElement = currentElement.parentElement;
        }
        expect(wasserkostenCard).toBeInTheDocument();

        // Open HoverCard to check details
        const triggerCard = wasserkostenTitle.closest('button[data-state="closed"]'); // HoverCardTrigger is a button
        if(triggerCard) fireEvent.mouseEnter(triggerCard); // Or focus, depending on trigger mechanism

        // Wait for HoverCardContent to appear
        const hoverCardContent = await screen.findByRole('tooltip'); // HoverCardContent has role="tooltip"
        expect(hoverCardContent).toBeInTheDocument();

        // Assert calculation method
        expect(within(hoverCardContent).getByText('Berechnungsmethode:')).toBeInTheDocument();
        expect(within(hoverCardContent).getByText('nach Verbrauch')).toBeInTheDocument();

        // Assert consumption display
        expect(within(hoverCardContent).getByText('Verbrauch:')).toBeInTheDocument();
        expect(within(hoverCardContent).getByText('10 m³')).toBeInTheDocument(); // 10 m³ from testWasserlesung

        // Assert tenant's share (this is visible on the main card, not just hover)
        // Expected share = 10 m³ * (100 € / 20 m³) = 10 * 5 = 50 €
        const expectedShareFormatted = formatCurrency(50).replace(/\s/g, ' ');
        const tenantShareElement = wasserkostenCard!.querySelector('div.text-2xl.font-semibold');
        expect(tenantShareElement).toHaveTextContent(expectedShareFormatted);
      });
    });
  });
});
