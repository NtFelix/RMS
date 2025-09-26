import tippy, { Instance, Props } from 'tippy.js';
import { Editor } from '@tiptap/react';
import { 
  handlePositionError, 
  MentionSuggestionErrorType,
  safeExecute 
} from './mention-suggestion-error-handling';

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
  try {
    if (!referenceRect || typeof window === 'undefined') {
      return 'bottom-start';
    }
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Validate viewport dimensions
    if (viewportWidth <= 0 || viewportHeight <= 0) {
      return 'bottom-start';
    }
    
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
  } catch (error) {
    console.warn('Error calculating optimal placement:', error);
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
 * Creates and configures a Tippy.js instance for mention suggestions with error handling
 */
export function createSuggestionPopup(config: SuggestionPopupConfig): PopupInstance {
  try {
    const { element, clientRect, onDestroy } = config;
    
    if (!element) {
      throw new Error('Element is required for popup creation');
    }
    
    if (!clientRect || typeof clientRect !== 'function') {
      throw new Error('ClientRect function is required for popup creation');
    }
    
    // Get initial reference rect for positioning
    const initialRect = clientRect();
    const isMobile = isMobileDevice();
    
    // Base configuration
    const baseConfig: Partial<Props> = {
      getReferenceClientRect: () => {
        try {
          return clientRect() || new DOMRect();
        } catch (error) {
          console.warn('Error getting client rect:', error);
          return new DOMRect();
        }
      },
      appendTo: () => document.body,
      content: element,
      showOnCreate: true,
      interactive: true,
      trigger: 'manual',
      hideOnClick: false,
      theme: 'mention-suggestion',
      animation: 'shift-away-subtle',
      duration: [150, 100],
      zIndex: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--z-index-tooltip').trim()) || 1070,
      ...( isMobile && initialRect 
        ? getMobileConfig() 
        : getDesktopConfig(initialRect || new DOMRect())
      ),
    };
    
    // Create Tippy instance
    const tippyInstances = tippy(document.body, baseConfig);
    const tippyInstance = Array.isArray(tippyInstances) ? tippyInstances[0] : tippyInstances;
    
    if (!tippyInstance) {
      throw new Error('Failed to create Tippy instance');
    }

    // Track cleanup functions for proper memory management
    const cleanupFunctions: (() => void)[] = [];
    
    // Handle responsive updates on window resize with throttling
    let resizeTimeout: NodeJS.Timeout | null = null;
    const handleResize = () => {
      // Throttle resize events to prevent excessive updates
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      resizeTimeout = setTimeout(() => {
        try {
          const currentRect = clientRect();
          if (!currentRect) return;
          
          const newIsMobile = isMobileDevice();
          const newConfig = newIsMobile 
            ? getMobileConfig() 
            : getDesktopConfig(currentRect);
          
          tippyInstance.setProps(newConfig);
        } catch (error) {
          console.warn('Error handling resize:', error);
        } finally {
          resizeTimeout = null;
        }
      }, 100); // 100ms throttle
    };
    
    // Add resize listener for responsive behavior
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize, { passive: true });
      cleanupFunctions.push(() => {
        window.removeEventListener('resize', handleResize);
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
          resizeTimeout = null;
        }
      });
    }
    
    return {
      show: () => {
        try {
          tippyInstance.show();
        } catch (error) {
          console.warn('Error showing popup:', error);
        }
      },
      hide: () => {
        try {
          tippyInstance.hide();
        } catch (error) {
          console.warn('Error hiding popup:', error);
        }
      },
      destroy: () => {
        try {
          // Execute all cleanup functions
          cleanupFunctions.forEach(cleanup => {
            try {
              cleanup();
            } catch (error) {
              console.warn('Error in cleanup function:', error);
            }
          });
          
          // Destroy Tippy instance
          tippyInstance.destroy();
          
          // Call onDestroy callback
          onDestroy?.();
        } catch (error) {
          console.warn('Error destroying popup:', error);
          // Still call onDestroy even if tippy destroy fails
          try {
            onDestroy?.();
          } catch (destroyError) {
            console.warn('Error in onDestroy callback:', destroyError);
          }
        }
      },
      setProps: (props: Partial<Props>) => {
        try {
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
        } catch (error) {
          console.warn('Error setting popup props:', error);
        }
      },
    };
  } catch (error) {
    // Return a fallback popup instance that does nothing
    console.error('Failed to create suggestion popup:', error);
    
    const fallbackInstance: PopupInstance = {
      show: () => console.warn('Popup show called on fallback instance'),
      hide: () => console.warn('Popup hide called on fallback instance'),
      destroy: () => {
        try {
          config.onDestroy?.();
        } catch (error) {
          console.warn('Error in fallback destroy:', error);
        }
      },
      setProps: () => console.warn('Popup setProps called on fallback instance'),
    };
    
    return fallbackInstance;
  }
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
  
  // Handle orientation changes on mobile with throttling
  let orientationTimeout: NodeJS.Timeout | null = null;
  const handleOrientationChange = () => {
    if (orientationTimeout) {
      clearTimeout(orientationTimeout);
    }
    
    orientationTimeout = setTimeout(() => {
      try {
        const currentRect = config.clientRect();
        if (currentRect) {
          const newConfig = isMobileDevice() 
            ? getMobileConfig() 
            : getDesktopConfig(currentRect);
          popup.setProps(newConfig);
        }
      } catch (error) {
        console.warn('Error handling orientation change:', error);
      } finally {
        orientationTimeout = null;
      }
    }, 150); // Slightly longer delay for orientation changes
  };
  
  // Add orientation change listener with passive option for better performance
  if (typeof window !== 'undefined') {
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
  }
  
  // Override destroy to clean up orientation listener and timeout
  const originalDestroy = popup.destroy;
  popup.destroy = () => {
    try {
      if (typeof window !== 'undefined') {
        window.removeEventListener('orientationchange', handleOrientationChange);
      }
      
      if (orientationTimeout) {
        clearTimeout(orientationTimeout);
        orientationTimeout = null;
      }
      
      originalDestroy();
    } catch (error) {
      console.warn('Error in viewport-aware popup destroy:', error);
      // Still try to call original destroy
      try {
        originalDestroy();
      } catch (originalError) {
        console.warn('Error in original destroy:', originalError);
      }
    }
  };
  
  return popup;
}