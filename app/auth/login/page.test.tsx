import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginPage from './page';
import { createClient } from '@/utils/supabase/client';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/utils/supabase/client');

jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, ...props }: any) => (
    <input onChange={onChange} value={value} {...props} />
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
  CardFooter: ({ children }: any) => <div data-testid="card-footer">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h1 data-testid="card-title">{children}</h1>,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>{children}</div>
  ),
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>,
}));

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
};

const mockSearchParams = {
  get: jest.fn(),
};

const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
  },
};

// Mock window.location.assign
const mockLocationAssign = jest.fn();

describe('LoginPage - Jetzt loslegen Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    
    // Mock window.location.assign
    mockLocationAssign.mockClear();
    delete (window as any).location;
    (window as any).location = { assign: mockLocationAssign };
    
    // Default - no redirect parameter
    mockSearchParams.get.mockReturnValue(null);
  });

  describe('Page Rendering', () => {
    it('renders login form correctly', () => {
      render(<LoginPage />);

      expect(screen.getByTestId('card-title')).toHaveTextContent('Anmelden');
      expect(screen.getByTestId('card-description')).toHaveTextContent(
        'Geben Sie Ihre E-Mail-Adresse und Ihr Passwort ein, um sich anzumelden'
      );
      expect(screen.getByLabelText('E-Mail')).toBeInTheDocument();
      expect(screen.getByLabelText('Passwort')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Anmelden' })).toBeInTheDocument();
    });

    it('renders navigation links', () => {
      render(<LoginPage />);

      expect(screen.getByText('Passwort vergessen?')).toBeInTheDocument();
      expect(screen.getByText('Registrieren')).toBeInTheDocument();
    });

    it('has proper form structure', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText('E-Mail');
      const passwordInput = screen.getByLabelText('Passwort');
      const submitButton = screen.getByRole('button', { name: 'Anmelden' });

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('required');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });

  describe('Redirect Parameter Handling', () => {
    it('redirects to dashboard by default', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({ error: null });

      render(<LoginPage />);

      await user.type(screen.getByLabelText('E-Mail'), 'test@example.com');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(mockLocationAssign).toHaveBeenCalledWith('/home');
      });
    });

    it('respects redirect parameter when provided', async () => {
      const user = userEvent.setup();
      mockSearchParams.get.mockReturnValue('/custom-redirect');
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({ error: null });

      render(<LoginPage />);

      await user.type(screen.getByLabelText('E-Mail'), 'test@example.com');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(mockLocationAssign).toHaveBeenCalledWith('/custom-redirect');
      });
    });

    it('handles dashboard redirect for get-started flow', async () => {
      const user = userEvent.setup();
      mockSearchParams.get.mockReturnValue('/home');
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({ error: null });

      render(<LoginPage />);

      await user.type(screen.getByLabelText('E-Mail'), 'test@example.com');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(mockLocationAssign).toHaveBeenCalledWith('/home');
      });
    });
  });

  describe('Form Interactions', () => {
    it('updates form fields when user types', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText('E-Mail') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('Passwort') as HTMLInputElement;

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      expect(emailInput.value).toBe('test@example.com');
      expect(passwordInput.value).toBe('password123');
    });

    it('submits form with correct credentials', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({ error: null });

      render(<LoginPage />);

      await user.type(screen.getByLabelText('E-Mail'), 'test@example.com');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('prevents form submission when loading', async () => {
      const user = userEvent.setup();
      let resolveAuth: (value: any) => void;
      const authPromise = new Promise(resolve => {
        resolveAuth = resolve;
      });
      mockSupabaseClient.auth.signInWithPassword.mockReturnValue(authPromise);

      render(<LoginPage />);

      await user.type(screen.getByLabelText('E-Mail'), 'test@example.com');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      // Button should show loading state
      expect(screen.getByRole('button', { name: 'Wird angemeldet...' })).toBeDisabled();

      resolveAuth!({ error: null });
    });
  });

  describe('Error Handling', () => {
    it('displays authentication errors', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: { message: 'Invalid credentials' }
      });

      render(<LoginPage />);

      await user.type(screen.getByLabelText('E-Mail'), 'test@example.com');
      await user.type(screen.getByLabelText('Passwort'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument();
        expect(screen.getByTestId('alert-description')).toHaveTextContent('Invalid credentials');
      });
    });

    it('clears error when form is resubmitted', async () => {
      const user = userEvent.setup();
      
      // First submission with error
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        error: { message: 'Invalid credentials' }
      });

      render(<LoginPage />);

      await user.type(screen.getByLabelText('E-Mail'), 'test@example.com');
      await user.type(screen.getByLabelText('Passwort'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(screen.getByTestId('alert-description')).toHaveTextContent('Invalid credentials');
      });

      // Second submission without error
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({ error: null });

      await user.clear(screen.getByLabelText('Passwort'));
      await user.type(screen.getByLabelText('Passwort'), 'correctpassword');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      );

      render(<LoginPage />);

      await user.type(screen.getByLabelText('E-Mail'), 'test@example.com');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      // Should handle the error without crashing
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Anmelden' })).not.toBeDisabled();
      });
    });
  });

  describe('Navigation Links', () => {
    it('links to password reset page', () => {
      render(<LoginPage />);

      const resetLink = screen.getByText('Passwort vergessen?');
      expect(resetLink.closest('a')).toHaveAttribute('href', '/auth/reset-password');
    });

    it('links to registration page', () => {
      render(<LoginPage />);

      const registerLink = screen.getByText('Registrieren');
      expect(registerLink.closest('a')).toHaveAttribute('href', '/auth/register');
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<LoginPage />);

      expect(screen.getByLabelText('E-Mail')).toBeInTheDocument();
      expect(screen.getByLabelText('Passwort')).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      render(<LoginPage />);

      expect(screen.getByRole('heading', { name: 'Anmelden' })).toBeInTheDocument();
    });

    it('provides proper error announcements', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: { message: 'Invalid credentials' }
      });

      render(<LoginPage />);

      await user.type(screen.getByLabelText('E-Mail'), 'test@example.com');
      await user.type(screen.getByLabelText('Passwort'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        const alert = screen.getByTestId('alert');
        expect(alert).toHaveAttribute('data-variant', 'destructive');
      });
    });
  });

  describe('Form Validation', () => {
    it('requires email field', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText('E-Mail');
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('requires password field', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText('Passwort');
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('has proper input placeholders', () => {
      render(<LoginPage />);

      expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    });
  });
});