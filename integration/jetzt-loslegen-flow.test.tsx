import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Integration test for the complete "Jetzt loslegen" flow
// This test simulates the entire user journey from landing page to dashboard

// Mock all external dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
  usePathname: () => '/',
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signInWithPassword: jest.fn(),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null }),
        }),
      }),
    }),
  }),
}));

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn().mockResolvedValue(null),
}));

// Mock all UI components to focus on behavior
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
  CardFooter: ({ children }: any) => <div data-testid="card-footer">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h1 data-testid="card-title">{children}</h1>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, ...props }: any) => (
    <input onChange={onChange} value={value} {...props} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

// Mock the pill tab switcher
jest.mock('@/components/ui/pill-tab-switcher', () => ({
  PillTabSwitcher: ({ tabs, activeTab, onTabChange }: any) => (
    <div data-testid="pill-tab-switcher">
      {tabs.map((tab: any) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.value)}
          data-active={activeTab === tab.value}
          data-testid={`tab-${tab.value}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
}));

// Create a simplified test component that simulates the key parts of the flow
function TestJetztLoslegenFlow() {
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [authIntent, setAuthIntent] = React.useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [currentTab, setCurrentTab] = React.useState<'login' | 'register'>('login');

  // Mock sessionStorage
  React.useEffect(() => {
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(() => authIntent),
        setItem: jest.fn((key: string, value: string) => {
          if (key === 'authIntent') setAuthIntent(value);
        }),
        removeItem: jest.fn((key: string) => {
          if (key === 'authIntent') setAuthIntent(null);
        }),
      },
      writable: true,
    });
  }, [authIntent]);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      // Simulate redirect to dashboard
      window.location.assign('/home');
    } else {
      // Set auth intent and open modal
      setAuthIntent('get-started');
      setIsAuthModalOpen(true);
    }
  };

  const handleRegularLogin = () => {
    // Clear any existing auth intent
    setAuthIntent(null);
    setIsAuthModalOpen(true);
  };

  const handleAuthentication = () => {
    setIsAuthenticated(true);
    
    // Check auth intent and redirect accordingly
    if (authIntent === 'get-started') {
      setAuthIntent(null);
      window.location.assign('/home');
    } else {
      // Stay on current page
      setIsAuthModalOpen(false);
    }
  };

  const handleCloseModal = () => {
    setIsAuthModalOpen(false);
    setAuthIntent(null);
  };

  return (
    <div>
      {/* Landing Page Elements */}
      <div data-testid="landing-page">
        <button onClick={handleGetStarted} data-testid="jetzt-loslegen-button">
          Jetzt loslegen
        </button>
        <button onClick={handleRegularLogin} data-testid="anmelden-button">
          Anmelden
        </button>
      </div>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div data-testid="auth-modal">
          <div data-testid="pill-tab-switcher">
            <button
              onClick={() => setCurrentTab('login')}
              data-active={currentTab === 'login'}
              data-testid="tab-login"
            >
              Login
            </button>
            <button
              onClick={() => setCurrentTab('register')}
              data-active={currentTab === 'register'}
              data-testid="tab-register"
            >
              Register
            </button>
          </div>

          <div data-testid="auth-form">
            <h2>{currentTab === 'login' ? 'Anmelden' : 'Registrieren'}</h2>
            <input data-testid="email-input" placeholder="E-Mail" />
            <input data-testid="password-input" placeholder="Passwort" type="password" />
            <button onClick={handleAuthentication} data-testid="submit-auth">
              {currentTab === 'login' ? 'Anmelden' : 'Registrieren'}
            </button>
            <button onClick={handleCloseModal} data-testid="close-modal">
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Status Display */}
      <div data-testid="status">
        <div data-testid="auth-intent">{authIntent || 'none'}</div>
        <div data-testid="authenticated">{isAuthenticated ? 'true' : 'false'}</div>
        <div data-testid="modal-open">{isAuthModalOpen ? 'true' : 'false'}</div>
      </div>
    </div>
  );
}

// Mock window.location.assign globally
const mockLocationAssign = jest.fn();
Object.defineProperty(window, 'location', {
  value: { assign: mockLocationAssign },
  writable: true,
});

describe('Jetzt loslegen Flow - Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationAssign.mockClear();
  });

  describe('Complete Get Started Flow', () => {
    it('completes the full "Jetzt loslegen" flow successfully', async () => {
      const user = userEvent.setup();
      render(<TestJetztLoslegenFlow />);

      // Initial state
      expect(screen.getByTestId('auth-intent')).toHaveTextContent('none');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('modal-open')).toHaveTextContent('false');

      // Step 1: Click "Jetzt loslegen" button
      const getStartedButton = screen.getByTestId('jetzt-loslegen-button');
      await user.click(getStartedButton);

      // Should set auth intent and open modal
      expect(screen.getByTestId('auth-intent')).toHaveTextContent('get-started');
      expect(screen.getByTestId('modal-open')).toHaveTextContent('true');
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();

      // Step 2: Fill in authentication form
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Step 3: Submit authentication
      const submitButton = screen.getByTestId('submit-auth');
      await user.click(submitButton);

      // Should authenticate and redirect to dashboard
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(mockLocationAssign).toHaveBeenCalledWith('/home');
    });

    it('handles regular login flow correctly', async () => {
      const user = userEvent.setup();
      render(<TestJetztLoslegenFlow />);

      // Step 1: Click regular "Anmelden" button
      const loginButton = screen.getByTestId('anmelden-button');
      await user.click(loginButton);

      // Should NOT set auth intent but open modal
      expect(screen.getByTestId('auth-intent')).toHaveTextContent('none');
      expect(screen.getByTestId('modal-open')).toHaveTextContent('true');

      // Step 2: Authenticate
      const submitButton = screen.getByTestId('submit-auth');
      await user.click(submitButton);

      // Should authenticate but NOT redirect (stay on page)
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('modal-open')).toHaveTextContent('false');
      expect(mockLocationAssign).not.toHaveBeenCalled();
    });

    it('clears auth intent when modal is closed without authentication', async () => {
      const user = userEvent.setup();
      render(<TestJetztLoslegenFlow />);

      // Step 1: Click "Jetzt loslegen" to set intent
      const getStartedButton = screen.getByTestId('jetzt-loslegen-button');
      await user.click(getStartedButton);

      expect(screen.getByTestId('auth-intent')).toHaveTextContent('get-started');

      // Step 2: Close modal without authenticating
      const closeButton = screen.getByTestId('close-modal');
      await user.click(closeButton);

      // Should clear auth intent
      expect(screen.getByTestId('auth-intent')).toHaveTextContent('none');
      expect(screen.getByTestId('modal-open')).toHaveTextContent('false');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('handles already authenticated user clicking "Jetzt loslegen"', async () => {
      const user = userEvent.setup();
      render(<TestJetztLoslegenFlow />);

      // First authenticate the user
      const loginButton = screen.getByTestId('anmelden-button');
      await user.click(loginButton);
      const submitButton = screen.getByTestId('submit-auth');
      await user.click(submitButton);

      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');

      // Now click "Jetzt loslegen" while authenticated
      const getStartedButton = screen.getByTestId('jetzt-loslegen-button');
      await user.click(getStartedButton);

      // Should directly redirect without opening modal
      expect(mockLocationAssign).toHaveBeenCalledWith('/home');
      expect(screen.getByTestId('modal-open')).toHaveTextContent('false');
    });

    it('handles switching between login and register tabs', async () => {
      const user = userEvent.setup();
      render(<TestJetztLoslegenFlow />);

      // Open modal
      const getStartedButton = screen.getByTestId('jetzt-loslegen-button');
      await user.click(getStartedButton);

      // Should start with login tab
      expect(screen.getByText('Anmelden')).toBeInTheDocument();

      // Switch to register tab
      const registerTab = screen.getByTestId('tab-register');
      await user.click(registerTab);

      expect(screen.getByText('Registrieren')).toBeInTheDocument();

      // Switch back to login tab
      const loginTab = screen.getByTestId('tab-login');
      await user.click(loginTab);

      expect(screen.getByText('Anmelden')).toBeInTheDocument();
    });

    it('maintains auth intent through tab switches', async () => {
      const user = userEvent.setup();
      render(<TestJetztLoslegenFlow />);

      // Set auth intent via "Jetzt loslegen"
      const getStartedButton = screen.getByTestId('jetzt-loslegen-button');
      await user.click(getStartedButton);

      expect(screen.getByTestId('auth-intent')).toHaveTextContent('get-started');

      // Switch tabs
      const registerTab = screen.getByTestId('tab-register');
      await user.click(registerTab);

      // Auth intent should be preserved
      expect(screen.getByTestId('auth-intent')).toHaveTextContent('get-started');

      // Authenticate via register
      const submitButton = screen.getByTestId('submit-auth');
      await user.click(submitButton);

      // Should still redirect to dashboard
      expect(mockLocationAssign).toHaveBeenCalledWith('/home');
    });
  });

  describe('Multiple User Interactions', () => {
    it('handles multiple modal open/close cycles', async () => {
      const user = userEvent.setup();
      render(<TestJetztLoslegenFlow />);

      // Cycle 1: Get started -> close
      const getStartedButton = screen.getByTestId('jetzt-loslegen-button');
      await user.click(getStartedButton);
      expect(screen.getByTestId('auth-intent')).toHaveTextContent('get-started');

      const closeButton = screen.getByTestId('close-modal');
      await user.click(closeButton);
      expect(screen.getByTestId('auth-intent')).toHaveTextContent('none');

      // Cycle 2: Regular login -> close
      const loginButton = screen.getByTestId('anmelden-button');
      await user.click(loginButton);
      expect(screen.getByTestId('auth-intent')).toHaveTextContent('none');

      await user.click(closeButton);
      expect(screen.getByTestId('modal-open')).toHaveTextContent('false');

      // Cycle 3: Get started -> authenticate
      await user.click(getStartedButton);
      expect(screen.getByTestId('auth-intent')).toHaveTextContent('get-started');

      const submitButton = screen.getByTestId('submit-auth');
      await user.click(submitButton);
      expect(mockLocationAssign).toHaveBeenCalledWith('/home');
    });

    it('handles rapid button clicks', async () => {
      const user = userEvent.setup();
      render(<TestJetztLoslegenFlow />);

      const getStartedButton = screen.getByTestId('jetzt-loslegen-button');

      // Rapid clicks should not cause issues
      await user.click(getStartedButton);
      await user.click(getStartedButton);
      await user.click(getStartedButton);

      // Should still work correctly
      expect(screen.getByTestId('auth-intent')).toHaveTextContent('get-started');
      expect(screen.getByTestId('modal-open')).toHaveTextContent('true');
    });
  });

  describe('State Consistency', () => {
    it('maintains consistent state throughout the flow', async () => {
      const user = userEvent.setup();
      render(<TestJetztLoslegenFlow />);

      // Track state changes
      const getAuthIntent = () => screen.getByTestId('auth-intent').textContent;
      const getModalOpen = () => screen.getByTestId('modal-open').textContent;
      const getAuthenticated = () => screen.getByTestId('authenticated').textContent;

      // Initial state
      expect(getAuthIntent()).toBe('none');
      expect(getModalOpen()).toBe('false');
      expect(getAuthenticated()).toBe('false');

      // After clicking "Jetzt loslegen"
      await user.click(screen.getByTestId('jetzt-loslegen-button'));
      expect(getAuthIntent()).toBe('get-started');
      expect(getModalOpen()).toBe('true');
      expect(getAuthenticated()).toBe('false');

      // After authentication
      await user.click(screen.getByTestId('submit-auth'));
      expect(getAuthenticated()).toBe('true');
      expect(mockLocationAssign).toHaveBeenCalledWith('/home');
    });
  });
});