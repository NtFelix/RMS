import { 
  getOptimalPlacement, 
  isMobileDevice, 
  getMobileConfig, 
  getDesktopConfig,
  injectMentionSuggestionTheme 
} from '../mention-suggestion-popup';

// Mock window properties
const mockWindow = (width: number, height: number, hasTouch = false) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  if (hasTouch) {
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: {},
    });
  } else {
    delete (window as any).ontouchstart;
  }
};

describe('mention-suggestion-popup', () => {
  beforeEach(() => {
    // Reset window properties
    mockWindow(1024, 768);
    
    // Clear any existing theme styles
    const existingStyle = document.getElementById('mention-suggestion-theme');
    if (existingStyle) {
      existingStyle.remove();
    }
  });

  describe('getOptimalPlacement', () => {
    it('should return bottom-start when there is enough space below and to the right', () => {
      const rect = new DOMRect(100, 100, 50, 20);
      mockWindow(1024, 768);
      
      const placement = getOptimalPlacement(rect);
      expect(placement).toBe('bottom-start');
    });

    it('should return top-start when there is not enough space below but enough above', () => {
      const rect = new DOMRect(100, 600, 50, 20);
      mockWindow(1024, 768);
      
      const placement = getOptimalPlacement(rect);
      expect(placement).toBe('top-start');
    });

    it('should return bottom-end when there is not enough space to the right', () => {
      const rect = new DOMRect(900, 100, 50, 20);
      mockWindow(1024, 768);
      
      const placement = getOptimalPlacement(rect);
      expect(placement).toBe('bottom-end');
    });

    it('should return top-end when there is not enough space below or to the right', () => {
      const rect = new DOMRect(900, 600, 50, 20);
      mockWindow(1024, 768);
      
      const placement = getOptimalPlacement(rect);
      expect(placement).toBe('top-end');
    });
  });

  describe('isMobileDevice', () => {
    it('should return true for narrow viewport', () => {
      mockWindow(600, 800);
      expect(isMobileDevice()).toBe(true);
    });

    it('should return true when touch is available', () => {
      mockWindow(1024, 768, true);
      expect(isMobileDevice()).toBe(true);
    });

    it('should return false for wide viewport without touch', () => {
      mockWindow(1024, 768, false);
      expect(isMobileDevice()).toBe(false);
    });
  });

  describe('getMobileConfig', () => {
    it('should return mobile-optimized configuration', () => {
      mockWindow(375, 667);
      
      const config = getMobileConfig();
      
      expect(config.maxWidth).toBe(280); // Math.min(375 - 32, 280)
      expect(config.offset).toEqual([0, 8]);
      expect(config.placement).toBe('bottom-start');
      expect(config.popperOptions?.modifiers).toBeDefined();
    });

    it('should respect minimum width', () => {
      mockWindow(300, 500);
      
      const config = getMobileConfig();
      
      expect(config.maxWidth).toBe(268); // 300 - 32
    });
  });

  describe('getDesktopConfig', () => {
    it('should return desktop-optimized configuration', () => {
      const rect = new DOMRect(100, 100, 50, 20);
      mockWindow(1024, 768);
      
      const config = getDesktopConfig(rect);
      
      expect(config.maxWidth).toBe(320);
      expect(config.offset).toEqual([0, 4]);
      expect(config.placement).toBe('bottom-start');
      expect(config.popperOptions?.modifiers).toBeDefined();
    });
  });

  describe('injectMentionSuggestionTheme', () => {
    it('should inject theme CSS into document head', () => {
      injectMentionSuggestionTheme();
      
      const styleElement = document.getElementById('mention-suggestion-theme');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.tagName).toBe('STYLE');
      expect(styleElement?.textContent).toContain('mention-suggestion');
    });

    it('should not inject duplicate theme CSS', () => {
      injectMentionSuggestionTheme();
      injectMentionSuggestionTheme();
      
      const styleElements = document.querySelectorAll('#mention-suggestion-theme');
      expect(styleElements.length).toBe(1);
    });
  });
});