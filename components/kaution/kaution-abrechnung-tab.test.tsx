/**
 * Tests of the settlement tab (GH-6, phase 4): calculation for a settlement date (figures from the action, stale marking after
 * a data change, interest credit handover), the PDF download (exact request body, file name, fixed error texts, no double
 * click), deductions, payout and the interest hold (set, change, remove, validation, zero balance, rights, dirty report).
 * Accessibility checked with jest-axe.
 *
 * All values are synthetic. The server actions and the feature flag are mocked; the PDF request goes through a mocked `fetch`.
 */

import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { KautionAbrechnungTab } from "@/components/kaution/kaution-abrechnung-tab";
import { getKautionAbrechnungAction, setzeKautionEinbehaltAction } from "@/app/kautionen-actions";
import { toast } from "@/hooks/use-toast";
import { useKautionFlag } from "@/hooks/use-kaution-flag";
import { standardKautionFlagKonfig, type KautionFunktion } from "@/lib/kautionen-flag";
import { getTodayISOString } from "@/utils/date-calculations";
import type { KautionAbrechnung, KautionBewegung, KautionDetails, KautionRechte, KautionZinsVorschlag } from "@/types/Kaution";

expect.extend(toHaveNoViolations);

interface AxeErgebnis {
  violations: { id: string; nodes: { html: string }[] }[];
}

/**
 * Accessibility check with jest-axe. Known existing issue (as in `kaution-zinsen-tab.test.tsx`): `components/ui/date-picker.tsx`
 * sets aria-expanded/aria-haspopup on a `div` without role (aria-allowed-attr). Only this node is excluded.
 */
async function pruefeZugaenglichkeit(container: HTMLElement) {
  const ergebnis = (await axe(container)) as AxeErgebnis;
  const verstoesse = ergebnis.violations
    .map((verstoss) => ({
      ...verstoss,
      nodes: verstoss.nodes.filter(
        (knoten) =>
          !(verstoss.id === "aria-allowed-attr" && knoten.html.startsWith('<div class="relative"') && knoten.html.includes('aria-haspopup="dialog"'))
      ),
    }))
    .filter((verstoss) => verstoss.nodes.length > 0);
  (expect({ ...ergebnis, violations: verstoesse }) as unknown as { toHaveNoViolations: () => void }).toHaveNoViolations();
}

jest.mock("@/app/kautionen-actions", () => ({
  getKautionAbrechnungAction: jest.fn(),
  setzeKautionEinbehaltAction: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn(), useToast: jest.fn() }));
jest.mock("@/hooks/use-kaution-flag", () => ({ useKautionFlag: jest.fn() }));

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const KAUTION_ID = "22222222-2222-4222-8222-222222222222";
const BEWEGUNG_EINZAHLUNG = "33333333-3333-4333-8333-333333333331";
const BEWEGUNG_ABZUG = "33333333-3333-4333-8333-333333333332";
const BEWEGUNG_ABZUG_STORNO = "33333333-3333-4333-8333-333333333333";

const ALLE_RECHTE: KautionRechte = { ansehen: true, erstellen: true, bearbeiten: true, loeschen: true };
const NUR_ANSEHEN: KautionRechte = { ansehen: true, erstellen: false, bearbeiten: false, loeschen: false };

const abrechnungMock = getKautionAbrechnungAction as jest.Mock;
const einbehaltMock = setzeKautionEinbehaltAction as jest.Mock;
const toastMock = toast as unknown as jest.Mock;
const flagMock = useKautionFlag as unknown as jest.Mock;

/** Function flags of the test (all others off). */
function setzeFunktionen(funktionen: Partial<Record<KautionFunktion, boolean>> = {}) {
  flagMock.mockReturnValue({
    ...standardKautionFlagKonfig(true),
    bewegungsarten: ["einzahlung", "zinsgutschrift", "auszahlung", "abzug"],
    funktionen: { raten: false, dokumente: false, fristen: false, zinsen: false, abrechnung: true, ...funktionen },
  });
}

function bewegung(teil: Partial<KautionBewegung> & Pick<KautionBewegung, "id" | "bewegungsart" | "betrag" | "wertstellung">): KautionBewegung {
  return {
    vorzeichen: teil.bewegungsart === "einzahlung" || teil.bewegungsart === "zinsgutschrift" ? 1 : -1,
    kategorie: null,
    grund: null,
    interne_notiz: null,
    empfaenger: null,
    quelle: "app",
    erstellt_am: "2026-01-05T09:00:00Z",
    storniert_am: null,
    storno_grund: null,
    saldo_nach_buchung: null,
    ...teil,
  };
}

/** Deposit with a bank account (synthetic): 1.000,00 € paid in, 100,00 € deduction, balance 900,00 €. */
function baueDetails(aenderung: Partial<KautionDetails> = {}): KautionDetails {
  return {
    kaution: {
      id: KAUTION_ID,
      organisation_id: "44444444-4444-4444-8444-444444444444",
      mieter_id: TENANT_ID,
      kautionsart: "barkaution",
      soll_betrag: 1000,
      miete_bei_vertragsschluss: 500,
      interne_notiz: null,
      quelle: "app",
      erstellt_am: "2026-01-05T09:00:00Z",
      geaendert_am: "2026-01-05T09:00:00Z",
      zinsmethode: "act_365",
    },
    konto: {
      summe_einzahlungen: 1000,
      summe_zinsgutschriften: 0,
      summe_auszahlungen: 0,
      summe_abzuege: 100,
      kontostand: 900,
      erste_einzahlung: "2026-01-05",
      letzte_wertstellung: "2026-02-10",
      anzahl_aktiv: 2,
      anzahl_storniert: 1,
    },
    zustand: "verwahrt",
    mietende: "2026-02-28",
    stichtag: "2026-10-17",
    warnungen: { dreifache_miete: 1500, soll_ueber_dreifache_miete: false, einzahlungen_ueber_dreifache_miete: false },
    kontoauszug: [
      bewegung({ id: BEWEGUNG_EINZAHLUNG, bewegungsart: "einzahlung", betrag: 1000, wertstellung: "2026-01-05", saldo_nach_buchung: 1000 }),
      bewegung({
        id: BEWEGUNG_ABZUG,
        bewegungsart: "abzug",
        betrag: 100,
        wertstellung: "2026-02-10",
        kategorie: "nebenkosten",
        grund: "Nebenkostennachzahlung (Testdaten)",
        saldo_nach_buchung: 900,
      }),
      bewegung({
        id: BEWEGUNG_ABZUG_STORNO,
        bewegungsart: "abzug",
        betrag: 50,
        wertstellung: "2026-02-12",
        kategorie: "sonstiges",
        grund: "Fehlbuchung (Testdaten)",
        storniert_am: "2026-02-15T10:00:00Z",
        storno_grund: "Falsch gebucht (Testdaten)",
        saldo_nach_buchung: null,
      }),
    ],
    einbehalt: null,
    ...aenderung,
  };
}

/** Settlement result (synthetic): balance 900,00 €, accrued interest 3,97 € (period 01.01.2026 to 16.10.2026 inclusive). */
function baueAbrechnung(aenderung: Partial<KautionAbrechnung> = {}): KautionAbrechnung {
  const zinsen: KautionZinsVorschlag = {
    moeglich: true,
    regelwerk_version: 1,
    methode: "act_365",
    von: "2026-01-01",
    bis: "2026-10-17",
    tage: 289,
    betrag: 3.97,
    betrag_exakt: "3.9671232876712",
    staffel: [],
    segmente: [],
  };
  return {
    regelwerk_version: 1,
    stichtag: getTodayISOString(),
    organisation: { name: null },
    mieter: { name: null, auszug: null },
    objekt: { haus: null, wohnung: null },
    kaution: { kautionsart: "barkaution", soll_betrag: 1000, zinsmethode: "act_365", getrennt_angelegt: null },
    konto: { summe_einzahlungen: 1000, summe_zinsgutschriften: 0, summe_auszahlungen: 0, summe_abzuege: 100, kontostand: 900 },
    abzuege: [{ kategorie: "nebenkosten", anzahl: 1, summe: 100 }],
    zinsen_offen: zinsen,
    betrag_inkl_zinsen: 903.97,
    einbehalt: null,
    bewegungen: [],
    storniert_anzahl: 1,
    ...aenderung,
  };
}

interface Props {
  details?: KautionDetails;
  rechte?: KautionRechte;
  onGeaendert?: jest.Mock;
  onFehler?: jest.Mock;
  onEinbehaltDirtyChange?: jest.Mock;
  onBuchungErfassen?: jest.Mock;
}

function element(props: Props = {}, onFehler: jest.Mock) {
  return (
    <KautionAbrechnungTab
      tenantId={TENANT_ID}
      details={props.details ?? baueDetails()}
      rechte={props.rechte ?? ALLE_RECHTE}
      onGeaendert={props.onGeaendert ?? jest.fn()}
      onFehler={onFehler}
      onEinbehaltDirtyChange={props.onEinbehaltDirtyChange}
      onBuchungErfassen={props.onBuchungErfassen ?? jest.fn()}
    />
  );
}

function renderTab(props: Props = {}) {
  const onFehler = (props.onFehler ?? jest.fn(() => false)) as jest.Mock;
  const utils = render(element(props, onFehler));
  return {
    ...utils,
    onFehler,
    onGeaendert: props.onGeaendert ?? jest.fn(),
    /** Same tab with new data (what the dialog does after every change). */
    neueDaten: (details: KautionDetails, rechte: KautionRechte = ALLE_RECHTE) =>
      utils.rerender(element({ ...props, details, rechte }, onFehler)),
  };
}

/** Calculation for today (the default settlement date) with the synthetic result. */
async function berechneHeute(user: ReturnType<typeof userEvent.setup>) {
  abrechnungMock.mockResolvedValueOnce({ success: true, data: baueAbrechnung() });
  await user.click(screen.getByRole("button", { name: "Berechnen" }));
  return screen.findByTestId("kaution-abrechnung-ergebnis");
}

/** Response of the PDF route (only what the download code reads). */
function pdfAntwort(kopf: string | null = null) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name.toLowerCase() === "content-disposition" ? kopf : null) },
    blob: async () => new Blob(["%PDF-1.4 Testdaten"], { type: "application/pdf" }),
  };
}

function fehlerAntwort(status: number) {
  return { ok: false, status, headers: { get: () => null }, blob: async () => new Blob([]) };
}

let fetchMock: jest.Mock;
let klickSpy: jest.SpyInstance;
let heruntergeladen: string[];
const originalFetch = global.fetch;

beforeEach(() => {
  jest.resetAllMocks();
  setzeFunktionen();
  einbehaltMock.mockResolvedValue({ success: true, data: undefined });
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  // The download is observed, not performed: jsdom cannot navigate to a blob link.
  heruntergeladen = [];
  klickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    heruntergeladen.push(this.download);
  });
  URL.createObjectURL = jest.fn(() => "blob:kaution-test");
  URL.revokeObjectURL = jest.fn();
});

afterEach(() => {
  klickSpy.mockRestore();
  global.fetch = originalFetch;
});

/**
 * Räumt nach JEDEM Test auf, bevor `jest.setup.js` die Fake-Timer leert (Muster wie in `kaution-zinsen-tab.test.tsx`).
 */
function raeumeNachJedemTestAuf() {
  afterEach(async () => {
    cleanup();
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
  });
}

describe("KautionAbrechnungTab: Berechnung", () => {
  raeumeNachJedemTestAuf();

  it("ruft die Berechnung mit dem Stichtag (heute) auf und zeigt die Zahlen der Datenbank", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();

    const ergebnis = await berechneHeute(user);

    expect(abrechnungMock).toHaveBeenCalledWith({ tenantId: TENANT_ID, stichtag: getTodayISOString() });
    expect(within(ergebnis).getByTestId("kaution-abrechnung-kontostand")).toHaveTextContent("900,00 €");
    expect(within(ergebnis).getByTestId("kaution-abrechnung-abzuege")).toHaveTextContent("Nebenkosten (1 Buchung)");
    expect(within(ergebnis).getByTestId("kaution-abrechnung-abzuege")).toHaveTextContent("100,00 €");
    expect(within(ergebnis).getByTestId("kaution-abrechnung-zinsen")).toHaveTextContent("Vom 01.01.2026 bis 16.10.2026: 3,97 €");
    expect(within(ergebnis).getByTestId("kaution-abrechnung-betrag-inkl-zinsen")).toHaveTextContent("903,97 €");
  });

  it("lehnt ein Auszahlungsdatum in der Zukunft ab, ohne die Berechnung aufzurufen", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();

    // One complete value (the date picker takes a full DD.MM.YYYY text): a single change event.
    fireEvent.change(screen.getByLabelText("Auszahlungsdatum (Stichtag)"), { target: { value: "01.01.2999" } });
    await user.click(screen.getByRole("button", { name: "Berechnen" }));

    expect(await screen.findByText("Das Auszahlungsdatum darf nicht in der Zukunft liegen.")).toBeInTheDocument();
    expect(abrechnungMock).not.toHaveBeenCalled();
  });

  it("zeigt bei fehlendem Zinssatz den Hinweis statt eines Betrags", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();
    abrechnungMock.mockResolvedValueOnce({
      success: true,
      data: baueAbrechnung({
        zinsen_offen: {
          moeglich: false,
          grund: "KEIN_ZINSSATZ",
          erster_tag_ohne_satz: "2026-03-01",
          methode: "act_365",
          von: "2026-01-01",
          bis: "2026-10-17",
          tage: 289,
        },
      }),
    });

    await user.click(screen.getByRole("button", { name: "Berechnen" }));

    expect(await screen.findByText(/Kein Zinssatz hinterlegt \(ab 01\.03\.2026\)/)).toBeInTheDocument();
  });

  it("meldet einen Zinszeitraum über zehn Jahre ausdrücklich statt „keine Zinsen“", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();
    abrechnungMock.mockResolvedValueOnce({
      success: true,
      data: baueAbrechnung({
        zinsen_offen: { moeglich: false, grund: "ZEITRAUM_ZU_LANG", methode: "act_365", von: "2010-01-01", bis: "2026-10-17", tage: 6133 },
      }),
    });

    await user.click(screen.getByRole("button", { name: "Berechnen" }));

    expect(await screen.findByText(/Der Zinszeitraum seit 01\.01\.2010 ist länger als zehn Jahre/)).toBeInTheDocument();
    expect(screen.queryByText("Bis zum Auszahlungsdatum sind keine Zinsen aufgelaufen.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Zinsen gutschreiben" })).not.toBeInTheDocument();
  });

  it("markiert die Berechnung nach einer Datenänderung als veraltet und blendet die Zahlen aus", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { neueDaten } = renderTab();
    await berechneHeute(user);

    neueDaten(baueDetails({ kontoauszug: [] }));

    expect(screen.getByTestId("kaution-abrechnung-veraltet")).toHaveTextContent("Die Berechnung ist veraltet");
    expect(screen.queryByTestId("kaution-abrechnung-ergebnis")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zwischenabrechnung (PDF)" })).toBeDisabled();
  });

  it("zeigt den Fehler der Berechnung am Tab, wenn der Dialog ihn nicht selbst behandelt", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { onFehler } = renderTab();
    abrechnungMock.mockResolvedValueOnce({
      success: false,
      error: { code: "KA013", message: "Das Datum oder der Zeitraum ist ungültig." },
    });

    await user.click(screen.getByRole("button", { name: "Berechnen" }));

    expect(await screen.findByText("Das Datum oder der Zeitraum ist ungültig.")).toBeInTheDocument();
    expect(onFehler).toHaveBeenCalledWith(expect.objectContaining({ code: "KA013" }));
  });

  it("öffnet die Zinsgutschrift im Kontoauszug mit dem aufgelaufenen Zeitraum (mit Zinsfunktion)", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    setzeFunktionen({ zinsen: true });
    const onBuchungErfassen = jest.fn();
    renderTab({ onBuchungErfassen });
    await berechneHeute(user);

    await user.click(screen.getByRole("button", { name: "Zinsen gutschreiben" }));

    expect(onBuchungErfassen).toHaveBeenCalledWith({ art: "zinsgutschrift", von: "2026-01-01", bis: "2026-10-17" });
  });

  it("bietet die Zinsgutschrift ohne Zinsfunktion nicht an", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();
    await berechneHeute(user);

    expect(screen.queryByRole("button", { name: "Zinsen gutschreiben" })).not.toBeInTheDocument();
  });

  it("bietet die Zinsgutschrift nicht an, wenn die Konfiguration die Buchungsart nicht erlaubt", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    flagMock.mockReturnValue({
      ...standardKautionFlagKonfig(true),
      bewegungsarten: ["einzahlung", "auszahlung", "abzug"],
      funktionen: { raten: false, dokumente: false, fristen: false, zinsen: true, abrechnung: true },
    });
    renderTab();
    await berechneHeute(user);

    expect(screen.queryByRole("button", { name: "Zinsen gutschreiben" })).not.toBeInTheDocument();
  });

  it("bietet keine Zinsgutschrift an, wenn kein Zinsbetrag über 0 offen ist", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    setzeFunktionen({ zinsen: true });
    renderTab();
    const zinsen = baueAbrechnung().zinsen_offen as KautionZinsVorschlag;
    abrechnungMock.mockResolvedValueOnce({
      success: true,
      data: baueAbrechnung({ zinsen_offen: { ...zinsen, moeglich: true, betrag: 0 } as KautionZinsVorschlag }),
    });

    await user.click(screen.getByRole("button", { name: "Berechnen" }));

    expect(await screen.findByTestId("kaution-abrechnung-ergebnis")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Zinsen gutschreiben" })).not.toBeInTheDocument();
  });
});

describe("KautionAbrechnungTab: Abzüge", () => {
  raeumeNachJedemTestAuf();

  it("listet nur die nicht stornierten Abzüge mit Datum, Kategorie, Grund und Betrag", () => {
    renderTab();

    const zeilen = screen.getAllByTestId("kaution-abzug-zeile");
    expect(zeilen).toHaveLength(1);
    expect(zeilen[0]).toHaveTextContent("10.02.2026");
    expect(zeilen[0]).toHaveTextContent("Nebenkosten");
    expect(zeilen[0]).toHaveTextContent("Nebenkostennachzahlung (Testdaten)");
    expect(zeilen[0]).toHaveTextContent("100,00 €");
    expect(screen.queryByText("Fehlbuchung (Testdaten)")).not.toBeInTheDocument();
  });

  it("öffnet über „Abzug erfassen“ das Buchungsformular des Kontoauszugs mit der Art Abzug", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onBuchungErfassen = jest.fn();
    renderTab({ onBuchungErfassen });

    await user.click(screen.getByRole("button", { name: "Abzug erfassen" }));

    expect(onBuchungErfassen).toHaveBeenCalledWith({ art: "abzug" });
  });

  it("deaktiviert „Abzug erfassen“ ohne Erstellrecht und erklärt es mit dem Tooltip", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab({ rechte: NUR_ANSEHEN });

    const knopf = screen.getByRole("button", { name: "Abzug erfassen" });
    expect(knopf).toBeDisabled();
    await user.hover(knopf.parentElement as HTMLElement);
    expect(await screen.findByText("Keine Berechtigung")).toBeInTheDocument();
  });
});

describe("KautionAbrechnungTab: Buchungsarten der Konfiguration", () => {
  raeumeNachJedemTestAuf();

  it("zeigt „Abzug erfassen“ und „Auszahlung erfassen“ nicht, wenn die Konfiguration die Buchungsart nicht erlaubt", () => {
    flagMock.mockReturnValue({
      ...standardKautionFlagKonfig(true),
      bewegungsarten: ["einzahlung"],
      funktionen: { raten: false, dokumente: false, fristen: false, zinsen: false, abrechnung: true },
    });
    renderTab();

    expect(screen.queryByRole("button", { name: "Abzug erfassen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Auszahlung erfassen" })).not.toBeInTheDocument();
  });

  it("zeigt nur den Knopf der erlaubten Buchungsart", () => {
    flagMock.mockReturnValue({
      ...standardKautionFlagKonfig(true),
      bewegungsarten: ["einzahlung", "abzug"],
      funktionen: { raten: false, dokumente: false, fristen: false, zinsen: false, abrechnung: true },
    });
    renderTab();

    expect(screen.getByRole("button", { name: "Abzug erfassen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Auszahlung erfassen" })).not.toBeInTheDocument();
  });
});

describe("KautionAbrechnungTab: PDF", () => {
  raeumeNachJedemTestAuf();

  it("sind die PDF-Knöpfe vor einer Berechnung deaktiviert", () => {
    renderTab();

    expect(screen.getByRole("button", { name: "Zwischenabrechnung (PDF)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Endabrechnung (PDF)" })).toBeDisabled();
  });

  it("sendet genau { tenantId, art, stichtag } und löst den Download mit festem Dateinamen aus", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();
    await berechneHeute(user);
    fetchMock.mockResolvedValueOnce(pdfAntwort());

    await user.click(screen.getByRole("button", { name: "Zwischenabrechnung (PDF)" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [adresse, anfrage] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(adresse).toBe("/api/kautionen/abrechnung");
    expect(anfrage.method).toBe("POST");
    expect(anfrage.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(anfrage.body as string)).toEqual({ tenantId: TENANT_ID, art: "zwischen", stichtag: getTodayISOString() });

    expect(klickSpy).toHaveBeenCalledTimes(1);
    expect(heruntergeladen).toEqual([`Kautionsabrechnung-Zwischen-${getTodayISOString()}.pdf`]);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    // The object URL is released after the download had time to start.
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:kaution-test");
  });

  it("übernimmt den Dateinamen aus dem Header nur in der erwarteten Form", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();
    await berechneHeute(user);
    fetchMock.mockResolvedValueOnce(pdfAntwort('attachment; filename="Kautionsabrechnung-End-2026-10-17.pdf"'));

    await user.click(screen.getByRole("button", { name: "Endabrechnung (PDF)" }));

    expect(heruntergeladen).toEqual(["Kautionsabrechnung-End-2026-10-17.pdf"]);
  });

  it("verwirft einen Dateinamen aus dem Header, der nicht der Form entspricht", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();
    await berechneHeute(user);
    fetchMock.mockResolvedValueOnce(pdfAntwort('attachment; filename="../../Mieter Mustermann.pdf"'));

    await user.click(screen.getByRole("button", { name: "Zwischenabrechnung (PDF)" }));

    expect(heruntergeladen).toEqual([`Kautionsabrechnung-Zwischen-${getTodayISOString()}.pdf`]);
  });

  it.each([
    [401, "Bitte melden Sie sich erneut an."],
    [403, "Für diese Aktion fehlt die Berechtigung (Modul Kautionen)."],
    [404, "Die Kautionsabrechnung ist für diesen Mieter nicht verfügbar."],
    [502, "Die Kautionsabrechnung konnte nicht erstellt werden. Bitte versuchen Sie es später erneut."],
    [500, "Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut."],
  ])("zeigt bei Status %i den festen Text und lädt nichts herunter", async (status, meldung) => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();
    await berechneHeute(user);
    fetchMock.mockResolvedValueOnce(fehlerAntwort(status));

    await user.click(screen.getByRole("button", { name: "Endabrechnung (PDF)" }));

    expect(await screen.findByText(meldung)).toBeInTheDocument();
    expect(klickSpy).not.toHaveBeenCalled();
  });

  it("zeigt bei einem Netzfehler den festen Text", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();
    await berechneHeute(user);
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await user.click(screen.getByRole("button", { name: "Zwischenabrechnung (PDF)" }));

    expect(await screen.findByText("Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut.")).toBeInTheDocument();
  });

  it("nimmt einen zweiten Klick vor Ende der Anfrage nicht an (kein Doppelklick)", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();
    await berechneHeute(user);
    let antworten: ((wert: unknown) => void) | undefined;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => (antworten = resolve)));

    const knopf = screen.getByRole("button", { name: "Zwischenabrechnung (PDF)" });
    fireEvent.click(knopf);
    fireEvent.click(knopf);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      antworten?.(pdfAntwort());
    });
    expect(klickSpy).toHaveBeenCalledTimes(1);
  });

  it("weist auf die Ablage als Beleg im Tab Dokumente hin, wenn dieser Tab existiert", () => {
    setzeFunktionen({ dokumente: true });
    renderTab();

    expect(screen.getByText(/Zum Aufbewahren laden Sie es als Beleg an der Auszahlung im Tab Dokumente hoch/)).toBeInTheDocument();
  });
});

describe("KautionAbrechnungTab: Auszahlung und Einbehalt", () => {
  raeumeNachJedemTestAuf();

  it("öffnet über „Auszahlung erfassen“ das Buchungsformular mit der Art Auszahlung", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onBuchungErfassen = jest.fn();
    renderTab({ onBuchungErfassen });

    await user.click(screen.getByRole("button", { name: "Auszahlung erfassen" }));

    expect(onBuchungErfassen).toHaveBeenCalledWith({ art: "auszahlung" });
  });

  it("speichert einen neuen Einbehalt mit Grund und Datum (Standard: heute)", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onGeaendert = jest.fn();
    renderTab({ onGeaendert });

    await user.type(screen.getByLabelText("Grund (Pflicht, 3 bis 500 Zeichen)"), "Nebenkostenabrechnung offen (Testdaten)");
    await user.click(screen.getByRole("button", { name: "Einbehalt speichern" }));

    expect(einbehaltMock).toHaveBeenCalledWith({
      kautionId: KAUTION_ID,
      grund: "Nebenkostenabrechnung offen (Testdaten)",
      seit: getTodayISOString(),
    });
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Einbehalt gespeichert.", variant: "success" }));
    expect(onGeaendert).toHaveBeenCalled();
  });

  it("prüft den Grund vor dem Senden (3 bis 500 Zeichen) und sendet nichts", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();

    await user.type(screen.getByLabelText("Grund (Pflicht, 3 bis 500 Zeichen)"), "ab");
    await user.click(screen.getByRole("button", { name: "Einbehalt speichern" }));

    expect(await screen.findByText("Der Grund muss zwischen 3 und 500 Zeichen lang sein.")).toBeInTheDocument();
    expect(einbehaltMock).not.toHaveBeenCalled();
  });

  it("zeigt den bestehenden Einbehalt mit dem Kontostand und den Tagen und ändert ihn mit dem Formular", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab({
      details: baueDetails({ einbehalt: { grund: "Nebenkostenabrechnung offen (Testdaten)", seit: "2026-03-01", liegedauer_tage: 14 } }),
    });

    expect(screen.getByTestId("kaution-einbehalt-zeile")).toHaveTextContent(
      "Noch einbehalten: 900,00 € – Nebenkostenabrechnung offen (Testdaten), seit 01.03.2026 (14 Tage)"
    );
    expect(screen.queryByTestId("kaution-einbehalt-form")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Einbehalt ändern" }));
    const grund = screen.getByLabelText("Grund (Pflicht, 3 bis 500 Zeichen)");
    expect(grund).toHaveValue("Nebenkostenabrechnung offen (Testdaten)");
    await user.clear(grund);
    await user.type(grund, "Nebenkosten bis Jahresende (Testdaten)");
    await user.click(screen.getByRole("button", { name: "Einbehalt speichern" }));

    expect(einbehaltMock).toHaveBeenCalledWith({
      kautionId: KAUTION_ID,
      grund: "Nebenkosten bis Jahresende (Testdaten)",
      seit: "2026-03-01",
    });
  });

  it("hebt den Einbehalt auf, indem Grund und Datum leer gesendet werden", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onGeaendert = jest.fn();
    renderTab({
      onGeaendert,
      details: baueDetails({ einbehalt: { grund: "Nebenkostenabrechnung offen (Testdaten)", seit: "2026-03-01", liegedauer_tage: 14 } }),
    });

    await user.click(screen.getByRole("button", { name: "Einbehalt aufheben" }));

    expect(einbehaltMock).toHaveBeenCalledWith({ kautionId: KAUTION_ID, grund: null, seit: null });
    expect(onGeaendert).toHaveBeenCalled();
  });

  it("zeigt einen gespeicherten Einbehalt bei Kontostand 0 und erlaubt nur das Aufheben", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onGeaendert = jest.fn();
    renderTab({
      onGeaendert,
      details: baueDetails({
        konto: { ...baueDetails().konto, kontostand: 0 },
        einbehalt: { grund: "Nebenkostenabrechnung offen (Testdaten)", seit: "2026-03-01", liegedauer_tage: 14 },
      }),
    });

    expect(screen.getByTestId("kaution-einbehalt-ohne-guthaben")).toHaveTextContent(
      "noch ein Einbehalt gespeichert: Nebenkostenabrechnung offen (Testdaten), seit 01.03.2026"
    );
    expect(screen.queryByTestId("kaution-einbehalt-zeile")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Einbehalt ändern" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("kaution-einbehalt-form")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Einbehalt aufheben" }));

    expect(einbehaltMock).toHaveBeenCalledWith({ kautionId: KAUTION_ID, grund: null, seit: null });
    expect(onGeaendert).toHaveBeenCalled();
  });

  it("zeigt bei Kontostand 0 den Hinweis und kein Formular", () => {
    renderTab({ details: baueDetails({ konto: { ...baueDetails().konto, kontostand: 0 } }) });

    expect(screen.getByText("Es liegt kein Guthaben auf dem Konto.")).toBeInTheDocument();
    expect(screen.queryByTestId("kaution-einbehalt-form")).not.toBeInTheDocument();
  });

  it("zeigt einen Fehler der Eingabe (KA004) am Formular, das offen bleibt", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { onFehler } = renderTab();
    einbehaltMock.mockResolvedValueOnce({ success: false, error: { code: "KA004", message: "Die Eingabe ist ungültig." } });

    await user.type(screen.getByLabelText("Grund (Pflicht, 3 bis 500 Zeichen)"), "Nebenkostenabrechnung offen (Testdaten)");
    await user.click(screen.getByRole("button", { name: "Einbehalt speichern" }));

    expect(await screen.findByText("Die Eingabe ist ungültig.")).toBeInTheDocument();
    expect(screen.getByLabelText("Grund (Pflicht, 3 bis 500 Zeichen)")).toHaveValue("Nebenkostenabrechnung offen (Testdaten)");
    expect(onFehler).toHaveBeenCalledWith(expect.objectContaining({ code: "KA004" }));
  });

  it("meldet ungespeicherte Eingaben des Einbehalt-Formulars an den Dialog", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onEinbehaltDirtyChange = jest.fn();
    renderTab({ onEinbehaltDirtyChange });

    await user.type(screen.getByLabelText("Grund (Pflicht, 3 bis 500 Zeichen)"), "Nebenkosten");

    expect(onEinbehaltDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it("deaktiviert die Einbehalt-Knöpfe ohne Bearbeitungsrecht und erklärt es mit dem Tooltip", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab({
      rechte: NUR_ANSEHEN,
      details: baueDetails({ einbehalt: { grund: "Nebenkostenabrechnung offen (Testdaten)", seit: "2026-03-01", liegedauer_tage: 14 } }),
    });

    const aendern = screen.getByRole("button", { name: "Einbehalt ändern" });
    const aufheben = screen.getByRole("button", { name: "Einbehalt aufheben" });
    expect(aendern).toBeDisabled();
    expect(aufheben).toBeDisabled();
    expect(screen.getByRole("button", { name: "Auszahlung erfassen" })).toBeDisabled();
    await user.hover(aufheben.parentElement as HTMLElement);
    expect(await screen.findByText("Keine Berechtigung")).toBeInTheDocument();
  });
});

describe("KautionAbrechnungTab: Zugänglichkeit", () => {
  raeumeNachJedemTestAuf();

  it("hat nach der Berechnung keine axe-Verstöße (außer dem bekannten Datumsfeld)", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { container } = renderTab();
    await berechneHeute(user);

    await pruefeZugaenglichkeit(container);
  });
});
