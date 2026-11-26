/**
 * Tests of the block "Frühere Kautionen" (GH-6, takeover of an earlier deposit after a move): rows, takeover action,
 * busy state, error handling through the dialog callback, rights.
 *
 * All values are synthetic. The server action and the toast are mocked.
 */

import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KautionFruehereListe } from "@/components/kaution/kaution-fruehere-liste";
import { kautionUebernehmenAction } from "@/app/kautionen-actions";
import { toast } from "@/hooks/use-toast";
import type { KautionListenEintrag } from "@/types/Kaution";

jest.mock("@/app/kautionen-actions", () => ({ kautionUebernehmenAction: jest.fn() }));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn(), useToast: jest.fn() }));

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const ID_1 = "66666666-6666-4666-8666-666666666661";
const ID_2 = "66666666-6666-4666-8666-666666666662";

const uebernehmenMock = kautionUebernehmenAction as jest.Mock;
const toastMock = toast as unknown as jest.Mock;

function baueEintraege(): KautionListenEintrag[] {
  return [
    {
      kautionId: ID_1,
      mietverhaeltnisId: "77777777-7777-4777-8777-777777777771",
      kautionsart: "barkaution",
      sollBetrag: 1200,
      kontostand: 950.5,
      istAktuell: false,
      vertragsbeginn: "2023-02-01",
      vertragsende: "2024-12-31",
    },
    {
      kautionId: ID_2,
      mietverhaeltnisId: null,
      kautionsart: "buergschaft",
      sollBetrag: 3000,
      kontostand: 0,
      istAktuell: false,
      vertragsbeginn: "2021-05-01",
      vertragsende: null,
    },
  ];
}

function renderListe(overrides: Partial<React.ComponentProps<typeof KautionFruehereListe>> = {}) {
  const props = {
    tenantId: TENANT_ID,
    eintraege: baueEintraege(),
    onUebernommen: jest.fn(),
    onFehler: jest.fn(() => false),
    ...overrides,
  };
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  render(<KautionFruehereListe {...props} />);
  return { user, props };
}

beforeEach(() => {
  jest.resetAllMocks();
});

// A never-answering action must not leak its pending React work into the next test (fake timers, see dialog tests).
afterEach(async () => {
  cleanup();
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
});

describe("KautionFruehereListe", () => {
  it("rendert nichts ohne Einträge", () => {
    const { container } = render(
      <KautionFruehereListe tenantId={TENANT_ID} eintraege={[]} onUebernommen={jest.fn()} onFehler={jest.fn(() => false)} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("zeigt Überschrift, Hinweis und je Eintrag Art, Beträge, Mietverhältnis und einen Übernehmen-Knopf", () => {
    renderListe();

    expect(screen.getByRole("heading", { name: "Frühere Kautionen" })).toBeInTheDocument();
    expect(
      screen.getByText("Sie können eine frühere Kaution für das aktuelle Mietverhältnis übernehmen oder unten eine neue anlegen.")
    ).toBeInTheDocument();
    expect(screen.getByText("Barkaution")).toBeInTheDocument();
    expect(screen.getByText("Soll-Betrag 1.200,00 € · Kontostand 950,50 €")).toBeInTheDocument();
    expect(screen.getByText("Mietverhältnis: 01.02.2023 – 31.12.2024")).toBeInTheDocument();
    expect(screen.getByText("Mietverhältnis: 01.05.2021 – offen")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Übernehmen" })).toHaveLength(2);
  });

  it("übernimmt den gewählten Eintrag, zeigt die Meldung und ruft onUebernommen auf", async () => {
    uebernehmenMock.mockResolvedValue({ success: true, data: { kautionId: ID_2 } });
    const { user, props } = renderListe();

    await user.click(screen.getAllByRole("button", { name: "Übernehmen" })[1]);

    await waitFor(() => expect(props.onUebernommen).toHaveBeenCalledTimes(1));
    expect(uebernehmenMock).toHaveBeenCalledTimes(1);
    expect(uebernehmenMock).toHaveBeenCalledWith(TENANT_ID, ID_2);
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Die Kaution wurde übernommen.", variant: "success" }));
    expect(props.onFehler).not.toHaveBeenCalled();
  });

  it("sperrt alle Knöpfe, solange eine Übernahme läuft, und sendet keinen zweiten Aufruf", async () => {
    uebernehmenMock.mockReturnValue(new Promise(() => undefined)); // antwortet nie
    const { user } = renderListe();

    await user.click(screen.getAllByRole("button", { name: "Übernehmen" })[0]);

    const laufend = await screen.findByRole("button", { name: "Wird übernommen..." });
    expect(laufend).toBeDisabled();
    expect(laufend).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Übernehmen" })).toBeDisabled();
    expect(uebernehmenMock).toHaveBeenCalledTimes(1);
  });

  it("zeigt einen Fehler am Block, wenn der Dialog ihn nicht behandelt", async () => {
    uebernehmenMock.mockResolvedValue({
      success: false,
      error: { code: "KA011", message: "Der Ratenplan lässt diese Übernahme nicht zu (Testdaten)." },
    });
    const { user, props } = renderListe({ onFehler: jest.fn(() => false) });

    // The answer arrives after the click: it is handled inside `act` so that its state update is flushed.
    await act(async () => {
      await user.click(screen.getAllByRole("button", { name: "Übernehmen" })[0]);
    });

    expect(screen.getByText("Der Ratenplan lässt diese Übernahme nicht zu (Testdaten).")).toBeInTheDocument();
    expect(props.onFehler).toHaveBeenCalledWith(expect.objectContaining({ code: "KA011" }));
    expect(props.onUebernommen).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: "Übernehmen" })[0]).toBeEnabled();
  });

  it("überlässt den Fehler dem Dialog, wenn dieser ihn behandelt (keine Meldung am Block)", async () => {
    uebernehmenMock.mockResolvedValue({ success: false, error: { code: "KA003", message: "Nicht gefunden (Testdaten)." } });
    const { user, props } = renderListe({ onFehler: jest.fn(() => true) });

    await user.click(screen.getAllByRole("button", { name: "Übernehmen" })[0]);

    await waitFor(() => expect(props.onFehler).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Nicht gefunden (Testdaten).")).not.toBeInTheDocument();
    expect(props.onUebernommen).not.toHaveBeenCalled();
  });

  it("zeigt die feste Meldung bei einem Übertragungsfehler", async () => {
    uebernehmenMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { user, props } = renderListe();

    await act(async () => {
      await user.click(screen.getAllByRole("button", { name: "Übernehmen" })[0]);
    });

    expect(screen.getByText("Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut.")).toBeInTheDocument();
    expect(props.onUebernommen).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: "Übernehmen" })[0]).toBeEnabled();
  });

  it("deaktiviert die Knöpfe ohne Recht und erklärt den Grund", () => {
    renderListe({ disabled: true });

    expect(screen.getByText("Für das Übernehmen einer Kaution fehlt Ihnen die Berechtigung.")).toBeInTheDocument();
    for (const knopf of screen.getAllByRole("button", { name: "Übernehmen" })) {
      expect(knopf).toBeDisabled();
    }
  });

  it("verknüpft jeden Knopf mit den Angaben seines Eintrags", () => {
    renderListe();

    const knopf = screen.getAllByRole("button", { name: "Übernehmen" })[0];
    const beschreibung = document.getElementById(knopf.getAttribute("aria-describedby") ?? "");
    expect(beschreibung).toHaveTextContent("Soll-Betrag 1.200,00 €");
  });
});
