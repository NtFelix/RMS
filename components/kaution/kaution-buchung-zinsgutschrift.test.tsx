/**
 * Tests of the booking form for interest credits (GH-6, phase 3): period with inclusive end (the database gets the day after),
 * proposal from the server, deviation and "no proposal" rules for the reason, stale proposals after a period change, and
 * the accessibility smoke test (jest-axe).
 *
 * All values are synthetic. The server actions are mocked; the form only talks to them through their signatures.
 */

import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { KautionBuchungForm, type KautionBuchungVorgabe } from "@/components/kaution/kaution-buchung-form";
import { berechneKautionZinsenAction, bucheKautionBewegungAction } from "@/app/kautionen-actions";
import { toast } from "@/hooks/use-toast";
import type { KautionZinsVorschlag } from "@/types/Kaution";

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

jest.mock("@/app/kautionen-actions", () => ({
  berechneKautionZinsenAction: jest.fn(),
  bucheKautionBewegungAction: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn(), useToast: jest.fn() }));
// Fixed "today" so that the default value date and the future check are deterministic.
jest.mock("@/components/kaution/kaution-format", () => ({
  ...jest.requireActual("@/components/kaution/kaution-format"),
  heuteIso: () => "2026-10-17",
}));

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const KAUTION_ID = "22222222-2222-4222-8222-222222222222";

const berechneMock = berechneKautionZinsenAction as jest.Mock;
const bucheMock = bucheKautionBewegungAction as jest.Mock;
const toastMock = toast as unknown as jest.Mock;

/** Synthetic proposal of 15,04 € for 1.000 EUR at 1 % p. a. over 2025 (act/365). */
const VORSCHLAG: KautionZinsVorschlag = {
  moeglich: true,
  regelwerk_version: 1,
  methode: "act_365",
  von: "2025-01-01",
  bis: "2026-01-01",
  tage: 365,
  betrag: 15.04,
  betrag_exakt: "15.041095890411",
  staffel: [{ gueltig_ab: "2025-01-01", zinssatz_prozent: 1 }],
  segmente: [{ von: "2025-01-01", bis: "2026-01-01", tage: 365, zinssatz_prozent: 1, saldo: 1504.11, divisor: 365, zins: "15.0411" }],
};

/** Synthetic: no interest rate for the period (the database answers with `moeglich: false`). */
const KEIN_SATZ: KautionZinsVorschlag = {
  moeglich: false,
  grund: "KEIN_ZINSSATZ",
  erster_tag_ohne_satz: "2025-01-01",
  methode: "act_365",
  von: "2025-01-01",
  bis: "2026-01-01",
  tage: 365,
};

const ZINS_VORGABE: KautionBuchungVorgabe = { art: "zinsgutschrift", von: "2025-01-01", bis: "2026-01-01" };

function renderForm(vorgabe: KautionBuchungVorgabe = ZINS_VORGABE, darfBuchen = true) {
  const onGebucht = jest.fn();
  const onFehler = jest.fn(() => false);
  const utils = render(
    <KautionBuchungForm
      art="zinsgutschrift"
      tenantId={TENANT_ID}
      kautionId={KAUTION_ID}
      kontostand={1000}
      darfBuchen={darfBuchen}
      vorgabe={vorgabe}
      onGebucht={onGebucht}
      onFehler={onFehler}
      onAbbrechen={jest.fn()}
    />
  );
  return { ...utils, onGebucht, onFehler, formular: screen.getByTestId("kaution-buchung-form") };
}

/** Sets a date field the way the other tests do (the calendar opens on click, typing is not needed). */
function setzeDatum(feld: HTMLElement, text: string) {
  fireEvent.change(feld, { target: { value: text } });
}

beforeEach(() => {
  jest.resetAllMocks();
  bucheMock.mockResolvedValue({ success: true, data: { bewegungId: "33333333-3333-4333-8333-333333333333" } });
});

/**
 * Räumt nach jedem Test auf, bevor `jest.setup.js` die Fake-Timer leert: endet ein Test während einer Action, plant React
 * die Aktualisierung über den gefakten Timer des Schedulers. Ohne dieses Aufräumen hängt der Scheduler für die folgenden Tests.
 * Die Hooks müssen in einem `describe` stehen (laufen dann vor denen von `jest.setup.js`), wie in `kaution-dialog.test.tsx`.
 */
function raeumeNachJedemTestAuf() {
  afterEach(async () => {
    cleanup();
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
  });
}

describe("KautionBuchungForm: Zinsgutschrift, Zeitraum und Vorschlag", () => {
  raeumeNachJedemTestAuf();
  it("zeigt den Zeitraum mit einschließlichem Ende und die Wertstellung am Tag danach", () => {
    const { formular } = renderForm();

    expect(within(formular).getByLabelText("Zinszeitraum von")).toHaveValue("01.01.2025");
    expect(within(formular).getByLabelText("Zinszeitraum bis (einschließlich)")).toHaveValue("31.12.2025");
    expect(within(formular).getByLabelText("Wertstellung")).toHaveValue("01.01.2026");
    expect(formular).toHaveAttribute("data-bewegungsart", "zinsgutschrift");
  });

  it("berechnet den Vorschlag für den Zeitraum, füllt den Betrag vor und zeigt die Abschnitte", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    berechneMock.mockResolvedValue({ success: true, data: VORSCHLAG });
    const { formular } = renderForm();

    await user.click(within(formular).getByRole("button", { name: "Zinsen berechnen" }));

    // Exclusive end to the server: the day after the inclusive end.
    expect(berechneMock).toHaveBeenCalledWith({ kautionId: KAUTION_ID, von: "2025-01-01", bis: "2026-01-01" });
    expect(await within(formular).findByText(/Berechneter Zinsbetrag:/)).toHaveTextContent("15,04 €");
    expect(within(formular).getByLabelText("Betrag (€)")).toHaveValue("15,04");
    expect(within(formular).getByRole("table", { name: "Abschnitte der Zinsberechnung" })).toHaveTextContent("31.12.2025");
  });

  it("bucht den Vorschlag mit dem Tag nach dem einschließlichen Ende als Zinszeitraum-Ende", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    berechneMock.mockResolvedValue({ success: true, data: VORSCHLAG });
    const { formular, onGebucht } = renderForm();
    await user.click(within(formular).getByRole("button", { name: "Zinsen berechnen" }));
    await within(formular).findByText(/Berechneter Zinsbetrag:/);

    await user.click(within(formular).getByRole("button", { name: "Buchen" }));

    await waitFor(() => expect(bucheMock).toHaveBeenCalledTimes(1));
    expect(bucheMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        kautionId: KAUTION_ID,
        art: "zinsgutschrift",
        betrag: "15,04",
        wertstellung: "2026-01-01",
        zinszeitraumVon: "2025-01-01",
        zinszeitraumBis: "2026-01-01",
        idempotenzSchluessel: expect.stringMatching(/^[0-9a-f-]{36}$/i),
      })
    );
    expect(onGebucht).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Buchung erfasst." }));
  });

  it("verlangt ohne Berechnung keine Buchung, sondern zeigt den Hinweis zur Berechnung", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { formular } = renderForm();
    fireEvent.change(within(formular).getByLabelText("Betrag (€)"), { target: { value: "15,04" } });

    await user.click(within(formular).getByRole("button", { name: "Buchen" }));

    expect(await within(formular).findByText("Bitte berechnen Sie zuerst die Zinsen für diesen Zeitraum.")).toBeInTheDocument();
    expect(bucheMock).not.toHaveBeenCalled();
  });

  it("macht einen Vorschlag ungültig, sobald der Zeitraum geändert wird", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    berechneMock.mockResolvedValue({ success: true, data: VORSCHLAG });
    const { formular } = renderForm();
    await user.click(within(formular).getByRole("button", { name: "Zinsen berechnen" }));
    await within(formular).findByText(/Berechneter Zinsbetrag:/);

    setzeDatum(within(formular).getByLabelText("Zinszeitraum bis (einschließlich)"), "30.12.2025");
    await user.click(within(formular).getByRole("button", { name: "Buchen" }));

    expect(await within(formular).findByText("Bitte berechnen Sie zuerst die Zinsen für diesen Zeitraum.")).toBeInTheDocument();
    expect(bucheMock).not.toHaveBeenCalled();
  });

  it("zeigt bei einem ungültigen Zeitraum (Ende vor Beginn) einen Fehler am Feld, ohne zu rechnen", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { formular } = renderForm();
    setzeDatum(within(formular).getByLabelText("Zinszeitraum bis (einschließlich)"), "31.12.2024");

    await user.click(within(formular).getByRole("button", { name: "Zinsen berechnen" }));

    expect(within(formular).getByRole("button", { name: "Zinsen berechnen" })).toBeDisabled();
    await user.click(within(formular).getByRole("button", { name: "Buchen" }));
    expect(await within(formular).findByText("Das Ende des Zinszeitraums muss nach dem Beginn liegen.")).toBeInTheDocument();
    expect(berechneMock).not.toHaveBeenCalled();
    expect(bucheMock).not.toHaveBeenCalled();
  });
});

describe("KautionBuchungForm: Zinsgutschrift, Begründung", () => {
  raeumeNachJedemTestAuf();
  it("verlangt bei einer Abweichung vom Vorschlag einen Grund und bucht mit Grund", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    berechneMock.mockResolvedValue({ success: true, data: VORSCHLAG });
    const { formular } = renderForm();
    await user.click(within(formular).getByRole("button", { name: "Zinsen berechnen" }));
    await within(formular).findByText(/Berechneter Zinsbetrag:/);

    const betrag = within(formular).getByLabelText("Betrag (€)");
    fireEvent.change(betrag, { target: { value: "20,00" } });
    expect(within(formular).getByLabelText(/Grund \(Pflicht, mindestens 3 Zeichen\)/)).toBeInTheDocument();
    expect(within(formular).getByText("Abweichung vom berechneten Betrag begründen (z. B. Gutschrift der Bank).")).toBeInTheDocument();

    await user.click(within(formular).getByRole("button", { name: "Buchen" }));
    expect(await within(formular).findByText("Bitte begründen Sie die Abweichung vom berechneten Betrag (mindestens 3 Zeichen).")).toBeInTheDocument();
    expect(bucheMock).not.toHaveBeenCalled();

    await user.type(within(formular).getByLabelText(/Grund \(Pflicht/), "Gutschrift der Bank");
    await user.click(within(formular).getByRole("button", { name: "Buchen" }));

    await waitFor(() => expect(bucheMock).toHaveBeenCalledTimes(1));
    expect(bucheMock).toHaveBeenCalledWith(expect.objectContaining({ betrag: "20,00", grund: "Gutschrift der Bank" }));
  });

  it("bucht ohne Grund, solange der Betrag dem Vorschlag entspricht", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    berechneMock.mockResolvedValue({ success: true, data: VORSCHLAG });
    const { formular } = renderForm();
    await user.click(within(formular).getByRole("button", { name: "Zinsen berechnen" }));
    await within(formular).findByText(/Berechneter Zinsbetrag:/);

    // Same amount in another notation: the comparison is by exact cents, not by the typed text.
    fireEvent.change(within(formular).getByLabelText("Betrag (€)"), { target: { value: "15.04" } });
    await user.click(within(formular).getByRole("button", { name: "Buchen" }));

    await waitFor(() => expect(bucheMock).toHaveBeenCalledTimes(1));
    expect(bucheMock.mock.calls[0][0].grund).toBeUndefined();
  });

  it("zeigt bei fehlendem Zinssatz den Hinweis, verlangt den Betrag manuell und einen Grund", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    berechneMock.mockResolvedValue({ success: true, data: KEIN_SATZ });
    const { formular } = renderForm();

    await user.click(within(formular).getByRole("button", { name: "Zinsen berechnen" }));

    expect(await within(formular).findByText(/Für den Zeitraum ist kein Zinssatz hinterlegt \(ab 01\.01\.2025\)/)).toBeInTheDocument();
    expect(within(formular).getByLabelText("Betrag (€)")).toHaveValue("");

    fireEvent.change(within(formular).getByLabelText("Betrag (€)"), { target: { value: "10,00" } });
    await user.click(within(formular).getByRole("button", { name: "Buchen" }));
    expect(await within(formular).findByText("Bitte begründen Sie den manuell erfassten Betrag (mindestens 3 Zeichen).")).toBeInTheDocument();
    expect(bucheMock).not.toHaveBeenCalled();

    await user.type(within(formular).getByLabelText(/Grund \(Pflicht/), "Manuelle Gutschrift");
    await user.click(within(formular).getByRole("button", { name: "Buchen" }));

    await waitFor(() => expect(bucheMock).toHaveBeenCalledTimes(1));
    expect(bucheMock).toHaveBeenCalledWith(expect.objectContaining({ betrag: "10,00", grund: "Manuelle Gutschrift" }));
  });

  it("zeigt die Berechnungsfehler des Servers am Formular und fragt nicht erneut", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    berechneMock.mockResolvedValue({ success: false, error: { message: "Das Datum oder der Zeitraum ist ungültig.", code: "KA013" } });
    const { formular, onFehler } = renderForm();

    await user.click(within(formular).getByRole("button", { name: "Zinsen berechnen" }));

    expect(await within(formular).findByText("Das Datum oder der Zeitraum ist ungültig.")).toBeInTheDocument();
    expect(onFehler).toHaveBeenCalledWith(expect.objectContaining({ code: "KA013" }));
  });
});

describe("KautionBuchungForm: Zinsgutschrift, Rechte und Barrierefreiheit", () => {
  raeumeNachJedemTestAuf();
  it("deaktiviert das Formular ohne Buchungsrecht", () => {
    const { formular } = renderForm(ZINS_VORGABE, false);
    expect(within(formular).getByRole("button", { name: "Buchen" })).toBeDisabled();
    expect(within(formular).getByRole("button", { name: "Zinsen berechnen" })).toBeDisabled();
  });

  it("hat keine Verstöße gegen die Barrierefreiheit (jest-axe)", async () => {
    berechneMock.mockResolvedValue({ success: true, data: VORSCHLAG });
    const { container } = renderForm();
    // Vorbestehend, nicht durch dieses Formular verursacht: der Wrapper des DatePicker (`components/ui/date-picker.tsx`)
    // trägt `aria-expanded` an einem <div> mit `aria-haspopup`. Die Regel `aria-allowed-attr` ist deshalb nur für diesen
    // Test aus; alle übrigen Regeln gelten für das Formular.
    await pruefeZugaenglichkeit(container);
  });
});
