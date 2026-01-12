import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import AuthModalProvider, { useAuthModal } from './auth-modal-provider';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('./auth-modal', () => {
  return function MockAuthModal({
    isOpen,
    onClose,
    onAuthenticated,
    initialTab
  }: {
    isOpen: boolean;
    onClose: () => void;
    onAuthenticated: () => void;
    initialTab: 'login' | 'register';
  }) {
    if (!isOpen) return null;

    return (
      <div data-testid="auth-modal">
        <div data-testid="modal-tab">{initialTab}</div>
        <button onClick={onClose} data-testid="close-modal">Close</button>
        <button onClick={onAuthenticated} data-testid="authenticate">Authenticate</button>
      </div>
    );
  };
});

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
};

// Test component that uses the auth modal context
function TestComponent() {
  const { openAuthModal, closeAuthModal, isOpen } = useAuthModal();

  return (
    <div>
      <button onClick={() => openAuthModal('login')} data-testid="open-login">
        Open Login
      </button>
      <button onClick={() => openAuthModal('register')} data-testid="open-register">
        Open Register
      </button>
      <button onClick={closeAuthModal} data-testid="close-auth">
        Close Auth
      </button>
      <div data-testid="modal-state">{isOpen ? 'open' : 'closed'}</div>
    </div>
  );
}

describe('AuthModalProvider - Jetzt loslegen Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  describe('Modal State Management', () => {
    it('opens login modal correctly', async () => {
      const user = userEvent.setup();
      render(
        <AuthModalProvider>
          <TestComponent />
        </AuthModalProvider>
      );

      const openLoginButton = screen.getByTestId('open-login');
      await user.click(openLoginButton);

      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-tab')).toHaveTextContent('login');
      expect(screen.getByTestId('modal-state')).toHaveTextContent('open');
    });

    it('opens register modal correctly', async () => {
      const user = userEvent.setup();
      render(
        <AuthModalProvider>
          <TestComponent />
        </AuthModalProvider>
      );

      const openRegisterButton = screen.getByTestId('open-register');
      await user.click(openRegisterButton);

      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-tab')).toHaveTextContent('register');
      expect(screen.getByTestId('modal-state')).toHaveTextContent('open');
    });

    it('closes modal correctly', async () => {
      const user = userEvent.setup();
      render(
        <AuthModalProvider>
          <TestComponent />
        </AuthModalProvider>
      );

      // Open modal first
      const openLoginButton = screen.getByTestId('open-login');
      await user.click(openLoginButton);
      expect(screen.getByTestId('modal-state')).toHaveTextContent('open');

      // Close modal
      const closeButton = screen.getByTestId('close-modal');
      await user.click(closeButton);
      expect(screen.getByTestId('modal-state')).toHaveTextContent('closed');
    });
  });

  describe('Authentication Flow - Get Started Intent', () => {
    it('redirects to dashboard when auth intent is get-started', async () => {
      const user = userEvent.setup();
      (window.sessionStorage.getItem as jest.Mock).mockReturnValue('get-started');

      render(
        <AuthModalProvider>
          <TestComponent />
        </AuthModalProvider>
      );

      // Open modal and authenticate
      const openLoginButton = screen.getByTestId('open-login');
      await user.click(openLoginButton);

      const authenticateButton = screen.getByTestId('authenticate');
      await user.click(authenticateButton);

      await waitFor(() => {
        expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('authIntent');
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('stays on current page when auth intent is not get-started', async () => {
      const user = userEvent.setup();
      (window.sessionStorage.getItem as jest.Mock).mockReturnValue(null);

      render(
        <AuthModalProvider>
          <TestComponent />
        </AuthModalProvider>
      );

      // Open modal and authenticate
      const openLoginButton = screen.getByTestId('open-login');
      await user.click(openLoginButton);

      const authenticateButton = screen.getByTestId('authenticate');
      await user.click(authenticateButton);

      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalledWith('/dashboard');
        expect(mockRouter.refresh).toHaveBeenCalled();
      });
    });

    it('handles sessionStorage errors during authentication', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      (window.sessionStorage.getItem as jest.Mock).mockImplementation(() => {
        throw new Error('SessionStorage not available');
      });

      render(
        <AuthModalProvider>
          <TestComponent />
        </AuthModalProvider>
      );

      // Open modal and authenticate
      const openLoginButton = screen.getByTestId('open-login');
      await user.click(openLoginButton);

      const authenticateButton = screen.getByTestId('authenticate');
      await user.click(authenticateButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('SessionStorage not available');
        expect(mockRouter.refresh).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Modal Closing Behavior', () => {
    it('clears auth intent when modal is closed', async () => {
      const user = userEvent.setup();
      render(
        <AuthModalProvider>
          <TestComponent />
        </AuthModalProvider>
      );

      // Open modal
      const openLoginButton = screen.getByTestId('open-login');
      await user.click(openLoginButton);

      // Close modal
      const closeButton = screen.getByTestId('close-modal');
      await user.click(closeButton);

      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('authIntent');
    });

    it('handles sessionStorage errors when closing modal', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      (window.sessionStorage.removeItem as jest.Mock).mockImplementation(() => {
        throw new Error('SessionStorage not available');
      });

      render(
        <AuthModalProvider>
          <TestComponent />
        </AuthModalProvider>
      );

      // Open modal
      const openLoginButton = screen.getByTestId('open-login');
      await user.click(openLoginButton);

      // Close modal
      const closeButton = screen.getByTestId('close-modal');
      await user.click(closeButton);

      expect(consoleSpy).toHaveBeenCalledWith('SessionStorage not available');
      consoleSpy.mockRestore();
    });
  });

  describe('Context Provider', () => {
    it('provides correct context values', () => {
      render(
        <AuthModalProvider>
          <TestComponent />
        </AuthModalProvider>
      );

      expect(screen.getByTestId('open-login')).toBeInTheDocument();
      expect(screen.getByTestId('open-register')).toBeInTheDocument();
      expect(screen.getByTestId('close-auth')).toBeInTheDocument();
      expect(screen.getByTestId('modal-state')).toHaveTextContent('closed');
    });

    it('throws error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuthModal must be used within an AuthModalProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Multiple Modal Operations', () => {
    it('handles rapid open/close operations', async () => {
      const user = userEvent.setup();
      render(
        <AuthModalProvider>
          <TestComponent />
        </AuthModalProvider>
      );

      // Rapid open/close operations
      const openLoginButton = screen.getByTestId('open-login');
      const closeAuthButton = screen.getByTestId('close-auth');

      await user.click(openLoginButton);
      expect(screen.getByTestId('modal-state')).toHaveTextContent('open');

      await user.click(closeAuthButton);
      expect(screen.getByTestId('modal-state')).toHaveTextContent('closed');

      await user.click(openLoginButton);
      expect(screen.getByTestId('modal-state')).toHaveTextContent('open');
    });

    it('switches between login and register tabs', async () => {
      const user = userEvent.setup();
      render(
        <AuthModalProvider>
          <TestComponent />
        </AuthModalProvider>
      );

      // Open login modal
      const openLoginButton = screen.getByTestId('open-login');
      await user.click(openLoginButton);
      expect(screen.getByTestId('modal-tab')).toHaveTextContent('login');

      // Switch to register
      const openRegisterButton = screen.getByTestId('open-register');
      await user.click(openRegisterButton);
      expect(screen.getByTestId('modal-tab')).toHaveTextContent('register');
    });
  });
});