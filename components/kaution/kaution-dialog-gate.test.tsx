import { render, screen } from '@testing-library/react';
import { KautionDialogGate } from '@/components/kaution/kaution-dialog-gate';

let mockFlagAktiv = false;
let mockRecht = false;
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: () => mockFlagAktiv,
  useFeatureFlagPayload: () => undefined,
}));
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: (selector: (state: { canViewKautionen: boolean }) => unknown) => selector({ canViewKautionen: mockRecht }),
}));

describe('KautionDialogGate', () => {
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
});
