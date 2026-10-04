import { getKautionLoeschauswirkungAction } from "@/app/kautionen-actions";
import { toast } from "@/hooks/use-toast";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import { bestaetigeLoeschenMitKautionen } from "@/lib/kautionen-loeschen";
import type { KautionLoeschauswirkung } from "@/types/Kaution";

// `jest.setup.js` ersetzt den Store global durch einen Mock: hier wird der echte Store verwendet.
jest.mock("@/hooks/use-modal-store", () => jest.requireActual("@/hooks/use-modal-store"));
jest.mock("@/app/kautionen-actions", () => ({ getKautionLoeschauswirkungAction: jest.fn() }));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

const { useModalStore } = jest.requireActual<typeof import("@/hooks/use-modal-store")>("@/hooks/use-modal-store");

const mockAction = getKautionLoeschauswirkungAction as jest.Mock;
const mockToast = toast as jest.Mock;

const HAUS_A = "11111111-1111-4111-8111-111111111111";
const HAUS_B = "22222222-2222-4222-8222-222222222222";
const SUMME_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const SUMME_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function auswirkung(overrides: Partial<KautionLoeschauswirkung> = {}, mitBuchungen = 2): KautionLoeschauswirkung {
  return {
    tabelle: "Haeuser",
    anzahl_haeuser: 2,
    anzahl_wohnungen: 3,
    anzahl_mieter: 4,
    kautionen_sichtbar: true,
    kautionen: {
      anzahl: 4,
      ohne_buchungen: 4 - mitBuchungen,
      mit_buchungen: mitBuchungen,
      konto_noch_offen: 900,
      konto_verwahrt: 600,
      dokumentiert_anzahl: 0,
      dokumentiert_summe: 0,
      mit_saldo_anzahl: 1,
      mit_buchungen_gekuerzt: false,
      mit_buchungen_liste: [],
    },
    pruefsumme: "cccccccccccccccccccccccccccccccc",
    eintraege: [
      { id: HAUS_A, anzahl_mieter: 2, mit_buchungen: 1, pruefsumme: SUMME_A },
      { id: HAUS_B, anzahl_mieter: 2, mit_buchungen: 1, pruefsumme: SUMME_B },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  mockAction.mockReset();
  mockToast.mockReset();
  useModalStore.setState({ isLoeschUebersichtOpen: false, loeschUebersichtConfig: null });
});

describe("bestaetigeLoeschenMitKautionen", () => {
  it("asks the database for the impact of exactly these IDs", async () => {
    mockAction.mockResolvedValue({ success: true, data: auswirkung({}, 0) });

    await bestaetigeLoeschenMitKautionen("Haeuser", [HAUS_A, HAUS_B]);

    expect(mockAction).toHaveBeenCalledWith({ tabelle: "Haeuser", ids: [HAUS_A, HAUS_B] });
  });

  it.each([
    ["only deposits without bookings", auswirkung({}, 0)],
    ["no deposits at all", auswirkung({ kautionen: { ...auswirkung().kautionen!, anzahl: 0, ohne_buchungen: 0, mit_buchungen: 0 } })],
    ["no right to see deposits", auswirkung({ kautionen_sichtbar: false, kautionen: null, pruefsumme: null })],
  ])("%s: proceeds without a dialog and without checksums", async (_name, impact) => {
    mockAction.mockResolvedValue({ success: true, data: impact });

    const result = await bestaetigeLoeschenMitKautionen("Haeuser", [HAUS_A]);

    expect(result).toEqual({ ok: true, pruefsummen: {} });
    expect(useModalStore.getState().isLoeschUebersichtOpen).toBe(false);
  });

  it("without the module right (42501) proceeds silently with the usual deletion", async () => {
    mockAction.mockResolvedValue({ success: false, error: { code: "42501", message: "Keine Berechtigung" } });

    const result = await bestaetigeLoeschenMitKautionen("Mieter", [HAUS_A]);

    expect(result).toEqual({ ok: true, pruefsummen: {} });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("any other error shows its message and stops (nothing is deleted)", async () => {
    mockAction.mockResolvedValue({ success: false, error: { code: "KA002", message: "Kein Zugriff auf dieses Objekt." } });

    const result = await bestaetigeLoeschenMitKautionen("Mieter", [HAUS_A]);

    expect(result).toEqual({ ok: false });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ description: "Kein Zugriff auf dieses Objekt.", variant: "destructive" }));
  });

  it("an exception of the action shows the generic message and stops", async () => {
    mockAction.mockRejectedValue(new Error("Netzwerk"));

    const result = await bestaetigeLoeschenMitKautionen("Mieter", [HAUS_A]);

    expect(result).toEqual({ ok: false });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ description: KAUTION_FEHLER_FALLBACK_MESSAGE }));
  });

  it("with deposits with bookings: opens the overview and waits; confirming returns the checksum per ID", async () => {
    mockAction.mockResolvedValue({ success: true, data: auswirkung() });

    const pending = bestaetigeLoeschenMitKautionen("Haeuser", [HAUS_A, HAUS_B]);
    await Promise.resolve();
    await Promise.resolve();

    const state = useModalStore.getState();
    expect(state.isLoeschUebersichtOpen).toBe(true);
    expect(state.loeschUebersichtConfig?.auswirkung.anzahl_mieter).toBe(4);

    state.loeschUebersichtConfig?.onEntscheidung(true);

    await expect(pending).resolves.toEqual({ ok: true, pruefsummen: { [HAUS_A]: SUMME_A, [HAUS_B]: SUMME_B } });
  });

  it("cancelling the overview returns ok: false", async () => {
    mockAction.mockResolvedValue({ success: true, data: auswirkung() });

    const pending = bestaetigeLoeschenMitKautionen("Haeuser", [HAUS_A]);
    await Promise.resolve();
    await Promise.resolve();
    useModalStore.getState().loeschUebersichtConfig?.onEntscheidung(false);

    await expect(pending).resolves.toEqual({ ok: false });
  });
});

describe("Modal store: Löschübersicht", () => {
  it("a second request cancels the first one", () => {
    const erste = jest.fn();
    const zweite = jest.fn();

    useModalStore.getState().openLoeschUebersicht({ auswirkung: auswirkung(), onEntscheidung: erste });
    useModalStore.getState().openLoeschUebersicht({ auswirkung: auswirkung(), onEntscheidung: zweite });

    expect(erste).toHaveBeenCalledWith(false);
    expect(zweite).not.toHaveBeenCalled();
    expect(useModalStore.getState().loeschUebersichtConfig?.onEntscheidung).toBe(zweite);
  });

  it("closing resets the state", () => {
    useModalStore.getState().openLoeschUebersicht({ auswirkung: auswirkung(), onEntscheidung: jest.fn() });

    useModalStore.getState().closeLoeschUebersicht();

    expect(useModalStore.getState().isLoeschUebersichtOpen).toBe(false);
    expect(useModalStore.getState().loeschUebersichtConfig).toBeNull();
  });
});
