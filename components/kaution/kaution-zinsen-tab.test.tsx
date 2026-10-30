/**
 * Tests of the Zinsen tab (GH-6, phase 3): accrued interest shown as a proposal (never as credited), the handover of the
 * accrued period to the statement, the interest credits so far (cancelled ones marked), and the interest schedule form
 * (rows, validation, saving, lock `KA009`, rights, zero rate). Accessibility checked with jest-axe.
 *
 * All values are synthetic. The server action is mocked; the tab only talks to it through `planeKautionZinsstaffelAction`.
 */

import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { KautionZinsenTab } from "@/components/kaution/kaution-zinsen-tab";
import { planeKautionZinsstaffelAction } from "@/app/kautionen-actions";
import { toast } from "@/hooks/use-toast";
import { useKautionFlag } from "@/hooks/use-kaution-flag";
import { standardKautionFlagKonfig } from "@/lib/kautionen-flag";
import type { KautionBewegung, KautionDetails, KautionRechte, KautionZinsVorschlag, KautionZinssatz } from "@/types/Kaution";

jest.mock("@/hooks/use-kaution-flag", () => ({ useKautionFlag: jest.fn() }));
const flagMock = useKautionFlag as unknown as jest.Mock;

/** Flag configuration of the test: the booking type `zinsgutschrift` is allowed unless the test restricts it. */
function setzeBuchungsarten(bewegungsarten: string[] = ["einzahlung", "zinsgutschrift", "auszahlung", "abzug"]) {
  flagMock.mockReturnValue({ ...standardKautionFlagKonfig(true), bewegungsarten, funktionen: { raten: false, dokumente: false, fristen: false, zinsen: true, abrechnung: false } });
}

expect.extend(toHaveNoViolations);

interface AxeErgebnis {
  violations: { id: string; nodes: { html: string }[] }[];
}

/**
 * Accessibility check with jest-axe. Bekannter Bestandsfehler (wie in `kaution-raten-tab.test.tsx`): `components/ui/date-picker.tsx`
 * setzt aria-expanded/aria-haspopup auf ein `div` ohne Rolle (aria-allowed-attr). Nur dieser Knoten wird ausgenommen;
 * alle anderen Verstöße bleiben Fehler.
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

jest.mock("@/app/kautionen-actions", () => ({ planeKautionZinsstaffelAction: jest.fn() }));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn(), useToast: jest.fn() }));

const KAUTION_ID = "22222222-2222-4222-8222-222222222222";
const BEWEGUNG_ZINS = "33333333-3333-4333-8333-333333333331";
const BEWEGUNG_ZINS_STORNO = "33333333-3333-4333-8333-333333333332";

const ALLE_RECHTE: KautionRechte = { ansehen: true, erstellen: true, bearbeiten: true, loeschen: true };
const NUR_ANSEHEN: KautionRechte = { ansehen: true, erstellen: false, bearbeiten: false, loeschen: false };

const planeMock = planeKautionZinsstaffelAction as jest.Mock;
const toastMock = toast as unknown as jest.Mock;

const STAFFEL: KautionZinssatz[] = [
  { id: "44444444-4444-4444-8444-444444444441", gueltig_ab: "2025-01-01", zinssatz_prozent: 1.5 },
  { id: "44444444-4444-4444-8444-444444444442", gueltig_ab: "2025-07-01", zinssatz_prozent: 2 },
];

/** Synthetic accrued proposal: 1 January to yesterday (exclusive end is today). */
const AUFGELAUFEN: KautionZinsVorschlag = {
  moeglich: true,
  regelwerk_version: 1,
  methode: "act_365",
  von: "2026-01-01",
  bis: "2026-10-17",
  tage: 289,
  betrag: 3.97,
  betrag_exakt: "3.9671232876712",
  staffel: [{ gueltig_ab: "2025-07-01", zinssatz_prozent: 2 }],
  segmente: [{ von: "2026-01-01", bis: "2026-10-17", tage: 289, zinssatz_prozent: 2, saldo: 1000, divisor: 365, zins: "1.5835616438356" }],
};

function zinsGutschrift(teil: Partial<KautionBewegung> & Pick<KautionBewegung, "id" | "betrag" | "wertstellung">): KautionBewegung {
  return {
    bewegungsart: "zinsgutschrift",
    vorzeichen: 1,
    kategorie: null,
    grund: null,
    interne_notiz: null,
    empfaenger: null,
    quelle: "app",
    erstellt_am: "2026-01-05T09:00:00Z",
    storniert_am: null,
    storno_grund: null,
    saldo_nach_buchung: null,
    zinszeitraum_von: "2025-01-01",
    zinszeitraum_bis: "2026-01-01",
    berechnungsgrundlage: null,
    ...teil,
  };
}

/** Deposit with 1.000,00 € (synthetic), one active and one cancelled interest credit. */
function baueDetails(aenderung: Partial<KautionDetails> = {}): KautionDetails {
  return {
    kaution: {
      id: KAUTION_ID,
      organisation_id: "44444444-4444-4444-8444-444444444444",
      mieter_id: "11111111-1111-4111-8111-111111111111",
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
      summe_zinsgutschriften: 15.04,
      summe_auszahlungen: 0,
      summe_abzuege: 0,
      kontostand: 1015.04,
      erste_einzahlung: "2025-01-05",
      letzte_wertstellung: "2026-01-01",
      anzahl_aktiv: 2,
      anzahl_storniert: 1,
    },
    zustand: "verwahrt",
    mietende: null,
    stichtag: "2026-10-17",
    warnungen: { dreifache_miete: 1500, soll_ueber_dreifache_miete: false, einzahlungen_ueber_dreifache_miete: false },
    kontoauszug: [
      zinsGutschrift({ id: BEWEGUNG_ZINS, betrag: 15.04, wertstellung: "2026-01-01", saldo_nach_buchung: 1015.04 }),
      zinsGutschrift({
        id: BEWEGUNG_ZINS_STORNO,
        betrag: 5,
        wertstellung: "2026-02-01",
        zinszeitraum_von: "2026-01-01",
        zinszeitraum_bis: "2026-02-01",
        storniert_am: "2026-02-03T10:00:00Z",
        storno_grund: "Falscher Zeitraum (Testdaten)",
      }),
    ],
    zinsstaffel: STAFFEL,
    zins_aufgelaufen: AUFGELAUFEN,
    kontostand_inkl_zinsen: 1019.01,
    ...aenderung,
  };
}

interface Props {
  details?: KautionDetails;
  rechte?: KautionRechte;
  onGeaendert?: jest.Mock;
  onFehler?: jest.Mock;
  onZinsgutschriftErfassen?: jest.Mock;
}

function renderTab(props: Props = {}) {
  const onGeaendert = props.onGeaendert ?? jest.fn();
  const onFehler = props.onFehler ?? jest.fn(() => false);
  const onZinsgutschriftErfassen = props.onZinsgutschriftErfassen ?? jest.fn();
  const utils = render(
    <KautionZinsenTab
      details={props.details ?? baueDetails()}
      rechte={props.rechte ?? ALLE_RECHTE}
      onGeaendert={onGeaendert}
      onFehler={onFehler}
      onZinsgutschriftErfassen={onZinsgutschriftErfassen}
    />
  );
  return { ...utils, onGeaendert, onFehler, onZinsgutschriftErfassen };
}

beforeEach(() => {
  jest.resetAllMocks();
  setzeBuchungsarten();
  planeMock.mockResolvedValue({ success: true, data: undefined });
});

/**
 * Räumt nach JEDEM Test auf, bevor `jest.setup.js` die Fake-Timer leert (Muster wie in `kaution-raten-tab.test.tsx`).
 * Die Hooks stehen in einem `describe`, damit sie vor denen von `jest.setup.js` laufen.
 */
function raeumeNachJedemTestAuf() {
  afterEach(async () => {
    cleanup();
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
  });
}

describe("KautionZinsenTab: aufgelaufene Zinsen", () => {
  raeumeNachJedemTestAuf();

  it("zeigt die aufgelaufenen Zinsen als Vorschlag, der noch nicht gutgeschrieben ist", () => {
    renderTab();

    expect(screen.getByText("Vorschlag, noch nicht gutgeschrieben")).toBeInTheDocument();
    // The period ends the day before today (the database excludes today).
    expect(screen.getByTestId("kaution-zins-aufgelaufen")).toHaveTextContent("Aufgelaufen vom 01.01.2026 bis 16.10.2026: 3,97 €");
    expect(screen.getByTestId("kaution-zins-kontostand-inkl")).toHaveTextContent("1.019,01 €");
  });

  it("weist bei fehlendem Zinssatz darauf hin, statt einen Betrag zu zeigen", () => {
    renderTab({
      details: baueDetails({
        zins_aufgelaufen: { moeglich: false, grund: "KEIN_ZINSSATZ", erster_tag_ohne_satz: "2026-01-01", methode: "act_365", von: "2026-01-01", bis: "2026-10-17", tage: 289 },
        kontostand_inkl_zinsen: null,
      }),
    });

    expect(screen.getByText(/Für den Zeitraum ist kein Zinssatz hinterlegt/)).toBeInTheDocument();
    expect(screen.queryByTestId("kaution-zins-aufgelaufen")).not.toBeInTheDocument();
    expect(screen.getByTestId("kaution-zins-kontostand-inkl")).toHaveTextContent("–");
  });

  it("meldet einen Zinszeitraum über zehn Jahre ausdrücklich statt „keine Zinsen“", () => {
    renderTab({
      details: baueDetails({
        zins_aufgelaufen: { moeglich: false, grund: "ZEITRAUM_ZU_LANG", methode: "act_365", von: "2010-01-01", bis: "2026-10-17", tage: 6133 },
        kontostand_inkl_zinsen: null,
      }),
    });

    expect(screen.getByText(/Der Zeitraum seit 01\.01\.2010 ist länger als 3660 Tage/)).toBeInTheDocument();
    expect(screen.queryByText("Derzeit sind keine Zinsen aufgelaufen.")).not.toBeInTheDocument();
    expect(screen.queryByTestId("kaution-zins-aufgelaufen")).not.toBeInTheDocument();
  });

  it("deaktiviert „Zinsgutschrift erfassen“ bei einem Zinszeitraum über 3660 Tage (der Zeitraum wäre ungültig)", () => {
    renderTab({
      details: baueDetails({
        zins_aufgelaufen: { moeglich: false, grund: "ZEITRAUM_ZU_LANG", methode: "act_365", von: "2010-01-01", bis: "2026-10-17", tage: 6133 },
        kontostand_inkl_zinsen: null,
      }),
    });

    expect(screen.getByRole("button", { name: "Zinsgutschrift erfassen" })).toBeDisabled();
  });

  it("deaktiviert „Zinsgutschrift erfassen“, wenn die Konfiguration die Buchungsart zinsgutschrift nicht erlaubt", () => {
    setzeBuchungsarten(["einzahlung", "auszahlung", "abzug"]);
    renderTab();

    expect(screen.getByRole("button", { name: "Zinsgutschrift erfassen" })).toBeDisabled();
  });

  it("deaktiviert die Zinsgutschrift, wenn keine Zinsen aufgelaufen sind", () => {
    renderTab({ details: baueDetails({ zins_aufgelaufen: null }) });

    expect(screen.getByText("Derzeit sind keine Zinsen aufgelaufen.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zinsgutschrift erfassen" })).toBeDisabled();
  });

  it("übergibt den aufgelaufenen Zeitraum (Ende exklusiv, wie es die Datenbank liefert) an die Buchung", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { onZinsgutschriftErfassen } = renderTab();

    await user.click(screen.getByRole("button", { name: "Zinsgutschrift erfassen" }));

    expect(onZinsgutschriftErfassen).toHaveBeenCalledWith({ art: "zinsgutschrift", von: "2026-01-01", bis: "2026-10-17" });
  });

  it("deaktiviert die Zinsgutschrift ohne Erstellrecht und erklärt es mit dem Tooltip", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab({ rechte: NUR_ANSEHEN });

    const knopf = screen.getByRole("button", { name: "Zinsgutschrift erfassen" });
    expect(knopf).toBeDisabled();
    // The tooltip wraps a disabled button: the hover goes to the wrapper (`ButtonWithTooltip`).
    await user.hover(knopf.parentElement as HTMLElement);
    expect(await screen.findByText("Keine Berechtigung")).toBeInTheDocument();
  });
});

describe("KautionZinsenTab: bisherige Zinsgutschriften", () => {
  raeumeNachJedemTestAuf();

  it("listet die Zinsgutschriften mit Zeitraum (Ende einschließlich) und markiert Stornierte", () => {
    renderTab();

    const tabelle = screen.getByRole("table", { name: /Zinsgutschriften der Kaution/ });
    const zeilen = within(tabelle).getAllByRole("row").slice(1);
    expect(zeilen).toHaveLength(2);
    expect(zeilen[0]).toHaveTextContent("01.01.2025 – 31.12.2025");
    expect(zeilen[0]).toHaveTextContent("gutgeschrieben");
    expect(zeilen[1]).toHaveAttribute("data-storniert", "true");
    expect(within(zeilen[1]).getByText("storniert")).toBeInTheDocument();
    expect(screen.getByTestId("kaution-zins-aktiv-anzahl")).toHaveTextContent("Aktive Zinsgutschriften: 1");
  });

  it("sagt, wenn noch keine Zinsgutschrift vorhanden ist", () => {
    renderTab({ details: baueDetails({ kontoauszug: [] }) });

    expect(screen.getByText("Es sind noch keine Zinsgutschriften vorhanden.")).toBeInTheDocument();
  });
});

describe("KautionZinsenTab: Zinsstaffel", () => {
  raeumeNachJedemTestAuf();

  it("zeigt die gespeicherten Zeilen mit Datum und Satz (Komma als Dezimalzeichen)", () => {
    renderTab();

    expect(screen.getAllByLabelText("Zinssatz in % p. a.")).toHaveLength(2);
    expect(screen.getAllByLabelText("Zinssatz in % p. a.")[0]).toHaveValue("1,5");
    expect(screen.getAllByLabelText("Zinssatz in % p. a.")[1]).toHaveValue("2");
    expect(screen.getAllByLabelText("Gültig ab")[0]).toHaveValue("01.01.2025");
    expect(screen.getByText(/Satz 0 ist zulässig \(z\. B\. keine Verzinsungspflicht beim Studenten-\/Jugendwohnheim\)\./)).toBeInTheDocument();
  });

  it("fügt Zeilen hinzu und entfernt sie wieder", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();

    await user.click(screen.getByRole("button", { name: "Zeile hinzufügen" }));
    expect(screen.getAllByLabelText("Zinssatz in % p. a.")).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "Zeile 3 entfernen" }));
    expect(screen.getAllByLabelText("Zinssatz in % p. a.")).toHaveLength(2);
  });

  it("prüft Datum und Satz und sendet nichts, solange die Eingabe ungültig ist", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();
    fireEvent.change(screen.getAllByLabelText("Zinssatz in % p. a.")[1], { target: { value: "1,55555" } });

    await user.click(screen.getByRole("button", { name: "Zinsstaffel speichern" }));

    expect(await screen.findByText(/höchstens 4 Nachkommastellen haben/)).toBeInTheDocument();
    expect(planeMock).not.toHaveBeenCalled();
  });

  it("verlangt aufsteigende Gültigkeitsdaten", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();
    fireEvent.change(screen.getAllByLabelText("Gültig ab")[1], { target: { value: "01.01.2025" } });

    await user.click(screen.getByRole("button", { name: "Zinsstaffel speichern" }));

    expect(await screen.findByText("Das Gültigkeitsdatum muss nach dem Datum der vorherigen Zeile liegen.")).toBeInTheDocument();
    expect(planeMock).not.toHaveBeenCalled();
  });

  it("speichert die Staffel mit exakten Satzstrings, Satz 0 eingeschlossen", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { onGeaendert } = renderTab();
    fireEvent.change(screen.getAllByLabelText("Zinssatz in % p. a.")[1], { target: { value: "2,50" } });
    await user.click(screen.getByRole("button", { name: "Zeile hinzufügen" }));
    fireEvent.change(screen.getAllByLabelText("Gültig ab")[2], { target: { value: "01.01.2026" } });
    fireEvent.change(screen.getAllByLabelText("Zinssatz in % p. a.")[2], { target: { value: "0" } });

    await user.click(screen.getByRole("button", { name: "Zinsstaffel speichern" }));

    expect(planeMock).toHaveBeenCalledWith({
      kautionId: KAUTION_ID,
      staffel: [
        { gueltigAb: "2025-01-01", zinssatzProzent: "1.5" },
        { gueltigAb: "2025-07-01", zinssatzProzent: "2.5" },
        { gueltigAb: "2026-01-01", zinssatzProzent: "0" },
      ],
    });
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Zinsstaffel gespeichert." }));
    expect(onGeaendert).toHaveBeenCalled();
  });

  it("entfernt die Staffel mit einer leeren Liste", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab({ details: baueDetails({ zinsstaffel: [STAFFEL[0]] }) });

    await user.click(screen.getByRole("button", { name: "Zeile 1 entfernen" }));
    expect(screen.getByText("Keine Zinsstaffel hinterlegt.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Zinsstaffel speichern" }));

    expect(planeMock).toHaveBeenCalledWith({ kautionId: KAUTION_ID, staffel: [] });
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Zinsstaffel entfernt." }));
  });

  it("zeigt die Sperre (KA009) am Formular, wenn ein gutgeschriebener Zeitraum betroffen ist", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    planeMock.mockResolvedValue({
      success: false,
      error: { code: "KA009", message: "Die Zinsstaffel kann für bereits gutgeschriebene Zeiträume nicht mehr geändert werden." },
    });
    const { onFehler } = renderTab();
    fireEvent.change(screen.getAllByLabelText("Zinssatz in % p. a.")[0], { target: { value: "1,6" } });

    await user.click(screen.getByRole("button", { name: "Zinsstaffel speichern" }));

    expect(await screen.findByText("Die Zinsstaffel kann für bereits gutgeschriebene Zeiträume nicht mehr geändert werden.")).toBeInTheDocument();
    expect(onFehler).toHaveBeenCalledWith(expect.objectContaining({ code: "KA009" }));
  });

  it("deaktiviert die Zinsstaffel ohne Bearbeitungsrecht und erklärt den Grund", () => {
    renderTab({ rechte: { ansehen: true, erstellen: true, bearbeiten: false, loeschen: false } });

    expect(screen.getByText("Für das Bearbeiten der Zinsstaffel fehlt Ihnen die Berechtigung.")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Zinssatz in % p. a.")[0]).toBeDisabled();
    expect(screen.getByRole("button", { name: "Zinsstaffel speichern" })).toBeDisabled();
  });

  it("hat keine Verstöße gegen die Barrierefreiheit (jest-axe)", async () => {
    const { container } = renderTab();
    await pruefeZugaenglichkeit(container);
  });
});
