import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CookieConsent from '../cookie-consent';

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render when no consent is given', () => {
    render(<CookieConsent />);
    expect(screen.getByText(/we use cookies/i)).toBeInTheDocument();
  });

  it('should not render when consent is already given', () => {
    localStorage.setItem('cookie-consent', 'all');
    render(<CookieConsent />);
    expect(screen.queryByText(/we use cookies/i)).not.toBeInTheDocument();
  });

  it('should set consent to "denied" when "Deny" is clicked', () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByText('Deny'));
    expect(localStorage.getItem('cookie-consent')).toBe('denied');
    expect(screen.queryByText(/we use cookies/i)).not.toBeInTheDocument();
  });

  it('should set consent to "necessary" when "Accept only necessary" is clicked', () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByText('Accept only necessary'));
    expect(localStorage.getItem('cookie-consent')).toBe('necessary');
    expect(screen.queryByText(/we use cookies/i)).not.toBeInTheDocument();
  });

  it('should set consent to "all" when "Accept all cookies" is clicked', () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByText('Accept all cookies'));
    expect(localStorage.getItem('cookie-consent')).toBe('all');
    expect(screen.queryByText(/we use cookies/i)).not.toBeInTheDocument();
  });
});
