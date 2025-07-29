import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AbrechnungModal } from './abrechnung-modal'; // Adjust path as needed
import { Nebenkosten, Mieter, Rechnung, Wohnung, Wasserzaehler, Haus } from '@/lib/data-fetching'; // For type annotations

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

// Standalone calculateOccupancy function (30/360 day count convention)
const calculateOccupancy = (einzug: string | null | undefined, auszug: string | null | undefined, abrechnungsjahr: number): { percentage: number, daysInYear: number, daysOccupied: number } => {
  const daysInBillingYear = 360; // Fixed for 30/360 convention

  if (!einzug) {
    return { percentage: 0, daysInYear: daysInBillingYear, daysOccupied: 0 };
  }

  const actualBillingYearStartDate = new Date(Date.UTC(abrechnungsjahr, 0, 1));
  const actualBillingYearEndDate = new Date(Date.UTC(abrechnungsjahr, 11, 31, 23, 59, 59, 999));

  const moveInDate = new Date(einzug);
  if (isNaN(moveInDate.getTime()) || moveInDate > actualBillingYearEndDate) {
    return { percentage: 0, daysInYear: daysInBillingYear, daysOccupied: 0 };
  }

  let moveOutDate: Date | null = null;
  if (auszug) {
    const parsedMoveOut = new Date(auszug);
    if (!isNaN(parsedMoveOut.getTime())) {
      moveOutDate = parsedMoveOut;
    }
  }

  if (moveOutDate && moveOutDate < actualBillingYearStartDate) {
    return { percentage: 0, daysInYear: daysInBillingYear, daysOccupied: 0 };
  }

  const effectivePeriodStart = moveInDate < actualBillingYearStartDate ? actualBillingYearStartDate : moveInDate;
  const effectivePeriodEnd = (!moveOutDate || moveOutDate > actualBillingYearEndDate) ? actualBillingYearEndDate : moveOutDate;

  if (effectivePeriodStart > effectivePeriodEnd) {
    return { percentage: 0, daysInYear: daysInBillingYear, daysOccupied: 0 };
  }

  let y1 = effectivePeriodStart.getUTCFullYear();
  let m1 = effectivePeriodStart.getUTCMonth();
  let d1 = effectivePeriodStart.getUTCDate();

  let y2 = effectivePeriodEnd.getUTCFullYear();
  let m2 = effectivePeriodEnd.getUTCMonth();
  let d2 = effectivePeriodEnd.getUTCDate();

  if (d1 === 31) d1 = 30;
  if (d2 === 31) d2 = 30;

  let calculatedDaysOccupied = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1) + 1;

  calculatedDaysOccupied = Math.max(0, calculatedDaysOccupied);
  calculatedDaysOccupied = Math.min(calculatedDaysOccupied, daysInBillingYear);

  const percentage = (calculatedDaysOccupied / daysInBillingYear) * 100;

  return {
    percentage: Math.max(0, Math.min(100, percentage)),
    daysInYear: daysInBillingYear,
    daysOccupied: calculatedDaysOccupied,
  };
};

describe('calculateOccupancy (30/360 Convention)', () => {
  it('should return 0% for no move-in date', () => {
    const result = calculateOccupancy(null, '2023-12-31', 2023);
    expect(result.percentage).toBe(0);
    expect(result.daysOccupied).toBe(0);
    expect(result.daysInYear).toBe(360);
  });

  it('should return 0% for move-in after billing year', () => {
    const result = calculateOccupancy('2024-01-01', '2024-12-31', 2023);
    expect(result.percentage).toBe(0);
    expect(result.daysOccupied).toBe(0);
  });

  it('should return 0% for move-out before billing year', () => {
    const result = calculateOccupancy('2022-01-01', '2022-12-31', 2023);
    expect(result.percentage).toBe(0);
    expect(result.daysOccupied).toBe(0);
  });

  it('should calculate 100% for full year occupancy', () => {
    const result = calculateOccupancy('2023-01-01', '2023-12-31', 2023);
    expect(result.percentage).toBeCloseTo(100);
    expect(result.daysOccupied).toBe(360);
  });

  it('should calculate 100% for full year occupancy, move-in before, move-out after', () => {
    const result = calculateOccupancy('2022-06-01', '2024-05-31', 2023);
    expect(result.percentage).toBeCloseTo(100);
    expect(result.daysOccupied).toBe(360);
  });

  it('should handle 31st day as 30th for start date', () => {
    // 2023-01-31 to 2023-02-01 should be 1 day (30th Jan to 1st Feb)
    const result = calculateOccupancy('2023-01-31', '2023-02-01', 2023);
    // (y2 - y1) * 360 => 0
    // (m2 - m1) * 30 => (1-0)*30 = 30
    // (d2 - d1) + 1 => (1-30)+1 = -28
    // Total = 30 - 28 = 2 days. This seems correct for 30/360 if Jan 31 is treated as Jan 30.
    // Jan 30 to Feb 1. (Feb 1 included) - (Jan 30 included) + 1 = 2 days
    expect(result.daysOccupied).toBe(2); // (Feb 1) - (Jan 30) + 1
  });

  it('should handle 31st day as 30th for end date', () => {
    // 2023-03-30 to 2023-03-31 should be 1 day (30th to 30th)
    const result = calculateOccupancy('2023-03-30', '2023-03-31', 2023);
     // (0*360) + (0*30) + (30-30)+1 = 1 day
    expect(result.daysOccupied).toBe(1);
  });

  it('should calculate correctly for partial year (move-in during year)', () => {
    // From 2023-07-01 to 2023-12-31
    // Months: July, Aug, Sep, Oct, Nov, Dec (6 months)
    // Days: 6 * 30 = 180 days
    const result = calculateOccupancy('2023-07-01', '2023-12-31', 2023);
    expect(result.daysOccupied).toBe(180);
    expect(result.percentage).toBeCloseTo(50); // 180/360
  });

  it('should calculate correctly for partial year (move-out during year)', () => {
    // From 2023-01-01 to 2023-06-30
    // Months: Jan, Feb, Mar, Apr, May, Jun (6 months)
    // Days: 6 * 30 = 180 days
    const result = calculateOccupancy('2023-01-01', '2023-06-30', 2023);
    expect(result.daysOccupied).toBe(180);
    expect(result.percentage).toBeCloseTo(50);
  });

  it('should calculate correctly for one month occupancy', () => {
    // 2023-03-01 to 2023-03-30
    const result = calculateOccupancy('2023-03-01', '2023-03-30', 2023);
    expect(result.daysOccupied).toBe(30);
    expect(result.percentage).toBeCloseTo((30/360)*100);
  });

  it('should calculate correctly for one day occupancy', () => {
    const result = calculateOccupancy('2023-03-15', '2023-03-15', 2023);
    expect(result.daysOccupied).toBe(1);
  });

  it('should cap daysOccupied at daysInBillingYear (360)', () => {
    // Using a leap year where actual days might exceed 360 for full occupancy
    const result = calculateOccupancy('2024-01-01', '2024-12-31', 2024);
    expect(result.daysOccupied).toBe(360);
    expect(result.percentage).toBe(100);
  });

  it('should handle period start date before billing year start date', () => {
    // Tenant moved in Nov 2022, billing year 2023, moved out Dec 2023
    // Effective start for 2023 is Jan 1, 2023.
    const result = calculateOccupancy('2022-11-01', '2023-12-31', 2023);
    expect(result.daysOccupied).toBe(360);
    expect(result.percentage).toBe(100);
  });

  it('should handle period end date after billing year end date', () => {
    // Tenant moved in Jan 2023, billing year 2023, moved out Feb 2024
    // Effective end for 2023 is Dec 31, 2023 (represented as Dec 30).
    const result = calculateOccupancy('2023-01-01', '2024-02-15', 2023);
    expect(result.daysOccupied).toBe(360);
    expect(result.percentage).toBe(100);
  });

  it('should handle short period across month boundary', () => {
    // 2023-02-28 to 2023-03-02. Feb 28, Mar 1, Mar 2 (3 days)
    // In 30/360: (Feb 28, Feb 29 (n/a), Feb 30 (n/a)), Mar 1, Mar 2
    // Using 30/360 formula: (M2-M1)*30 + (D2-D1) + 1
    // (2-1)*30 + (2-28) + 1 = 30 - 26 + 1 = 5 days.
    // (Feb 28, Feb 29, Feb 30), (Mar 1, Mar 2) - this is how 30E/360 might count it.
    // Feb 28th, (29th), (30th), Mar 1st, Mar 2nd = 5 days by some 30/360 variants.
    const result = calculateOccupancy('2023-02-28', '2023-03-02', 2023);
    expect(result.daysOccupied).toBe(5); // This matches the 30E/360 logic.
  });
   it('should handle move-in on Feb 28 and move-out on Feb 28 of non-leap year', () => {
    const result = calculateOccupancy('2023-02-28', '2023-02-28', 2023);
    expect(result.daysOccupied).toBe(1); // One day of occupancy
  });
} );

// Existing describe block for AbrechnungModal
describe('AbrechnungModal Cost Calculation & Proration (30/360 Convention)', () => {
  const user = userEvent.setup();

  // Helper to assert costs for a tenant
  const assertTenantCosts = async (
    tenant: Mieter,
    nebenkostenItem: Nebenkosten,
    rechnungen: Rechnung[] | undefined, // Allow undefined if not applicable
    wasserzaehlerReadings: Wasserzaehler[],
    expectedTotalCost: number,
    expectedGrundsteuerShare: number,
    expectedVersicherungShare: number,
    expectedStrassenreinigungShare: number,
    expectedWaterShare: number, // This should be the final, non-prorated amount
    expectedKabelTVShare?: number // Optional, for "nach Rechnung"
  ) => {
    renderModal({
      isOpen: true,
      onClose: jest.fn(),
      nebenkostenItem,
      tenants: [tenant],
      rechnungen: rechnungen || [], // Use empty array if undefined
      wasserzaehlerReadings,
    });

    // Select the tenant in the modal
    // Assuming CustomCombobox updates its value, then calculations run
    // For simplicity, we'll assume direct rendering with one tenant triggers calculation directly for that tenant
    // or that a mechanism to select the tenant is used if multiple are passed.
    // The current AbrechnungModal calculates for a selected tenant or all if `loadAllRelevantTenants` is true.
    // Let's assume we are testing the single tenant selection path.

    // Click the combobox trigger to open options
    // Using a more robust way to find the combobox trigger
    const comboboxTrigger = screen.getByRole('button', { name: /Mieter auswählen/i });
    await user.click(comboboxTrigger);

    // Click the tenant's name in the listbox that appears
    const tenantOption = await screen.findByRole('option', { name: tenant.name });
    await user.click(tenantOption);


    await waitFor(() => {
      // Verify Total Costs display (example, adjust selector as needed)
      // This requires looking for the "Gesamtkosten Mieter" in the main table
      const gesamtKostenRows = screen.getAllByText('Gesamtkosten Mieter');
      const lastGesamtKostenRow = gesamtKostenRows[gesamtKostenRows.length -1]; // Assuming it's the last one
      const totalCostCell = lastGesamtKostenRow.closest('tr')?.querySelector('td:last-child');
      expect(totalCostCell).toHaveTextContent(formatCurrency(expectedTotalCost).replace(/\s/g, ' '));

      // Verify individual cost items in the table
      const table = screen.getByRole('table'); // Find the main table

      // Grundsteuer
      const grundsteuerRow = within(table).getByText('Grundsteuer').closest('tr');
      expect(within(grundsteuerRow!).getByText(formatCurrency(expectedGrundsteuerShare).replace(/\s/g, ' '))).toBeInTheDocument();

      // Versicherung
      const versicherungRow = within(table).getByText('Versicherung').closest('tr');
      expect(within(versicherungRow!).getByText(formatCurrency(expectedVersicherungShare).replace(/\s/g, ' '))).toBeInTheDocument();

      // Straßenreinigung
      const strassenreinigungRow = within(table).getByText('Straßenreinigung').closest('tr');
      expect(within(strassenreinigungRow!).getByText(formatCurrency(expectedStrassenreinigungShare).replace(/\s/g, ' '))).toBeInTheDocument();

      // Wasserkosten (from HoverCard, as it's not in the main cost items table in this structure)
      const wasserkostenTitle = screen.getByText("Wasserkosten"); // This finds the CardTitle
      // The value is in a sibling div with class 'text-2xl font-semibold'
      const wasserkostenCard = wasserkostenTitle.closest('div[class*="min-w-"]'); // Find the parent card
      const wasserkostenValueElement = wasserkostenCard!.querySelector('div.text-2xl.font-semibold');
      expect(wasserkostenValueElement).toHaveTextContent(formatCurrency(expectedWaterShare).replace(/\s/g, ' '));

      if (expectedKabelTVShare !== undefined) {
        const kabelTVRow = within(table).getByText('Kabel TV').closest('tr');
        expect(within(kabelTVRow!).getByText(formatCurrency(expectedKabelTVShare).replace(/\s/g, ' '))).toBeInTheDocument();
      }
    });
  };

  let pricePerQmGrundsteuer: number;
  let versicherungTotal: number;
  let strassenreinigungTotal: number;
  let pricePerCubicMeterWater: number;

  beforeAll(() => {
    pricePerQmGrundsteuer = commonNebenkostenItem2023.betrag![0] / commonNebenkostenItem2023.gesamtFlaeche!; // 200 / 300
    versicherungTotal = commonNebenkostenItem2023.betrag![1]; // 300
    strassenreinigungTotal = commonNebenkostenItem2023.betrag![2]; // 100
    pricePerCubicMeterWater = commonNebenkostenItem2023.wasserkosten! / commonNebenkostenItem2023.wasserverbrauch!; // 300 / 60 = 5
  });

  it('should calculate costs correctly for full year occupancy (2023, 30/360)', async () => {
    const tenant = tenant1_FullYear2023;
    const occupancy = calculateOccupancy(tenant.einzug, tenant.auszug, 2023); // 100%
    const factor = occupancy.percentage / 100;

    const grundsteuerShare = pricePerQmGrundsteuer * tenant.Wohnungen!.groesse * factor; // (200/300) * 75 * 1 = 50
    const versicherungShare = versicherungTotal * factor; // 300 * 1 = 300
    const strassenreinigungShare = strassenreinigungTotal * factor; // 100 * 1 = 100

    const individualWaterConsumption = 10; // Assume 10 m³ for this tenant
    const waterShare = individualWaterConsumption * pricePerCubicMeterWater; // 10 * 5 = 50 (NOT prorated)

    const totalCost = grundsteuerShare + versicherungShare + strassenreinigungShare + waterShare; // 50 + 300 + 100 + 50 = 500

    const mockReadings: Wasserzaehler[] = [{id: 'wz_t1', user_id:'usr', mieter_id: tenant.id, nebenkosten_id: commonNebenkostenItem2023.id, verbrauch: individualWaterConsumption, zaehlerstand: 100, ablese_datum: '2023-12-31'}];

    await assertTenantCosts(tenant, commonNebenkostenItem2023, [], mockReadings, totalCost, grundsteuerShare, versicherungShare, strassenreinigungShare, waterShare);
  });

  it('should calculate costs correctly for half year move-out (2023, 30/360)', async () => {
    const tenant = tenant2_HalfYearMoveOut2023; // auszug: 2023-06-30 => 180 days / 50%
    const occupancy = calculateOccupancy(tenant.einzug, tenant.auszug, 2023);
    expect(occupancy.daysOccupied).toBe(180); // Verify occupancy calculation
    const factor = occupancy.percentage / 100; // 0.5

    const grundsteuerShare = pricePerQmGrundsteuer * tenant.Wohnungen!.groesse * factor; // (200/300) * 75 * 0.5 = 25
    const versicherungShare = versicherungTotal * factor; // 300 * 0.5 = 150
    const strassenreinigungShare = strassenreinigungTotal * factor; // 100 * 0.5 = 50

    const individualWaterConsumption = 5; // Assume 5 m³ for this tenant (could be different for partial year)
    const waterShare = individualWaterConsumption * pricePerCubicMeterWater; // 5 * 5 = 25 (NOT prorated)

    const totalCost = grundsteuerShare + versicherungShare + strassenreinigungShare + waterShare; // 25 + 150 + 50 + 25 = 250

    const mockReadings: Wasserzaehler[] = [{id: 'wz_t2', user_id:'usr', mieter_id: tenant.id, nebenkosten_id: commonNebenkostenItem2023.id, verbrauch: individualWaterConsumption, zaehlerstand: 50, ablese_datum: '2023-06-30'}];

    await assertTenantCosts(tenant, commonNebenkostenItem2023, [], mockReadings, totalCost, grundsteuerShare, versicherungShare, strassenreinigungShare, waterShare);
  });

  it('should calculate costs correctly for partial year in leap year (2024, 30/360)', async () => {
    const tenant = tenant4_LeapYearPartial2024; // einzug: 2023-10-01, auszug: 2024-03-31. For year 2024.
    const occupancy = calculateOccupancy(tenant.einzug, tenant.auszug, 2024); // Jan 1 2024 to Mar 31 2024 = 90 days
    expect(occupancy.daysOccupied).toBe(90);
    const factor = occupancy.percentage / 100; // 90/360 = 0.25

    // Using nebenkostenItem2024Leap for this test
    const pricePerQmGrundsteuer2024 = nebenkostenItem2024Leap.betrag![0] / nebenkostenItem2024Leap.gesamtFlaeche!;
    const versicherungTotal2024 = nebenkostenItem2024Leap.betrag![1];
    const strassenreinigungTotal2024 = nebenkostenItem2024Leap.betrag![2];
    const pricePerCubicMeterWater2024 = nebenkostenItem2024Leap.wasserkosten! / nebenkostenItem2024Leap.wasserverbrauch!;


    const grundsteuerShare = pricePerQmGrundsteuer2024 * tenant.Wohnungen!.groesse * factor; // (200/300) * 75 * 0.25 = 12.5
    const versicherungShare = versicherungTotal2024 * factor; // 300 * 0.25 = 75
    const strassenreinigungShare = strassenreinigungTotal2024 * factor; // 100 * 0.25 = 25

    const individualWaterConsumption = 3; // Assume 3 m³
    const waterShare = individualWaterConsumption * pricePerCubicMeterWater2024; // 3 * 5 = 15 (NOT prorated)

    const totalCost = grundsteuerShare + versicherungShare + strassenreinigungShare + waterShare; // 12.5 + 75 + 25 + 15 = 127.5

    const mockReadings: Wasserzaehler[] = [{id: 'wz_t4', user_id:'usr', mieter_id: tenant.id, nebenkosten_id: nebenkostenItem2024Leap.id, verbrauch: individualWaterConsumption, zaehlerstand: 30, ablese_datum: '2024-03-31'}];

    await assertTenantCosts(tenant, nebenkostenItem2024Leap, [], mockReadings, totalCost, grundsteuerShare, versicherungShare, strassenreinigungShare, waterShare);
  });

  it('should result in zero costs for zero occupancy (2023, 30/360)', async () => {
    const tenant = tenant5_ZeroOccupancy2023; // einzug: 2024-01-01 for year 2023
    const occupancy = calculateOccupancy(tenant.einzug, tenant.auszug, 2023);
    expect(occupancy.percentage).toBe(0);
    const factor = occupancy.percentage / 100; // 0

    const grundsteuerShare = pricePerQmGrundsteuer * tenant.Wohnungen!.groesse * factor; // 0
    const versicherungShare = versicherungTotal * factor; // 0
    const strassenreinigungShare = strassenreinigungTotal * factor; // 0

    // Water consumption should also be 0 if not occupied, or no reading found for the period
    const individualWaterConsumption = 0;
    const waterShare = individualWaterConsumption * pricePerCubicMeterWater; // 0 (NOT prorated, but consumption is 0)

    const totalCost = grundsteuerShare + versicherungShare + strassenreinigungShare + waterShare; // 0

    // No specific reading needed if consumption is 0
    const mockReadings: Wasserzaehler[] = [{id: 'wz_t5', user_id:'usr', mieter_id: tenant.id, nebenkosten_id: commonNebenkostenItem2023.id, verbrauch: 0, zaehlerstand: 0, ablese_datum: '2023-12-31'}];


    await assertTenantCosts(tenant, commonNebenkostenItem2023, [], mockReadings, totalCost, grundsteuerShare, versicherungShare, strassenreinigungShare, waterShare);
  });

  it('should calculate "nach Rechnung" costs with proration (2023, 30/360)', async () => {
    const tenant = tenant6_NachRechnung2023; // Half year: 2023-01-01 to 2023-06-30
    const occupancy = calculateOccupancy(tenant.einzug, tenant.auszug, 2023); // 50%
    const factor = occupancy.percentage / 100; // 0.5

    // Grundsteuer (pro qm) from nebenkostenItem_NachRechnung2023
    const nkItemNachRechnung = nebenkostenItem_NachRechnung2023;
    const pricePerQmGrundsteuerNR = nkItemNachRechnung.betrag![1] / nkItemNachRechnung.gesamtFlaeche!; // 200 / 300
    const grundsteuerShareNR = pricePerQmGrundsteuerNR * tenant.Wohnungen!.groesse * factor; // (200/300) * 75 * 0.5 = 25

    // Kabel TV (nach Rechnung)
    const kabelTVFullYearCost = rechnungen_NachRechnung_Tenant6[0].betrag!; // 120 for full year
    const kabelTVProratedShare = kabelTVFullYearCost * factor; // 120 * 0.5 = 60

    // Water cost for this specific Nebenkosten item (nk_nach_rechnung_2023)
    // It inherits wasskosten: 300, wasserverbrauch: 60 from commonNebenkostenItem2023. So price is 5.
    const individualWaterConsumption = 4; // Assume 4 m³ for this tenant for this period
    const waterShareNR = individualWaterConsumption * (nkItemNachRechnung.wasserkosten! / nkItemNachRechnung.wasserbrauch!); // 4 * 5 = 20 (NOT prorated)

    // Total cost = prorated Grundsteuer + prorated KabelTV + non-prorated Water
    const totalCost = grundsteuerShareNR + kabelTVProratedShare + waterShareNR; // 25 + 60 + 20 = 105

    const mockReadings: Wasserzaehler[] = [{id: 'wz_t6', user_id:'usr', mieter_id: tenant.id, nebenkosten_id: nkItemNachRechnung.id, verbrauch: individualWaterConsumption, zaehlerstand: 0, ablese_datum: '2023-06-30'}];

    // For assertTenantCosts, we need to map these to the general cost item names if they are fixed in the helper
    // commonNebenkostenItem2023 had: ['Grundsteuer', 'Versicherung', 'Straßenreinigung']
    // nebenkostenItem_NachRechnung2023 has: ['Kabel TV', 'Grundsteuer']
    // The assertTenantCosts helper looks for fixed names. This test will need a more specific assertion or a flexible helper.
    // For now, let's assume we adapt the call to assertTenantCosts or the helper for this specific structure.
    // The helper expects Grundsteuer, Versicherung, Straßenreinigung. We only have Grundsteuer and KabelTV.
    // So, pass 0 for Versicherung and Straßenreinigung.
    await assertTenantCosts(
      tenant,
      nkItemNachRechnung,
      rechnungen_NachRechnung_Tenant6,
      mockReadings,
      totalCost,
      grundsteuerShareNR, // Grundsteuer
      0,                  // Versicherung (not in this NK item)
      0,                  // Straßenreinigung (not in this NK item)
      waterShareNR,
      kabelTVProratedShare // Kabel TV
    );
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

// --- Mock Data for Proration Tests ---
const mockHaus: Haus = {
  id: 'haus_prorat',
  name: 'Proration Test Haus',
  ort: 'Testort',
  strasse: 'Teststrasse 1',
  user_id: 'user_prorat_test',
};

const tenantWohnung: Wohnung = {
  id: 'w_prorat_1',
  name: 'WE 01',
  groesse: 75, // 75 qm
  haus_id: mockHaus.id,
  // other Wohnung fields if necessary, ensure consistency with Mieter.Wohnungen type
  // For AbrechnungModal, only 'name' and 'groesse' are directly used from Mieter.Wohnungen.
  // Adding fields to satisfy the Wohnung type, assuming default values or null where appropriate
  miete: 500, // Example value
  user_id: 'user_prorat_test', // Example value
};

const commonNebenkostenItem2023: Nebenkosten = {
  id: 'nk_common_2023',
  jahr: '2023',
  nebenkostenart: ['Grundsteuer', 'Versicherung', 'Straßenreinigung'],
  betrag: [200, 300, 100], // Total for building for these items
  berechnungsart: ['pro qm', 'pro einheit', 'fix'],
  wasserkosten: 300,      // Total water cost for building
  wasserverbrauch: 60,    // Total water consumption for building (e.g., 60 m³) -> 5 €/m³
  gesamtFlaeche: 300,     // Total area of the building in qm
  Haeuser: { name: mockHaus.name }, // Simplified Haus object
  haeuser_id: mockHaus.id,
  user_id: 'test_user_id', // Added user_id
  // Added other required Nebenkosten fields with example/default values
  Rechnungen: null,
  anzahlMieter: 0,
  anzahlWohnungen: 0,
};

const nebenkostenItem2024Leap: Nebenkosten = {
  ...commonNebenkostenItem2023,
  id: 'nk_common_2024_leap',
  jahr: '2024', // Leap year
};

const tenant1_FullYear2023: Mieter = {
  id: 't_prorat_1', name: 'Tenant Full Year', einzug: '2023-01-01', auszug: '2023-12-31',
  Wohnungen: tenantWohnung, wohnung_id: tenantWohnung.id, user_id: 'user_prorat_test',
  // Added other required Mieter fields
  email: 'full@year.com', telefonnummer: '123', notiz: '', nebenkosten: [], nebenkosten_datum: [],
};
const tenant2_HalfYearMoveOut2023: Mieter = {
  id: 't_prorat_2', name: 'Tenant Half Year MoveOut', einzug: '2023-01-01', auszug: '2023-06-30',
  Wohnungen: tenantWohnung, wohnung_id: tenantWohnung.id, user_id: 'user_prorat_test',
  email: 'half@year.com', telefonnummer: '123', notiz: '', nebenkosten: [], nebenkosten_datum: [],
};
const tenant4_LeapYearPartial2024: Mieter = { // For 2024 leap year, moved in 2023, moves out mid 2024
  id: 't_prorat_4', name: 'Tenant Leap Year Partial', einzug: '2023-10-01', auszug: '2024-03-31', // Occupied Jan, Feb, Mar 2024 (3 months = 90 days)
  Wohnungen: tenantWohnung, wohnung_id: tenantWohnung.id, user_id: 'user_prorat_test',
  email: 'leap@year.com', telefonnummer: '123', notiz: '', nebenkosten: [], nebenkosten_datum: [],
};
const tenant5_ZeroOccupancy2023: Mieter = { // Moved in after year end
  id: 't_prorat_5', name: 'Tenant Zero Occupancy', einzug: '2024-01-01', auszug: '2024-12-31',
  Wohnungen: tenantWohnung, wohnung_id: tenantWohnung.id, user_id: 'user_prorat_test',
  email: 'zero@year.com', telefonnummer: '123', notiz: '', nebenkosten: [], nebenkosten_datum: [],
};

// For "nach Rechnung" test
const tenant6_NachRechnung2023: Mieter = {
  id: 't_nach_rechnung_6', name: 'Tenant Nach Rechnung', einzug: '2023-01-01', auszug: '2023-06-30', // Half year
  Wohnungen: tenantWohnung, wohnung_id: tenantWohnung.id, user_id: 'user_prorat_test',
  email: 'rechnung@year.com', telefonnummer: '123', notiz: '', nebenkosten: [], nebenkosten_datum: [],
};
const nebenkostenItem_NachRechnung2023: Nebenkosten = {
  ...commonNebenkostenItem2023,
  id: 'nk_nach_rechnung_2023',
  nebenkostenart: ['Kabel TV', 'Grundsteuer'], // Grundsteuer pro-qm, Kabel TV nach Rechnung
  betrag: [0, 200], // Kabel TV total is 0 at NK-Item, actual cost from Rechnung. Grundsteuer 200 for building.
  berechnungsart: ['nach Rechnung', 'pro qm'],
};
const rechnungen_NachRechnung_Tenant6: Rechnung[] = [
  { id: 'r_kabel_1', mieter_id: tenant6_NachRechnung2023.id, nebenkosten_id: nebenkostenItem_NachRechnung2023.id, name: 'Kabel TV', betrag: 120, user_id: 'test_user_id' } // Full year cost for tenant is 120
];
// --- End Mock Data for Proration Tests ---

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
  // This baseTotalTenantCost will now be calculated dynamically per test based on occupancy.
  // const baseTotalTenantCost = 320; // REPLACED

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
      const occupancyS1 = calculateOccupancy(tenantS1.einzug, tenantS1.auszug, 2023);
      const proratedOtherCostsS1 = 280 * (occupancyS1.percentage / 100);
      const currentExpectedTotalS1 = proratedOtherCostsS1 + 40; // 40 for water
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, currentExpectedTotalS1 - expectedVorauszahlungen, 'Guthaben');
    });

    it('Scenario 2: Prepayment Change Mid-Year', async () => {
      const tenantS2: Mieter = {
        id: 'tS2', name: 'Tenant S2 MidYearChange', einzug: '2023-01-01', auszug: null, Wohnungen: mockWohnungAlice,
        nebenkosten: [100, 120], nebenkosten_datum: ['2023-01-01', '2023-07-01'],
      };
      await renderAndSelectTenant(tenantS2);
      const expectedVorauszahlungen = (100 * 6) + (120 * 6); // 600 + 720 = 1320
      const occupancyS2 = calculateOccupancy(tenantS2.einzug, tenantS2.auszug, 2023);
      const proratedOtherCostsS2 = 280 * (occupancyS2.percentage / 100);
      const currentExpectedTotalS2 = proratedOtherCostsS2 + 40;
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, currentExpectedTotalS2 - expectedVorauszahlungen, 'Guthaben');
    });

    it('Scenario 3: Tenant Moves In Mid-Year', async () => {
      const tenantS3: Mieter = {
        id: 'tS3', name: 'Tenant S3 MoveInMidYear', einzug: '2023-04-01', auszug: null, Wohnungen: mockWohnungAlice,
        nebenkosten: [100], nebenkosten_datum: ['2023-01-01'], // Rate active from before move-in
      };
      await renderAndSelectTenant(tenantS3);
      const expectedVorauszahlungen = 100 * 9; // April to Dec = 9 months = 900
      const occupancyS3 = calculateOccupancy(tenantS3.einzug, tenantS3.auszug, 2023); // Occupancy: Apr 1 to Dec 31 = 9 months * 30 = 270 days. 270/360 = 75%
      const proratedOtherCostsS3 = 280 * (occupancyS3.percentage / 100); // 280 * 0.75 = 210
      const currentExpectedTotalS3 = proratedOtherCostsS3 + 40; // 210 + 40 = 250
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, currentExpectedTotalS3 - expectedVorauszahlungen, 'Guthaben'); // 250 - 900 = -650
    });

    it('Scenario 4: Tenant Moves Out Mid-Year', async () => {
      const tenantS4: Mieter = {
        id: 'tS4', name: 'Tenant S4 MoveOutMidYear', einzug: '2023-01-01', auszug: '2023-08-31', Wohnungen: mockWohnungAlice,
        nebenkosten: [100], nebenkosten_datum: ['2023-01-01'],
      };
      await renderAndSelectTenant(tenantS4);
      const expectedVorauszahlungen = 100 * 8; // Jan to Aug = 8 months = 800
      const occupancyS4 = calculateOccupancy(tenantS4.einzug, tenantS4.auszug, 2023); // Occupancy: Jan 1 to Aug 30 (as 31 becomes 30) = 8 * 30 = 240 days. 240/360 = 66.66%
      const proratedOtherCostsS4 = 280 * (occupancyS4.percentage / 100); // 280 * (240/360) = 186.666...
      const currentExpectedTotalS4 = proratedOtherCostsS4 + 40; // 186.666... + 40 = 226.666...
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, currentExpectedTotalS4 - expectedVorauszahlungen, 'Guthaben'); // 226.666 - 800 = -573.333...
    });

    it('Scenario 5: Tenant Moves In and Out Within Abrechnungsjahr', async () => {
      const tenantS5: Mieter = {
        id: 'tS5', name: 'Tenant S5 InOutYear', einzug: '2023-02-01', auszug: '2023-10-31', Wohnungen: mockWohnungAlice,
        nebenkosten: [100], nebenkosten_datum: ['2023-01-01'],
      };
      await renderAndSelectTenant(tenantS5);
      const expectedVorauszahlungen = 100 * 9; // Feb to Oct = 9 months = 900
      const occupancyS5 = calculateOccupancy(tenantS5.einzug, tenantS5.auszug, 2023); // Occupancy: Feb 1 to Oct 30 = 9 * 30 = 270 days. 270/360 = 75%
      const proratedOtherCostsS5 = 280 * (occupancyS5.percentage / 100); // 280 * 0.75 = 210
      const currentExpectedTotalS5 = proratedOtherCostsS5 + 40; // 210 + 40 = 250
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, currentExpectedTotalS5 - expectedVorauszahlungen, 'Guthaben'); // 250 - 900 = -650
    });

    it('Scenario 6: Prepayment Starts After Abrechnungsjahr Begins', async () => {
      const tenantS6: Mieter = {
        id: 'tS6', name: 'Tenant S6 LateStartPrepay', einzug: '2023-01-01', auszug: null, Wohnungen: mockWohnungAlice,
        nebenkosten: [100], nebenkosten_datum: ['2023-03-01'],
      };
      await renderAndSelectTenant(tenantS6);
      const expectedVorauszahlungen = 100 * 10; // Mar to Dec = 10 months = 1000
      const occupancyS6 = calculateOccupancy(tenantS6.einzug, tenantS6.auszug, 2023); // Full year occupancy
      const proratedOtherCostsS6 = 280 * (occupancyS6.percentage / 100); // 280 * 1 = 280
      const currentExpectedTotalS6 = proratedOtherCostsS6 + 40; // 280 + 40 = 320
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, currentExpectedTotalS6 - expectedVorauszahlungen, 'Guthaben'); // 320 - 1000 = -680
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
      const occupancyS7 = calculateOccupancy(tenantS7.einzug, tenantS7.auszug, 2023); // Mar 1 to Jun 30 = 4 * 30 = 120 days. 120/360 = 33.33%
      const proratedOtherCostsS7 = 280 * (occupancyS7.percentage / 100); // 280 * (120/360) = 93.333...
      const currentExpectedTotalS7 = proratedOtherCostsS7 + 40; // 93.333... + 40 = 133.333...
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, currentExpectedTotalS7 - expectedVorauszahlungen, 'Nachzahlung'); // 133.333 - 220 = -86.666... (Guthaben)
    });

    it('Scenario 8: No nebenkosten or nebenkosten_datum', async () => {
      const tenantS8: Mieter = {
        id: 'tS8', name: 'Tenant S8 NoPrepayData', einzug: '2023-01-01', auszug: null, Wohnungen: mockWohnungAlice,
        nebenkosten: [], nebenkosten_datum: [],
      };
      await renderAndSelectTenant(tenantS8);
      const expectedVorauszahlungen = 0;
      const occupancyS8 = calculateOccupancy(tenantS8.einzug, tenantS8.auszug, 2023); // Full year
      const proratedOtherCostsS8 = 280 * (occupancyS8.percentage / 100); // 280 * 1 = 280
      const currentExpectedTotalS8 = proratedOtherCostsS8 + 40; // 280 + 40 = 320
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, currentExpectedTotalS8 - expectedVorauszahlungen, 'Nachzahlung'); // 320 - 0 = 320
    });

    it('Scenario 9: Invalid dates in nebenkosten_datum or mismatch length', async () => {
      const tenantS9A: Mieter = { // Invalid date string
        id: 'tS9A', name: 'Tenant S9A InvalidDate', einzug: '2023-01-01', auszug: null, Wohnungen: mockWohnungAlice,
        nebenkosten: [100], nebenkosten_datum: ['invalid-date-string'],
      };
      await renderAndSelectTenant(tenantS9A);
      const occupancyS9A = calculateOccupancy(tenantS9A.einzug, tenantS9A.auszug, 2023); // Full year
      const proratedOtherCostsS9A = 280 * (occupancyS9A.percentage / 100);
      const currentExpectedTotalS9A = proratedOtherCostsS9A + 40;
      assertPrepaymentsAndSettlement(0, currentExpectedTotalS9A - 0, 'Nachzahlung');

      const tenantS9B: Mieter = { // Mismatched length
        id: 'tS9B', name: 'Tenant S9B Mismatch', einzug: '2023-01-01', auszug: null, Wohnungen: mockWohnungAlice,
        nebenkosten: [100, 120], nebenkosten_datum: ['2023-01-01'],
      };
      // Rendering S9B in a new block
       renderModal({
        tenants: [tenantS9B],
        nebenkostenItem: mockNebenkostenItem2023,
        wasserzaehlerReadings: mockWasserzaehlerReadingsNk2023,
      });
      fireEvent.click(screen.getByRole('button', { name: /Mieter auswählen/i }));
      fireEvent.click(screen.getByText(tenantS9B.name));
      await waitFor(() => {
        expect(screen.getByText('Vorauszahlungen')).toBeInTheDocument();
      });
      const occupancyS9B = calculateOccupancy(tenantS9B.einzug, tenantS9B.auszug, 2023); // Full year
      const proratedOtherCostsS9B = 280 * (occupancyS9B.percentage / 100);
      const currentExpectedTotalS9B = proratedOtherCostsS9B + 40;
      assertPrepaymentsAndSettlement(0, currentExpectedTotalS9B - 0, 'Nachzahlung');
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
      const expectedVorauszahlungen = 100 * 10; // 1000
      const occupancyS10 = calculateOccupancy(tenantS10.einzug, tenantS10.auszug, 2023); // Full year
      const proratedOtherCostsS10 = 280 * (occupancyS10.percentage / 100); // 280
      const currentExpectedTotalS10 = proratedOtherCostsS10 + 40; // 320
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, currentExpectedTotalS10 - expectedVorauszahlungen, 'Guthaben'); // 320 - 1000 = -680
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
      const expectedVorauszahlungen = 0;
      const occupancyS11 = calculateOccupancy(tenantS11.einzug, tenantS11.auszug, 2023); // Jan 1 to Mar 30 = 3 * 30 = 90 days. 90/360 = 25%
      const proratedOtherCostsS11 = 280 * (occupancyS11.percentage / 100); // 280 * 0.25 = 70
      const currentExpectedTotalS11 = proratedOtherCostsS11 + 40; // 70 + 40 = 110
      assertPrepaymentsAndSettlement(expectedVorauszahlungen, currentExpectedTotalS11 - expectedVorauszahlungen, 'Nachzahlung'); // 110 - 0 = 110
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
        if(triggerCard) {
          fireEvent.mouseEnter(triggerCard); // Or focus, depending on trigger mechanism

          // Wait for HoverCardContent to appear
          // const hoverCardContent = await screen.findByRole('tooltip'); // HoverCardContent has role="tooltip"
          // expect(hoverCardContent).toBeInTheDocument();

          // Assert calculation method
          // expect(within(hoverCardContent).getByText('Berechnungsmethode:')).toBeInTheDocument();
        }
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
