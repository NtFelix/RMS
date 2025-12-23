import { renderHook } from '@testing-library/react';
import { useModalKeyboardNavigation } from '@/hooks/use-modal-keyboard-navigation';

// Mock DOM elements
const createMockElement = (tagName: string, attributes: Record<string, string> = {}) => {
  const element = document.createElement(tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
};

describe('useModalKeyboardNavigation', () => {
  let mockOnClose: jest.Mock;
  let mockOnEscape: jest.Mock;
  let mockOnAttemptClose: jest.Mock;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnEscape = jest.fn();
    mockOnAttemptClose = jest.fn();

    // Clear any existing event listeners
    document.removeEventListener('keydown', jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('Escape Key Handling', () => {
    it('should call onClose when escape is pressed and modal is not dirty', () => {
      renderHook(() =>
        useModalKeyboardNavigation({
          isOpen: true,
          onClose: mockOnClose,
          isDirty: false,
        })
      );

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onAttemptClose when escape is pressed and modal is dirty', () => {
      renderHook(() =>
        useModalKeyboardNavigation({
          isOpen: true,
          onClose: mockOnClose,
          isDirty: true,
          onAttemptClose: mockOnAttemptClose,
        })
      );

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(mockOnAttemptClose).toHaveBeenCalledTimes(1);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onEscape when provided instead of onClose', () => {
      renderHook(() =>
        useModalKeyboardNavigation({
          isOpen: true,
          onClose: mockOnClose,
          onEscape: mockOnEscape,
          isDirty: false,
        })
      );

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(mockOnEscape).toHaveBeenCalledTimes(1);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not handle escape when modal is closed', () => {
      renderHook(() =>
        useModalKeyboardNavigation({
          isOpen: false,
          onClose: mockOnClose,
        })
      );

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      // Create a mock modal with focusable elements
      const modal = createMockElement('div', { role: 'dialog' });
      const button1 = createMockElement('button');
      const button2 = createMockElement('button');
      const input = createMockElement('input');

      modal.appendChild(button1);
      modal.appendChild(button2);
      modal.appendChild(input);
      document.body.appendChild(modal);

      // Mock focus method
      [button1, button2, input].forEach(el => {
        el.focus = jest.fn();
      });
    });

    it('should trap focus within modal on tab navigation', () => {
      renderHook(() =>
        useModalKeyboardNavigation({
          isOpen: true,
          onClose: mockOnClose,
        })
      );

      const modal = document.querySelector('[role="dialog"]');
      const buttons = modal?.querySelectorAll('button');
      const input = modal?.querySelector('input');

      if (buttons && input) {
        // Simulate focus on last element
        Object.defineProperty(document, 'activeElement', {
          value: input,
          configurable: true,
        });

        const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
        document.dispatchEvent(tabEvent);

        // Should focus first element when tabbing from last
        expect(buttons[0].focus).toHaveBeenCalled();
      }
    });

    it('should handle shift+tab navigation', () => {
      renderHook(() =>
        useModalKeyboardNavigation({
          isOpen: true,
          onClose: mockOnClose,
        })
      );

      const modal = document.querySelector('[role="dialog"]');
      const buttons = modal?.querySelectorAll('button');
      const input = modal?.querySelector('input');

      if (buttons && input) {
        // Simulate focus on first element
        Object.defineProperty(document, 'activeElement', {
          value: buttons[0],
          configurable: true,
        });

        const shiftTabEvent = new KeyboardEvent('keydown', { 
          key: 'Tab', 
          shiftKey: true 
        });
        document.dispatchEvent(shiftTabEvent);

        // Should focus last element when shift+tabbing from first
        expect(input.focus).toHaveBeenCalled();
      }
    });
  });

  describe('Arrow Key Navigation', () => {
    beforeEach(() => {
      // Create a mock modal with focusable elements
      const modal = createMockElement('div', { role: 'dialog' });
      const button1 = createMockElement('button');
      const button2 = createMockElement('button');
      const button3 = createMockElement('button');

      modal.appendChild(button1);
      modal.appendChild(button2);
      modal.appendChild(button3);
      document.body.appendChild(modal);

      // Mock focus method
      [button1, button2, button3].forEach(el => {
        el.focus = jest.fn();
      });
    });

    it('should navigate with arrow keys when enabled', () => {
      renderHook(() =>
        useModalKeyboardNavigation({
          isOpen: true,
          onClose: mockOnClose,
          enableArrowNavigation: true,
        })
      );

      const modal = document.querySelector('[role="dialog"]');
      const buttons = modal?.querySelectorAll('button');

      if (buttons) {
        // Simulate focus on first button
        Object.defineProperty(document, 'activeElement', {
          value: buttons[0],
          configurable: true,
        });

        const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        document.dispatchEvent(arrowDownEvent);

        // Should focus next element
        expect(buttons[1].focus).toHaveBeenCalled();
      }
    });

    it('should wrap around when navigating past last element', () => {
      renderHook(() =>
        useModalKeyboardNavigation({
          isOpen: true,
          onClose: mockOnClose,
          enableArrowNavigation: true,
        })
      );

      const modal = document.querySelector('[role="dialog"]');
      const buttons = modal?.querySelectorAll('button');

      if (buttons) {
        // Simulate focus on last button
        Object.defineProperty(document, 'activeElement', {
          value: buttons[buttons.length - 1],
          configurable: true,
        });

        const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        document.dispatchEvent(arrowDownEvent);

        // Should wrap to first element
        expect(buttons[0].focus).toHaveBeenCalled();
      }
    });

    it('should handle Home and End keys', () => {
      renderHook(() =>
        useModalKeyboardNavigation({
          isOpen: true,
          onClose: mockOnClose,
          enableArrowNavigation: true,
        })
      );

      const modal = document.querySelector('[role="dialog"]');
      const buttons = modal?.querySelectorAll('button');

      if (buttons) {
        // Test Home key
        const homeEvent = new KeyboardEvent('keydown', { key: 'Home' });
        document.dispatchEvent(homeEvent);
        expect(buttons[0].focus).toHaveBeenCalled();

        // Test End key
        const endEvent = new KeyboardEvent('keydown', { key: 'End' });
        document.dispatchEvent(endEvent);
        expect(buttons[buttons.length - 1].focus).toHaveBeenCalled();
      }
    });

    it('should not navigate with arrow keys when disabled', () => {
      renderHook(() =>
        useModalKeyboardNavigation({
          isOpen: true,
          onClose: mockOnClose,
          enableArrowNavigation: false,
        })
      );

      const modal = document.querySelector('[role="dialog"]');
      const buttons = modal?.querySelectorAll('button');

      if (buttons) {
        // Mock focus method to track calls
        buttons[1].focus = jest.fn();

        const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        document.dispatchEvent(arrowDownEvent);

        // Should not focus next element
        expect(buttons[1].focus).not.toHaveBeenCalled();
      }
    });
  });

  describe('Focus Management', () => {
    it('should focus first element when modal opens', (done) => {
      // Create a mock modal with focusable elements
      const modal = createMockElement('div', { role: 'dialog' });
      const button = createMockElement('button');
      button.focus = jest.fn();
      
      modal.appendChild(button);
      document.body.appendChild(modal);

      renderHook(() =>
        useModalKeyboardNavigation({
          isOpen: true,
          onClose: mockOnClose,
        })
      );

      // Focus should be called after timeout
      setTimeout(() => {
        expect(button.focus).toHaveBeenCalled();
        done();
      }, 150);
    });

    it('should use custom focusable selector', () => {
      const modal = createMockElement('div', { role: 'dialog' });
      const customElement = createMockElement('div', { 'data-focusable': 'true' });
      const button = createMockElement('button');
      
      customElement.focus = jest.fn();
      button.focus = jest.fn();
      
      modal.appendChild(customElement);
      modal.appendChild(button);
      document.body.appendChild(modal);

      const { result } = renderHook(() =>
        useModalKeyboardNavigation({
          isOpen: true,
          onClose: mockOnClose,
          focusableSelector: '[data-focusable="true"]',
        })
      );

      const focusableElements = result.current.getFocusableElements();
      expect(focusableElements).toHaveLength(1);
      expect(focusableElements[0]).toBe(customElement);
    });
  });

  describe('Event Cleanup', () => {
    it('should remove event listeners when modal closes', () => {
      const { rerender } = renderHook(
        ({ isOpen }) =>
          useModalKeyboardNavigation({
            isOpen,
            onClose: mockOnClose,
          }),
        { initialProps: { isOpen: true } }
      );

      // Modal is open, event listeners should be active
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      // Close modal
      rerender({ isOpen: false });

      // Event listeners should be removed
      mockOnClose.mockClear();
      document.dispatchEvent(escapeEvent);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});