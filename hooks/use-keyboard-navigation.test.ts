import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation } from '../use-keyboard-navigation';

describe('useKeyboardNavigation', () => {
  const mockOnSelect = jest.fn();
  const mockOnEscape = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        onSelect: mockOnSelect,
        initialIndex: 0,
      })
    );

    expect(result.current.selectedIndex).toBe(0);
  });

  it('should initialize with custom initial index', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        onSelect: mockOnSelect,
        initialIndex: 2,
      })
    );

    expect(result.current.selectedIndex).toBe(2);
  });

  it('should navigate to next item correctly', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 3,
        onSelect: mockOnSelect,
        initialIndex: 0,
      })
    );

    act(() => {
      result.current.selectNext();
    });

    expect(result.current.selectedIndex).toBe(1);

    act(() => {
      result.current.selectNext();
    });

    expect(result.current.selectedIndex).toBe(2);
  });

  it('should wrap around when navigating past last item', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 3,
        onSelect: mockOnSelect,
        initialIndex: 2,
      })
    );

    act(() => {
      result.current.selectNext();
    });

    expect(result.current.selectedIndex).toBe(0);
  });

  it('should navigate to previous item correctly', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 3,
        onSelect: mockOnSelect,
        initialIndex: 2,
      })
    );

    act(() => {
      result.current.selectPrevious();
    });

    expect(result.current.selectedIndex).toBe(1);

    act(() => {
      result.current.selectPrevious();
    });

    expect(result.current.selectedIndex).toBe(0);
  });

  it('should wrap around when navigating before first item', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 3,
        onSelect: mockOnSelect,
        initialIndex: 0,
      })
    );

    act(() => {
      result.current.selectPrevious();
    });

    expect(result.current.selectedIndex).toBe(2);
  });

  it('should call onSelect when selecting current item', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 3,
        onSelect: mockOnSelect,
        initialIndex: 1,
      })
    );

    act(() => {
      result.current.selectCurrentItem();
    });

    expect(mockOnSelect).toHaveBeenCalledWith(1);
  });

  it('should handle keyboard events correctly', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 3,
        onSelect: mockOnSelect,
        onEscape: mockOnEscape,
        initialIndex: 0,
      })
    );

    // Test ArrowDown
    const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    const preventDefaultSpy = jest.spyOn(arrowDownEvent, 'preventDefault');

    act(() => {
      const handled = result.current.handleKeyDown(arrowDownEvent);
      expect(handled).toBe(true);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(result.current.selectedIndex).toBe(1);

    // Test ArrowUp
    const arrowUpEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    const preventDefaultSpy2 = jest.spyOn(arrowUpEvent, 'preventDefault');

    act(() => {
      const handled = result.current.handleKeyDown(arrowUpEvent);
      expect(handled).toBe(true);
    });

    expect(preventDefaultSpy2).toHaveBeenCalled();
    expect(result.current.selectedIndex).toBe(0);

    // Test Enter
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    const preventDefaultSpy3 = jest.spyOn(enterEvent, 'preventDefault');

    act(() => {
      const handled = result.current.handleKeyDown(enterEvent);
      expect(handled).toBe(true);
    });

    expect(preventDefaultSpy3).toHaveBeenCalled();
    expect(mockOnSelect).toHaveBeenCalledWith(0);

    // Test Tab
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    const preventDefaultSpy4 = jest.spyOn(tabEvent, 'preventDefault');

    act(() => {
      const handled = result.current.handleKeyDown(tabEvent);
      expect(handled).toBe(true);
    });

    expect(preventDefaultSpy4).toHaveBeenCalled();
    expect(mockOnSelect).toHaveBeenCalledWith(0);

    // Test Escape
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    const preventDefaultSpy5 = jest.spyOn(escapeEvent, 'preventDefault');

    act(() => {
      const handled = result.current.handleKeyDown(escapeEvent);
      expect(handled).toBe(true);
    });

    expect(preventDefaultSpy5).toHaveBeenCalled();
    expect(mockOnEscape).toHaveBeenCalled();
  });

  it('should return false for unhandled keys', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 3,
        onSelect: mockOnSelect,
        initialIndex: 0,
      })
    );

    const randomEvent = new KeyboardEvent('keydown', { key: 'a' });

    act(() => {
      const handled = result.current.handleKeyDown(randomEvent);
      expect(handled).toBe(false);
    });

    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('should handle empty item list gracefully', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 0,
        onSelect: mockOnSelect,
        initialIndex: 0,
      })
    );

    act(() => {
      result.current.selectNext();
      result.current.selectPrevious();
      result.current.selectCurrentItem();
    });

    expect(result.current.selectedIndex).toBe(0);
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('should adjust selectedIndex when itemCount changes', () => {
    const { result, rerender } = renderHook(
      ({ itemCount }) =>
        useKeyboardNavigation({
          itemCount,
          onSelect: mockOnSelect,
          initialIndex: 2,
        }),
      { initialProps: { itemCount: 5 } }
    );

    expect(result.current.selectedIndex).toBe(2);

    // Reduce item count below current selected index
    rerender({ itemCount: 2 });

    expect(result.current.selectedIndex).toBe(1); // Should adjust to last valid index

    // Set item count to 0
    rerender({ itemCount: 0 });

    expect(result.current.selectedIndex).toBe(0);
  });

  it('should allow manual selectedIndex updates', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        onSelect: mockOnSelect,
        initialIndex: 0,
      })
    );

    act(() => {
      result.current.setSelectedIndex(3);
    });

    expect(result.current.selectedIndex).toBe(3);
  });

  it('should not call onEscape if not provided', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 3,
        onSelect: mockOnSelect,
        // No onEscape provided
      })
    );

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });

    act(() => {
      const handled = result.current.handleKeyDown(escapeEvent);
      expect(handled).toBe(true);
    });

    // Should not throw error even without onEscape
  });

  it('should handle manual index updates correctly', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 3,
        onSelect: mockOnSelect,
        initialIndex: 0,
      })
    );

    // Clear any previous calls
    mockOnSelect.mockClear();

    // Manually set valid index
    act(() => {
      result.current.setSelectedIndex(2);
    });

    act(() => {
      result.current.selectCurrentItem();
    });

    expect(mockOnSelect).toHaveBeenCalledWith(2);
  });
});