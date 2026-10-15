import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrganisationAuditLogTab } from './organisation-audit-log-tab';
import { getAuditLogsAction, getAuditLogDetailsAction } from '@/app/organisation-actions';

jest.mock('@/app/organisation-actions', () => ({
  getAuditLogsAction: jest.fn(),
  getAuditLogDetailsAction: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

const DAY_MS = 24 * 60 * 60 * 1000;

const FIXED_NOW_MS = new Date('2026-10-14T12:00:00.000Z').getTime();

function logAt(daysAgo: number) {
  return {
    id: 'log-1',
    organisation_id: 'org-1',
    tabellenname: 'Haeuser',
    datensatz_id: 'datensatz-1',
    aktion: 'UPDATE',
    geaendert_von: null,
    geaendert_von_name: 'Beispiel Person',
    geaendert_von_email: null,
    geaendert_am: new Date(Date.now() - daysAgo * DAY_MS).toISOString(),
  };
}

// Die Liste zeigt standardmäßig nur die letzten 7 Tage; das Alter des Detaileintrags wird getrennt gesteuert.
async function openDetails(detail: ReturnType<typeof logAt> & { alte_daten: unknown; neue_daten: unknown }) {
  (getAuditLogsAction as jest.Mock).mockResolvedValue({ success: true, data: [logAt(1)] });
  (getAuditLogDetailsAction as jest.Mock).mockResolvedValue({ success: true, data: detail });

  render(<OrganisationAuditLogTab />);
  fireEvent.click(await screen.findByText('Häuser'));
  await waitFor(() => expect(getAuditLogDetailsAction).toHaveBeenCalledWith('log-1'));
}

describe('OrganisationAuditLogTab Detailansicht', () => {
  let dateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    dateSpy = jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW_MS);
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  it('zeigt bei einem alten Eintrag ohne Payloads den Aufbewahrungshinweis statt "Keine Feldänderungen"', async () => {
    await openDetails({ ...logAt(45), alte_daten: null, neue_daten: null });

    expect(await screen.findByText(/nach 30 Tagen aus Datenschutzgründen entfernt/)).toBeInTheDocument();
    expect(screen.queryByText('Keine Feldänderungen vorhanden.')).not.toBeInTheDocument();
  });

  it('zeigt bei einem jungen Eintrag ohne Payloads weiterhin "Keine Feldänderungen"', async () => {
    await openDetails({ ...logAt(2), alte_daten: null, neue_daten: null });

    expect(await screen.findByText('Keine Feldänderungen vorhanden.')).toBeInTheDocument();
    expect(screen.queryByText(/aus Datenschutzgründen entfernt/)).not.toBeInTheDocument();
  });

  it('zeigt im Leerzustand den Hinweis auf die 90-Tage-Löschung', async () => {
    (getAuditLogsAction as jest.Mock).mockResolvedValue({ success: true, data: [] });

    render(<OrganisationAuditLogTab />);
    expect(await screen.findByText(/Einträge werden nach 90 Tagen gelöscht/)).toBeInTheDocument();
  });
});
