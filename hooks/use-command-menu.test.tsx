import { renderHook, act } from '@testing-library/react';
import { useCommandMenu } from './use-command-menu';

describe('useCommandMenu', () => {
  it('should initialize with closed state', () => {
    const { result } = renderHook(() => useCommandMenu());

    expect(result.current.open).toBe(false);
  });

  it('should open the command menu', () => {
    const { result } = renderHook(() => useCommandMenu());

    act(() => {
      result.current.setOpen(true);
    });

    expect(result.current.open).toBe(true);
  });

  it('should close the command menu', () => {
    const { result } = renderHook(() => useCommandMenu());

    // First open it
    act(() => {
      result.current.setOpen(true);
    });

    expect(result.current.open).toBe(true);

    // Then close it
    act(() => {
      result.current.setOpen(false);
    });

    expect(result.current.open).toBe(false);
  });

  it('should toggle the command menu state', () => {
    const { result } = renderHook(() => useCommandMenu());

    // Initially closed
    expect(result.current.open).toBe(false);

    // Open
    act(() => {
      result.current.setOpen(true);
    });

    expect(result.current.open).toBe(true);

    // Close
    act(() => {
      result.current.setOpen(false);
    });

    expect(result.current.open).toBe(false);

    // Open again
    act(() => {
      result.current.setOpen(true);
    });

    expect(result.current.open).toBe(true);
  });

  it('should maintain state across multiple calls', () => {
    const { result } = renderHook(() => useCommandMenu());

    // Set to true multiple times
    act(() => {
      result.current.setOpen(true);
      result.current.setOpen(true);
      result.current.setOpen(true);
    });

    expect(result.current.open).toBe(true);

    // Set to false multiple times
    act(() => {
      result.current.setOpen(false);
      result.current.setOpen(false);
      result.current.setOpen(false);
    });

    expect(result.current.open).toBe(false);
  });

  it('should work with multiple hook instances (shared state)', () => {
    const { result: result1 } = renderHook(() => useCommandMenu());
    const { result: result2 } = renderHook(() => useCommandMenu());

    // Both should start closed
    expect(result1.current.open).toBe(false);
    expect(result2.current.open).toBe(false);

    // Opening from first instance should affect second
    act(() => {
      result1.current.setOpen(true);
    });

    expect(result1.current.open).toBe(true);
    expect(result2.current.open).toBe(true);

    // Closing from second instance should affect first
    act(() => {
      result2.current.setOpen(false);
    });

    expect(result1.current.open).toBe(false);
    expect(result2.current.open).toBe(false);
  });

  it('should handle rapid state changes', () => {
    const { result } = renderHook(() => useCommandMenu());

    act(() => {
      result.current.setOpen(true);
      result.current.setOpen(false);
      result.current.setOpen(true);
      result.current.setOpen(false);
      result.current.setOpen(true);
    });

    expect(result.current.open).toBe(true);
  });

  it('should provide consistent API', () => {
    const { result } = renderHook(() => useCommandMenu());

    expect(typeof result.current.open).toBe('boolean');
    expect(typeof result.current.setOpen).toBe('function');
    expect(result.current.setOpen).toBeInstanceOf(Function);
  });

  it('should handle state changes correctly', () => {
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return useCommandMenu();
    });

    const initialRenderCount = renderCount;

    // Setting different value should cause re-render
    act(() => {
      result.current.setOpen(true);
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(result.current.open).toBe(true);

    // Setting back to false
    act(() => {
      result.current.setOpen(false);
    });

    expect(result.current.open).toBe(false);
  });

  it('should handle boolean type checking', () => {
    const { result } = renderHook(() => useCommandMenu());

    // Test with explicit boolean values
    act(() => {
      result.current.setOpen(Boolean(1));
    });

    expect(result.current.open).toBe(true);

    act(() => {
      result.current.setOpen(Boolean(0));
    });

    expect(result.current.open).toBe(false);

    act(() => {
      result.current.setOpen(Boolean('true'));
    });

    expect(result.current.open).toBe(true);

    act(() => {
      result.current.setOpen(Boolean(''));
    });

    expect(result.current.open).toBe(false);
  });

  it('should persist state during component unmount and remount', () => {
    const { result: result1, unmount } = renderHook(() => useCommandMenu());

    // Set state
    act(() => {
      result1.current.setOpen(true);
    });

    expect(result1.current.open).toBe(true);

    // Unmount the hook
    unmount();

    // Create new hook instance
    const { result: result2 } = renderHook(() => useCommandMenu());

    // State should persist (since it's using Zustand store)
    expect(result2.current.open).toBe(true);
  });
});