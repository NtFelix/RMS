import { render, screen, waitFor } from '@testing-library/react';
import FinanzenClientWrapper from './client-wrapper';
import { useModalStore } from '@/hooks/use-modal-store';
import { API_PERMISSION_DENIED_CODE } from '@/lib/permissions-core';

/**
 * Mieteingang-Box auf dem Finanzen-Dashboard: /api/tenants-data braucht mieter:ansehen UND finanzen:ansehen. Bei
 * 403 PERMISSION_DENIED zeigt die Box "keine Berechtigung" (statt endlos zu laden) und fragt nicht erneut an.
 * Alle Daten sind synthetisch.
 */

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    rpc: jest.fn(() => Promise.resolve({ data: [], error: null })),
  })),
}));

jest.mock('@/hooks/use-modal-store');
jest.mock('@/hooks/use-debounce', () => ({ useDebounce: (value: string) => value }));
jest.mock('@/hooks/use-tab-params', () => ({
  useTabParams: () => ['overview', jest.fn()],
}));

global.fetch = jest.fn();

const NO_ACCESS_TEXT = /Für den Mieteingang fehlt Ihnen die Berechtigung/;

const props = {
  finances: [],
  wohnungen: [],
  summaryData: {
    year: 2023,
    totalIncome: 0,
    totalExpenses: 0,
    totalCashflow: 0,
    averageMonthlyIncome: 0,
    averageMonthlyExpenses: 0,
    averageMonthlyCashflow: 0,
    yearlyProjection: 0,
    monthsPassed: 12,
    monthlyData: {},
  },
};

function mockFetch(tenantsDataResponse: { status: number; body: unknown }) {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (String(url).includes('/api/tenants-data')) {
      return Promise.resolve({
        ok: tenantsDataResponse.status >= 200 && tenantsDataResponse.status < 300,
        status: tenantsDataResponse.status,
        json: () => Promise.resolve(tenantsDataResponse.body),
      } as Response);
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
  });
}

const tenantsDataCalls = () =>
  (global.fetch as jest.Mock).mock.calls.filter(([url]) => String(url).includes('/api/tenants-data')).length;

describe('FinanzenClientWrapper: Mieteingang ohne Berechtigung', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useModalStore as unknown as jest.Mock).mockReturnValue({ getState: () => ({ openFinanceModal: jest.fn() }) });
  });

  it('zeigt bei 403 PERMISSION_DENIED den Hinweis und fragt nur einmal an', async () => {
    mockFetch({ status: 403, body: { error: 'Permission denied', code: API_PERMISSION_DENIED_CODE } });
    render(<FinanzenClientWrapper {...props} />);

    expect(await screen.findByText(NO_ACCESS_TEXT)).toBeInTheDocument();
    expect(tenantsDataCalls()).toBe(1);
  });

  it('zeigt den Hinweis bei einem 403 ohne Code (kein Rechte-Entscheid) nicht', async () => {
    mockFetch({ status: 403, body: { error: 'Forbidden' } });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<FinanzenClientWrapper {...props} />);

    await waitFor(() => expect(tenantsDataCalls()).toBe(1));
    expect(screen.queryByText(NO_ACCESS_TEXT)).not.toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('zeigt den Hinweis bei einem 503 (Rechteabfrage fehlgeschlagen) nicht', async () => {
    mockFetch({ status: 503, body: { error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' } });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<FinanzenClientWrapper {...props} />);

    await waitFor(() => expect(tenantsDataCalls()).toBe(1));
    expect(screen.queryByText(NO_ACCESS_TEXT)).not.toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
