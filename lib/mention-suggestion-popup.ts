import tippy, { Instance, Props } from 'tippy.js';
import { Editor } from '@tiptap/react';

export interface SuggestionPopupConfig {
  editor: Editor;
  element: HTMLElement;
  clientRect: () => DOMRect | null;
  onDestroy?: () => void;
}

export interface PopupInstance {
  show: () => void;
  hide: () => void;
  destroy: () => void;
  setProps: (props: Partial<Props>) => void;
}

/**
 * Calculates optimal placement for the suggestion popup to prevent off-screen rendering
 */
export function getOptimalPlacement(referenceRect: DOMRect): 'bottom-start' | 'top-start' | 'bottom-end' | 'top-end' {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate available space in each direction
  const spaceBelow = viewportHeight - referenceRect.bottom;
  const spaceAbove = referenceRect.top;
  const spaceRight = viewportWidth - referenceRect.left;
  const spaceLeft = referenceRect.left;
  
  // Minimum space required for popup (approximate)
  const minVerticalSpace = 200;
  const minHorizontalSpace = 320;
  
  // Determine vertical placement
  const preferBottom = spaceBelow >= minVerticalSpace;
  const canFitBelow = spaceBelow >= minVerticalSpace;
  const canFitAbove = spaceAbove >= minVerticalSpace;
  
  // Determine horizontal placement
  const preferStart = spaceRight >= minHorizontalSpace;
  const canFitRight = spaceRight >= minHorizontalSpace;
  const canFitLeft = spaceLeft >= minHorizontalSpace;
  
  // Choose placement based on available space
  if (preferBottom && canFitBelow) {
    return preferStart && canFitRight ? 'bottom-start' : 'bottom-end';
  } else if (canFitAbove) {
    return preferStart && canFitRight ? 'top-start' : 'top-end';
  } else {
    // Fallback to bottom-start if no ideal placement
    return 'bottom-start';
  }
}

/**
 * Determines if the current device is mobile based on viewport width and touch capability
 */
export function isMobileDevice(): boolean {
  return window.innerWidth <= 768 || ('ontouchstart' in window);
}

/**
 * Gets mobile-optimized configuration for the suggestion popup
 */
export function getMobileConfig(): Partial<Props> {
  return {
    maxWidth: Math.min(window.innerWidth - 32, 280), // 16px margin on each side
    offset: [0, 8],
    placement: 'bottom-start',
    popperOptions: {
      modifiers: [
        {
          name: 'preventOverflow',
          options: {
            boundary: 'viewport',
            padding: 16,
          },
        },
        {
          name: 'flip',
          options: {
            fallbackPlacements: ['top-start', 'bottom-end', 'top-end'],
          },
        },
      ],
    },
  };
}

/**
 * Gets desktop-optimized configuration for the suggestion popup
 */
export function getDesktopConfig(referenceRect: DOMRect): Partial<Props> {
  const placement = getOptimalPlacement(referenceRect);
  
  return {
    maxWidth: 320,
    offset: [0, 4],
    placement,
    popperOptions: {
      modifiers: [
        {
          name: 'preventOverflow',
          options: {
            boundary: 'viewport',
            padding: 8,
          },
        },
        {
          name: 'flip',
          options: {
            fallbackPlacements: ['bottom-start', 'top-start', 'bottom-end', 'top-end'],
          },
        },
      ],
    },
  };
}

/**
 * Creates and configures a Tippy.js instance for mention suggestions
 */
export function createSuggestionPopup(config: SuggestionPopupConfig): PopupInstance {
  const { element, clientRect, onDestroy } = config;
  
  // Get initial reference rect for positioning
  const initialRect = clientRect();
  const isMobile = isMobileDevice();
  
  // Base configuration
  const baseConfig: Partial<Props> = {
    getReferenceClientRect: () => clientRect() || new DOMRect(),
    appendTo: () => document.body,
    content: element,
    showOnCreate: true,
    interactive: true,
    trigger: 'manual',
    hideOnClick: 'toggle',
    theme: 'mention-suggestion',
    animation: 'shift-away-subtle',
    duration: [150, 100],
    zIndex: 9999,
    ...( isMobile && initialRect 
      ? getMobileConfig() 
      : getDesktopConfig(initialRect || new DOMRect())
    ),
  };
  
  // Create Tippy instance
  const tippyInstances = tippy(document.body, baseConfig);
  const tippyInstance = Array.isArray(tippyInstances) ? tippyInstances[0] : tippyInstances;
  
  // Handle responsive updates on window resize
  const handleResize = () => {
    const currentRect = clientRect();
    if (!currentRect) return;
    
    const newIsMobile = isMobileDevice();
    const newConfig = newIsMobile 
      ? getMobileConfig() 
      : getDesktopConfig(currentRect);
    
    tippyInstance.setProps(newConfig);
  };
  
  // Add resize listener for responsive behavior
  window.addEventListener('resize', handleResize);
  
  return {
    show: () => tippyInstance.show(),
    hide: () => tippyInstance.hide(),
    destroy: () => {
      window.removeEventListener('resize', handleResize);
      tippyInstance.destroy();
      onDestroy?.();
    },
    setProps: (props: Partial<Props>) => {
      // Merge with responsive config when updating props
      const currentRect = clientRect();
      if (currentRect) {
        const responsiveConfig = isMobileDevice() 
          ? getMobileConfig() 
          : getDesktopConfig(currentRect);
        
        tippyInstance.setProps({
          ...responsiveConfig,
          ...props,
        });
      } else {
        tippyInstance.setProps(props);
      }
    },
  };
}

/**
 * Custom CSS theme for mention suggestion popup - now handled by mention-suggestion.css
 * This is kept for backward compatibility but the main styling is in the CSS file
 */
export const mentionSuggestionTheme = `
  /* Base Tippy.js theme integration - detailed styles are in mention-suggestion.css */
  .tippy-box[data-theme~='mention-suggestion'] {
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
  }
  
  .tippy-box[data-theme~='mention-suggestion'] .tippy-content {
    padding: 0;
  }
  
  .tippy-box[data-theme~='mention-suggestion'] .tippy-arrow {
    display: none;
  }
`;

/**
 * Injects the mention suggestion theme CSS into the document head
 */
export function injectMentionSuggestionTheme(): void {
  const existingStyle = document.getElementById('mention-suggestion-theme');
  if (existingStyle) return;
  
  const style = document.createElement('style');
  style.id = 'mention-suggestion-theme';
  style.textContent = mentionSuggestionTheme;
  document.head.appendChild(style);
}

/**
 * Utility function to handle viewport changes and update popup positioning
 */
export function createViewportAwarePopup(config: SuggestionPopupConfig): PopupInstance {
  // Inject theme CSS
  injectMentionSuggestionTheme();
  
  // Create popup with viewport awareness
  const popup = createSuggestionPopup(config);
  
  // Handle orientation changes on mobile
  const handleOrientationChange = () => {
    setTimeout(() => {
      const currentRect = config.clientRect();
      if (currentRect) {
        const newConfig = isMobileDevice() 
          ? getMobileConfig() 
          : getDesktopConfig(currentRect);
        popup.setProps(newConfig);
      }
    }, 100); // Small delay to allow viewport to settle
  };
  
  window.addEventListener('orientationchange', handleOrientationChange);
  
  // Override destroy to clean up orientation listener
  const originalDestroy = popup.destroy;
  popup.destroy = () => {
    window.removeEventListener('orientationchange', handleOrientationChange);
    originalDestroy();
  };
  
  return popup;
}