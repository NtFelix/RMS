import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AbrechnungModal } from './abrechnung-modal'; // Adjust path as necessary
import { Nebenkosten, Mieter, Wohnung, Rechnung, Haus } from '@/lib/data-fetching'; // Assuming these types are exported

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('jspdf', () => {
    const mockJspdfInstance = {
        internal: {
            pageSize: {
                height: 297,
                getWidth: () => 210
            }
        },
        setFontSize: jest.fn(),
        text: jest.fn(),
        setFont: jest.fn(),
        addPage: jest.fn(),
        save: jest.fn(),
        lastAutoTable: { finalY: 0 },
    };
    const mock = jest.fn(() => mockJspdfInstance);
    (mock as any).API = { autoTable: jest.fn() };
    return mock;
});


jest.mock('jspdf-autotable', () => ({
  applyPlugin: jest.fn(),
  default: jest.fn(),
}));


// Re-declare calculateOccupancy with 30/360 Eurobond convention
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


// Helper for currency formatting (must match component's implementation)
const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "-";
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

describe('calculateOccupancy (30/360 Convention)', () => {
  it('calculates full year', () => {
    const { percentage, daysInYear, daysOccupied } = calculateOccupancy("2023-01-01", "2023-12-31", 2023);
    expect(daysOccupied).toBe(360); // (12-1)*30 + (30-1)+1 = 330 + 30 = 360 (Incorrect manual calc, (11-0)*30 + (30-1)+1 = 330+30 = 360)
                                      // (2023-2023)*360 + (11-0)*30 + (30-1)+1 = 0 + 330 + 29 + 1 = 360
    expect(daysInYear).toBe(360);
    expect(percentage).toBeCloseTo(100);
  });

  it('calculates partial year, start (Jan 1 to Jun 30)', () => {
    // Y1=2023, M1=0, D1=1 -> D1=1
    // Y2=2023, M2=5, D2=30 -> D2=30 (June 30th)
    // Days = (0)*360 + (5-0)*30 + (30-1) + 1 = 150 + 29 + 1 = 180 days.
    const { percentage, daysInYear, daysOccupied } = calculateOccupancy("2023-01-01", "2023-06-30", 2023);
    expect(daysOccupied).toBe(180);
    expect(daysInYear).toBe(360);
    expect(percentage).toBeCloseTo(50);
  });

  it('calculates partial year, mid (Mar 1 to Sep 30)', () => {
    // Y1=2023, M1=2, D1=1 (Mar 1st)
    // Y2=2023, M2=8, D2=30 (Sep 30th)
    // Days = (0)*360 + (8-2)*30 + (30-1) + 1 = 180 + 29 + 1 = 210 days.
    const { percentage, daysInYear, daysOccupied } = calculateOccupancy("2023-03-01", "2023-09-30", 2023);
    expect(daysOccupied).toBe(210);
    expect(daysInYear).toBe(360);
    expect(percentage).toBeCloseTo((210 / 360) * 100);
  });

  it('calculates partial year, end (Jul 1 to Dec 31)', () => {
    // Y1=2023, M1=6, D1=1 (Jul 1st)
    // Y2=2023, M2=11, D2=31 -> D2=30 (Dec 31st)
    // Days = (0)*360 + (11-6)*30 + (30-1) + 1 = 150 + 29 + 1 = 180 days.
    const { percentage, daysInYear, daysOccupied } = calculateOccupancy("2023-07-01", "2023-12-31", 2023);
    expect(daysOccupied).toBe(180);
    expect(daysInYear).toBe(360);
    expect(percentage).toBeCloseTo(50);
  });

  it('returns zero occupancy if no einzug date', () => {
    const { percentage, daysOccupied, daysInYear } = calculateOccupancy(null, "2023-12-31", 2023);
    expect(percentage).toBe(0);
    expect(daysOccupied).toBe(0);
    expect(daysInYear).toBe(360);
  });

  it('returns zero occupancy if einzug is after auszug', () => {
    const { percentage, daysOccupied } = calculateOccupancy("2023-12-01", "2023-11-01", 2023);
    expect(percentage).toBe(0);
    expect(daysOccupied).toBe(0);
  });

  it('returns zero occupancy if einzug is in next year', () => {
    const { percentage, daysOccupied } = calculateOccupancy("2024-01-01", "2024-12-31", 2023);
    expect(percentage).toBe(0);
    expect(daysOccupied).toBe(0);
  });

  it('returns zero occupancy if auszug is in previous year', () => {
    const { percentage, daysOccupied } = calculateOccupancy("2022-01-01", "2022-12-31", 2023);
    expect(percentage).toBe(0);
    expect(daysOccupied).toBe(0);
  });

  it('calculates 100% (360 days) if move-in is before and move-out is after billing year', () => {
    const { percentage, daysOccupied, daysInYear } = calculateOccupancy("2022-01-01", "2024-12-31", 2023);
    expect(daysOccupied).toBe(360);
    expect(daysInYear).toBe(360);
    expect(percentage).toBeCloseTo(100);
  });

  it('calculates correctly if move-in is during billing year and move-out is after', () => {
    // Effective: 2023-07-01 to 2023-12-31 (180 days by 30/360 logic)
    const { percentage, daysOccupied, daysInYear } = calculateOccupancy("2023-07-01", "2024-06-30", 2023);
    expect(daysOccupied).toBe(180);
    expect(daysInYear).toBe(360);
    expect(percentage).toBeCloseTo(50);
  });

  it('calculates correctly if move-in is before billing year and move-out is during', () => {
    // Effective: 2023-01-01 to 2023-06-30 (180 days by 30/360 logic)
    const { percentage, daysOccupied, daysInYear } = calculateOccupancy("2022-07-01", "2023-06-30", 2023);
    expect(daysOccupied).toBe(180);
    expect(daysInYear).toBe(360);
    expect(percentage).toBeCloseTo(50);
  });

  it('calculates correctly for a leap year date range (Jan 1 to Mar 31, 2024)', () => {
    // Y1=2024, M1=0, D1=1
    // Y2=2024, M2=2, D2=31 -> D2=30
    // Days = (0)*360 + (2-0)*30 + (30-1) + 1 = 60 + 29 + 1 = 90 days.
    const { percentage, daysInYear, daysOccupied } = calculateOccupancy("2024-01-01", "2024-03-31", 2024);
    expect(daysOccupied).toBe(90);
    expect(daysInYear).toBe(360);
    expect(percentage).toBeCloseTo(25);
  });
});

// Mock Data (Wohnung size 50qm, Haus total area 100qm)
const mockHaus: Haus = { id: "haus1", name: "Test Haus", adresse: "Teststr. 1" };

const commonNebenkostenItem2023: Nebenkosten = {
  id: "nk1_2023",
  jahr: "2023",
  nebenkostenart: ["Grundsteuer", "Versicherung"],
  betrag: [1200, 600], // Total for house: Grundsteuer 12€/qm, Versicherung 6€/qm
  berechnungsart: ["pro qm", "pro qm"],
  beschreibung: ["Steuer", "Police"],
  faelligkeit: [], bezahlt_am: [], status: "offen",
  wasserkosten: 300, // Total for house: 3€/qm
  gesamtFlaeche: 100,
  haus_id: "haus1", Haeuser: mockHaus, Rechnungen: [],
};

const nebenkostenItem2024Leap: Nebenkosten = {
  ...commonNebenkostenItem2023,
  id: "nk1_2024",
  jahr: "2024",
};

const tenantWohnung: Wohnung = {
  id: "whg1", name: "Wohnung 1", groesse: 50, haus_id: "haus1",
  Haeuser: mockHaus, Mieter: [], wasserzaehler_ids: [], wasserzaehler_verbrauch: {},
};

// Tenant costs for 50qm: Grundsteuer=600, Versicherung=300, Wasser=150. Total = 1050 (unprorated)

const tenant1_FullYear2023: Mieter = {
  id: "m1", name: "Tenant FullYear", einzug: "2023-01-01", auszug: "2023-12-31",
  wohnung_id: "whg1", Wohnungen: tenantWohnung, nebenkosten: [], nebenkosten_datum: [],
};

// 30/360: 180 days, 50%
const tenant2_HalfYearMoveOut2023: Mieter = {
  id: "m2", name: "Tenant HalfYear MoveOut", einzug: "2023-01-01", auszug: "2023-06-30",
  wohnung_id: "whg1", Wohnungen: tenantWohnung, nebenkosten: [], nebenkosten_datum: [],
};

// 30/360: 90 days, 25%
const tenant4_LeapYearPartial2024: Mieter = {
  id: "m4", name: "Tenant LeapYear Partial", einzug: "2024-01-01", auszug: "2024-03-31",
  wohnung_id: "whg1", Wohnungen: tenantWohnung, nebenkosten: [], nebenkosten_datum: [],
};

const tenant5_ZeroOccupancy2023: Mieter = {
  id: "m5", name: "Tenant ZeroOccupancy", einzug: "2024-01-01", auszug: null,
  wohnung_id: "whg1", Wohnungen: tenantWohnung, nebenkosten: [], nebenkosten_datum: [],
};

// 30/360: 180 days, 50%
const tenant6_NachRechnung2023: Mieter = {
    id: "m6", name: "Tenant NachRechnung", einzug: "2023-07-01", auszug: "2023-12-31",
    wohnung_id: "whg1", Wohnungen: tenantWohnung, nebenkosten: [], nebenkosten_datum: [],
};

const nebenkostenItem_NachRechnung2023: Nebenkosten = {
    ...commonNebenkostenItem2023,
    id: "nk_nach_rechnung",
    nebenkostenart: ["Heizungswartung"], betrag: [200], berechnungsart: ["nach rechnung"],
};
const rechnungen_NachRechnung_Tenant6: Rechnung[] = [{
    id: "r1", name: "Heizungswartung", betrag: 200, datum: "2023-10-10",
    beschreibung: "Wartung XYZ", kategorie: "Instandhaltung",
    nebenkosten_id: "nk_nach_rechnung", mieter_id: "m6", haus_id: "haus1", wohnung_id: "whg1", rechnungsnummer: "R123"
}];


describe('AbrechnungModal Cost Calculation & Proration (30/360 Convention)', () => {
  const defaultProps = { isOpen: true, onClose: jest.fn(), rechnungen: [], };

  async function assertTenantCosts(
    tenantName: string, expectedDays: number, totalDaysInYear: number, expectedPercentage: number,
    costs: Array<{ name: string, expectedShare: number }>,
    expectedWaterShare: number, expectedTotalCost: number
  ) {
    await waitFor(() => {
        const tenantHeader = screen.queryByText((content, element) => element?.tagName.toLowerCase() === 'span' && element.textContent === tenantName);
        expect(tenantHeader).toBeInTheDocument();
    }, { timeout: 3000 });

    const tenantSection = screen.getByText((content, element) => element?.tagName.toLowerCase() === 'span' && element.textContent === tenantName)
                                .closest('h3')?.parentElement;
    expect(tenantSection).toBeInTheDocument();
    if (!tenantSection) throw new Error(`Tenant section for ${tenantName} not found`);

    expect(within(tenantSection).getByText(`Anwesenheit im Abrechnungsjahr (${expectedDays} / ${totalDaysInYear} Tage)`)).toBeInTheDocument();
    expect(within(tenantSection).getByText(`${expectedPercentage.toFixed(2)}%`)).toBeInTheDocument();

    await waitFor(() => {
        const progressBar = within(tenantSection).getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-valuenow', String(expectedPercentage));
    });

    costs.forEach(cost => {
      const itemRow = within(tenantSection).getByText(cost.name).closest('tr');
      expect(itemRow).toBeInTheDocument();
      if (itemRow) {
        const cells = within(itemRow).getAllByRole('cell');
        const shareCell = cells[3];
        expect(shareCell.textContent).toBe(formatCurrency(cost.expectedShare));
      }
    });

    const waterCardTitle = within(tenantSection).getByText('Wasserkosten');
    const waterCard = waterCardTitle.closest('.bg-card, [class*="card"]');
    expect(waterCard).toBeInTheDocument();

    if (waterCard) {
        const valueElement = within(waterCard).getByText((content, element) =>
            (element?.textContent || "") === formatCurrency(expectedWaterShare) &&
            element.classList.contains('text-2xl')
        );
        expect(valueElement).toBeInTheDocument();
    }

    const totalRow = within(tenantSection).getByText('Gesamtkosten Mieter').closest('tr');
    expect(totalRow).toBeInTheDocument();
    if (totalRow) {
        const cells = within(totalRow).getAllByRole('cell');
        const totalValueCell = cells[cells.length - 1];
        expect(totalValueCell.textContent).toBe(formatCurrency(expectedTotalCost));
    }
  }

  it('should calculate costs correctly for full year occupancy (2023, 30/360)', async () => {
    render(<AbrechnungModal {...defaultProps} nebenkostenItem={commonNebenkostenItem2023} tenants={[tenant1_FullYear2023]} />);
    await userEvent.click(screen.getByRole('button', { name: /Alle relevanten Mieter laden/i }));

    const percentage = 100.0; // 360/360
    const factor = percentage / 100;
    const grundsteuerShare = 600 * factor;
    const versicherungShare = 300 * factor;
    const waterShare = 150 * factor;
    const totalCost = grundsteuerShare + versicherungShare + waterShare;

    await assertTenantCosts( tenant1_FullYear2023.name, 360, 360, percentage,
      [{ name: 'Grundsteuer', expectedShare: grundsteuerShare }, { name: 'Versicherung', expectedShare: versicherungShare }],
      waterShare, totalCost
    );
  });

  it('should calculate costs correctly for half year move-out (2023, 30/360)', async () => {
    render(<AbrechnungModal {...defaultProps} nebenkostenItem={commonNebenkostenItem2023} tenants={[tenant2_HalfYearMoveOut2023]} />);
    await userEvent.click(screen.getByRole('button', { name: /Alle relevanten Mieter laden/i }));

    const daysOccupied = 180; // Jan 1 to Jun 30 -> 30/360 convention
    const percentage = 50.0; // 180/360
    const factor = percentage / 100;

    const grundsteuerShare = 600 * factor;
    const versicherungShare = 300 * factor;
    const waterShare = 150 * factor;
    const totalCost = grundsteuerShare + versicherungShare + waterShare;

    await assertTenantCosts( tenant2_HalfYearMoveOut2023.name, daysOccupied, 360, percentage,
      [{ name: 'Grundsteuer', expectedShare: grundsteuerShare }, { name: 'Versicherung', expectedShare: versicherungShare }],
      waterShare, totalCost
    );
  });

  it('should calculate costs correctly for partial year in leap year (2024, 30/360)', async () => {
    render(<AbrechnungModal {...defaultProps} nebenkostenItem={nebenkostenItem2024Leap} tenants={[tenant4_LeapYearPartial2024]} />);
    await userEvent.click(screen.getByRole('button', { name: /Alle relevanten Mieter laden/i }));

    const daysOccupied = 90; // Jan 1 to Mar 31 -> 30/360 convention
    const percentage = 25.0; // 90/360
    const factor = percentage / 100;

    const grundsteuerShare = 600 * factor;
    const versicherungShare = 300 * factor;
    const waterShare = 150 * factor;
    const totalCost = grundsteuerShare + versicherungShare + waterShare;

    await assertTenantCosts( tenant4_LeapYearPartial2024.name, daysOccupied, 360, percentage,
      [{ name: 'Grundsteuer', expectedShare: grundsteuerShare }, { name: 'Versicherung', expectedShare: versicherungShare }],
      waterShare, totalCost
    );
  });

  it('should result in zero costs for zero occupancy (2023, 30/360)', async () => {
    render(<AbrechnungModal {...defaultProps} nebenkostenItem={commonNebenkostenItem2023} tenants={[tenant5_ZeroOccupancy2023]} />);
    await userEvent.click(screen.getByRole('button', { name: /Alle relevanten Mieter laden/i }));
    await assertTenantCosts( tenant5_ZeroOccupancy2023.name, 0, 360, 0.0,
      [{ name: 'Grundsteuer', expectedShare: 0 }, { name: 'Versicherung', expectedShare: 0 }], 0, 0
    );
  });

  it('should calculate "nach Rechnung" costs with proration (2023, 30/360)', async () => {
    render(<AbrechnungModal
             {...defaultProps}
             nebenkostenItem={nebenkostenItem_NachRechnung2023}
             tenants={[tenant6_NachRechnung2023]}
             rechnungen={rechnungen_NachRechnung_Tenant6}
           />);
    await userEvent.click(screen.getByRole('button', { name: /Alle relevanten Mieter laden/i }));

    const daysOccupied = 180; // Jul 1 to Dec 31 -> 30/360 convention
    const percentage = 50.0; // 180/360
    const factor = percentage / 100;

    const heizungswartungDirectCost = 200;
    const heizungswartungProrated = heizungswartungDirectCost * factor;

    const waterShareTotalForTenant = 150; // (300 / 100qm) * 50qm
    const waterShareProrated = waterShareTotalForTenant * factor;

    const totalCost = heizungswartungProrated + waterShareProrated;

    await assertTenantCosts( tenant6_NachRechnung2023.name, daysOccupied, 360, percentage,
      [{ name: 'Heizungswartung', expectedShare: heizungswartungProrated }],
      waterShareProrated, totalCost
    );
  });
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: any): R;
      toHaveTextContent(textContent: string | RegExp | ((text: string, element: Element | null) => boolean)): R;
    }
  }
}
import '@testing-library/jest-dom';
