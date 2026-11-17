/**
 * Entry point of the deposit dialog with several deposits per tenant (GH-6): the list decides between the
 * selection and the direct opening. Uses the REAL store; the server action is mocked.
 * All values are synthetic placeholders.
 */
import { renderHook, act } from "@testing-library/react";
import { getKautionenListeAction } from "@/app/kautionen-actions";
import { useKautionOeffnen } from "@/hooks/use-kaution-oeffnen";
import type { KautionListenEintrag } from "@/types/Kaution";

// `jest.setup.js` ersetzt den Store global durch einen Mock: hier läuft der echte Store.
const { useModalStore } = jest.requireActual<typeof import("@/hooks/use-modal-store")>("@/hooks/use-modal-store");

jest.mock("@/hooks/use-modal-store", () => jest.requireActual("@/hooks/use-modal-store"));
jest.mock("@/app/kautionen-actions", () => ({
  getKautionenListeAction: jest.fn(),
}));

const mockListe = getKautionenListeAction as jest.MockedFunction<typeof getKautionenListeAction>;

const tenant = { id: "tenant-1", name: "Test Mieter", wohnung_id: "wohnung-1" };

const eintrag = (kautionId: string, istAktuell: boolean): KautionListenEintrag => ({
  kautionId,
  mietverhaeltnisId: `mv-${kautionId}`,
  kautionsart: "barkaution",
  sollBetrag: 1000,
  kontostand: 1000,
  istAktuell,
  vertragsbeginn: "2024-01-01",
  vertragsende: null,
});

describe("useKautionOeffnen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useModalStore.setState({
      isKautionModalOpen: false,
      kautionInitialData: undefined,
      isKautionModalDirty: false,
      kautionAuswahl: null,
    });
  });

  it("shows the selection when the tenant has more than one deposit", async () => {
    const kautionen = [eintrag("k1", false), eintrag("k2", true)];
    mockListe.mockResolvedValue({ success: true, data: { kautionen } });
    const { result } = renderHook(() => useKautionOeffnen());

    await act(() => result.current(tenant));

    expect(mockListe).toHaveBeenCalledWith("tenant-1");
    expect(useModalStore.getState().kautionAuswahl).toEqual({ tenant, eintraege: kautionen });
    expect(useModalStore.getState().isKautionModalOpen).toBe(false);
  });

  it("opens the dialog directly when the tenant has exactly one deposit", async () => {
    mockListe.mockResolvedValue({ success: true, data: { kautionen: [eintrag("k1", true)] } });
    const { result } = renderHook(() => useKautionOeffnen());

    await act(() => result.current(tenant));

    expect(useModalStore.getState().kautionAuswahl).toBeNull();
    expect(useModalStore.getState().isKautionModalOpen).toBe(true);
    expect(useModalStore.getState().kautionInitialData).toMatchObject({ tenant });
  });

  it("opens the dialog directly when the tenant has no deposit and passes the tab on", async () => {
    mockListe.mockResolvedValue({ success: true, data: { kautionen: [] } });
    const { result } = renderHook(() => useKautionOeffnen());

    await act(() => result.current(tenant, { tab: "raten" }));

    expect(useModalStore.getState().kautionAuswahl).toBeNull();
    expect(useModalStore.getState().isKautionModalOpen).toBe(true);
    expect(useModalStore.getState().kautionInitialData?.initialTab).toBe("raten");
  });

  it("opens the dialog directly when the list call fails", async () => {
    mockListe.mockResolvedValue({ success: false, error: { code: "KA999", message: "Fehler" } });
    const { result } = renderHook(() => useKautionOeffnen());

    await act(() => result.current(tenant));

    expect(useModalStore.getState().kautionAuswahl).toBeNull();
    expect(useModalStore.getState().isKautionModalOpen).toBe(true);
  });

  it("opens the dialog directly and never throws when the list call rejects", async () => {
    mockListe.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useKautionOeffnen());

    await expect(act(() => result.current(tenant))).resolves.not.toThrow();

    expect(useModalStore.getState().kautionAuswahl).toBeNull();
    expect(useModalStore.getState().isKautionModalOpen).toBe(true);
  });

  it("opens the given deposit directly without loading the list", async () => {
    const { result } = renderHook(() => useKautionOeffnen());

    await act(() => result.current(tenant, { kautionId: "k2" }));

    expect(mockListe).not.toHaveBeenCalled();
    expect(useModalStore.getState().isKautionModalOpen).toBe(true);
    expect(useModalStore.getState().kautionInitialData?.kautionId).toBe("k2");
  });
});
