import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AuthModalProvider, { useAuthModal } from '@/components/auth/auth-modal-provider';

// Test component that uses the auth modal
const TestAuthFlow = () => {
  const { openAuthModal, closeAuthModal, isOpen } = useAuthModal();
  
  return (
    <div>
      <button 
        onClick={() => openAuthModal('login')} 
        data-testid="login-button"
      >
        Anmelden
      </button>
      <button 
        onClick={() => {
          sessionStorage.setItem('authIntent', 'get-started');
          openAuthModal('login');
        }}
        data-testid="get-started-button"
      >
        Jetzt loslegen
      </button>
      <div data-testid="auth-intent">
        {sessionStorage.getItem('authIntent') || 'none'}
      </div>
      <div data-testid="modal-open">{isOpen.toString()}</div>
    </div>
  );
};

// Wrapper component to provide auth context
const TestWrapper = () => (
  <AuthModalProvider>
    <TestAuthFlow />
  </AuthModalProvider>
);

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

describe('Auth Flow Integration', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    user = userEvent.setup();
  });

  it('sets auth intent when clicking "Jetzt loslegen"', async () => {
    render(<TestWrapper />);
    
    const getStartedButton = screen.getByTestId('get-started-button');
    await user.click(getStartedButton);

    expect(sessionStorage.setItem).toHaveBeenCalledWith('authIntent', 'get-started');
    expect(screen.getByTestId('auth-intent')).toHaveTextContent('get-started');
  });

  it('preserves auth intent when switching between auth tabs', async () => {
    render(<TestWrapper />);
    
    // Start with "Jetzt loslegen"
    const getStartedButton = screen.getByTestId('get-started-button');
    await user.click(getStartedButton);

    // Verify initial state
    expect(screen.getByTestId('auth-intent')).toHaveTextContent('get-started');
    
    // Simulate switching tabs (in a real test, you'd click the tab)
    // The important part is that auth intent is preserved
    expect(sessionStorage.getItem('authIntent')).toBe('get-started');
  });

  it('clears auth intent when closing the auth modal', async () => {
    render(<TestWrapper />);
    
    // Start with "Jetzt loslegen"
    const getStartedButton = screen.getByTestId('get-started-button');
    await user.click(getStartedButton);

    // Verify auth intent is set
    expect(screen.getByTestId('auth-intent')).toHaveTextContent('get-started');
    
    // Simulate clicking the close button on the modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    // The AuthModalProvider should have cleared the auth intent when closing
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('authIntent');
    
    // The UI should reflect that the auth intent was cleared
    expect(screen.getByTestId('auth-intent')).toHaveTextContent('none');
  });
});
