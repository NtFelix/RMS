import { renderHook } from '@testing-library/react';
import { useKautionFlag } from '@/hooks/use-kaution-flag';

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

  it('reads the functions from the payload and keeps a stable result for an equal payload object', () => {
    mockEnabled = true;
    mockPayload = { version: 1, funktionen: { raten: true } };
    const { result, rerender } = renderHook(() => useKautionFlag());
    const erste = result.current;
    expect(erste.funktionen.raten).toBe(true);

    mockPayload = { version: 1, funktionen: { raten: true } }; // new object, same content
    rerender();
    expect(result.current).toBe(erste);
  });
});
