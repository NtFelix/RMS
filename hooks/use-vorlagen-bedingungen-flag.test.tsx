import { renderHook } from '@testing-library/react';
import { VORLAGEN_BEDINGUNGEN_FLAG_KEY, useVorlagenBedingungenFlag } from '@/hooks/use-vorlagen-bedingungen-flag';

let mockEnabled: boolean | undefined;
const mockUseFeatureFlagEnabled = jest.fn((flag: string) => (flag === 'vorlagen-bedingungen' ? mockEnabled : undefined));
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: (flag: string) => mockUseFeatureFlagEnabled(flag),
}));

describe('Flag vorlagen-bedingungen', () => {
  beforeEach(() => {
    mockEnabled = undefined;
    mockUseFeatureFlagEnabled.mockClear();
  });

  it('verwendet den Schlüssel vorlagen-bedingungen', () => {
    expect(VORLAGEN_BEDINGUNGEN_FLAG_KEY).toBe('vorlagen-bedingungen');
    renderHook(() => useVorlagenBedingungenFlag());
    expect(mockUseFeatureFlagEnabled).toHaveBeenCalledWith('vorlagen-bedingungen');
  });

  it.each([
    { roh: undefined, aktiv: false },
    { roh: false, aktiv: false },
    { roh: true, aktiv: true },
  ])('ist fail-closed bei $roh -> $aktiv', ({ roh, aktiv }) => {
    mockEnabled = roh;
    const { result } = renderHook(() => useVorlagenBedingungenFlag());
    expect(result.current).toBe(aktiv);
  });
});
