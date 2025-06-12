import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthModal from './auth-modal'; // Assuming path is correct

// Mock Supabase client
const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn(); // Add other methods if AuthModal uses them

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      // Mock other auth methods if your component uses them
    },
  }),
}));

// Mock useRouter - not strictly needed for these tests based on current modal logic,
// but good practice if navigation was involved post-auth.
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

    // Reset mocks before each test
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

  // Test Scenario 1: Registration with Email Confirmation
  describe('Registration with Email Confirmation', () => {
    it('Successful registration, shows confirmation modal, then successful auto-login', async () => {
      // Stage 1: Registration leading to confirmation modal
      mockSignUp.mockResolvedValueOnce({
        data: { user: { id: '123', email: 'test@example.com' }, session: null },
        error: null,
      });

      renderModal(true, 'register');

      await user.click(screen.getByRole('tab', { name: /register/i }));
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Assert confirmation modal appears
      expect(await screen.findByText('Email Confirmation')).toBeInTheDocument();
      expect(screen.getByText(/registration successful! please check your email/i)).toBeInTheDocument();
      expect(mockSignUp).toHaveBeenCalledTimes(1);
      expect(mockOnAuthenticated).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();

      // Stage 2: Clicking "OK" on confirmation modal and successful login
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: '123' }, session: { access_token: 'fake-token', user: { id: '123' } } },
        error: null,
      });

      await user.click(screen.getByRole('button', { name: /ok/i }));

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockOnAuthenticated).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
      expect(await screen.findByText(/account confirmed and you are now logged in!/i)).toBeInTheDocument();
    });

    it('Successful registration, shows confirmation modal, then failed auto-login', async () => {
      // Stage 1: Registration
      mockSignUp.mockResolvedValueOnce({
        data: { user: { id: '123', email: 'test@example.com' }, session: null },
        error: null,
      });

      renderModal(true, 'register');
      await user.click(screen.getByRole('tab', { name: /register/i }));
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Email Confirmation')).toBeInTheDocument();

      // Stage 2: Failed Login
      mockSignInWithPassword.mockResolvedValueOnce({
        data: {},
        error: { message: 'Email not confirmed yet' },
      });

      await user.click(screen.getByRole('button', { name: /ok/i }));

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Email not confirmed yet')).toBeInTheDocument();
      expect(mockOnAuthenticated).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled(); // Main modal stays open

      // Check if switched to login tab - the title of the active tab's content would be "Login"
      // Or check if the Login tab trigger has aria-selected=true
      expect(screen.getByRole('tab', { name: /login/i, selected: true })).toBeInTheDocument();
    });

    it('Registration fails due to mismatched passwords', async () => {
      renderModal(true, 'register');
      await user.click(screen.getByRole('tab', { name: /register/i }));
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password456');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
      expect(mockSignUp).not.toHaveBeenCalled();
      expect(mockOnAuthenticated).not.toHaveBeenCalled();
      expect(screen.queryByText('Email Confirmation')).not.toBeInTheDocument();
    });
  });

  // Test Scenario 2: Registration with Immediate Login
  describe('Registration with Immediate Login', () => {
    it('Successful registration and immediate login', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: { id: '123' }, session: { access_token: 'fake-token', user: { id: '123' } } },
        error: null,
      });

      renderModal(true, 'register');
      await user.click(screen.getByRole('tab', { name: /register/i }));
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockOnAuthenticated).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Registration successful! You are now logged in.')).toBeInTheDocument();
      expect(screen.queryByText('Email Confirmation')).not.toBeInTheDocument();
    });
  });

  // Test Scenario 3: Existing Login Functionality (Regression)
  describe('Direct Login Functionality', () => {
    it('Successful direct login', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: '123' }, session: { access_token: 'fake-token', user: { id: '123' } } },
        error: null,
      });

      renderModal(true, 'login');
      await user.click(screen.getByRole('tab', { name: /login/i })); // Ensure login tab is active

      // Need to use a more specific selector if multiple email/password fields exist due to tabs
      const loginTabContent = screen.getByRole('tabpanel', { name: /login/i });
      await user.type(within(loginTabContent).getByLabelText(/email/i), 'login@example.com');
      await user.type(within(loginTabContent).getByLabelText(/password/i), 'password123');
      await user.click(within(loginTabContent).getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockOnAuthenticated).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
      expect(await screen.findByText('Login successful! Redirecting...')).toBeInTheDocument();
    });

    it('Failed direct login', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: {},
        error: { message: 'Invalid credentials' },
      });

      renderModal(true, 'login');
      await user.click(screen.getByRole('tab', { name: /login/i }));

      const loginTabContent = screen.getByRole('tabpanel', { name: /login/i });
      await user.type(within(loginTabContent).getByLabelText(/email/i), 'fail@example.com');
      await user.type(within(loginTabContent).getByLabelText(/password/i), 'wrongpassword');
      await user.click(within(loginTabContent).getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
      expect(mockOnAuthenticated).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled(); // Modal should stay open on error
    });
  });
});

// Helper to query within a specific element, useful for tabs
import { queries, getQueriesForElement } from '@testing-library/dom';

function within(element: HTMLElement) {
  return getQueriesForElement(element, queries);
}
