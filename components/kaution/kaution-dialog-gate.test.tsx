import { render, screen } from '@testing-library/react';
import { KautionDialogGate } from '@/components/kaution/kaution-dialog-gate';

let mockFlagAktiv = false;
let mockRecht = false;
const mockCloseKautionModal = jest.fn();
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: () => mockFlagAktiv,
  useFeatureFlagPayload: () => undefined,
}));
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: (selector: (state: unknown) => unknown) =>
    selector({ canViewKautionen: mockRecht, closeKautionModal: mockCloseKautionModal }),
}));

describe('KautionDialogGate', () => {
  beforeEach(() => mockCloseKautionModal.mockClear());

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

  it('resets the store state while hidden (no stale open state), and leaves it alone while shown', () => {
    mockRecht = true;
    mockFlagAktiv = false;
    const { rerender } = render(<KautionDialogGate><div>Kautionsdialog</div></KautionDialogGate>);
    expect(mockCloseKautionModal).toHaveBeenCalledWith({ force: true });

    mockCloseKautionModal.mockClear();
    mockFlagAktiv = true;
    rerender(<KautionDialogGate><div>Kautionsdialog</div></KautionDialogGate>);
    expect(mockCloseKautionModal).not.toHaveBeenCalled();
  });
});
