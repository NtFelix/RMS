import { act, renderHook } from '@testing-library/react';
import { KAUTION_FLAG_LADE_TIMEOUT_MS, useKautionFlagGeladen, useKautionenSichtbar, useKautionFlag } from '@/hooks/use-kaution-flag';

let mockEnabled: boolean | undefined;
let mockPayload: unknown;
let mockHasLoadedFlags = false;
let mockFlagsCallback: (() => void) | undefined;
const mockUnsubscribe = jest.fn();
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: jest.fn((flag: string) => (flag === 'advanced-kautionsmanagment' ? mockEnabled : undefined)),
  usePostHog: () => ({
    featureFlags: { hasLoadedFlags: mockHasLoadedFlags },
    onFeatureFlags: (callback: () => void) => {
      mockFlagsCallback = callback;
      return mockUnsubscribe;
    },
  }),
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

describe('useKautionFlagGeladen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockHasLoadedFlags = false;
    mockFlagsCallback = undefined;
    mockUnsubscribe.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('is true right away when PostHog already holds the flags', () => {
    mockHasLoadedFlags = true;
    const { result } = renderHook(() => useKautionFlagGeladen());
    expect(result.current).toBe(true);
  });

  it('is false until PostHog delivers the flags', () => {
    const { result } = renderHook(() => useKautionFlagGeladen());
    expect(result.current).toBe(false);
    act(() => mockFlagsCallback?.());
    expect(result.current).toBe(true);
  });

  it('counts as loaded after the timeout if the flags never arrive (e.g. blocked request)', () => {
    const { result, unmount } = renderHook(() => useKautionFlagGeladen());
    expect(result.current).toBe(false);
    act(() => {
      jest.advanceTimersByTime(KAUTION_FLAG_LADE_TIMEOUT_MS);
    });
    expect(result.current).toBe(true);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
