import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AbrechnungVersandModalData, AbrechnungVersandTenant, TenantCostDetails } from '@/types/abrechnung-versand';
import { VorauszahlungUebernehmenModal } from '@/components/finance/vorauszahlung-uebernehmen-modal';
import { planNebenkostenVorauszahlungenAction } from '@/app/mieter-actions';

jest.mock('@/hooks/use-modal-store', () => jest.requireActual('@/hooks/use-modal-store'));
const { useModalStore } = jest.requireActual<typeof import('@/hooks/use-modal-store')>('@/hooks/use-modal-store');

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }), toast: jest.fn() }));
jest.mock('@/app/mieter-actions', () => ({ planNebenkostenVorauszahlungenAction: jest.fn() }));

const tenant = (tenantId: string, name: string): AbrechnungVersandTenant => ({
  tenantId,
  name,
  email: `${tenantId}@example.test`,
  apartmentName: 'Whg',
  finalSettlement: 100,
  currentMonthlyPrepayment: 80,
  recommendedMonthlyPrepayment: 95,
  tenantData: {} as TenantCostDetails,
});

const data: AbrechnungVersandModalData = {
  nebenkostenItem: { id: 'nk', startdatum: '2025-01-01', enddatum: '2025-12-31' } as AbrechnungVersandModalData['nebenkostenItem'],
  ownerName: 'V',
  ownerAddress: 'A',
  tenants: [tenant('t1', 'Erika Beispiel'), tenant('t2', 'Otto Beispiel'), tenant('t3', 'Ohne Erhöhung')],
};

const setup = () => {
  act(() => {
    const store = useModalStore.getState();
    store.openAbrechnungVersandModal(data);
    store.updateAbrechnungVersandRow('t1', { erhoehung: { aktiv: true, betrag: 95, abDatum: '2026-01-01' }, mailGeoeffnet: true });
    store.updateAbrechnungVersandRow('t2', { erhoehung: { aktiv: true, betrag: 70, abDatum: '2026-02-01' } });
    store.openVorauszahlungUebernehmenModal();
  });
  return render(<VorauszahlungUebernehmenModal />);
};

describe('VorauszahlungUebernehmenModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useModalStore.getState().closeVorauszahlungUebernehmenModal();
      useModalStore.getState().closeAbrechnungVersandModal({ force: true });
    });
  });

  it('lists only tenants with an increase, with old and new amount and date', () => {
    setup();
    expect(screen.getByText('Erika Beispiel')).toBeInTheDocument();
    expect(screen.getByText('Otto Beispiel')).toBeInTheDocument();
    expect(screen.queryByText('Ohne Erhöhung')).not.toBeInTheDocument();
    expect(screen.getByText(/ab 1\.2\.2026/)).toBeInTheDocument();
  });

  it('warns when deselecting a tenant whose mail was already opened', () => {
    setup();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Erika Beispiel übernehmen' }));
    expect(screen.getByText(/Die Mail mit dieser Erhöhung wurde bereits geöffnet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 Vorauszahlung übernehmen' })).toBeInTheDocument();
  });

  it('saves the selected increases, shows the result and closes the Versand afterwards', async () => {
    (planNebenkostenVorauszahlungenAction as jest.Mock).mockResolvedValue({
      success: true,
      results: [{ tenantId: 't1', success: true }, { tenantId: 't2', success: true }],
    });
    setup();
    fireEvent.click(screen.getByRole('button', { name: '2 Vorauszahlungen übernehmen' }));

    await waitFor(() => expect(useModalStore.getState().abrechnungVersandRows.t2?.uebernommen).toBe(true));
    expect(planNebenkostenVorauszahlungenAction).toHaveBeenCalledWith([
      { tenantId: 't1', amount: 95, date: '2026-01-01' },
      { tenantId: 't2', amount: 70, date: '2026-02-01' },
    ]);
    expect(useModalStore.getState().isAbrechnungVersandModalDirty).toBe(false);
    expect(screen.getAllByLabelText('Übernommen')).toHaveLength(2);

    fireEvent.click(screen.getByText('Schließen', { selector: 'button' }));
    expect(useModalStore.getState().isVorauszahlungUebernehmenModalOpen).toBe(false);
    expect(useModalStore.getState().isAbrechnungVersandModalOpen).toBe(false);
  });

  it('keeps failed tenants selectable and the Versand open', async () => {
    (planNebenkostenVorauszahlungenAction as jest.Mock).mockResolvedValue({
      success: false,
      results: [{ tenantId: 't1', success: true }, { tenantId: 't2', success: false, error: 'Speichern fehlgeschlagen.' }],
    });
    setup();
    fireEvent.click(screen.getByRole('button', { name: '2 Vorauszahlungen übernehmen' }));

    expect(await screen.findByText('Speichern fehlgeschlagen.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 Vorauszahlung übernehmen' })).toBeInTheDocument();
    expect(useModalStore.getState().isAbrechnungVersandModalDirty).toBe(true);

    fireEvent.click(screen.getByText('Schließen', { selector: 'button' }));
    expect(useModalStore.getState().isAbrechnungVersandModalOpen).toBe(true);
  });
});
