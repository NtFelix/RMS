import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import Navigation from './navigation';
import { createClient } from '@/utils/supabase/client';

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('@/utils/supabase/client');

jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

// Mock Framer Motion components
jest.mock('framer-motion', () => ({
  motion: {
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AvatarImage: ({ src, alt }: any) => <img src={src} alt={alt} />,
  AvatarFallback: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/pill-container', () => ({
  PillContainer: ({ children }: any) => <div data-testid="pill-container">{children}</div>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onSelect }: any) => (
    <button onClick={onSelect}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(),
    signOut: jest.fn(),
  },
};

describe('Navigation - Jetzt loslegen Feature', () => {
  const mockOnLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue('/');
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    
    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Default auth state - not logged in
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  describe('Authentication State', () => {
    it('renders login button when user is not authenticated', async () => {
      render(<Navigation onLogin={mockOnLogin} />);

      await waitFor(() => {
        expect(screen.getByText('Anmelden')).toBeInTheDocument();
      });
    });

    it('renders user avatar when user is authenticated', async () => {
      const mockUser = { 
        id: '123', 
        email: 'test@example.com',
        user_metadata: { avatar_url: 'https://example.com/avatar.jpg' }
      };
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      render(<Navigation onLogin={mockOnLogin} />);

      await waitFor(() => {
        expect(screen.getByAltText('User avatar')).toBeInTheDocument();
      });
    });
  });

  describe('Login Button Behavior', () => {
    it('clears auth intent when login button is clicked', async () => {
      const user = userEvent.setup();
      render(<Navigation onLogin={mockOnLogin} />);

      await waitFor(() => {
        const loginButton = screen.getByText('Anmelden');
        return user.click(loginButton);
      });

      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('authIntent');
      expect(mockOnLogin).toHaveBeenCalled();
    });

    it('handles sessionStorage errors when clearing auth intent', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      (window.sessionStorage.removeItem as jest.Mock).mockImplementation(() => {
        throw new Error('SessionStorage not available');
      });

      render(<Navigation onLogin={mockOnLogin} />);

      await waitFor(() => {
        const loginButton = screen.getByText('Anmelden');
        return user.click(loginButton);
      });

      expect(consoleSpy).toHaveBeenCalledWith('SessionStorage not available');
      expect(mockOnLogin).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('calls onLogin prop when provided', async () => {
      const user = userEvent.setup();
      render(<Navigation onLogin={mockOnLogin} />);

      await waitFor(() => {
        const loginButton = screen.getByText('Anmelden');
        return user.click(loginButton);
      });

      expect(mockOnLogin).toHaveBeenCalled();
    });

    it('works without onLogin prop', async () => {
      const user = userEvent.setup();
      render(<Navigation />);

      await waitFor(() => {
        const loginButton = screen.getByText('Anmelden');
        return user.click(loginButton);
      });

      // Should not throw error
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('authIntent');
    });
  });

  describe('Logout Functionality', () => {
    it('handles logout successfully', async () => {
      const user = userEvent.setup();
      const mockUser = { 
        id: '123', 
        email: 'test@example.com',
        user_metadata: {}
      };
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      render(<Navigation onLogin={mockOnLogin} />);

      await waitFor(() => {
        expect(screen.getByText('Abmelden')).toBeInTheDocument();
      });

      const logoutButton = screen.getByText('Abmelden');
      await user.click(logoutButton);

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it('handles logout errors', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockUser = { 
        id: '123', 
        email: 'test@example.com',
        user_metadata: {}
      };
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      mockSupabaseClient.auth.signOut.mockResolvedValue({ 
        error: { message: 'Logout failed' } 
      });

      render(<Navigation onLogin={mockOnLogin} />);

      await waitFor(() => {
        expect(screen.getByText('Abmelden')).toBeInTheDocument();
      });

      const logoutButton = screen.getByText('Abmelden');
      await user.click(logoutButton);

      expect(consoleSpy).toHaveBeenCalledWith('Error logging out:', 'Logout failed');
      consoleSpy.mockRestore();
    });
  });

  describe('Navigation Items', () => {
    it('renders navigation items on homepage', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      render(<Navigation onLogin={mockOnLogin} />);

      expect(screen.getByText('Startseite')).toBeInTheDocument();
      expect(screen.getByText('Funktionen')).toBeInTheDocument();
      expect(screen.getByText('Preise')).toBeInTheDocument();
    });

    it('renders home link on other pages', () => {
      (usePathname as jest.Mock).mockReturnValue('/other-page');
      render(<Navigation onLogin={mockOnLogin} />);

      expect(screen.getByText('Startseite')).toBeInTheDocument();
    });

    it('handles navigation clicks with smooth scroll', async () => {
      const user = userEvent.setup();
      const mockScrollIntoView = jest.fn();
      
      // Mock querySelector and scrollIntoView
      const mockElement = { scrollIntoView: mockScrollIntoView };
      jest.spyOn(document, 'querySelector').mockReturnValue(mockElement as any);

      (usePathname as jest.Mock).mockReturnValue('/');
      render(<Navigation onLogin={mockOnLogin} />);

      const featuresButton = screen.getByText('Funktionen');
      await user.click(featuresButton);

      expect(document.querySelector).toHaveBeenCalledWith('#features');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });
  });

  describe('Mobile Navigation', () => {
    it('opens mobile menu when menu button is clicked', async () => {
      const user = userEvent.setup();
      render(<Navigation onLogin={mockOnLogin} />);

      const menuButton = screen.getByText('Menü');
      await user.click(menuButton);

      expect(screen.getByText('Navigation')).toBeInTheDocument();
    });

    it('closes mobile menu when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<Navigation onLogin={mockOnLogin} />);

      // Open menu first
      const menuButton = screen.getByText('Menü');
      await user.click(menuButton);

      // Close menu
      const closeButton = screen.getByLabelText('Menü schließen');
      await user.click(closeButton);

      // Menu should be closed (AnimatePresence will handle the removal)
    });

    it('renders login button in mobile menu when not authenticated', async () => {
      const user = userEvent.setup();
      render(<Navigation onLogin={mockOnLogin} />);

      const menuButton = screen.getByText('Menü');
      await user.click(menuButton);

      // Should have login button in mobile menu
      const mobileLoginButtons = screen.getAllByText('Anmelden');
      expect(mobileLoginButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Brand Logo', () => {
    it('renders brand logo with correct text', () => {
      render(<Navigation onLogin={mockOnLogin} />);

      expect(screen.getAllByText('Immobilien')).toHaveLength(2); // Mobile and desktop versions
      expect(screen.getAllByText('Verwalter')).toHaveLength(2); // Mobile and desktop versions
    });

    it('renders brand logo as link to home', () => {
      render(<Navigation onLogin={mockOnLogin} />);

      const logoLinks = screen.getAllByRole('link');
      const homeLink = logoLinks.find(link => link.getAttribute('href') === '/');
      expect(homeLink).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('renders desktop navigation elements', () => {
      render(<Navigation onLogin={mockOnLogin} />);

      // Desktop elements should be present (mobile menu, desktop logo, nav, auth)
      expect(screen.getAllByTestId('pill-container')).toHaveLength(4);
    });

    it('renders mobile navigation elements', () => {
      render(<Navigation onLogin={mockOnLogin} />);

      // Mobile menu button should be present
      expect(screen.getByText('Menü')).toBeInTheDocument();
    });
  });
});