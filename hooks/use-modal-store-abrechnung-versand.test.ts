import type { AbrechnungVersandModalData } from '@/types/abrechnung-versand';

// `jest.setup.js` replaces the store globally with a mock: this tests the real store.
const { useModalStore } = jest.requireActual<typeof import('@/hooks/use-modal-store')>('@/hooks/use-modal-store');

describe('Modal store - Abrechnung-Versand (GH-23)', () => {
  const data = {
    nebenkostenItem: { id: 'nk-1', startdatum: '2025-01-01', enddatum: '2025-12-31' },
    ownerName: 'Vermieter',
    ownerAddress: 'Teststraße 1, 12345 Teststadt',
    tenants: [],
  } as unknown as AbrechnungVersandModalData;

  const erhoehung = { aktiv: true, betrag: 95, abDatum: '2026-01-01' };

  beforeEach(() => {
    useModalStore.getState().closeAbrechnungVersandModal({ force: true });
    useModalStore.setState({ isConfirmationModalOpen: false, confirmationModalConfig: null });
  });

  it('opens with fresh choices', () => {
    useModalStore.getState().openAbrechnungVersandModal(data);
    useModalStore.getState().updateAbrechnungVersandRow('t1', { templateId: 'v2' });
    useModalStore.getState().setAbrechnungVersandExpandedIds(['t1']);

    useModalStore.getState().openAbrechnungVersandModal(data);
    const state = useModalStore.getState();
    expect(state.isAbrechnungVersandModalOpen).toBe(true);
    expect(state.abrechnungVersandData).toBe(data);
    expect(state.abrechnungVersandRows).toEqual({});
    expect(state.abrechnungVersandExpandedIds).toEqual([]);
  });

  it('merges row changes and is dirty only while an active increase is unsaved', () => {
    const store = useModalStore.getState();
    store.openAbrechnungVersandModal(data);

    store.updateAbrechnungVersandRow('t1', { templateId: 'v2' });
    expect(useModalStore.getState().isAbrechnungVersandModalDirty).toBe(false);

    store.updateAbrechnungVersandRow('t1', { erhoehung });
    expect(useModalStore.getState().abrechnungVersandRows.t1).toEqual({ templateId: 'v2', erhoehung });
    expect(useModalStore.getState().isAbrechnungVersandModalDirty).toBe(true);

    store.updateAbrechnungVersandRow('t1', { uebernommen: true });
    expect(useModalStore.getState().isAbrechnungVersandModalDirty).toBe(false);

    store.updateAbrechnungVersandRow('t1', { erhoehung: { ...erhoehung, aktiv: false }, uebernommen: false });
    expect(useModalStore.getState().isAbrechnungVersandModalDirty).toBe(false);
  });

  it('asks before closing with unsaved increases and closes after confirming', () => {
    const store = useModalStore.getState();
    store.openAbrechnungVersandModal(data);
    store.updateAbrechnungVersandRow('t1', { erhoehung });

    store.closeAbrechnungVersandModal();
    let state = useModalStore.getState();
    expect(state.isAbrechnungVersandModalOpen).toBe(true);
    expect(state.isConfirmationModalOpen).toBe(true);
    expect(state.confirmationModalConfig?.title).toBe('Erhöhungen nicht gespeichert');

    state.confirmationModalConfig!.onConfirm();
    state = useModalStore.getState();
    expect(state.isAbrechnungVersandModalOpen).toBe(false);
    expect(state.abrechnungVersandRows).toEqual({});
  });

  it('closes without asking when forced or nothing is unsaved', () => {
    const store = useModalStore.getState();
    store.openAbrechnungVersandModal(data);
    store.closeAbrechnungVersandModal();
    expect(useModalStore.getState().isAbrechnungVersandModalOpen).toBe(false);
    expect(useModalStore.getState().isConfirmationModalOpen).toBe(false);

    store.openAbrechnungVersandModal(data);
    store.updateAbrechnungVersandRow('t1', { erhoehung });
    store.closeAbrechnungVersandModal({ force: true });
    expect(useModalStore.getState().isAbrechnungVersandModalOpen).toBe(false);
    expect(useModalStore.getState().isConfirmationModalOpen).toBe(false);
  });

  it('opens and closes the Übernahme step on top of the Versand', () => {
    const store = useModalStore.getState();
    store.openAbrechnungVersandModal(data);
    store.openVorauszahlungUebernehmenModal();
    expect(useModalStore.getState().isVorauszahlungUebernehmenModalOpen).toBe(true);
    store.closeVorauszahlungUebernehmenModal();
    expect(useModalStore.getState().isVorauszahlungUebernehmenModalOpen).toBe(false);
    expect(useModalStore.getState().isAbrechnungVersandModalOpen).toBe(true);
  });
});
