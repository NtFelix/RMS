'use client';

import { useEffect, useCallback, useRef } from 'react';
import { 
  announceToScreenReader, 
  manageFocus, 
  findFocusableElement,
  SCREEN_READER_ANNOUNCEMENTS,
  KEYBOARD_SHORTCUTS,
  FOCUS_SELECTORS,
  generateAccessibilityId
} from '@/lib/accessibility-constants';

interface UseTemplateAccessibilityOptions {
  isModalOpen?: boolean;
  isEditorOpen?: boolean;
  templateCount?: number;
  filteredCount?: number;
  searchQuery?: string;
  onKeyboardShortcut?: (shortcut: string) => void;
}

/**
 * Hook for managing accessibility features in the template system
 */
export function useTemplateAccessibility({
  isModalOpen = false,
  isEditorOpen = false,
  templateCount = 0,
  filteredCount = 0,
  searchQuery = '',
  onKeyboardShortcut,
}: UseTemplateAccessibilityOptions = {}) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalIdRef = useRef<string | undefined>(undefined);
  const editorIdRef = useRef<string | undefined>(undefined);

  // Generate stable IDs for ARIA relationships
  if (!modalIdRef.current) {
    modalIdRef.current = generateAccessibilityId('templates-modal', 'main');
  }
  if (!editorIdRef.current) {
    editorIdRef.current = generateAccessibilityId('template-editor', 'main');
  }

  // Announce modal state changes
  useEffect(() => {
    if (isModalOpen) {
      announceToScreenReader(SCREEN_READER_ANNOUNCEMENTS.modalOpened);
    } else {
      announceToScreenReader(SCREEN_READER_ANNOUNCEMENTS.modalClosed);
    }
  }, [isModalOpen]);

  // Announce editor state changes
  useEffect(() => {
    if (isEditorOpen) {
      announceToScreenReader(SCREEN_READER_ANNOUNCEMENTS.editorOpened);
    } else {
      announceToScreenReader(SCREEN_READER_ANNOUNCEMENTS.editorClosed);
    }
  }, [isEditorOpen]);

  // Announce search results
  useEffect(() => {
    if (searchQuery && filteredCount !== templateCount) {
      const announcement = SCREEN_READER_ANNOUNCEMENTS.searchResults(filteredCount, searchQuery);
      announceToScreenReader(announcement);
    }
  }, [searchQuery, filteredCount, templateCount]);

  // Focus management for modal
  const handleModalOpen = useCallback(() => {
    // Store current focus
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    // Focus first focusable element in modal
    setTimeout(() => {
      const modal = document.querySelector(`#${modalIdRef.current}`);
      if (modal) {
        const firstFocusable = modal.querySelector(FOCUS_SELECTORS.focusable) as HTMLElement;
        manageFocus(firstFocusable);
      }
    }, 100);
  }, []);

  const handleModalClose = useCallback(() => {
    // Restore previous focus
    if (previousFocusRef.current) {
      manageFocus(previousFocusRef.current);
      previousFocusRef.current = null;
    }
  }, []);

  // Keyboard navigation for template cards
  const handleTemplateCardNavigation = useCallback((
    event: KeyboardEvent,
    container: HTMLElement
  ) => {
    const { key } = event;
    const currentElement = document.activeElement as HTMLElement;
    
    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        const nextElement = findFocusableElement(container, 'next', currentElement);
        manageFocus(nextElement);
        break;
        
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        const prevElement = findFocusableElement(container, 'previous', currentElement);
        manageFocus(prevElement);
        break;
        
      case 'Home':
        event.preventDefault();
        const firstElement = findFocusableElement(container, 'next');
        manageFocus(firstElement);
        break;
        
      case 'End':
        event.preventDefault();
        const lastElement = findFocusableElement(container, 'previous');
        manageFocus(lastElement);
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (currentElement && currentElement.click) {
          currentElement.click();
        }
        break;
    }
  }, []);

  // Global keyboard shortcuts
  const handleGlobalKeyboard = useCallback((event: KeyboardEvent) => {
    const { key, ctrlKey, altKey, metaKey } = event;
    const isModifierPressed = ctrlKey || metaKey;
    
    // Handle keyboard shortcuts
    if (altKey && key === 't') {
      event.preventDefault();
      onKeyboardShortcut?.(KEYBOARD_SHORTCUTS.openTemplates);
      return;
    }
    
    if (isModifierPressed && key === 's' && (isModalOpen || isEditorOpen)) {
      event.preventDefault();
      onKeyboardShortcut?.(KEYBOARD_SHORTCUTS.save);
      return;
    }
    
    if (key === 'Escape' && (isModalOpen || isEditorOpen)) {
      event.preventDefault();
      onKeyboardShortcut?.(KEYBOARD_SHORTCUTS.closeModal);
      return;
    }
  }, [isModalOpen, isEditorOpen, onKeyboardShortcut]);

  // Set up global keyboard listeners
  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyboard);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyboard);
    };
  }, [handleGlobalKeyboard]);

  // Announce template operations
  const announceTemplateCreated = useCallback(() => {
    announceToScreenReader(SCREEN_READER_ANNOUNCEMENTS.templateCreated, 'assertive');
  }, []);

  const announceTemplateUpdated = useCallback(() => {
    announceToScreenReader(SCREEN_READER_ANNOUNCEMENTS.templateUpdated, 'assertive');
  }, []);

  const announceTemplateDeleted = useCallback(() => {
    announceToScreenReader(SCREEN_READER_ANNOUNCEMENTS.templateDeleted, 'assertive');
  }, []);

  const announceFilterApplied = useCallback((count: number) => {
    const announcement = SCREEN_READER_ANNOUNCEMENTS.filterApplied(count);
    announceToScreenReader(announcement);
  }, []);

  // Focus management utilities
  const focusTemplateCard = useCallback((templateId: string) => {
    const card = document.querySelector(`[data-template-id="${templateId}"]`) as HTMLElement;
    manageFocus(card);
  }, []);

  const focusFirstTemplate = useCallback(() => {
    const firstCard = document.querySelector('[data-template-card]') as HTMLElement;
    manageFocus(firstCard);
  }, []);

  const focusSearchInput = useCallback(() => {
    const searchInput = document.querySelector('[data-search-input]') as HTMLElement;
    manageFocus(searchInput);
  }, []);

  const focusCreateButton = useCallback(() => {
    const createButton = document.querySelector('[data-create-template-button]') as HTMLElement;
    manageFocus(createButton);
  }, []);

  // Editor-specific accessibility
  const handleEditorKeyboard = useCallback((event: KeyboardEvent) => {
    const { key, ctrlKey, metaKey } = event;
    const isModifierPressed = ctrlKey || metaKey;
    
    if (!isEditorOpen) return;
    
    // Handle editor shortcuts
    if (isModifierPressed) {
      switch (key) {
        case 'b':
          event.preventDefault();
          onKeyboardShortcut?.(KEYBOARD_SHORTCUTS.bold);
          break;
        case 'i':
          event.preventDefault();
          onKeyboardShortcut?.(KEYBOARD_SHORTCUTS.italic);
          break;
        case 'z':
          event.preventDefault();
          onKeyboardShortcut?.(KEYBOARD_SHORTCUTS.undo);
          break;
        case 'y':
          event.preventDefault();
          onKeyboardShortcut?.(KEYBOARD_SHORTCUTS.redo);
          break;
      }
    }
  }, [isEditorOpen, onKeyboardShortcut]);

  // Set up editor keyboard listeners
  useEffect(() => {
    if (isEditorOpen) {
      document.addEventListener('keydown', handleEditorKeyboard);
      return () => {
        document.removeEventListener('keydown', handleEditorKeyboard);
      };
    }
  }, [isEditorOpen, handleEditorKeyboard]);

  return {
    // IDs for ARIA relationships
    modalId: modalIdRef.current,
    editorId: editorIdRef.current,
    
    // Focus management
    handleModalOpen,
    handleModalClose,
    focusTemplateCard,
    focusFirstTemplate,
    focusSearchInput,
    focusCreateButton,
    
    // Navigation
    handleTemplateCardNavigation,
    
    // Announcements
    announceTemplateCreated,
    announceTemplateUpdated,
    announceTemplateDeleted,
    announceFilterApplied,
    
    // Utilities
    manageFocus,
    announceToScreenReader,
  };
}