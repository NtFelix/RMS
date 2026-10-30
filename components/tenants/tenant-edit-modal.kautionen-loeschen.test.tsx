import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { TenantEditModal } from '@/components/tenants/tenant-edit-modal';
import { useModalStore } from '@/hooks/use-modal-store';
import { deleteTenantAction } from '@/app/mieter-actions';
import { starteLoeschenMitKautionen } from '@/lib/kautionen-loeschen';

jest.mock('@/app/mieter-actions', () => ({
  deleteTenantAction: jest.fn(),
}));

jest.mock('@/lib/kautionen-loeschen', () => ({
  // Standard: keine gebuchte Kaution betroffen -> die übliche Frage wird gezeigt
  starteLoeschenMitKautionen: jest.fn(async (_tabelle, _ids, handlers) => handlers.einfach()),
}));

jest.mock('@/hooks/use-onboarding-store', () => ({
  useOnboardingStore: { getState: () => ({ completeStep: jest.fn() }) },
}));

// Nur das Kaution-Flag ist steuerbar, alle anderen Flags bleiben aus.
let mockKautionFlagAktiv = false;
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: (flag: string) => flag === 'advanced-kautionsmanagment' && mockKautionFlagAktiv,
  useFeatureFlagPayload: () => undefined,
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
const mockStart = starteLoeschenMitKautionen as jest.Mock;

describe('TenantEditModal - Löschen mit Kautionen-Übersicht', () => {
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
    mockKautionFlagAktiv = false;
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

  const klickeLoeschen = () => {
    render(<TenantEditModal serverAction={jest.fn()} />);
    // Eintrag "Löschen" im (gestubbten) Aktionsmenü: lädt zuerst die Auswirkung
    fireEvent.click(screen.getByRole('button', { name: /Löschen/ }));
  };

  it('lädt zuerst die Auswirkung, fragt dann üblich und löscht danach', async () => {
    klickeLoeschen();

    const dialog = await screen.findByRole('alertdialog');
    expect(mockStart).toHaveBeenCalledWith('Mieter', [tenant.id], expect.any(Object));
    expect(within(dialog).getByText('Mieter löschen?')).toBeInTheDocument();
    expect(mockDeleteTenant).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    await waitFor(() => expect(mockDeleteTenant).toHaveBeenCalledWith(tenant.id));
    await waitFor(() => expect(closeTenantModal).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('mit gebuchter Kaution: keine zweite Frage, die bestätigte Übersicht löscht und schließt das Modal', async () => {
    mockStart.mockImplementationOnce(async (_tabelle, _ids, handlers) => handlers.loeschen());
    klickeLoeschen();

    await waitFor(() => expect(mockDeleteTenant).toHaveBeenCalledWith(tenant.id));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => expect(closeTenantModal).toHaveBeenCalled());
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('löscht nicht und schließt das Modal nicht, wenn die Übersicht abgebrochen wird', async () => {
    mockStart.mockImplementationOnce(async () => undefined);
    klickeLoeschen();

    await waitFor(() => expect(mockStart).toHaveBeenCalled());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockDeleteTenant).not.toHaveBeenCalled();
    expect(closeTenantModal).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  // Kaution (GH-6): Der Menüeintrag im Modal braucht Modulrecht UND das Feature Flag `advanced-kautionsmanagment`.
  describe.each([
    { recht: true, flag: true, sichtbar: true },
    { recht: true, flag: false, sichtbar: false },
    { recht: false, flag: true, sichtbar: false },
  ])('Kaution-Eintrag (Modulrecht $recht, Flag $flag)', ({ recht, flag, sichtbar }) => {
    it(`ist ${sichtbar ? 'sichtbar' : 'ausgeblendet'}`, () => {
      mockKautionFlagAktiv = flag;
      mockUseModalStore.mockReturnValue({ ...mockUseModalStore(), canViewKautionen: recht });
      render(<TenantEditModal serverAction={jest.fn()} />);
      expect(screen.queryByRole('button', { name: /Kaution/ }) !== null).toBe(sichtbar);
    });
  });
});
