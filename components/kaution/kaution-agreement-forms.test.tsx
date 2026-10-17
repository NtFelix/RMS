/**
 * Tests of the agreement fields in the creation form and the agreement form (GH-6, phase 3): deposit types from the flag,
 * fields per type, IBAN check, separate-account notice, interest method with the interest function, and the clearing of the
 * fields of the old type after a type change. Accessibility checked with jest-axe.
 *
 * All values are synthetic; the IBAN is the public example from the specification. The server actions are mocked.
 */

import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { KautionAnlegenForm } from "@/components/kaution/kaution-anlegen-form";
import { KautionVereinbarungForm } from "@/components/kaution/kaution-vereinbarung-form";
import { createKautionAction, updateKautionVereinbarungAction } from "@/app/kautionen-actions";
import { useKautionFlag } from "@/hooks/use-kaution-flag";
import { GETRENNT_HINWEIS_TEXT } from "@/lib/kautionen-vereinbarung";
import type { Kaution, KautionArt } from "@/types/Kaution";
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
  createKautionAction: jest.fn(),
  updateKautionVereinbarungAction: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn(), useToast: jest.fn() }));
jest.mock("@/hooks/use-kaution-flag", () => ({ useKautionFlag: jest.fn() }));

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const KAUTION_ID = "22222222-2222-4222-8222-222222222222";
const IBAN_BEISPIEL = "DE89370400440532013000";

const createMock = createKautionAction as jest.Mock;
const updateMock = updateKautionVereinbarungAction as jest.Mock;
const flagMock = useKautionFlag as unknown as jest.Mock;

/** Flag payload of the test: the offered deposit types and the function flags (all others off). */
function setzeFlag(arten: KautionArt[], funktionen: Partial<Record<KautionFunktion, boolean>> = {}) {
  flagMock.mockReturnValue({
    aktiv: true,
    arten,
    bewegungsarten: ["einzahlung", "auszahlung", "abzug"],
    funktionen: { raten: false, dokumente: false, fristen: false, zinsen: false, abrechnung: false, ...funktionen },
  });
}

/** Stored bank account deposit (synthetic). */
function bankKaution(aenderung: Partial<Kaution> = {}): Kaution {
  return {
    id: KAUTION_ID,
    organisation_id: "44444444-4444-4444-8444-444444444444",
    mieter_id: TENANT_ID,
    kautionsart: "barkaution",
    soll_betrag: 1500,
    miete_bei_vertragsschluss: 500,
    interne_notiz: null,
    quelle: "app",
    erstellt_am: "2026-01-05T09:00:00Z",
    geaendert_am: "2026-01-05T09:00:00Z",
    iban: IBAN_BEISPIEL,
    bank: "Beispielbank (Testdaten)",
    kontoinhaber: "Max Muster (Testdaten)",
    getrennt_angelegt: true,
    zinsmethode: "act_365",
    ...aenderung,
  };
}

function renderAnlegen() {
  const onErstellt = jest.fn();
  const onFehler = jest.fn(() => false);
  render(
    <KautionAnlegenForm
      tenantId={TENANT_ID}
      vorschlag={null}
      darfErstellen
      onErstellt={onErstellt}
      onFehler={onFehler}
      onAbbrechen={jest.fn()}
    />
  );
  return { onErstellt, onFehler };
}

function renderVereinbarung(kaution: Kaution, artAenderbar = true) {
  const onGespeichert = jest.fn();
  const onFehler = jest.fn(() => false);
  render(
    <KautionVereinbarungForm
      tenantId={TENANT_ID}
      kaution={kaution}
      darfBearbeiten
      artAenderbar={artAenderbar}
      onGespeichert={onGespeichert}
      onFehler={onFehler}
      onAbbrechen={jest.fn()}
    />
  );
  return { onGespeichert, onFehler };
}

/** Opens a Radix select and picks an option by its visible text. */
async function waehle(user: ReturnType<typeof userEvent.setup>, feld: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: feld }));
  await user.click(await screen.findByRole("option", { name: option }));
}

beforeEach(() => {
  jest.resetAllMocks();
  createMock.mockResolvedValue({ success: true, data: { kautionId: KAUTION_ID } });
  updateMock.mockResolvedValue({ success: true, data: undefined });
  setzeFlag(["barkaution"]);
});

/**
 * Räumt nach jedem Test auf, bevor `jest.setup.js` die Fake-Timer leert (Muster wie in `kaution-raten-tab.test.tsx`).
 * Die Hooks stehen in einem `describe`, damit sie vor denen von `jest.setup.js` laufen.
 */
function raeumeNachJedemTestAuf() {
  afterEach(async () => {
    cleanup();
    await waitFor(() => undefined);
  });
}

describe("KautionAnlegenForm: Kautionsart und Felder je Art", () => {
  raeumeNachJedemTestAuf();

  it("bietet nur die Kautionsarten an, die der Flag freigibt", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    setzeFlag(["barkaution", "buergschaft"]);
    renderAnlegen();

    await user.click(screen.getByRole("combobox", { name: "Kautionsart" }));

    const optionen = await screen.findAllByRole("option");
    expect(optionen.map((option) => option.textContent)).toEqual(["Barkaution", "Bürgschaft"]);
  });

  it("zeigt bei einem Bankkonto Bankfelder, bei Bürgschaft Bürge und Urkundennummer", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    setzeFlag(["barkaution", "buergschaft"]);
    renderAnlegen();

    expect(screen.getByLabelText("IBAN")).toBeInTheDocument();
    expect(screen.getByLabelText("Bank")).toBeInTheDocument();
    expect(screen.getByLabelText("Kontoinhaber")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Getrennt vom eigenen Vermögen angelegt" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Bürge / Versicherer")).not.toBeInTheDocument();

    await waehle(user, "Kautionsart", "Bürgschaft");

    expect(screen.queryByLabelText("IBAN")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Bürge / Versicherer")).toBeInTheDocument();
    expect(screen.getByLabelText("Urkunden-/Policennummer")).toBeInTheDocument();
    expect(screen.getByLabelText("Bürgschafts-/Versicherungssumme (€)")).toBeInTheDocument();
  });

  it("zeigt die Zinsmethode nur, wenn die Zinsfunktion an ist", () => {
    setzeFlag(["barkaution"], { zinsen: false });
    const { unmount } = render(
      <KautionAnlegenForm tenantId={TENANT_ID} vorschlag={null} darfErstellen onErstellt={jest.fn()} onFehler={jest.fn()} onAbbrechen={jest.fn()} />
    );
    expect(screen.queryByRole("combobox", { name: "Zinsmethode" })).not.toBeInTheDocument();
    unmount();

    setzeFlag(["barkaution"], { zinsen: true });
    renderAnlegen();
    expect(screen.getByRole("combobox", { name: "Zinsmethode" })).toHaveTextContent("act/365");
  });

  it("sendet Kontodaten, Trennung und Zinsmethode mit, wenn sie ausgefüllt sind", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    setzeFlag(["barkaution"], { zinsen: true });
    const { onErstellt } = renderAnlegen();

    await user.type(screen.getByLabelText("Soll-Betrag (€)"), "1500,00");
    await user.type(screen.getByLabelText("IBAN"), IBAN_BEISPIEL);
    await user.type(screen.getByLabelText("Bank"), "Beispielbank (Testdaten)");
    await user.type(screen.getByLabelText("Kontoinhaber"), "Max Muster (Testdaten)");
    await waehle(user, "Getrennt vom eigenen Vermögen angelegt", "Ja");
    await user.click(screen.getByRole("button", { name: "Kaution anlegen" }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        kautionsart: "barkaution",
        sollBetrag: "1500,00",
        iban: IBAN_BEISPIEL,
        bank: "Beispielbank (Testdaten)",
        kontoinhaber: "Max Muster (Testdaten)",
        getrenntAngelegt: true,
        zinsmethode: "act_365",
      })
    );
    expect(createMock.mock.calls[0][0]).not.toHaveProperty("buergeVersicherer");
    await waitFor(() => expect(onErstellt).toHaveBeenCalled());
  });

  it("meldet eine ungültige IBAN am Feld, ohne zu speichern", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderAnlegen();
    await user.type(screen.getByLabelText("Soll-Betrag (€)"), "1500,00");
    await user.type(screen.getByLabelText("IBAN"), "DE00 0000 0000 0000 0000 00");
    expect(screen.getByText("Diese IBAN ist ungültig. Bitte prüfen Sie die Eingabe.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Kaution anlegen" }));

    expect(await screen.findByText("Bitte geben Sie eine gültige IBAN an.")).toBeInTheDocument();
    expect(screen.getByLabelText("IBAN")).toHaveAttribute("aria-invalid", "true");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("gruppiert die IBAN beim Verlassen des Feldes", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderAnlegen();
    await user.type(screen.getByLabelText("IBAN"), IBAN_BEISPIEL);
    await user.tab();

    expect(screen.getByLabelText("IBAN")).toHaveValue("DE89 3704 0044 0532 0130 00");
  });

  it("zeigt den Hinweis zur getrennten Anlage, solange die Trennung nicht bestätigt ist", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderAnlegen();

    expect(screen.getByText(GETRENNT_HINWEIS_TEXT)).toBeInTheDocument();

    await waehle(user, "Getrennt vom eigenen Vermögen angelegt", "Ja");

    expect(screen.queryByText(GETRENNT_HINWEIS_TEXT)).not.toBeInTheDocument();
  });

  it("hat keine Verstöße gegen die Barrierefreiheit (jest-axe)", async () => {
    const { container } = render(
      <KautionAnlegenForm tenantId={TENANT_ID} vorschlag={null} darfErstellen onErstellt={jest.fn()} onFehler={jest.fn()} onAbbrechen={jest.fn()} />
    );
    await pruefeZugaenglichkeit(container);
  });
});

describe("KautionVereinbarungForm: Artwechsel und Änderungen", () => {
  raeumeNachJedemTestAuf();

  it("speichert nichts ohne Änderung", () => {
    renderVereinbarung(bankKaution());
    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
  });

  it("leert beim Wechsel zur Bürgschaft die Kontofelder mit null und sendet die neue Art", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    setzeFlag(["barkaution", "buergschaft"]);
    const { onGespeichert } = renderVereinbarung(bankKaution());

    await waehle(user, "Kautionsart", "Bürgschaft");
    await user.type(screen.getByLabelText("Bürge / Versicherer"), "Beispiel Bürge (Testdaten)");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      kautionId: KAUTION_ID,
      felder: {
        kautionsart: "buergschaft",
        iban: null,
        bank: null,
        kontoinhaber: null,
        getrennt_angelegt: null,
        buerge_versicherer: "Beispiel Bürge (Testdaten)",
      },
    });
    await waitFor(() => expect(onGespeichert).toHaveBeenCalled());
  });

  it("zeigt die Kautionsart als Text, wenn sie nicht mehr geändert werden darf", () => {
    setzeFlag(["barkaution", "buergschaft"]);
    renderVereinbarung(bankKaution(), false);

    expect(screen.queryByRole("combobox", { name: "Kautionsart" })).not.toBeInTheDocument();
    expect(screen.getByText("Die Kautionsart lässt sich nicht mehr ändern, weil bereits Buchungen, ein Ratenplan oder eine Zinsstaffel bestehen.")).toBeInTheDocument();
  });

  it("sendet bei einer Kontoänderung nur die geänderte Bankangabe", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderVereinbarung(bankKaution());

    const bank = screen.getByLabelText("Bank");
    await user.clear(bank);
    await user.type(bank, "Andere Testbank");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock.mock.calls[0][0].felder).toEqual({ bank: "Andere Testbank" });
  });

  it("hat keine Verstöße gegen die Barrierefreiheit (jest-axe)", async () => {
    const { container } = render(
      <KautionVereinbarungForm
        tenantId={TENANT_ID}
        kaution={bankKaution()}
        darfBearbeiten
        artAenderbar
        onGespeichert={jest.fn()}
        onFehler={jest.fn()}
        onAbbrechen={jest.fn()}
      />
    );
    await pruefeZugaenglichkeit(container);
  });
});

