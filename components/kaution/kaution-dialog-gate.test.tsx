import { render, screen } from '@testing-library/react';
import { KautionDialogGate } from '@/components/kaution/kaution-dialog-gate';

let mockFlagAktiv = false;
let mockRecht = false;
let mockOffen = false;
let mockDirty = false;
let mockAuswahlOffen = false;
const mockCloseKautionModal = jest.fn();
const mockCloseKautionAuswahl = jest.fn();
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: () => mockFlagAktiv,
  useFeatureFlagPayload: () => undefined,
}));
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: (selector: (state: unknown) => unknown) =>
    selector({
      canViewKautionen: mockRecht,
      closeKautionModal: mockCloseKautionModal,
      isKautionModalOpen: mockOffen,
      isKautionModalDirty: mockDirty,
      kautionAuswahl: mockAuswahlOffen ? { tenant: {}, eintraege: [] } : null,
      closeKautionAuswahl: mockCloseKautionAuswahl,
    }),
}));

describe('KautionDialogGate', () => {
  beforeEach(() => {
    mockCloseKautionModal.mockClear();
    mockCloseKautionAuswahl.mockClear();
    mockOffen = false;
    mockDirty = false;
    mockAuswahlOffen = false;
  });

  it.each([
    { recht: true, flag: true, sichtbar: true },
    { recht: true, flag: false, sichtbar: false },
    { recht: false, flag: true, sichtbar: false },
    { recht: false, flag: false, sichtbar: false },
  ])('module right $recht and flag $flag: dialog mounted = $sichtbar', ({ recht, flag, sichtbar }) => {
    mockRecht = recht;
    mockFlagAktiv = flag;
    render(
      <KautionDialogGate>
        <div>Kautionsdialog</div>
      </KautionDialogGate>
    );
    expect(screen.queryByText('Kautionsdialog') !== null).toBe(sichtbar);
  });

  const rendereGate = () => render(<KautionDialogGate><div>Kautionsdialog</div></KautionDialogGate>);

  it('clears a stale open state while hidden', () => {
    mockRecht = true;
    mockFlagAktiv = false;
    mockOffen = true;
    rendereGate();
    expect(mockCloseKautionModal).toHaveBeenCalledWith({ force: true });
  });

  it.each([
    { name: 'the dialog is not open (no store write on mount)', offen: false, dirty: false, flag: false },
    { name: 'the dialog holds unsaved input (never discarded)', offen: true, dirty: true, flag: false },
    { name: 'the dialog is shown', offen: true, dirty: false, flag: true },
  ])('does not touch the store when $name', ({ offen, dirty, flag }) => {
    mockRecht = true;
    mockFlagAktiv = flag;
    mockOffen = offen;
    mockDirty = dirty;
    rendereGate();
    expect(mockCloseKautionModal).not.toHaveBeenCalled();
  });

  it('clears an open deposit selection while hidden', () => {
    mockRecht = true;
    mockFlagAktiv = false;
    mockAuswahlOffen = true;
    rendereGate();
    expect(mockCloseKautionAuswahl).toHaveBeenCalledTimes(1);
  });

  it.each([
    { name: 'no selection is open', auswahl: false, flag: false },
    { name: 'the dialog is shown', auswahl: true, flag: true },
  ])('does not clear the selection when $name', ({ auswahl, flag }) => {
    mockRecht = true;
    mockFlagAktiv = flag;
    mockAuswahlOffen = auswahl;
    rendereGate();
    expect(mockCloseKautionAuswahl).not.toHaveBeenCalled();
  });
});
