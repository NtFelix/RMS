/**
 * Tests der Synchronisation des Modulrechts `kautionen: ansehen` in den Modal-Store (GH-6): Der Menüpunkt "Kaution"
 * des global gemounteten Mieter-Bearbeiten-Fensters hängt am Store-Flag `canViewKautionen`. Das Flag wird vom
 * Dashboard-Layout gesetzt (nicht von der Seite /mieter), gilt für genau einen Nutzer und fällt beim Verlassen des
 * Dashboards auf `false`. Alle Daten sind synthetische Platzhalter.
 */

import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { KautionenRechtSync } from "@/components/kaution/kautionen-recht-sync";
import { getVisibleActions } from "@/components/tenants/tenant-menu-actions";
import { useModalStore } from "@/hooks/use-modal-store";

// `jest.setup.js` ersetzt den Store global durch einen Mock: hier läuft der echte Store.
jest.mock("@/hooks/use-modal-store", () => jest.requireActual("@/hooks/use-modal-store"));

const MIETER = { id: "t-1", name: "Test Mieter", status: "mieter" } as Parameters<typeof getVisibleActions>[0];

function kautionImMenue(): boolean {
  const { canViewKautionen } = useModalStore.getState();
  return getVisibleActions(MIETER, { templatesEnabled: false, canViewKautionen }).some((aktion) => aktion.key === "kaution");
}

beforeEach(() => {
  useModalStore.setState({ canViewKautionen: false });
});

afterEach(() => {
  cleanup();
});

describe("KautionenRechtSync", () => {
  it("schreibt das Recht in den Store, ohne dass die Seite /mieter geladen wurde, und der Menüpunkt erscheint", () => {
    expect(kautionImMenue()).toBe(false);

    render(<KautionenRechtSync canViewKautionen userId="user-1" />);

    expect(useModalStore.getState().canViewKautionen).toBe(true);
    expect(kautionImMenue()).toBe(true);
  });

  it("lässt den Menüpunkt ohne das Recht verborgen", () => {
    render(<KautionenRechtSync canViewKautionen={false} userId="user-1" />);

    expect(useModalStore.getState().canViewKautionen).toBe(false);
    expect(kautionImMenue()).toBe(false);
  });

  it("übernimmt eine Änderung des Rechts (Layout wurde neu berechnet)", () => {
    const { rerender } = render(<KautionenRechtSync canViewKautionen={false} userId="user-1" />);
    expect(useModalStore.getState().canViewKautionen).toBe(false);

    rerender(<KautionenRechtSync canViewKautionen userId="user-1" />);
    expect(useModalStore.getState().canViewKautionen).toBe(true);

    rerender(<KautionenRechtSync canViewKautionen={false} userId="user-1" />);
    expect(useModalStore.getState().canViewKautionen).toBe(false);
  });

  it("setzt das Recht beim Verlassen des Dashboards zurück: ein anderer Nutzer im selben Tab erbt es nicht", () => {
    const { unmount } = render(<KautionenRechtSync canViewKautionen userId="user-1" />);
    expect(useModalStore.getState().canViewKautionen).toBe(true);

    unmount();

    expect(useModalStore.getState().canViewKautionen).toBe(false);
  });

  it("setzt bei einem Nutzerwechsel zuerst zurück und schreibt dann das Recht des neuen Nutzers", () => {
    const verlauf: boolean[] = [];
    const abmelden = useModalStore.subscribe((state) => {
      verlauf.push(state.canViewKautionen);
    });

    const { rerender } = render(<KautionenRechtSync canViewKautionen userId="user-1" />);
    rerender(<KautionenRechtSync canViewKautionen userId="user-2" />);
    abmelden();

    // true (Nutzer 1) -> false (Reset beim Wechsel) -> true (Recht des Nutzers 2): nie ein stehengebliebener Wert.
    expect(verlauf).toEqual([true, false, true]);
  });

  it("gibt ein Recht, das ein Nutzer nicht hat, auch nach einem Wechsel nicht weiter", () => {
    const { rerender } = render(<KautionenRechtSync canViewKautionen userId="user-1" />);

    act(() => {
      rerender(<KautionenRechtSync canViewKautionen={false} userId="user-2" />);
    });

    expect(useModalStore.getState().canViewKautionen).toBe(false);
    expect(kautionImMenue()).toBe(false);
  });
});
