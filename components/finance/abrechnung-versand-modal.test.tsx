import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Template } from '@/types/template';
import type { AbrechnungVersandModalData, AbrechnungVersandTenant, TenantCostDetails } from '@/types/abrechnung-versand';
import {
  AbrechnungVersandModal,
  buildTenantMailContext,
  defaultErhoehungAbDatum,
  defaultErhoehungBetrag,
} from '@/components/finance/abrechnung-versand-modal';
import { generateTenantSettlementPdf, downloadBlob } from '@/lib/abrechnung/pdf-export';
import { openMailto } from '@/lib/mail/mailto';

// The real store: rows, header template and open rows live there
jest.mock('@/hooks/use-modal-store', () => jest.requireActual('@/hooks/use-modal-store'));
const { useModalStore } = jest.requireActual<typeof import('@/hooks/use-modal-store')>('@/hooks/use-modal-store');

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }), toast: jest.fn() }));
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { email: 'vermieter@example.test', user_metadata: { first_name: 'Max', last_name: 'Muster' } } }),
}));

const mention = (id: string) => ({ type: 'mention', attrs: { id, label: id } });
const templates: Template[] = [
  {
    id: 'v-abrechnung',
    titel: 'Ihre Nebenkostenabrechnung',
    kategorie: 'Betriebskostenabrechnung',
    inhalt: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hallo ' }, mention('mieter.name'), { type: 'text', text: ',' }] },
        { type: 'paragraph', content: [mention('vorauszahlung.satz')] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Grüße ' }, mention('vermieter.vorname')] },
      ],
    },
    vorauszahlung_satz: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Neu ab ' }, mention('vorauszahlung.ab_datum'), { type: 'text', text: ': ' }, mention('vorauszahlung.neuer_betrag')] }],
    },
    kontext_anforderungen: [],
    erstellt_von: 'u',
    organisation_id: 'o',
    erstellungsdatum: '2026-01-01',
    aktualisiert_am: '2026-01-01',
  },
  {
    id: 'v-mail',
    titel: 'Allgemeine Mail',
    kategorie: 'Mail',
    inhalt: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Allgemein' }] }] },
    kontext_anforderungen: [],
    erstellt_von: 'u',
    organisation_id: 'o',
    erstellungsdatum: '2026-01-01',
    aktualisiert_am: '2026-01-01',
  },
];
jest.mock('@/hooks/use-templates', () => ({ useTemplates: () => ({ templates, loading: false, error: null }) }));

jest.mock('@/lib/abrechnung/pdf-export', () => ({
  ...jest.requireActual('@/lib/abrechnung/pdf-export'),
  fetchCustomerBillingAddress: jest.fn().mockResolvedValue({ line1: 'Vermieterweg 2', postal_code: '12345', city: 'Teststadt' }),
  generateTenantSettlementPdf: jest.fn().mockResolvedValue({ blob: new Blob(['pdf']), filename: 'Abrechnung.pdf', pageCount: 1 }),
  downloadBlob: jest.fn(),
}));
jest.mock('@/lib/mail/mailto', () => ({ ...jest.requireActual('@/lib/mail/mailto'), openMailto: jest.fn() }));

const tenant = (overrides: Partial<AbrechnungVersandTenant>): AbrechnungVersandTenant => ({
  tenantId: 't1',
  name: 'Erika Beispiel',
  email: 'erika@example.test',
  apartmentName: 'EG links',
  finalSettlement: 120,
  currentMonthlyPrepayment: 80,
  recommendedMonthlyPrepayment: 95,
  tenantData: { tenantName: 'Erika Beispiel' } as TenantCostDetails,
  ...overrides,
});

const data: AbrechnungVersandModalData = {
  nebenkostenItem: { id: 'nk', startdatum: '2025-01-01', enddatum: '2025-12-31' } as AbrechnungVersandModalData['nebenkostenItem'],
  ownerName: 'Max Muster',
  ownerAddress: 'Hausstraße 1, 12345 Teststadt',
  tenants: [tenant({}), tenant({ tenantId: 't2', name: 'Otto Ohnemail', email: null, finalSettlement: -40 })],
};

const renderModal = () => {
  act(() => useModalStore.getState().openAbrechnungVersandModal(data));
  return render(<AbrechnungVersandModal />);
};

describe('AbrechnungVersandModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => useModalStore.getState().closeAbrechnungVersandModal({ force: true }));
  });

  it('lists every tenant with result and flags the missing e-mail', () => {
    renderModal();
    expect(screen.getByText('Erika Beispiel')).toBeInTheDocument();
    expect(screen.getByText('Nachzahlung 120,00 €')).toBeInTheDocument();
    expect(screen.getByText('Guthaben 40,00 €')).toBeInTheDocument();
    expect(screen.getByText('Keine E-Mail')).toBeInTheDocument();
  });

  it('shows the preview without the Vorauszahlung paragraph until an increase is set', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Erika Beispiel'));

    const preview = await screen.findByText(/Hallo Erika Beispiel,/);
    expect(preview.textContent).toBe('Hallo Erika Beispiel,\n\nGrüße Max');

    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(screen.getByText(/Hallo Erika Beispiel,/).textContent).toBe('Hallo Erika Beispiel,\n\nNeu ab 1.1.2026: 95,00 €\n\nGrüße Max'));
    expect(screen.getByRole('button', { name: 'Fertig und Werte übernehmen' })).toBeInTheDocument();
    expect(useModalStore.getState().isAbrechnungVersandModalDirty).toBe(true);
  });

  it('downloads the tenant PDF and opens exactly one mail', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Erika Beispiel'));
    fireEvent.click(await screen.findByRole('button', { name: /Mail öffnen/ }));

    await waitFor(() => expect(openMailto).toHaveBeenCalledTimes(1));
    expect(generateTenantSettlementPdf).toHaveBeenCalledWith(expect.objectContaining({ tenantData: data.tenants[0].tenantData }));
    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'Abrechnung.pdf');
    const url = new URL((openMailto as jest.Mock).mock.calls[0][0]);
    expect(decodeURIComponent(url.pathname)).toBe('erika@example.test');
    expect(url.searchParams.get('subject')).toBe('Ihre Nebenkostenabrechnung');
    expect(url.searchParams.get('body')?.replace(/\r\n/g, '\n')).toBe('Hallo Erika Beispiel,\n\nGrüße Max');
    expect(useModalStore.getState().abrechnungVersandRows.t1?.mailGeoeffnet).toBe(true);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'PDF bitte anhängen' }));
  });

  it('does not open the mail when the PDF fails', async () => {
    (generateTenantSettlementPdf as jest.Mock).mockRejectedValueOnce(new Error('worker down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    renderModal();
    fireEvent.click(screen.getByText('Erika Beispiel'));
    fireEvent.click(await screen.findByRole('button', { name: /Mail öffnen/ }));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'PDF konnte nicht erstellt werden' })));
    expect(openMailto).not.toHaveBeenCalled();
  });

  it('disables the mail button for a tenant without e-mail and explains why', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Otto Ohnemail'));
    const region = (await screen.findByText(/keine E-Mail-Adresse hinterlegt/)).closest('div')!.parentElement!;
    expect(within(region).getByRole('button', { name: /Mail öffnen/ })).toBeDisabled();
  });

  it('offers a plain "Fertig" without increases', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Fertig' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fertig und Werte übernehmen' })).not.toBeInTheDocument();
  });
});

describe('Versand defaults and context', () => {
  it('defaults the increase to the recommendation and to 1 January of the following year', () => {
    expect(defaultErhoehungAbDatum('2025-12-31')).toBe('2026-01-01');
    expect(defaultErhoehungAbDatum('2025-06-30')).toBe('2026-01-01');
    expect(defaultErhoehungBetrag(tenant({}))).toBe(95);
    expect(defaultErhoehungBetrag(tenant({ recommendedMonthlyPrepayment: null }))).toBe(80);
  });

  it('passes the increase only when it is switched on', () => {
    const vermieter = { name: 'Max Muster', vorname: 'Max', nachname: 'Muster', adresse: null };
    const abrechnung = { startdatum: '2025-01-01', enddatum: '2025-12-31' };
    const off = buildTenantMailContext(tenant({}), { erhoehung: { aktiv: false, betrag: 95, abDatum: '2026-01-01' } }, abrechnung, vermieter);
    const on = buildTenantMailContext(tenant({}), { erhoehung: { aktiv: true, betrag: 95, abDatum: '2026-01-01' } }, abrechnung, vermieter);
    expect(off.vorauszahlung).toEqual({ alterBetrag: 80, erhoehung: null });
    expect(on.vorauszahlung).toEqual({ alterBetrag: 80, erhoehung: { neuerBetrag: 95, abDatum: '2026-01-01' } });
    expect(on.abrechnung).toEqual({ startdatum: '2025-01-01', enddatum: '2025-12-31', ergebnis: 120 });
  });
});
