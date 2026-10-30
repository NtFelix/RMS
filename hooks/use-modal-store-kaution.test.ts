import type { Tenant } from '@/types/Tenant';

// `jest.setup.js` ersetzt den Store global durch einen Mock: hier wird der echte Store getestet.
const { useModalStore } = jest.requireActual<typeof import('@/hooks/use-modal-store')>('@/hooks/use-modal-store');

// Kautionsmanagement (GH-6): Der Store transportiert nur den Mieter (ohne Kautionsdaten) und den Start-Tab.
describe('Modal store - Kaution (GH-6)', () => {
  const tenant: Tenant = {
    id: 'tenant-1',
    name: 'Test Mieter',
    wohnung_id: 'wohnung-1',
    email: 'mieter@example.invalid',
    // Altfeld (Kompat-Form): darf nicht im Store landen.
    kaution: {
      amount: 1500,
      paymentDate: '2024-01-01',
      status: 'Erhalten',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  };

  beforeEach(() => {
    useModalStore.setState({
      isKautionModalOpen: false,
      kautionInitialData: undefined,
      isKautionModalDirty: false,
      canViewKautionen: false,
      isConfirmationModalOpen: false,
    });
  });

  it('opens the dialog with the tenant only (id, name, wohnung_id), without deposit data or other fields', () => {
    useModalStore.getState().openKautionModal(tenant);

    const state = useModalStore.getState();
    expect(state.isKautionModalOpen).toBe(true);
    expect(state.kautionInitialData).toEqual({
      tenant: { id: 'tenant-1', name: 'Test Mieter', wohnung_id: 'wohnung-1' },
      initialTab: undefined,
    });
    expect(state.kautionInitialData?.tenant).not.toHaveProperty('kaution');
    expect(state.kautionInitialData?.tenant).not.toHaveProperty('email');
    expect(state.kautionInitialData).not.toHaveProperty('existingKaution');
    expect(state.kautionInitialData).not.toHaveProperty('suggestedAmount');
  });

  it('accepts the start tab as an option', () => {
    useModalStore.getState().openKautionModal({ id: 't1', name: 'Test Mieter' }, { tab: 'kontoauszug' });

    expect(useModalStore.getState().kautionInitialData?.initialTab).toBe('kontoauszug');
  });

  it('starts with a clean dirty flag on every opening', () => {
    useModalStore.setState({ isKautionModalDirty: true });

    useModalStore.getState().openKautionModal(tenant);

    expect(useModalStore.getState().isKautionModalDirty).toBe(false);
  });

  it('closes and resets the dialog state', () => {
    useModalStore.getState().openKautionModal(tenant, { tab: 'raten' });

    useModalStore.getState().closeKautionModal();

    const state = useModalStore.getState();
    expect(state.isKautionModalOpen).toBe(false);
    expect(state.kautionInitialData).toBeUndefined();
  });

  it('asks for confirmation before closing with unsaved input and closes on force', () => {
    useModalStore.getState().openKautionModal(tenant);
    useModalStore.getState().setKautionModalDirty(true);

    useModalStore.getState().closeKautionModal();
    expect(useModalStore.getState().isKautionModalOpen).toBe(true);
    expect(useModalStore.getState().isConfirmationModalOpen).toBe(true);

    useModalStore.getState().closeKautionModal({ force: true });
    expect(useModalStore.getState().isKautionModalOpen).toBe(false);
  });

  it('has no module right by default and keeps it when the dialog closes', () => {
    expect(useModalStore.getState().canViewKautionen).toBe(false);

    useModalStore.getState().setCanViewKautionen(true);
    useModalStore.getState().openKautionModal(tenant);
    useModalStore.getState().closeKautionModal();

    expect(useModalStore.getState().canViewKautionen).toBe(true);
  });
});
