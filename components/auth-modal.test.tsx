import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthModal from './auth-modal';
import { within } from '@testing-library/dom';

// Mock Supabase client
const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('AuthModal', () => {
  let mockOnAuthenticated: jest.Mock;
  let mockOnClose: jest.Mock;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockOnAuthenticated = jest.fn();
    mockOnClose = jest.fn();
    user = userEvent.setup();

    mockSignUp.mockReset();
    mockSignInWithPassword.mockReset();
    mockSignOut.mockReset();
  });

  const renderModal = (isOpen = true, initialTab: 'login' | 'register' = 'register') => {
    render(
      <AuthModal
        isOpen={isOpen}
        onClose={mockOnClose}
        onAuthenticated={mockOnAuthenticated}
        initialTab={initialTab}
      />
    );
  };

  describe('Registration with Email Confirmation', () => {
    it('Successful registration shows a success message', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: { id: '123', email: 'test@example.com' }, session: null },
        error: null,
      });

      renderModal(true, 'register');

      await user.click(screen.getByRole('tab', { name: /register/i }));
      await user.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^passwort$/i), 'password123');
      await user.type(screen.getByLabelText(/passwort bestätigen/i), 'password123');
      await user.click(screen.getByRole('button', { name: /registrieren/i }));

      expect(await screen.findByText(/Registration successful! Please check your email to confirm your account./i)).toBeInTheDocument();
      expect(mockSignUp).toHaveBeenCalledTimes(1);
      expect(mockOnAuthenticated).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('Registration fails due to mismatched passwords', async () => {
      renderModal(true, 'register');
      await user.click(screen.getByRole('tab', { name: /register/i }));
      await user.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^passwort$/i), 'password123');
      await user.type(screen.getByLabelText(/passwort bestätigen/i), 'password456');
      await user.click(screen.getByRole('button', { name: /registrieren/i }));

      expect(await screen.findByText(/Passwords do not match./i)).toBeInTheDocument();
      expect(mockSignUp).not.toHaveBeenCalled();
      expect(mockOnAuthenticated).not.toHaveBeenCalled();
    });
  });

  describe('Registration with Immediate Login', () => {
    it('Successful registration and immediate login', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: { id: '123' }, session: { access_token: 'fake-token', user: { id: '123' } } },
        error: null,
      });

      renderModal(true, 'register');
      await user.click(screen.getByRole('tab', { name: /register/i }));
      await user.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^passwort$/i), 'password123');
      await user.type(screen.getByLabelText(/passwort bestätigen/i), 'password123');
      await user.click(screen.getByRole('button', { name: /registrieren/i }));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockOnAuthenticated).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Direct Login Functionality', () => {
    it('Successful direct login', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: '123' }, session: { access_token: 'fake-token', user: { id: '123' } } },
        error: null,
      });

      renderModal(true, 'login');
      await user.click(screen.getByRole('tab', { name: /login/i }));

      const loginTabContent = screen.getByRole('tabpanel', { hidden: false });
      await user.type(within(loginTabContent).getByLabelText(/e-mail/i), 'login@example.com');
      await user.type(within(loginTabContent).getByLabelText(/^passwort$/i), 'password123');
      await user.click(within(loginTabContent).getByRole('button', { name: /anmelden/i }));

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockOnAuthenticated).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('Failed direct login', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: {},
        error: { message: 'Invalid credentials' },
      });

      renderModal(true, 'login');
      await user.click(screen.getByRole('tab', { name: /login/i }));

      const loginTabContent = screen.getByRole('tabpanel', { hidden: false });
      await user.type(within(loginTabContent).getByLabelText(/e-mail/i), 'fail@example.com');
      await user.type(within(loginTabContent).getByLabelText(/^passwort$/i), 'wrongpassword');
      await user.click(within(loginTabContent).getByRole('button', { name: /anmelden/i }));

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
      expect(mockOnAuthenticated).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
