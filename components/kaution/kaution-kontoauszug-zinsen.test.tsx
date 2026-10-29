/**
 * Tests of the statement for interest credits (GH-6, phase 3): the period with the inclusive end, the expandable
 * "Berechnungsgrundlage" (proposal against booked amount, deviation, manual credit), the interest booking button with its
 * flag, and the form opened from the Zinsen tab. Accessibility checked with jest-axe.
 *
 * All values are synthetic. The server actions are mocked.
 */

import React from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { KautionKontoauszugTab } from "@/components/kaution/kaution-kontoauszug-tab";
import type { KautionBuchungVorgabe } from "@/components/kaution/kaution-buchung-form";
import { useKautionFlag } from "@/hooks/use-kaution-flag";
import type { KautionBewegung, KautionDetails, KautionRechte, KautionZinsGrundlage } from "@/types/Kaution";
import type { KautionFunktion } from "@/lib/kautionen-flag";

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
  bucheKautionBewegungAction: jest.fn(),
  berechneKautionZinsenAction: jest.fn(),
  storniereKautionBewegungAction: jest.fn(),
  getKautionBelegUrlAction: jest.fn(),
  entferneKautionBelegAction: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn(), useToast: jest.fn() }));
jest.mock("@/hooks/use-kaution-flag", () => ({ useKautionFlag: jest.fn() }));

const KAUTION_ID = "22222222-2222-4222-8222-222222222222";
const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const BEWEGUNG_ZINS = "33333333-3333-4333-8333-333333333331";
const BEWEGUNG_MANUELL = "33333333-3333-4333-8333-333333333332";
const ALLE_RECHTE: KautionRechte = { ansehen: true, erstellen: true, bearbeiten: true, loeschen: true };

const flagMock = useKautionFlag as unknown as jest.Mock;

function setzeFunktionen(funktionen: Partial<Record<KautionFunktion, boolean>> = {}) {
  flagMock.mockReturnValue({
    aktiv: true,
    arten: ["barkaution"],
    bewegungsarten: ["einzahlung", "zinsgutschrift", "auszahlung", "abzug"],
    funktionen: { raten: false, dokumente: false, fristen: false, zinsen: false, abrechnung: false, ...funktionen },
  });
}

/** Interest credit with a calculation basis: proposal 15,04 €, booked 20,00 € (deviation 4,96 €). Synthetic. */
const GRUNDLAGE: KautionZinsGrundlage = {
  regelwerk_version: 1,
  methode: "act_365",
  von: "2025-01-01",
  bis: "2026-01-01",
  manuell: false,
  vorschlag_betrag: 15.04,
  gebucht_betrag: 20,
  abweichung: 4.96,
  staffel: [{ gueltig_ab: "2025-01-01", zinssatz_prozent: 1 }],
  segmente: [{ von: "2025-01-01", bis: "2026-01-01", tage: 365, zinssatz_prozent: 1, saldo: 1504.11, divisor: 365, zins: "15.0411" }],
};

function bewegung(teil: Partial<KautionBewegung> & Pick<KautionBewegung, "id" | "bewegungsart" | "betrag" | "wertstellung">): KautionBewegung {
  return {
    vorzeichen: teil.bewegungsart === "abzug" || teil.bewegungsart === "auszahlung" ? -1 : 1,
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

function baueDetails(): KautionDetails {
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
    },
    konto: {
      summe_einzahlungen: 1000,
      summe_zinsgutschriften: 35,
      summe_auszahlungen: 0,
      summe_abzuege: 0,
      kontostand: 1035,
      erste_einzahlung: "2025-01-05",
      letzte_wertstellung: "2026-02-01",
      anzahl_aktiv: 3,
      anzahl_storniert: 0,
    },
    zustand: "verwahrt",
    mietende: null,
    stichtag: "2026-10-17",
    warnungen: { dreifache_miete: 1500, soll_ueber_dreifache_miete: false, einzahlungen_ueber_dreifache_miete: false },
    kontoauszug: [
      bewegung({ id: "33333333-3333-4333-8333-333333333330", bewegungsart: "einzahlung", betrag: 1000, wertstellung: "2025-01-05", saldo_nach_buchung: 1000 }),
      bewegung({
        id: BEWEGUNG_ZINS,
        bewegungsart: "zinsgutschrift",
        betrag: 20,
        wertstellung: "2026-01-01",
        zinszeitraum_von: "2025-01-01",
        zinszeitraum_bis: "2026-01-01",
        berechnungsgrundlage: GRUNDLAGE,
        grund: "Gutschrift der Bank (Testdaten)",
        saldo_nach_buchung: 1020,
      }),
      bewegung({
        id: BEWEGUNG_MANUELL,
        bewegungsart: "zinsgutschrift",
        betrag: 15,
        wertstellung: "2026-02-01",
        zinszeitraum_von: "2026-01-01",
        zinszeitraum_bis: "2026-02-01",
        berechnungsgrundlage: {
          regelwerk_version: 1,
          methode: "manuell",
          von: "2026-01-01",
          bis: "2026-02-01",
          manuell: true,
          gebucht_betrag: 15,
        },
        grund: "Manuelle Gutschrift (Testdaten)",
        saldo_nach_buchung: 1035,
      }),
    ],
  };
}

interface Props {
  zahlungsVorgabe?: (KautionBuchungVorgabe & { nonce: number }) | null;
  rechte?: KautionRechte;
}

function renderTab(props: Props = {}) {
  return render(
    <KautionKontoauszugTab
      details={baueDetails()}
      rechte={props.rechte ?? ALLE_RECHTE}
      tenantId={TENANT_ID}
      onGeaendert={jest.fn()}
      onFehler={jest.fn(() => false)}
      onVerwerfenBestaetigen={(weiter) => weiter()}
      zahlungsVorgabe={props.zahlungsVorgabe ?? null}
    />
  );
}

beforeEach(() => {
  jest.resetAllMocks();
  setzeFunktionen({ zinsen: true });
});

/**
 * Räumt nach jedem Test auf, bevor `jest.setup.js` die Fake-Timer leert (Muster wie in `kaution-dialog.test.tsx`).
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

describe("KautionKontoauszugTab: Zinsgutschriften", () => {
  raeumeNachJedemTestAuf();

  it("zeigt den Zinszeitraum mit dem Enddatum einschließlich", () => {
    renderTab();

    expect(screen.getByText("Zinsen für 01.01.2025 – 31.12.2025")).toBeInTheDocument();
    expect(screen.getByText("Zinsen für 01.01.2026 – 31.01.2026")).toBeInTheDocument();
  });

  it("klappt die Berechnungsgrundlage auf: Vorschlag, gebuchter Betrag und Abweichung", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();

    await user.click(screen.getByRole("button", { name: /Details zu Zinsgutschrift vom 01\.01\.2026 .* anzeigen/ }));

    const grundlage = screen.getByTestId("kaution-berechnungsgrundlage");
    expect(within(grundlage).getByText("Berechnungsgrundlage")).toBeInTheDocument();
    expect(grundlage).toHaveTextContent("Vorschlag15,04 €");
    expect(grundlage).toHaveTextContent("Gebucht20,00 €");
    expect(grundlage).toHaveTextContent("Abweichung4,96 €");
    expect(within(grundlage).getByRole("table", { name: "Abschnitte der Zinsberechnung" })).toHaveTextContent("15,0411 €");
  });

  it("sagt bei einer manuellen Gutschrift, dass kein Zinssatz hinterlegt ist", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTab();

    await user.click(screen.getByRole("button", { name: /Details zu Zinsgutschrift vom 01\.02\.2026 .* anzeigen/ }));

    expect(screen.getByText("Manuell erfasst, kein Zinssatz hinterlegt.")).toBeInTheDocument();
  });

  it("zeigt den Knopf für die Zinsgutschrift nur mit der Zinsfunktion", () => {
    const { unmount } = renderTab();
    expect(screen.getByRole("group", { name: "Buchung erfassen" })).toHaveTextContent("Zinsgutschrift erfassen");
    unmount();

    setzeFunktionen({ zinsen: false });
    renderTab();
    expect(screen.getByRole("group", { name: "Buchung erfassen" })).not.toHaveTextContent("Zinsgutschrift erfassen");
  });

  it("öffnet das Formular für eine Zinsgutschrift, wenn der Zinsen-Tab einen Zeitraum übergibt", () => {
    renderTab({ zahlungsVorgabe: { art: "zinsgutschrift", von: "2026-02-01", bis: "2026-10-17", nonce: 1 } });

    const formular = screen.getByTestId("kaution-buchung-form");
    expect(formular).toHaveAttribute("data-bewegungsart", "zinsgutschrift");
    expect(within(formular).getByLabelText("Zinszeitraum von")).toHaveValue("01.02.2026");
    expect(within(formular).getByLabelText("Zinszeitraum bis (einschließlich)")).toHaveValue("16.10.2026");
  });

  it("hat keine Verstöße gegen die Barrierefreiheit (jest-axe)", async () => {
    const { container } = renderTab();
    await pruefeZugaenglichkeit(container);
  });
});
