import { renderHook } from '@testing-library/react';
import {
  KONTAKTE_FLAG_KEY,
  useKontakteFlag,
  useKontakteFlagStatus,
  useKontakteSichtbar,
} from '@/hooks/use-kontakte-flag';

let mockEnabled: boolean | undefined;
const mockUseFeatureFlagEnabled = jest.fn((flag: string) => (flag === 'kontakte-seite' ? mockEnabled : undefined));
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: (flag: string) => mockUseFeatureFlagEnabled(flag),
}));

describe('Flag kontakte-seite', () => {
  beforeEach(() => {
    mockEnabled = undefined;
    mockUseFeatureFlagEnabled.mockClear();
  });

  it('verwendet den Schlüssel kontakte-seite', () => {
    expect(KONTAKTE_FLAG_KEY).toBe('kontakte-seite');
  });

  it('liefert den Rohwert undefined, solange PostHog die Flags nicht geladen hat', () => {
    const { result } = renderHook(() => useKontakteFlagStatus());
    expect(result.current).toBeUndefined();
  });

  it.each([
    { roh: undefined, aktiv: false },
    { roh: false, aktiv: false },
    { roh: true, aktiv: true },
  ])('useKontakteFlag ist fail-closed bei $roh -> $aktiv', ({ roh, aktiv }) => {
    mockEnabled = roh;
    const { result } = renderHook(() => useKontakteFlag());
    expect(result.current).toBe(aktiv);
  });

  it.each([
    { recht: true, flag: true, erwartet: true },
    { recht: true, flag: false, erwartet: false },
    { recht: true, flag: undefined, erwartet: false },
    { recht: false, flag: true, erwartet: false },
    { recht: false, flag: false, erwartet: false },
  ])('Modulrecht $recht und Flag $flag ergeben $erwartet', ({ recht, flag, erwartet }) => {
    mockEnabled = flag;
    const { result } = renderHook(() => useKontakteSichtbar(recht));
    expect(result.current).toBe(erwartet);
  });
});
