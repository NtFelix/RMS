import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { TenantContextMenu } from '@/components/tenants/tenant-context-menu';
import { deleteTenantAction } from '@/app/mieter-actions';
import { starteLoeschenMitKautionen } from '@/lib/kautionen-loeschen';
import { useModalStore } from '@/hooks/use-modal-store';
import type { Tenant } from '@/types/Tenant';

jest.mock('@/app/mieter-actions', () => ({
  deleteTenantAction: jest.fn(),
}));

jest.mock('@/lib/kautionen-loeschen', () => ({
  // Standard: keine gebuchte Kaution betroffen -> die übliche Frage wird gezeigt
  starteLoeschenMitKautionen: jest.fn(async (_tabelle, _ids, handlers) => handlers.einfach()),
}));

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: () => false,
}));

jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: jest.fn(),
}));

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

// Kautionsmanagement (GH-6): Der Menüeintrag "Kaution" hängt am Modulrecht `kautionen: ansehen` und übergibt dem
// Dialog nur noch den Mieter (der Dialog lädt seine Daten selbst).
describe('TenantContextMenu - Kaution (GH-6)', () => {
  const mockOpenKautionModal = jest.fn();

  const tenant: Tenant = {
    id: 'tenant-1',
    name: 'Test Mieter',
    wohnung_id: 'wohnung-1',
    // Altfeld (Kompat-Form): darf nicht an den Store weitergereicht werden.
    kaution: {
      amount: 1200,
      paymentDate: '2024-01-01',
      status: 'Erhalten',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModalStore.mockReturnValue({
      openKautionModal: mockOpenKautionModal,
      openTenantMailTemplatesModal: jest.fn(),
      openApplicantScoreModal: jest.fn(),
    } as any);
  });

  function renderMenu(props: { canViewKautionen?: boolean } = {}) {
    render(
      <TenantContextMenu tenant={tenant} onEdit={jest.fn()} onRefresh={jest.fn()} {...props}>
        <div>Zeile</div>
      </TenantContextMenu>
    );
    fireEvent.contextMenu(screen.getByText('Zeile'));
  }

  it('hides the Kaution entry by default (no module right)', () => {
    renderMenu();

    expect(screen.getByText('Bearbeiten')).toBeInTheDocument();
    expect(screen.queryByText('Kaution')).not.toBeInTheDocument();
  });

  it('hides the Kaution entry without the module right', () => {
    renderMenu({ canViewKautionen: false });

    expect(screen.queryByText('Kaution')).not.toBeInTheDocument();
  });

  it('shows the Kaution entry with the module right', () => {
    renderMenu({ canViewKautionen: true });

    expect(screen.getByText('Kaution')).toBeInTheDocument();
  });

  it('opens the dialog with the tenant only (no deposit data), after the menu has closed', async () => {
    renderMenu({ canViewKautionen: true });

    fireEvent.click(screen.getByText('Kaution'));

    await waitFor(() => expect(mockOpenKautionModal).toHaveBeenCalledTimes(1));
    // exakt ein Argument: kein zweiter Parameter mit Kautionsdaten
    expect(mockOpenKautionModal).toHaveBeenCalledWith({ id: 'tenant-1', name: 'Test Mieter', wohnung_id: 'wohnung-1' });
  });
});

// Kautionsmanagement: Beim Klick auf "Löschen" wird zuerst die Auswirkung geladen; danach erscheint genau EIN Dialog
// (die übliche Frage oder die Übersicht der mitgelöschten Kautionen, die Prüfsumme geht an die Server-Action).
describe('TenantContextMenu - Löschen mit Kautionen', () => {
  const mockStart = starteLoeschenMitKautionen as jest.Mock;
  const mockDelete = deleteTenantAction as jest.MockedFunction<typeof deleteTenantAction>;
  const tenant = { id: 'tenant-1', name: 'Test Mieter', wohnung_id: 'wohnung-1' } as Tenant;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModalStore.mockReturnValue({
      openKautionModal: jest.fn(),
      openTenantMailTemplatesModal: jest.fn(),
      openApplicantScoreModal: jest.fn(),
    } as any);
    mockDelete.mockResolvedValue({ success: true });
  });

  function klickeLoeschen() {
    render(
      <TenantContextMenu tenant={tenant} onEdit={jest.fn()} onRefresh={jest.fn()}>
        <div>Zeile</div>
      </TenantContextMenu>
    );
    fireEvent.contextMenu(screen.getByText('Zeile'));
    fireEvent.click(screen.getByText('Löschen'));
  }

  it('lädt zuerst die Auswirkung des Mieters', async () => {
    klickeLoeschen();

    await waitFor(() => expect(mockStart).toHaveBeenCalledWith('Mieter', ['tenant-1'], expect.any(Object)));
  });

  it('ohne gebuchte Kaution: zeigt die übliche Frage und löscht danach ohne Prüfsumme', async () => {
    klickeLoeschen();

    const dialog = await screen.findByRole('alertdialog');
    expect(mockDelete).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('tenant-1', undefined));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('mit gebuchter Kaution: keine zweite Frage, die bestätigte Übersicht löscht mit der Prüfsumme', async () => {
    mockStart.mockImplementationOnce(async (_tabelle, _ids, handlers) => handlers.loeschen({ 'tenant-1': 'abc' }));

    klickeLoeschen();

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('tenant-1', 'abc'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('löscht nichts und zeigt keine Frage, wenn die Übersicht abgebrochen wird oder die Abfrage scheitert', async () => {
    mockStart.mockImplementationOnce(async () => undefined);

    klickeLoeschen();

    await waitFor(() => expect(mockStart).toHaveBeenCalled());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
