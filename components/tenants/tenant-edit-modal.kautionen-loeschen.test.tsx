import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { TenantEditModal } from '@/components/tenants/tenant-edit-modal';
import { useModalStore } from '@/hooks/use-modal-store';
import { deleteTenantAction } from '@/app/mieter-actions';
import { bestaetigeLoeschenMitKautionen } from '@/lib/kautionen-loeschen';

jest.mock('@/app/mieter-actions', () => ({
  deleteTenantAction: jest.fn(),
}));

jest.mock('@/lib/kautionen-loeschen', () => ({
  bestaetigeLoeschenMitKautionen: jest.fn(),
}));

jest.mock('@/hooks/use-onboarding-store', () => ({
  useOnboardingStore: { getState: () => ({ completeStep: jest.fn() }) },
}));

jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: () => false,
}));

// Stabiles Router-Objekt, damit router.refresh() prüfbar ist
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Dropdown ohne Popover rendern, damit der Löschen-Eintrag direkt klickbar ist
jest.mock('@/components/ui/custom-dropdown', () => ({
  CustomDropdown: ({ children }: any) => <div>{children}</div>,
  CustomDropdownItem: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  CustomDropdownSeparator: () => <hr />,
}));

// Schwere Formular-Bausteine stubben
jest.mock('@/components/ui/custom-combobox', () => ({
  CustomCombobox: () => <div data-testid="combobox-stub" />,
}));
jest.mock('@/components/ui/date-picker', () => ({
  DatePicker: () => <div data-testid="date-picker-stub" />,
}));

// jsdom kennt ResizeObserver nicht (ScrollArea)
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const mockUseModalStore = useModalStore as unknown as jest.Mock;
const mockDeleteTenant = deleteTenantAction as jest.Mock;
const mockBestaetige = bestaetigeLoeschenMitKautionen as jest.Mock;

describe('TenantEditModal - Löschen mit Kautionen-Bestätigung', () => {
  const tenant = {
    id: 'tenant-1',
    name: 'Erika Beispiel',
    wohnung_id: 'wohnung-1',
    status: 'mieter',
    einzug: '',
    auszug: '',
    email: '',
    telefonnummer: '',
    notiz: '',
    nebenkosten: [],
  };
  const closeTenantModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModalStore.mockReturnValue({
      isTenantModalOpen: true,
      closeTenantModal,
      tenantInitialData: tenant,
      tenantModalWohnungen: [{ id: 'wohnung-1', name: 'Wohnung A' }],
      isTenantModalDirty: false,
      setTenantModalDirty: jest.fn(),
      openKautionModal: jest.fn(),
      canViewKautionen: false,
      openTenantMailTemplatesModal: jest.fn(),
      openApplicantScoreModal: jest.fn(),
    });
    mockDeleteTenant.mockResolvedValue({ success: true });
  });

  const loeschenBestaetigen = async () => {
    render(<TenantEditModal serverAction={jest.fn()} />);
    // Eintrag "Löschen" im (gestubbten) Aktionsmenü öffnet den lokalen AlertDialog
    fireEvent.click(screen.getByRole('button', { name: /Löschen/ }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Mieter löschen?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));
  };

  it('löscht nicht und schließt das Modal nicht, wenn die Bestätigung abgebrochen wird', async () => {
    mockBestaetige.mockResolvedValue({ ok: false });
    await loeschenBestaetigen();

    await waitFor(() => expect(mockBestaetige).toHaveBeenCalledWith('Mieter', [tenant.id]));
    // Dialog schließt, kein hängender Ladezustand
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Löschen...')).not.toBeInTheDocument();
    expect(mockDeleteTenant).not.toHaveBeenCalled();
    expect(closeTenantModal).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('übergibt die Prüfsumme an deleteTenantAction und schließt das Modal bei Erfolg', async () => {
    mockBestaetige.mockResolvedValue({ ok: true, pruefsummen: { [tenant.id]: 'abc' } });
    await loeschenBestaetigen();

    await waitFor(() => expect(mockDeleteTenant).toHaveBeenCalledWith(tenant.id, 'abc'));
    expect(mockBestaetige).toHaveBeenCalledWith('Mieter', [tenant.id]);
    await waitFor(() => expect(closeTenantModal).toHaveBeenCalled());
    expect(mockRefresh).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('übergibt undefined als Prüfsumme, wenn keine vorhanden ist', async () => {
    mockBestaetige.mockResolvedValue({ ok: true, pruefsummen: {} });
    await loeschenBestaetigen();

    await waitFor(() => expect(mockDeleteTenant).toHaveBeenCalledWith(tenant.id, undefined));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });
});
