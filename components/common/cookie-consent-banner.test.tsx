import { render, screen, fireEvent } from '@testing-library/react';
import { CookieConsentBanner } from '@/components/common/cookie-consent-banner';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should render the cookie banner when no consent is given', () => {
    render(<CookieConsentBanner />);
    expect(screen.getByText('Cookie-Einstellungen')).toBeInTheDocument();
  });

  it('should not render the banner when consent is already given', () => {
    localStorage.setItem('cookieConsent', 'all');
    render(<CookieConsentBanner />);
    expect(screen.queryByText('Cookie-Einstellungen')).not.toBeInTheDocument();
  });

  it('should set consent to necessary when "Nur notwendige" is clicked', () => {
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText('Nur notwendige'));
    expect(localStorage.getItem('cookieConsent')).toBe('necessary');
  });

  it('should set consent to all when "Alle akzeptieren" is clicked', () => {
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText('Alle akzeptieren'));
    expect(localStorage.getItem('cookieConsent')).toBe('all');
  });

  it('should hide the banner after making a choice', () => {
    const { container } = render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText('Alle akzeptieren'));
    // The banner should be removed from the DOM
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
