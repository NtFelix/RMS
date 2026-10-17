/**
 * Tests of the Raten tab (GH-6, phase 2): plan table with the four states, warning on a sum mismatch, the no-plan state,
 * rights (read-only without `bearbeiten`), the form (proposal, exact amounts sent, validation, removal, locked plan) and
 * the handover of a rate to the statement ("Zahlung erfassen"). Accessibility checked with jest-axe.
 *
 * All values are synthetic placeholders. The server action is mocked; the tab only talks to it through
 * `planeKautionRatenAction` (`app/kautionen-actions.ts`).
 */

import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { KautionRatenTab } from "@/components/kaution/kaution-raten-tab";
import { planeKautionRatenAction } from "@/app/kautionen-actions";
import { toast } from "@/hooks/use-toast";
import type { KautionDetails, KautionRate, KautionRechte } from "@/types/Kaution";

expect.extend(toHaveNoViolations);

jest.mock("@/app/kautionen-actions", () => ({ planeKautionRatenAction: jest.fn() }));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn(), useToast: jest.fn() }));

const KAUTION_ID = "22222222-2222-4222-8222-222222222222";
const RATE_A = "77777777-7777-4777-8777-777777777771";
const RATE_B = "77777777-7777-4777-8777-777777777772";
const RATE_C = "77777777-7777-4777-8777-777777777773";

const ALLE_RECHTE: KautionRechte = { ansehen: true, erstellen: true, bearbeiten: true, loeschen: true };
const NUR_ANSEHEN: KautionRechte = { ansehen: true, erstellen: false, bearbeiten: false, loeschen: false };
const ERSTELLEN_OHNE_BEARBEITEN: KautionRechte = { ansehen: true, erstellen: true, bearbeiten: false, loeschen: false };

const planeMock = planeKautionRatenAction as jest.Mock;
const toastMock = toast as unknown as jest.Mock;

/** Synthetic plan of 1.000,00 € in three rates: paid, partly paid, open (sums to the target amount). */
const PLAN: KautionRate[] = [
  { rate_id: RATE_A, rate_nr: 1, faelligkeitsdatum: "2027-01-31", soll_betrag: 333.33, gezahlt: 333.33, offen: 0, status: "bezahlt" },
  { rate_id: RATE_B, rate_nr: 2, faelligkeitsdatum: "2027-02-28", soll_betrag: 333.33, gezahlt: 100, offen: 233.33, status: "teilweise" },
  { rate_id: RATE_C, rate_nr: 3, faelligkeitsdatum: "2027-03-31", soll_betrag: 333.34, gezahlt: 0, offen: 333.34, status: "offen" },
];

/** Deposit with a target amount of 1.000,00 € (synthetic). Only the fields the tab reads are meaningful. */
function baueDetails(raten: KautionRate[] | undefined, aenderung: Partial<KautionDetails> = {}): KautionDetails {
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
    },
    konto: {
      summe_einzahlungen: 433.33,
      summe_zinsgutschriften: 0,
      summe_auszahlungen: 0,
      summe_abzuege: 0,
      kontostand: 433.33,
      erste_einzahlung: "2026-01-05",
      letzte_wertstellung: "2026-02-10",
      anzahl_aktiv: 1,
      anzahl_storniert: 0,
    },
    zustand: "teilweise",
    mietende: null,
    stichtag: "2026-10-17",
    warnungen: { dreifache_miete: 1500, soll_ueber_dreifache_miete: false, einzahlungen_ueber_dreifache_miete: false },
    kontoauszug: [],
    raten,
    raten_summe: raten?.reduce((summe, rate) => summe + rate.soll_betrag, 0),
    ...aenderung,
  };
}

interface Props {
  details?: KautionDetails;
  rechte?: KautionRechte;
  onGeaendert?: jest.Mock;
  onFehler?: jest.Mock;
  onRatenDirtyChange?: jest.Mock;
  onZahlungErfassen?: jest.Mock;
}

function renderTab(props: Props = {}) {
  const onGeaendert = props.onGeaendert ?? jest.fn();
  const onFehler = props.onFehler ?? jest.fn(() => false);
  const onRatenDirtyChange = props.onRatenDirtyChange ?? jest.fn();
  const onZahlungErfassen = props.onZahlungErfassen ?? jest.fn();
  const utils = render(
    <KautionRatenTab
      details={props.details ?? baueDetails(PLAN)}
      rechte={props.rechte ?? ALLE_RECHTE}
      onGeaendert={onGeaendert}
      onFehler={onFehler}
      onRatenDirtyChange={onRatenDirtyChange}
      onZahlungErfassen={onZahlungErfassen}
    />
  );
  return { ...utils, onGeaendert, onFehler, onRatenDirtyChange, onZahlungErfassen };
}

beforeEach(() => {
  jest.resetAllMocks();
  planeMock.mockResolvedValue({ success: true, data: undefined });
});

/**
 * Räumt nach JEDEM Test auf, bevor `jest.setup.js` die Fake-Timer leert (`clearAllTimers`). Wie in `kaution-dialog.test.tsx`:
 * endet ein Test während einer Action, plant React die Aktualisierung über den (gefakten) Timer seines Schedulers. Ohne
 * dieses Aufräumen bleibt der Scheduler für die folgenden Tests hängen (Zustandsänderungen erscheinen nicht mehr).
 */
function raeumeNachJedemTestAuf() {
  afterEach(async () => {
    cleanup();
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
  });
}

describe("KautionRatenTab: Ratenplan anzeigen", () => {
  it("shows every rate with due date, target, paid and open amount and status", () => {
    renderTab({ rechte: NUR_ANSEHEN });

    const tabelle = screen.getByRole("table", { name: /Ratenplan der Kaution/ });
    const zeilen = within(tabelle).getAllByTestId("kaution-raten-zeile");
    expect(zeilen).toHaveLength(3);

    expect(within(zeilen[0]).getByText("Rate 1")).toBeInTheDocument();
    expect(zeilen[0]).toHaveTextContent("31.01.2027");
    expect(zeilen[0]).toHaveTextContent("Bezahlt");
    expect(zeilen[1]).toHaveTextContent("28.02.2027");
    expect(zeilen[1]).toHaveTextContent("233,33");
    expect(zeilen[2]).toHaveTextContent("31.03.2027");
  });

  it("summarises the plan with the database sum and the target amount", () => {
    renderTab({ rechte: NUR_ANSEHEN });

    const zusammenfassung = screen.getByTestId("kaution-raten-zusammenfassung");
    expect(zusammenfassung).toHaveTextContent("Der Ratenplan umfasst 3 Raten.");
    expect(zusammenfassung).toHaveTextContent("1.000,00");
  });

  it.each([
    ["offen", "Offen"],
    ["teilweise", "Teilweise bezahlt"],
    ["bezahlt", "Bezahlt"],
    ["ueberfaellig", "Überfällig"],
  ] as const)("shows the status %s as text and as an icon, not by colour alone", (status, label) => {
    renderTab({
      rechte: NUR_ANSEHEN,
      details: baueDetails([{ ...PLAN[0], status }]),
    });

    const badge = document.querySelector(`[data-status="${status}"]`);
    expect(badge).not.toBeNull();
    expect(badge).toHaveTextContent(label);
    expect(badge?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("warns (not blocking) when the rates do not add up to the target amount", () => {
    renderTab({
      rechte: NUR_ANSEHEN,
      details: baueDetails([
        { ...PLAN[0], soll_betrag: 300 },
        { ...PLAN[1], soll_betrag: 300 },
        { ...PLAN[2], soll_betrag: 300 },
      ]),
    });

    const hinweis = screen.getByRole("note");
    expect(hinweis).toHaveTextContent(/weicht vom Soll-Betrag um 100,00/);
    expect(hinweis).toHaveTextContent(/nach unten/);
    expect(screen.getByRole("table", { name: /Ratenplan der Kaution/ })).toBeInTheDocument();
  });

  it("shows no warning when the rates add up to the target amount", () => {
    renderTab({ rechte: NUR_ANSEHEN });

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("explains the missing plan and offers no table without a plan", () => {
    renderTab({ rechte: ALLE_RECHTE, details: baueDetails(undefined) });

    expect(screen.getByTestId("kaution-raten-leer")).toHaveTextContent("Für diese Kaution ist kein Ratenplan hinterlegt.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ratenplan anlegen" })).toBeInTheDocument();
  });

  it("treats an empty list like a missing plan", () => {
    renderTab({ rechte: NUR_ANSEHEN, details: baueDetails([]) });

    expect(screen.getByTestId("kaution-raten-leer")).toBeInTheDocument();
  });
});

describe("KautionRatenTab: Rechte", () => {
  raeumeNachJedemTestAuf();

  it("without the right to edit: no form, explanation instead, no booking button", () => {
    renderTab({ rechte: NUR_ANSEHEN });

    expect(screen.queryByTestId("kaution-raten-form")).not.toBeInTheDocument();
    expect(screen.getByText("Das Bearbeiten des Ratenplans ist mit Ihren Rechten nicht möglich.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Zahlung/ })).not.toBeInTheDocument();
  });

  it("with the right to edit: the form to replace the plan is shown", () => {
    renderTab({ rechte: ALLE_RECHTE });

    expect(screen.getByRole("heading", { name: "Ratenplan bearbeiten" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ratenplan entfernen" })).toBeInTheDocument();
  });

  it("'Zahlung erfassen' only for users with the right to book, and only for rates with an open amount", () => {
    renderTab({ rechte: ERSTELLEN_OHNE_BEARBEITEN });

    expect(screen.queryByRole("button", { name: "Zahlung für Rate 1 erfassen" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zahlung für Rate 2 erfassen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zahlung für Rate 3 erfassen" })).toBeInTheDocument();
    expect(screen.queryByTestId("kaution-raten-form")).not.toBeInTheDocument();
  });

  it("'Zahlung erfassen' hands the rate over to the statement", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { onZahlungErfassen } = renderTab({ rechte: ERSTELLEN_OHNE_BEARBEITEN });

    await user.click(screen.getByRole("button", { name: "Zahlung für Rate 2 erfassen" }));

    expect(onZahlungErfassen).toHaveBeenCalledTimes(1);
    expect(onZahlungErfassen).toHaveBeenCalledWith(expect.objectContaining({ rate_id: RATE_B, rate_nr: 2, offen: 233.33 }));
  });
});

describe("KautionRatenTab: Formular", () => {
  raeumeNachJedemTestAuf();

  it("prefills a new plan with the proposal: equal split, the last rate takes the remainder", () => {
    renderTab({ rechte: ALLE_RECHTE, details: baueDetails(undefined) });

    const betraege = screen.getAllByLabelText("Soll-Betrag (€)").map((feld) => (feld as HTMLInputElement).value);
    expect(betraege).toEqual(["333,33", "333,33", "333,34"]);
  });

  it("sends the exact decimal strings of the plan when it is saved", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { onGeaendert, onRatenDirtyChange } = renderTab({ rechte: ALLE_RECHTE });

    const betraege = screen.getAllByLabelText("Soll-Betrag (€)");
    await user.clear(betraege[0]);
    await user.type(betraege[0], "400,00");
    expect(onRatenDirtyChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Ratenplan speichern" }));

    expect(planeMock).toHaveBeenCalledWith({
      kautionId: KAUTION_ID,
      raten: [
        { faelligkeitsdatum: "2027-01-31", sollBetrag: "400.00" },
        { faelligkeitsdatum: "2027-02-28", sollBetrag: "333.33" },
        { faelligkeitsdatum: "2027-03-31", sollBetrag: "333.34" },
      ],
    });
    expect(onGeaendert).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Ratenplan gespeichert." }));
  });

  it("the save button stays disabled while the stored plan is unchanged", () => {
    renderTab({ rechte: ALLE_RECHTE });

    expect(screen.getByRole("button", { name: "Ratenplan speichern" })).toBeDisabled();
  });

  it("names the missing amount of a rate at the field and sends nothing", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab({ rechte: ALLE_RECHTE, details: baueDetails(undefined) });

    const betraege = screen.getAllByLabelText("Soll-Betrag (€)");
    await user.clear(betraege[1]);
    await user.click(screen.getByRole("button", { name: "Ratenplan speichern" }));

    expect(screen.getByText("Bitte geben Sie einen Betrag an.")).toBeInTheDocument();
    expect(betraege[1]).toHaveAttribute("aria-invalid", "true");
    expect(planeMock).not.toHaveBeenCalled();
  });

  it("rejects due dates that are not in ascending order at the form, sends nothing", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab({ rechte: ALLE_RECHTE });

    // The date picker opens its calendar on click and takes the keystrokes: the complete text is set as one change.
    const datumFelder = screen.getAllByLabelText("Fällig am");
    fireEvent.change(datumFelder[1], { target: { value: "30.01.2027" } });
    await user.click(screen.getByRole("button", { name: "Ratenplan speichern" }));

    expect(screen.getByText("Die Fälligkeit der Rate 2 muss nach der Fälligkeit der vorherigen Rate liegen.")).toBeInTheDocument();
    expect(planeMock).not.toHaveBeenCalled();
  });

  it("removes the plan with an empty list", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab({ rechte: ALLE_RECHTE });

    await user.click(screen.getByRole("button", { name: "Ratenplan entfernen" }));

    expect(planeMock).toHaveBeenCalledWith({ kautionId: KAUTION_ID, raten: [] });
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Ratenplan entfernt." }));
  });

  it("a locked plan (KA009) is handled by the dialog: the form shows no message of its own", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const fehler = { code: "KA009", message: "Der Ratenplan kann nicht mehr geändert werden, weil bereits Zahlungen zugeordnet sind." };
    planeMock.mockResolvedValueOnce({ success: false, error: fehler });
    const onFehler = jest.fn(() => true);
    renderTab({ rechte: ALLE_RECHTE, onFehler });

    await user.click(screen.getByRole("button", { name: "Ratenplan entfernen" }));

    expect(onFehler).toHaveBeenCalledWith(fehler);
    expect(screen.queryByTestId("kaution-formular-fehler")).not.toBeInTheDocument();
  });

  it("an error the dialog does not handle is shown at the form", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    planeMock.mockResolvedValueOnce({ success: false, error: { code: "KA004", message: "Die Eingabe ist ungültig." } });
    renderTab({ rechte: ALLE_RECHTE, onFehler: jest.fn(() => false) });

    await user.click(screen.getByRole("button", { name: "Ratenplan entfernen" }));

    expect(await screen.findByTestId("kaution-formular-fehler")).toHaveTextContent("Die Eingabe ist ungültig.");
  });

  it("while saving the buttons are disabled: one request only", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    planeMock.mockReturnValue(new Promise(() => undefined));
    renderTab({ rechte: ALLE_RECHTE });

    await user.click(screen.getByRole("button", { name: "Ratenplan entfernen" }));

    expect(screen.getByRole("button", { name: "Ratenplan entfernen" })).toBeDisabled();
    expect(planeMock).toHaveBeenCalledTimes(1);
  });
});

describe("KautionRatenTab: Barrierefreiheit", () => {
  raeumeNachJedemTestAuf();
  // axe-core is slow: generous time limit (as in the dialog tests).
  jest.setTimeout(30000);

  // `jest-axe` has no types in this project: only the fields needed here.
  interface AxeErgebnis {
    violations: { id: string; nodes: { html: string }[] }[];
  }

  /**
   * BEKANNTER BESTANDSFEHLER, nicht Teil dieser Änderung: `components/ui/date-picker.tsx` setzt über `PopoverTrigger asChild`
   * aria-expanded/aria-haspopup auf ein `div` ohne Rolle (aria-allowed-attr). Dieselbe Ausnahme wie in
   * `kaution-dialog.test.tsx`; alle anderen Verstöße bleiben Fehler.
   */
  async function pruefe(container: HTMLElement) {
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

  it("has no accessibility violations with a plan (read-only)", async () => {
    const { container } = renderTab({ rechte: NUR_ANSEHEN });

    await pruefe(container);
  });

  it("has no accessibility violations with a plan and the form", async () => {
    const { container } = renderTab({ rechte: ALLE_RECHTE });

    await pruefe(container);
  });

  it("has no accessibility violations without a plan (proposal form)", async () => {
    const { container } = renderTab({ rechte: ALLE_RECHTE, details: baueDetails(undefined) });

    await pruefe(container);
  });
});
