import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OperatingCostsTable } from './operating-costs-table';
import { useModalStore } from '@/hooks/use-modal-store';
import type { OptimizedNebenkosten } from '@/types/optimized-betriebskosten';

// The Abrechnung/Overview/Zaehler modals are loaded via next/dynamic and pull in a lot of
// unrelated dependencies; the table itself doesn't need them rendered for these tests.
jest.mock('next/dynamic', () => () => {
  const DynamicNoop = () => null;
  DynamicNoop.displayName = 'DynamicNoop';
  return DynamicNoop;
});

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

const baseItem: OptimizedNebenkosten = {
  id: 'nk1',
  startdatum: '2023-01-01',
  enddatum: '2023-12-31',
  nebenkostenart: ['Strom'],
  betrag: [120],
  berechnungsart: ['pro Flaeche'],
  zaehlerkosten: null,
  zaehlerverbrauch: null,
  haeuser_id: 'h1',
  erstellt_von: 'u1',
  haus_name: 'Haus A',
  gesamt_flaeche: 100,
  anzahl_wohnungen: 2,
  anzahl_mieter: 3,
};

describe('OperatingCostsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModalStore.mockReturnValue({
      openOperatingCostsOverviewModal: jest.fn(),
    } as any);
  });

  describe('360-Tage badge', () => {
    it('shows a "360 Tage" badge next to the Zeitraum for a 360-day settlement', () => {
      render(
        <OperatingCostsTable
          nebenkosten={[{ ...baseItem, rechenbasis: '360_tage' }]}
          onDeleteItem={jest.fn()}
          ownerName="Owner"
          allHaeuser={[]}
        />
      );

      expect(screen.getByText('360 Tage')).toBeInTheDocument();
    });

    it('does not show the badge for a calendar-days settlement', () => {
      render(
        <OperatingCostsTable
          nebenkosten={[{ ...baseItem, rechenbasis: 'kalendertage' }]}
          onDeleteItem={jest.fn()}
          ownerName="Owner"
          allHaeuser={[]}
        />
      );

      expect(screen.queryByText('360 Tage')).not.toBeInTheDocument();
    });

    it('does not show the badge when rechenbasis is not set (existing settlements)', () => {
      render(
        <OperatingCostsTable
          nebenkosten={[baseItem]}
          onDeleteItem={jest.fn()}
          ownerName="Owner"
          allHaeuser={[]}
        />
      );

      expect(screen.queryByText('360 Tage')).not.toBeInTheDocument();
    });
  });

  describe('CSV export', () => {
    let blobParts: string[] = [];

    beforeEach(() => {
      blobParts = [];
      class MockBlob {
        constructor(parts: string[]) {
          blobParts = parts;
        }
      }
      // @ts-expect-error - simplified Blob replacement for capturing CSV content
      global.Blob = MockBlob;
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();
      HTMLAnchorElement.prototype.click = jest.fn();
    });

    it('includes a Rechenbasis column with "360 Tage" for a 360-day item', async () => {
      const user = userEvent.setup();
      render(
        <OperatingCostsTable
          nebenkosten={[{ ...baseItem, rechenbasis: '360_tage' }]}
          onDeleteItem={jest.fn()}
          ownerName="Owner"
          allHaeuser={[]}
        />
      );

      await user.click(screen.getByLabelText('Abrechnung auswählen'));
      await user.click(screen.getByText('Exportieren'));

      const csv = blobParts.join('');
      expect(csv).toContain('Rechenbasis');
      const rows = csv.split('\n');
      expect(rows[1]).toContain('360 Tage');
    });

    it('includes "Kalendertage" for a settlement without the 360-day basis', async () => {
      const user = userEvent.setup();
      render(
        <OperatingCostsTable
          nebenkosten={[baseItem]}
          onDeleteItem={jest.fn()}
          ownerName="Owner"
          allHaeuser={[]}
        />
      );

      await user.click(screen.getByLabelText('Abrechnung auswählen'));
      await user.click(screen.getByText('Exportieren'));

      const csv = blobParts.join('');
      const rows = csv.split('\n');
      expect(rows[1]).toContain('Kalendertage');
    });
  });
});
