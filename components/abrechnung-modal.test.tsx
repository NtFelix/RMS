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
                height: 297, // A4 height in mm
                getWidth: () => 210 // A4 width in mm
            }
        },
        setFontSize: jest.fn(),
        text: jest.fn(),
        setFont: jest.fn(),
        addPage: jest.fn(),
        save: jest.fn(),
        lastAutoTable: { finalY: 0 }, // Mock this property
    };
    const mock = jest.fn(() => mockJspdfInstance);
    (mock as any).API = { autoTable: jest.fn() }; // Mock the API property for autoTable
    return mock;
});


jest.mock('jspdf-autotable', () => ({
  applyPlugin: jest.fn(),
  default: jest.fn(), // Mock the default export if that's what's used
}));


// Re-declare calculateOccupancy for isolated testing (corrected version)
const calculateOccupancy = (einzug: string | null | undefined, auszug: string | null | undefined, abrechnungsjahr: number): { percentage: number, daysInYear: number, daysOccupied: number } => {
  if (!einzug) return { percentage: 0, daysInYear: 365, daysOccupied: 0 };

  const yearStartDate = new Date(Date.UTC(abrechnungsjahr, 0, 1));
  const yearEndDate = new Date(Date.UTC(abrechnungsjahr, 11, 31));

  let moveInDateAttempt = new Date(einzug);
  if (typeof einzug === 'string' && einzug.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = einzug.split('-').map(Number);
    moveInDateAttempt = new Date(Date.UTC(year, month - 1, day));
  } else {
      moveInDateAttempt = new Date(einzug);
  }
  const moveInDate = moveInDateAttempt;


  if (isNaN(moveInDate.getTime()) || moveInDate.getUTCFullYear() > abrechnungsjahr || (moveInDate.getUTCFullYear() === abrechnungsjahr && moveInDate > new Date(Date.UTC(abrechnungsjahr, 11, 31)))) {
    return { percentage: 0, daysInYear: new Date(abrechnungsjahr, 1, 29).getUTCDate() === 29 ? 366 : 365, daysOccupied: 0 };
  }

  const effectiveMoveIn = moveInDate < yearStartDate ? yearStartDate : moveInDate;

  let moveOutDate: Date | null = null;
  if (auszug) {
    let moveOutDateAttempt = new Date(auszug);
    if (typeof auszug === 'string' && auszug.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = auszug.split('-').map(Number);
        moveOutDateAttempt = new Date(Date.UTC(year, month - 1, day));
    } else {
        moveOutDateAttempt = new Date(auszug);
    }
    if (!isNaN(moveOutDateAttempt.getTime())) {
      moveOutDate = moveOutDateAttempt;
    }
  }

  if (moveOutDate && (moveOutDate.getUTCFullYear() < abrechnungsjahr || (moveOutDate.getUTCFullYear() === abrechnungsjahr && moveOutDate < new Date(Date.UTC(abrechnungsjahr,0,1))))) {
    return { percentage: 0, daysInYear: new Date(abrechnungsjahr, 1, 29).getUTCDate() === 29 ? 366 : 365, daysOccupied: 0 };
  }

  const effectiveMoveOut = (!moveOutDate || moveOutDate > yearEndDate) ? yearEndDate : moveOutDate;

  if (effectiveMoveIn > effectiveMoveOut) {
      return { percentage: 0, daysInYear: new Date(abrechnungsjahr, 1, 29).getUTCDate() === 29 ? 366 : 365, daysOccupied: 0 };
  }

  const oneDay = 24 * 60 * 60 * 1000;
  const normEffectiveMoveIn = Date.UTC(effectiveMoveIn.getUTCFullYear(), effectiveMoveIn.getUTCMonth(), effectiveMoveIn.getUTCDate());
  const normEffectiveMoveOut = Date.UTC(effectiveMoveOut.getUTCFullYear(), effectiveMoveOut.getUTCMonth(), effectiveMoveOut.getUTCDate());

  const daysOccupied = Math.round((normEffectiveMoveOut - normEffectiveMoveIn) / oneDay) + 1;

  const isLeap = new Date(abrechnungsjahr, 1, 29).getUTCDate() === 29;
  const daysInYear = isLeap ? 366 : 365;

  const finalDaysOccupied = Math.min(daysOccupied, daysInYear);

  const percentage = Math.min(100, Math.max(0, (finalDaysOccupied / daysInYear) * 100));

  return { percentage, daysInYear, daysOccupied: finalDaysOccupied };
};


// Helper for currency formatting (must match component's implementation)
const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "-";
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

describe('calculateOccupancy', () => {
  // ... all calculateOccupancy tests are passing ...
  it('calculates full year, non-leap', () => {
    const { percentage, daysInYear, daysOccupied } = calculateOccupancy("2023-01-01", "2023-12-31", 2023);
    expect(daysOccupied).toBe(365);
    expect(daysInYear).toBe(365);
    expect(percentage).toBeCloseTo(100);
  });

  it('calculates full year, leap', () => {
    const { percentage, daysInYear, daysOccupied } = calculateOccupancy("2024-01-01", "2024-12-31", 2024);
    expect(daysOccupied).toBe(366);
    expect(daysInYear).toBe(366);
    expect(percentage).toBeCloseTo(100);
  });

  it('calculates partial year, start (non-leap)', () => {
    const { percentage, daysInYear, daysOccupied } = calculateOccupancy("2023-01-01", "2023-06-30", 2023);
    expect(daysOccupied).toBe(181);
    expect(daysInYear).toBe(365);
    expect(percentage).toBeCloseTo((181 / 365) * 100);
  });

  it('calculates partial year, mid (non-leap)', () => {
    const { percentage, daysInYear, daysOccupied } = calculateOccupancy("2023-03-01", "2023-09-30", 2023);
    expect(daysOccupied).toBe(214);
    expect(daysInYear).toBe(365);
    expect(percentage).toBeCloseTo((214 / 365) * 100);
  });

  it('calculates partial year, end (non-leap)', () => {
    const { percentage, daysInYear, daysOccupied } = calculateOccupancy("2023-07-01", "2023-12-31", 2023);
    expect(daysOccupied).toBe(184);
    expect(daysInYear).toBe(365);
    expect(percentage).toBeCloseTo((184 / 365) * 100);
  });

  it('returns zero occupancy if no einzug date', () => {
    const { percentage, daysOccupied } = calculateOccupancy(null, "2023-12-31", 2023);
    expect(percentage).toBe(0);
    expect(daysOccupied).toBe(0);
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

  it('calculates 100% occupancy if move-in is before and move-out is after billing year (2023)', () => {
    const { percentage, daysOccupied, daysInYear } = calculateOccupancy("2022-01-01", "2024-12-31", 2023);
    expect(daysOccupied).toBe(365);
    expect(daysInYear).toBe(365);
    expect(percentage).toBeCloseTo(100);
  });

  it('calculates 100% occupancy if move-in is before and move-out is after billing year (2024 leap)', () => {
    const { percentage, daysInYear, daysOccupied } = calculateOccupancy("2023-01-01", "2025-12-31", 2024);
    expect(daysOccupied).toBe(366);
    expect(daysInYear).toBe(366);
    expect(percentage).toBeCloseTo(100);
  });


  it('calculates correctly if move-in is during billing year and move-out is after', () => {
    const { percentage, daysOccupied, daysInYear } = calculateOccupancy("2023-07-01", "2024-06-30", 2023);
    expect(daysOccupied).toBe(184);
    expect(daysInYear).toBe(365);
    expect(percentage).toBeCloseTo((184 / 365) * 100);
  });

  it('calculates correctly if move-in is before billing year and move-out is during', () => {
    const { percentage, daysOccupied, daysInYear } = calculateOccupancy("2022-07-01", "2023-06-30", 2023);
    expect(daysOccupied).toBe(181);
    expect(daysInYear).toBe(365);
    expect(percentage).toBeCloseTo((181 / 365) * 100);
  });
});

// Mock Data
const mockHaus: Haus = { id: "haus1", name: "Test Haus", adresse: "Teststr. 1" };

const commonNebenkostenItem: Nebenkosten = {
  id: "nk1",
  jahr: "2023",
  nebenkostenart: ["Grundsteuer", "Versicherung"],
  betrag: [1200, 600],
  berechnungsart: ["pro qm", "pro qm"],
  beschreibung: ["Steuer", "Police"],
  faelligkeit: ["2023-12-31", "2023-12-31"],
  bezahlt_am: ["2023-12-01", "2023-12-01"],
  status: "bezahlt",
  wasserkosten: 300,
  gesamtFlaeche: 100,
  haus_id: "haus1",
  Haeuser: mockHaus,
  Rechnungen: [],
};

const leapYearNebenkostenItem: Nebenkosten = {
  ...commonNebenkostenItem,
  id: "nk_leap",
  jahr: "2024",
};

const tenantWohnung: Wohnung = {
  id: "whg1",
  name: "Wohnung 1",
  groesse: 50,
  haus_id: "haus1",
  Haeuser: mockHaus,
  Mieter: [],
  wasserzaehler_ids: [],
  wasserzaehler_verbrauch: {},
};

const tenant1_FullYear: Mieter = {
  id: "m1", name: "Tenant FullYear", telefon: "", email: "",
  einzug: "2023-01-01", auszug: "2023-12-31",
  wohnung_id: "whg1", Wohnungen: tenantWohnung,
  nebenkosten: [], nebenkosten_datum: [],
};

const tenant2_HalfYearMoveOut: Mieter = {
  id: "m2", name: "Tenant HalfYear MoveOut", telefon: "", email: "",
  einzug: "2023-01-01", auszug: "2023-06-30",
  wohnung_id: "whg1", Wohnungen: tenantWohnung,
  nebenkosten: [], nebenkosten_datum: [],
};

const tenant3_HalfYearMoveIn: Mieter = {
  id: "m3", name: "Tenant HalfYear MoveIn", telefon: "", email: "",
  einzug: "2023-07-01", auszug: "2023-12-31",
  wohnung_id: "whg1", Wohnungen: tenantWohnung,
  nebenkosten: [], nebenkosten_datum: [],
};

const tenant4_LeapYearPartial: Mieter = {
  id: "m4", name: "Tenant LeapYear Partial", telefon: "", email: "",
  einzug: "2024-01-01", auszug: "2024-03-31",
  wohnung_id: "whg1", Wohnungen: tenantWohnung,
  nebenkosten: [], nebenkosten_datum: [],
};

const tenant5_ZeroOccupancy: Mieter = {
  id: "m5", name: "Tenant ZeroOccupancy", telefon: "", email: "",
  einzug: "2024-01-01", auszug: null,
  wohnung_id: "whg1", Wohnungen: tenantWohnung,
  nebenkosten: [], nebenkosten_datum: [],
};

const tenant6_NachRechnung: Mieter = {
    id: "m6", name: "Tenant NachRechnung", telefon: "", email: "",
    einzug: "2023-07-01", auszug: "2023-12-31",
    wohnung_id: "whg1", Wohnungen: tenantWohnung,
    nebenkosten: [], nebenkosten_datum: [],
};

const nebenkostenItem_NachRechnung: Nebenkosten = {
    id: "nk_nach_rechnung",
    jahr: "2023",
    nebenkostenart: ["Heizungswartung"],
    betrag: [200],
    berechnungsart: ["nach rechnung"],
    beschreibung: ["Wartung"],
    faelligkeit: ["2023-10-15"],
    bezahlt_am: ["2023-10-01"],
    status: "bezahlt",
    wasserkosten: 300,
    gesamtFlaeche: 100,
    haus_id: "haus1",
    Haeuser: mockHaus,
    Rechnungen: [],
};

const rechnungen_NachRechnung: Rechnung[] = [{
    id: "r1",
    name: "Heizungswartung",
    betrag: 200,
    datum: "2023-10-10",
    beschreibung: "Wartung XYZ",
    kategorie: "Instandhaltung",
    nebenkosten_id: "nk_nach_rechnung",
    mieter_id: "m6",
    haus_id: "haus1",
    wohnung_id: "whg1",
    rechnungsnummer: "R123"
}];


describe('AbrechnungModal Cost Calculation & Proration', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    rechnungen: [],
  };

  async function assertTenantCosts(
    tenantName: string,
    expectedDays: number,
    totalDaysInYear: number,
    expectedPercentage: number, // This is the float percentage
    costs: Array<{ name: string, expectedShare: number }>,
    expectedWaterShare: number,
    expectedTotalCost: number
  ) {
    await waitFor(() => {
        const tenantHeader = screen.queryByText((content, element) => {
            return element?.tagName.toLowerCase() === 'span' && element.textContent === tenantName;
        });
        expect(tenantHeader).toBeInTheDocument();
    }, { timeout: 3000 });

    const tenantSection = screen.getByText((content, element) => element?.tagName.toLowerCase() === 'span' && element.textContent === tenantName)
                                .closest('h3')
                                ?.parentElement;

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
        const shareCell = cells[3]; // "Anteil Mieter" is the 4th cell
        expect(shareCell.textContent).toBe(formatCurrency(cost.expectedShare));
      }
    });

    const waterCardTitle = within(tenantSection).getByText('Wasserkosten');
    // Assuming CardTitle is within a CardHeader (div), which is within the Card (div)
    const waterCard = waterCardTitle.closest('.bg-card, [class*="card"]'); // Try a more general selector for card
    expect(waterCard).toBeInTheDocument(); // This is the line that might fail (359)

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
        const totalValueCell = cells[cells.length - 1]; // Last cell for total
        expect(totalValueCell.textContent).toBe(formatCurrency(expectedTotalCost));
    }
  }


  it('should calculate costs correctly for full year occupancy (2023)', async () => {
    render(<AbrechnungModal {...defaultProps} nebenkostenItem={commonNebenkostenItem} tenants={[tenant1_FullYear]} />);
    await userEvent.click(screen.getByRole('button', { name: /Alle relevanten Mieter laden/i }));

    const factor = 1.0;
    const grundsteuerShare = (1200 / 100) * 50 * factor;
    const versicherungShare = (600 / 100) * 50 * factor;
    const waterShare = (300 / 100) * 50 * factor;
    const totalCost = grundsteuerShare + versicherungShare + waterShare;
    const percentage = 100.0;

    await assertTenantCosts(
      tenant1_FullYear.name,
      365, 365, percentage,
      [
        { name: 'Grundsteuer', expectedShare: grundsteuerShare },
        { name: 'Versicherung', expectedShare: versicherungShare },
      ],
      waterShare,
      totalCost
    );
  });

  it('should calculate costs correctly for half year move-out (2023)', async () => {
    render(<AbrechnungModal {...defaultProps} nebenkostenItem={commonNebenkostenItem} tenants={[tenant2_HalfYearMoveOut]} />);
    await userEvent.click(screen.getByRole('button', { name: /Alle relevanten Mieter laden/i }));

    const daysOccupied = 181;
    const daysInYear = 365;
    const factor = daysOccupied / daysInYear;
    const percentage = factor * 100;

    const grundsteuerShare = (1200 / 100) * 50 * factor;
    const versicherungShare = (600 / 100) * 50 * factor;
    const waterShare = (300 / 100) * 50 * factor;
    const totalCost = grundsteuerShare + versicherungShare + waterShare;

    await assertTenantCosts(
      tenant2_HalfYearMoveOut.name,
      daysOccupied, daysInYear, percentage,
      [
        { name: 'Grundsteuer', expectedShare: grundsteuerShare },
        { name: 'Versicherung', expectedShare: versicherungShare },
      ],
      waterShare,
      totalCost
    );
  });

  it('should calculate costs correctly for leap year, partial occupancy (2024)', async () => {
    render(<AbrechnungModal {...defaultProps} nebenkostenItem={leapYearNebenkostenItem} tenants={[tenant4_LeapYearPartial]} />);
    await userEvent.click(screen.getByRole('button', { name: /Alle relevanten Mieter laden/i }));

    const daysOccupied = 91;
    const daysInYear = 366;
    const factor = daysOccupied / daysInYear;
    const percentage = factor * 100;

    const grundsteuerShare = (1200 / 100) * 50 * factor;
    const versicherungShare = (600 / 100) * 50 * factor;
    const waterShare = (300 / 100) * 50 * factor;
    const totalCost = grundsteuerShare + versicherungShare + waterShare;

    await assertTenantCosts(
      tenant4_LeapYearPartial.name,
      daysOccupied, daysInYear, percentage,
      [
        { name: 'Grundsteuer', expectedShare: grundsteuerShare },
        { name: 'Versicherung', expectedShare: versicherungShare },
      ],
      waterShare,
      totalCost
    );
  });

  it('should result in zero costs for zero occupancy (2023)', async () => {
    render(<AbrechnungModal {...defaultProps} nebenkostenItem={commonNebenkostenItem} tenants={[tenant5_ZeroOccupancy]} />);
    await userEvent.click(screen.getByRole('button', { name: /Alle relevanten Mieter laden/i }));
    const percentage = 0.0;
    await assertTenantCosts(
      tenant5_ZeroOccupancy.name,
      0, 365, percentage,
      [
        { name: 'Grundsteuer', expectedShare: 0 },
        { name: 'Versicherung', expectedShare: 0 },
      ],
      0,
      0
    );
  });

  it('should calculate costs correctly with "nach Rechnung" and proration (2023)', async () => {
    const nkItemWithRechnung = {
        ...nebenkostenItem_NachRechnung,
        Rechnungen: rechnungen_NachRechnung,
    };

    render(<AbrechnungModal
             {...defaultProps}
             nebenkostenItem={nkItemWithRechnung}
             tenants={[tenant6_NachRechnung]}
             rechnungen={rechnungen_NachRechnung}
           />);
    await userEvent.click(screen.getByRole('button', { name: /Alle relevanten Mieter laden/i }));

    const daysOccupied = 184;
    const daysInYear = 365;
    const factor = daysOccupied / daysInYear;
    const percentage = factor * 100;

    const heizungswartungDirectCost = 200;
    const heizungswartungProrated = heizungswartungDirectCost * factor;

    const waterShareTotal = (nebenkostenItem_NachRechnung.wasserkosten / nebenkostenItem_NachRechnung.gesamtFlaeche) * tenantWohnung.groesse;
    const waterShareProrated = waterShareTotal * factor;

    const totalCost = heizungswartungProrated + waterShareProrated;

    await assertTenantCosts(
      tenant6_NachRechnung.name,
      daysOccupied, daysInYear, percentage,
      [
        { name: 'Heizungswartung', expectedShare: heizungswartungProrated },
      ],
      waterShareProrated,
      totalCost
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
