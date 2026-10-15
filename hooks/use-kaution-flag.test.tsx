import { renderHook } from '@testing-library/react';
import { useKautionenSichtbar, useKautionFlag } from '@/hooks/use-kaution-flag';

let mockEnabled: boolean | undefined;
let mockPayload: unknown;
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: jest.fn((flag: string) => (flag === 'advanced-kautionsmanagment' ? mockEnabled : undefined)),
  useFeatureFlagPayload: jest.fn((flag: string) => (flag === 'advanced-kautionsmanagment' ? mockPayload : undefined)),
}));

describe('useKautionFlag', () => {
  beforeEach(() => {
    mockEnabled = undefined;
    mockPayload = undefined;
  });

  it('is inactive while the flag is not loaded, with the phase 1 defaults', () => {
    const { result } = renderHook(() => useKautionFlag());
    expect(result.current.aktiv).toBe(false);
    expect(result.current.arten).toEqual(['barkaution']);
  });

  it('is active with the flag on, also without a payload', () => {
    mockEnabled = true;
    const { result } = renderHook(() => useKautionFlag());
    expect(result.current.aktiv).toBe(true);
    expect(result.current.funktionen.raten).toBe(false);
  });

  it('reads the functions from the payload', () => {
    mockEnabled = true;
    mockPayload = { version: 1, funktionen: { raten: true } };
    const { result } = renderHook(() => useKautionFlag());
    expect(result.current.funktionen.raten).toBe(true);
  });
});

describe('useKautionenSichtbar', () => {
  beforeEach(() => {
    mockEnabled = undefined;
    mockPayload = undefined;
  });

  it.each([
    { recht: true, flag: true, erwartet: true },
    { recht: true, flag: false, erwartet: false },
    { recht: false, flag: true, erwartet: false },
    { recht: false, flag: false, erwartet: false },
  ])('module right $recht and flag $flag give $erwartet', ({ recht, flag, erwartet }) => {
    mockEnabled = flag;
    const { result } = renderHook(() => useKautionenSichtbar(recht));
    expect(result.current).toBe(erwartet);
  });
});
