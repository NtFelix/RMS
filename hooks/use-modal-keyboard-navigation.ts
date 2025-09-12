'use client';

import { useEffect, useCallback } from 'react';

interface UseModalKeyboardNavigationOptions {
  isOpen: boolean;
  onClose: () => void;
  onEscape?: () => void;
  isDirty?: boolean;
  onAttemptClose?: () => void;
  enableArrowNavigation?: boolean;
  focusableSelector?: string;
}

/**
 * Hook for managing keyboard navigation in modals
 * Handles escape key, arrow navigation, and focus management
 */
export function useModalKeyboardNavigation({
  isOpen,
  onClose,
  onEscape,
  isDirty = false,
  onAttemptClose,
  enableArrowNavigation = false,
  focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
}: UseModalKeyboardNavigationOptions) {
  
  // Handle escape key
  const handleEscape = useCallback(() => {
    if (isDirty && onAttemptClose) {
      onAttemptClose();
    } else if (onEscape) {
      onEscape();
    } else {
      onClose();
    }
  }, [isDirty, onAttemptClose, onEscape, onClose]);

  // Get focusable elements within the modal
  const getFocusableElements = useCallback(() => {
    if (!isOpen) return [];
    
    const modal = document.querySelector('[role="dialog"]');
    if (!modal) return [];
    
    return Array.from(modal.querySelectorAll(focusableSelector)) as HTMLElement[];
  }, [isOpen, focusableSelector]);

  // Handle arrow key navigation
  const handleArrowNavigation = useCallback((event: KeyboardEvent) => {
    if (!enableArrowNavigation) return;
    
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;
    
    const currentIndex = focusableElements.findIndex(el => el === document.activeElement);
    
    let nextIndex: number;
    
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
        focusableElements[nextIndex]?.focus();
        break;
        
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
        focusableElements[nextIndex]?.focus();
        break;
        
      case 'Home':
        event.preventDefault();
        focusableElements[0]?.focus();
        break;
        
      case 'End':
        event.preventDefault();
        focusableElements[focusableElements.length - 1]?.focus();
        break;
    }
  }, [enableArrowNavigation, getFocusableElements]);

  // Handle tab navigation (ensure it stays within modal)
  const handleTabNavigation = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      // Shift + Tab (backward)
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab (forward)
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }, [getFocusableElements]);

  // Main keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        handleEscape();
        break;
        
      case 'Tab':
        handleTabNavigation(event);
        break;
        
      case 'ArrowDown':
      case 'ArrowUp':
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Home':
      case 'End':
        handleArrowNavigation(event);
        break;
    }
  }, [isOpen, handleEscape, handleTabNavigation, handleArrowNavigation]);

  // Focus management
  const focusFirstElement = useCallback(() => {
    if (!isOpen) return;
    
    // Wait for modal to be rendered
    setTimeout(() => {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }, 100);
  }, [isOpen, getFocusableElements]);

  // Set up keyboard event listeners
  useEffect(() => {
    if (!isOpen) return;
    
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, handleKeyDown]);

  // Focus first element when modal opens
  useEffect(() => {
    if (isOpen) {
      focusFirstElement();
    }
  }, [isOpen, focusFirstElement]);

  return {
    focusFirstElement,
    getFocusableElements,
  };
}