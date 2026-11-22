import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { TenantEditModal } from '@/components/tenants/tenant-edit-modal';
import { useModalStore } from '@/hooks/use-modal-store';

/**
 * Personen-Stammdaten im Mieter-Dialog (GH-30): Anrede, Vorname und Nachname statt eines Namensfeldes.
 * Altdaten ohne Vor-/Nachnamen zeigen den bisherigen Namen als Nachnamen.
 */

jest.mock('@/app/mieter-actions', () => ({
  deleteTenantAction: jest.fn(),
}));

jest.mock('@/lib/kautionen-loeschen', () => ({
  starteLoeschenMitKautionen: jest.fn(),
}));

jest.mock('@/hooks/use-onboarding-store', () => ({
  useOnboardingStore: { getState: () => ({ completeStep: jest.fn() }) },
}));

jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: () => false,
  useFeatureFlagPayload: () => undefined,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

jest.mock('@/components/ui/custom-dropdown', () => ({
  CustomDropdown: ({ children }: any) => <div>{children}</div>,
  CustomDropdownItem: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  CustomDropdownSeparator: () => <hr />,
}));

jest.mock('@/components/ui/custom-combobox', () => ({
  CustomCombobox: () => <div data-testid="combobox-stub" />,
}));

jest.mock('@/components/ui/date-picker', () => ({
  DatePicker: () => <div data-testid="date-picker-stub" />,
}));

global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const mockUseModalStore = useModalStore as unknown as jest.Mock;

describe('TenantEditModal - Personen-Stammdaten', () => {
  const closeTenantModal = jest.fn();

  function oeffne(tenantInitialData: Record<string, unknown>) {
    mockUseModalStore.mockReturnValue({
      isTenantModalOpen: true,
      closeTenantModal,
      tenantInitialData,
      tenantModalWohnungen: [{ id: 'wohnung-1', name: 'Wohnung A' }],
      isTenantModalDirty: false,
      setTenantModalDirty: jest.fn(),
      openKautionModal: jest.fn(),
      canViewKautionen: false,
      openTenantMailTemplatesModal: jest.fn(),
      openApplicantScoreModal: jest.fn(),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('zeigt Vorname und Nachname aus den Stammdaten und die Anrede als Formularwert', () => {
    oeffne({ id: 'm1', name: 'Erika Beispiel', anrede: 'frau', vorname: 'Erika', nachname: 'Beispiel', wohnung_id: 'wohnung-1', status: 'mieter', nebenkosten: [] });

    render(<TenantEditModal serverAction={jest.fn()} />);

    expect(document.querySelector<HTMLInputElement>('input[name="vorname"]')?.value).toBe('Erika');
    expect(document.querySelector<HTMLInputElement>('input[name="nachname"]')?.value).toBe('Beispiel');
    expect(document.querySelector<HTMLInputElement>('input[name="anrede"]')?.value).toBe('frau');
    expect(document.querySelector('input[name="name"]')).toBeNull();
  });

  it('übernimmt bei Altdaten ohne Vor-/Nachnamen den bisherigen Namen als Nachnamen', () => {
    oeffne({ id: 'm2', name: 'Altdaten Name', nebenkosten: [] });

    render(<TenantEditModal serverAction={jest.fn()} />);

    expect(document.querySelector<HTMLInputElement>('input[name="vorname"]')?.value).toBe('');
    expect(document.querySelector<HTMLInputElement>('input[name="nachname"]')?.value).toBe('Altdaten Name');
    expect(document.querySelector<HTMLInputElement>('input[name="anrede"]')?.value).toBe('keine_angabe');
  });

  it('sendet Anrede, Vor- und Nachnamen und keinen Namen mehr, wenn ein Name gesetzt ist', async () => {
    oeffne({ id: 'm3', name: 'Max Muster', vorname: 'Max', nachname: 'Muster', anrede: 'herr', nebenkosten: [] });
    const serverAction = jest.fn().mockResolvedValue({ success: true });

    render(<TenantEditModal serverAction={serverAction} />);
    document.querySelector<HTMLFormElement>('#tenant-form-container form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await waitFor(() => expect(serverAction).toHaveBeenCalledTimes(1));
    const formData = serverAction.mock.calls[0][0] as FormData;
    expect(formData.get('anrede')).toBe('herr');
    expect(formData.get('vorname')).toBe('Max');
    expect(formData.get('nachname')).toBe('Muster');
    expect(formData.has('name')).toBe(false);
    expect(formData.get('status')).toBe('mieter');
  });

  it('schreibt unbekannte Personenfelder beim Speichern nicht zurück (Aufrufer kennt nur name)', async () => {
    oeffne({ id: 'm5', name: 'Altdaten Name', nebenkosten: [] });
    const serverAction = jest.fn().mockResolvedValue({ success: true });

    render(<TenantEditModal serverAction={serverAction} />);
    document.querySelector<HTMLFormElement>('#tenant-form-container form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await waitFor(() => expect(serverAction).toHaveBeenCalledTimes(1));
    const formData = serverAction.mock.calls[0][0] as FormData;
    expect(formData.has('anrede')).toBe(false);
    expect(formData.has('vorname')).toBe(false);
    expect(formData.has('nachname')).toBe(false);
    expect(formData.get('id')).toBe('m5');
  });

  it('sendet nicht, wenn weder Vor- noch Nachname angegeben sind', async () => {
    oeffne({ id: 'm4', name: '', vorname: '', nachname: '', nebenkosten: [] });
    const serverAction = jest.fn().mockResolvedValue({ success: true });

    render(<TenantEditModal serverAction={serverAction} />);
    document.querySelector<HTMLFormElement>('#tenant-form-container form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(serverAction).not.toHaveBeenCalled();
  });
});
