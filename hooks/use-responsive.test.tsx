import { renderHook, act } from '@testing-library/react';
import { useIsOverflowing } from './use-responsive';

// Capture the ResizeObserver callback so tests can drive re-measurement manually.
let resizeCallback: ResizeObserverCallback | null = null;
const observe = jest.fn();
const disconnect = jest.fn();

class MockResizeObserver {
  constructor(cb: ResizeObserverCallback) {
    resizeCallback = cb;
  }
  observe = observe;
  unobserve = jest.fn();
  disconnect = disconnect;
}

const makeNode = (scrollWidth: number, clientWidth: number) => {
  const node = document.createElement('div');
  Object.defineProperty(node, 'scrollWidth', { value: scrollWidth, configurable: true });
  Object.defineProperty(node, 'clientWidth', { value: clientWidth, configurable: true });
  return node as HTMLDivElement;
};

describe('useIsOverflowing', () => {
  beforeEach(() => {
    resizeCallback = null;
    observe.mockClear();
    disconnect.mockClear();
    // @ts-expect-error - inject mock
    global.ResizeObserver = MockResizeObserver;
  });

  it('reports overflow when the attached node overflows', () => {
    const { result } = renderHook(() => useIsOverflowing());

    expect(result.current.isOverflowing).toBe(false);

    act(() => {
      result.current.ref(makeNode(200, 100));
    });

    expect(result.current.isOverflowing).toBe(true);
    expect(observe).toHaveBeenCalledTimes(1);
  });

  it('reports no overflow when content fits', () => {
    const { result } = renderHook(() => useIsOverflowing());

    act(() => {
      result.current.ref(makeNode(100, 100));
    });

    expect(result.current.isOverflowing).toBe(false);
  });

  it('does not change state when a re-measurement yields the same result', () => {
    const { result } = renderHook(() => useIsOverflowing());

    const node = makeNode(100, 100);
    act(() => {
      result.current.ref(node);
    });

    const before = result.current.isOverflowing;

    // Fire the ResizeObserver repeatedly with an unchanged (non-overflowing) node.
    // The change-guard must keep the boolean stable so a measurement can never
    // drive a render loop (React "maximum update depth exceeded").
    act(() => {
      for (let i = 0; i < 5; i++) {
        resizeCallback?.([], {} as ResizeObserver);
      }
    });

    expect(result.current.isOverflowing).toBe(before);
    expect(result.current.isOverflowing).toBe(false);
  });

  it('disconnects the observer when the node detaches', () => {
    const { result } = renderHook(() => useIsOverflowing());

    act(() => {
      result.current.ref(makeNode(200, 100));
    });
    expect(result.current.isOverflowing).toBe(true);

    // Detaching the node (as happens when the measured element unmounts) must tear
    // down the observer so no further measurement can fire against a stale node.
    act(() => {
      result.current.ref(null);
    });

    expect(disconnect).toHaveBeenCalled();
  });
});
