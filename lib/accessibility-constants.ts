/**
 * Accessibility constants and utilities for the template system
 */

// ARIA labels for template components
export const ARIA_LABELS = {
  // Bulk Operations
  bulkActionBar: (count: number) => `Bulk-Aktionen für ${count} ausgewählte ${count === 1 ? 'Element' : 'Elemente'}`,
  bulkActionBarDescription: 'Führen Sie Aktionen für mehrere ausgewählte Zeilen gleichzeitig aus',
  bulkOperationsDropdown: 'Bulk-Aktionen auswählen',
  bulkOperationsDropdownTrigger: 'Bulk-Aktionen-Menü öffnen',
  clearSelectionButton: 'Auswahl aufheben',
  selectAllCheckbox: 'Alle Zeilen auswählen/abwählen',
  selectAllCheckboxIndeterminate: 'Einige Zeilen ausgewählt - alle auswählen',
  selectAllCheckboxSelected: 'Alle Zeilen ausgewählt - Auswahl aufheben',
  rowSelectionCheckbox: (id: string) => `Zeile ${id} auswählen`,
  selectionCounter: (count: number) => `${count} ${count === 1 ? 'Element' : 'Elemente'} ausgewählt`,
  bulkOperationConfirmation: (operation: string, count: number) => 
    `${operation} für ${count} ${count === 1 ? 'Element' : 'Elemente'} bestätigen`,
  bulkOperationProgress: 'Bulk-Operation wird ausgeführt',
  bulkOperationSuccess: (count: number) => `${count} ${count === 1 ? 'Element' : 'Elemente'} erfolgreich aktualisiert`,
  bulkOperationError: 'Fehler bei der Bulk-Operation',
  
  // Templates Modal
  templatesModal: 'Vorlagen verwalten',
  templatesModalDescription: 'Erstellen und verwalten Sie Ihre Dokumentvorlagen mit dynamischen Variablen',
  templatesList: 'Liste der verfügbaren Vorlagen',
  templatesSearch: 'Vorlagen durchsuchen',
  categoryFilter: 'Nach Kategorie filtern',
  createTemplateButton: 'Neue Vorlage erstellen',
  clearFiltersButton: 'Filter zurücksetzen',
  
  // Template Card
  templateCard: (title: string) => `Vorlage: ${title}`,
  templateCardDescription: (category: string, lastModified: string) => 
    `Kategorie: ${category}, Zuletzt geändert: ${lastModified}`,
  editTemplateButton: (title: string) => `Vorlage "${title}" bearbeiten`,
  deleteTemplateButton: (title: string) => `Vorlage "${title}" löschen`,
  
  // Template Editor Modal
  templateEditorModal: 'Vorlage bearbeiten',
  templateEditorModalDescription: 'Bearbeiten Sie Ihre Vorlage mit dem Rich-Text-Editor',
  categorySelection: 'Kategorie für die Vorlage auswählen',
  templateNameInput: 'Name der Vorlage eingeben',
  templateContentEditor: 'Inhalt der Vorlage bearbeiten',
  backToCategoryButton: 'Zurück zur Kategorieauswahl',
  saveTemplateButton: 'Vorlage speichern',
  cancelButton: 'Bearbeitung abbrechen',
  
  // Template Editor
  editorToolbar: 'Formatierungsoptionen für den Text-Editor',
  boldButton: 'Text fett formatieren',
  italicButton: 'Text kursiv formatieren',
  bulletListButton: 'Aufzählung erstellen',
  orderedListButton: 'Nummerierte Liste erstellen',
  blockquoteButton: 'Zitat einfügen',
  undoButton: 'Letzte Aktion rückgängig machen',
  redoButton: 'Letzte Aktion wiederholen',
  mentionDropdown: 'Verfügbare Variablen auswählen',
  mentionVariable: (label: string) => `Variable: ${label}`,
  
  // Loading states
  loadingTemplates: 'Vorlagen werden geladen',
  savingTemplate: 'Vorlage wird gespeichert',
  deletingTemplate: 'Vorlage wird gelöscht',
  
  // Error states
  templateError: 'Fehler beim Laden der Vorlagen',
  validationError: 'Validierungsfehler im Formular',
  
  // Status messages
  templateCreated: 'Vorlage wurde erfolgreich erstellt',
  templateUpdated: 'Vorlage wurde erfolgreich aktualisiert',
  templateDeleted: 'Vorlage wurde erfolgreich gelöscht',
} as const;

// Screen reader announcements
export const SCREEN_READER_ANNOUNCEMENTS = {
  // Bulk Operations
  rowSelected: (id: string) => `Zeile ${id} ausgewählt`,
  rowDeselected: (id: string) => `Zeile ${id} abgewählt`,
  allRowsSelected: (count: number) => `Alle ${count} Zeilen ausgewählt`,
  allRowsDeselected: 'Alle Zeilen abgewählt',
  selectionCleared: 'Auswahl aufgehoben',
  bulkOperationStarted: (operation: string, count: number) => 
    `${operation} für ${count} ${count === 1 ? 'Element' : 'Elemente'} gestartet`,
  bulkOperationCompleted: (operation: string, count: number) => 
    `${operation} für ${count} ${count === 1 ? 'Element' : 'Elemente'} abgeschlossen`,
  bulkOperationFailed: (operation: string) => `${operation} fehlgeschlagen`,
  validationErrors: (count: number) => `${count} Validierungsfehler gefunden`,
  
  // Templates
  templateCreated: 'Neue Vorlage wurde erstellt und zur Liste hinzugefügt',
  templateUpdated: 'Vorlage wurde aktualisiert',
  templateDeleted: 'Vorlage wurde aus der Liste entfernt',
  filterApplied: (count: number) => `Filter angewendet. ${count} Vorlagen werden angezeigt`,
  searchResults: (count: number, query: string) => 
    `Suchergebnisse für "${query}": ${count} Vorlagen gefunden`,
  modalOpened: 'Vorlagen-Dialog wurde geöffnet',
  modalClosed: 'Vorlagen-Dialog wurde geschlossen',
  editorOpened: 'Vorlagen-Editor wurde geöffnet',
  editorClosed: 'Vorlagen-Editor wurde geschlossen',
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  // Bulk Operations shortcuts
  clearSelection: 'Escape',
  selectRow: 'Space',
  selectAll: 'Ctrl+A',
  toggleSelection: 'Space',
  openBulkActions: 'Enter',
  confirmAction: 'Enter',
  cancelAction: 'Escape',
  
  // Global shortcuts
  openTemplates: 'Alt+T',
  closeModal: 'Escape',
  
  // Editor shortcuts
  bold: 'Ctrl+B',
  italic: 'Ctrl+I',
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Y',
  save: 'Ctrl+S',
  
  // Navigation shortcuts
  nextItem: 'ArrowDown',
  previousItem: 'ArrowUp',
  firstItem: 'Home',
  lastItem: 'End',
  selectItem: 'Enter',
  
  // Mention shortcuts
  insertMention: '@',
  selectMention: 'Enter',
  cancelMention: 'Escape',
} as const;

// Focus management selectors
export const FOCUS_SELECTORS = {
  // Focusable elements
  focusable: [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]:not([disabled])',
    '[role="menuitem"]:not([disabled])',
  ].join(', '),
  
  // Bulk Operations selectors
  bulkActionBar: '[data-bulk-action-bar]',
  bulkOperationsDropdown: '[data-bulk-operations-dropdown]',
  rowSelectionCheckbox: '[data-row-selection-checkbox]',
  selectAllCheckbox: '[data-select-all-checkbox]',
  bulkOperationButton: '[data-bulk-operation-button]',
  
  // Template-specific selectors
  templateCard: '[data-template-card]',
  templateCardActions: '[data-template-card-action]',
  editorToolbarButton: '[data-editor-toolbar-button]',
  mentionOption: '[data-mention-option]',
} as const;

// Live region types for screen readers
export const LIVE_REGIONS = {
  polite: 'polite' as const,
  assertive: 'assertive' as const,
  off: 'off' as const,
} as const;

// Role attributes
export const ROLES = {
  dialog: 'dialog',
  button: 'button',
  listbox: 'listbox',
  option: 'option',
  group: 'group',
  region: 'region',
  status: 'status',
  alert: 'alert',
  toolbar: 'toolbar',
  menubar: 'menubar',
  menu: 'menu',
  menuitem: 'menuitem',
  grid: 'grid',
  gridcell: 'gridcell',
  tab: 'tab',
  tabpanel: 'tabpanel',
  tablist: 'tablist',
} as const;

// Utility function to generate unique IDs for accessibility
export function generateAccessibilityId(prefix: string, suffix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}-${timestamp}-${random}${suffix ? `-${suffix}` : ''}`;
}

// Utility function to announce to screen readers
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Utility function to manage focus
export function manageFocus(element: HTMLElement | null, options?: { preventScroll?: boolean }): void {
  if (!element) return;
  
  // Ensure element is focusable
  if (!element.hasAttribute('tabindex') && !element.matches(FOCUS_SELECTORS.focusable)) {
    element.setAttribute('tabindex', '-1');
  }
  
  element.focus(options);
}

// Utility function to find next/previous focusable element
export function findFocusableElement(
  container: HTMLElement,
  direction: 'next' | 'previous',
  currentElement?: HTMLElement
): HTMLElement | null {
  const focusableElements = Array.from(
    container.querySelectorAll(FOCUS_SELECTORS.focusable)
  ) as HTMLElement[];
  
  if (focusableElements.length === 0) return null;
  
  if (!currentElement) {
    return direction === 'next' ? focusableElements[0] : focusableElements[focusableElements.length - 1];
  }
  
  const currentIndex = focusableElements.indexOf(currentElement);
  if (currentIndex === -1) return focusableElements[0];
  
  if (direction === 'next') {
    return focusableElements[currentIndex + 1] || focusableElements[0];
  } else {
    return focusableElements[currentIndex - 1] || focusableElements[focusableElements.length - 1];
  }
}