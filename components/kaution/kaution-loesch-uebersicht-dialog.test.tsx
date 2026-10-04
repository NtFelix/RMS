import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KautionLoeschUebersichtDialog } from "@/components/kaution/kaution-loesch-uebersicht-dialog";
import type { KautionLoeschauswirkung } from "@/types/Kaution";

// `jest.setup.js` ersetzt den Store global durch einen Mock: hier wird der echte Store verwendet.
jest.mock("@/hooks/use-modal-store", () => jest.requireActual("@/hooks/use-modal-store"));

const { useModalStore } = jest.requireActual<typeof import("@/hooks/use-modal-store")>("@/hooks/use-modal-store");

function auswirkung(overrides: Partial<KautionLoeschauswirkung> = {}): KautionLoeschauswirkung {
  return {
    tabelle: "Haeuser",
    anzahl_haeuser: 1,
    anzahl_wohnungen: 2,
    anzahl_mieter: 3,
    kautionen_sichtbar: true,
    kautionen: {
      anzahl: 3,
      ohne_buchungen: 1,
      mit_buchungen: 2,
      konto_noch_offen: 900,
      konto_verwahrt: 600,
      dokumentiert_anzahl: 1,
      dokumentiert_summe: 2000,
      mit_saldo_anzahl: 1,
      mit_buchungen_gekuerzt: false,
      mit_buchungen_liste: [
        { mieter_id: "m1", name: "Muster Mieter A", kautionsart: "barkaution", kontostand: 600, anzahl_buchungen: 2 },
        { mieter_id: "m2", name: null, kautionsart: "sparbuch", kontostand: 0, anzahl_buchungen: 1 },
      ],
    },
    pruefsumme: "cccccccccccccccccccccccccccccccc",
    eintraege: [{ id: "h1", anzahl_mieter: 3, mit_buchungen: 2, pruefsumme: "cccccccccccccccccccccccccccccccc" }],
    ...overrides,
  };
}

function oeffne(impact: KautionLoeschauswirkung = auswirkung()) {
  const onEntscheidung = jest.fn();
  act(() => {
    useModalStore.getState().openLoeschUebersicht({ auswirkung: impact, onEntscheidung });
  });
  return onEntscheidung;
}

beforeEach(() => {
  useModalStore.setState({ isLoeschUebersichtOpen: false, loeschUebersichtConfig: null });
});

describe("KautionLoeschUebersichtDialog", () => {
  it("renders nothing while no request is open", () => {
    render(<KautionLoeschUebersichtDialog />);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows what is affected and the figures reported by the database", () => {
    render(<KautionLoeschUebersichtDialog />);
    oeffne();

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("Kautionen werden mitgelöscht")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("1 Haus, 2 Wohnungen und 3 Mieter");
    expect(dialog).toHaveTextContent("2 Kautionen mit Buchungen");
    const summen = within(dialog).getByTestId("kaution-loesch-summen");
    expect(summen).toHaveTextContent("Noch offen (Soll abzüglich Eingezahltes)");
    expect(summen).toHaveTextContent("900,00");
    expect(summen).toHaveTextContent("Verwahrt (Kontostand)");
    expect(summen).toHaveTextContent("600,00");
    expect(summen).toHaveTextContent("Bürgschaften und Versicherungen (ohne Konto)");
    expect(summen).toHaveTextContent("2.000,00");
    expect(summen).toHaveTextContent("Mieter mit Kontostand ungleich 0");
  });

  it("lists the deposits with bookings (name, kind, balance, number of bookings); a missing name shows 'Mieter'", () => {
    render(<KautionLoeschUebersichtDialog />);
    oeffne();

    const liste = screen.getByRole("region", { name: "Kautionen mit Buchungen" });
    expect(liste).toHaveTextContent("Muster Mieter A");
    expect(liste).toHaveTextContent("2 Buchungen");
    expect(liste).toHaveTextContent("1 Buchung");
    expect(within(liste).getAllByRole("listitem")).toHaveLength(2);
    expect(liste).toHaveAttribute("tabindex", "0");
  });

  it("omits the rows for guarantees and tenants with a balance when there are none", () => {
    render(<KautionLoeschUebersichtDialog />);
    oeffne(auswirkung({ kautionen: { ...auswirkung().kautionen!, dokumentiert_anzahl: 0, dokumentiert_summe: 0, mit_saldo_anzahl: 0 } }));

    const summen = screen.getByTestId("kaution-loesch-summen");
    expect(summen).not.toHaveTextContent("Bürgschaften");
    expect(summen).not.toHaveTextContent("Kontostand ungleich 0");
  });

  it("notes when the list is shortened", () => {
    render(<KautionLoeschUebersichtDialog />);
    oeffne(auswirkung({ kautionen: { ...auswirkung().kautionen!, mit_buchungen_gekuerzt: true } }));

    expect(screen.getByText("Es werden die ersten 100 Kautionen angezeigt.")).toBeInTheDocument();
  });

  it("the delete button stays disabled until the number of tenants is typed", async () => {
    const user = userEvent.setup();
    render(<KautionLoeschUebersichtDialog />);
    const onEntscheidung = oeffne();

    const loeschen = screen.getByRole("button", { name: "Löschen" });
    expect(loeschen).toBeDisabled();

    const feld = screen.getByLabelText(/Zur Bestätigung geben Sie die Anzahl der betroffenen Mieter ein \(3\)/);
    await user.type(feld, "2");
    expect(loeschen).toBeDisabled();
    expect(screen.getByText("Bitte geben Sie 3 ein.")).toBeInTheDocument();
    expect(feld).toHaveAttribute("aria-invalid", "true");

    await user.clear(feld);
    await user.type(feld, "3");
    expect(loeschen).toBeEnabled();
    expect(onEntscheidung).not.toHaveBeenCalled();
  });

  it("confirming reports `true` and closes the overview", async () => {
    const user = userEvent.setup();
    render(<KautionLoeschUebersichtDialog />);
    const onEntscheidung = oeffne();

    await user.type(screen.getByLabelText(/Zur Bestätigung/), "3");
    await user.click(screen.getByRole("button", { name: "Löschen" }));

    expect(onEntscheidung).toHaveBeenCalledWith(true);
    expect(onEntscheidung).toHaveBeenCalledTimes(1);
    expect(useModalStore.getState().isLoeschUebersichtOpen).toBe(false);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("cancelling reports `false` and closes the overview", async () => {
    const user = userEvent.setup();
    render(<KautionLoeschUebersichtDialog />);
    const onEntscheidung = oeffne();

    await user.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(onEntscheidung).toHaveBeenCalledWith(false);
    expect(onEntscheidung).not.toHaveBeenCalledWith(true);
    expect(useModalStore.getState().isLoeschUebersichtOpen).toBe(false);
  });

  it("Escape cancels", async () => {
    const user = userEvent.setup();
    render(<KautionLoeschUebersichtDialog />);
    const onEntscheidung = oeffne();

    await user.keyboard("{Escape}");

    expect(onEntscheidung).toHaveBeenCalledWith(false);
    expect(useModalStore.getState().isLoeschUebersichtOpen).toBe(false);
  });

  it("a new request starts with an empty confirmation field", async () => {
    const user = userEvent.setup();
    render(<KautionLoeschUebersichtDialog />);
    oeffne();
    await user.type(screen.getByLabelText(/Zur Bestätigung/), "3");

    oeffne(auswirkung({ pruefsumme: "dddddddddddddddddddddddddddddddd" }));

    expect(screen.getByLabelText(/Zur Bestätigung/)).toHaveValue("");
    expect(screen.getByRole("button", { name: "Löschen" })).toBeDisabled();
  });
});
