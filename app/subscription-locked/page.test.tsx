import React from 'react';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SubscriptionLockedPage from './page';

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const originalModule = jest.requireActual('lucide-react');
  return {
    ...originalModule,
    Lock: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="lock-icon" {...props} />,
    Package: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="package-icon" {...props} />,
    ArrowRight: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="arrow-right-icon" {...props} />,
    Loader2: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="loader-icon" {...props} />,
  };
});

// Mock Supabase client
const mockGetUser = jest.fn().mockResolvedValue({ data: { user: { id: 'test-user', email: 'test@example.com' } } });
jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock toast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

describe('SubscriptionLockedPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default fetch mock for successful plan loading
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ id: 'plan_1', priceId: 'price_free', position: 0, price: 0 }]),
      })
    ) as jest.Mock;
  });

  describe('Rendering', () => {
    it('should render all UI elements correctly', async () => {
      render(<SubscriptionLockedPage />);

      // Wait for loading to complete (arrow icon appears when not loading)
      const freeButton = await screen.findByRole('button', { name: /Mit kostenlosem Plan fortfahren/i });
      await waitFor(() => {
        expect(within(freeButton).queryByTestId('loader-icon')).not.toBeInTheDocument();
      });

      // Check lock icon, headline, and description
      expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
      expect(screen.getByText(/Zugriff gesperrt/i)).toBeInTheDocument();
      expect(screen.getByText(/Diese Funktion ist in Ihrem aktuellen Plan nicht enthalten/i)).toBeInTheDocument();

      // Check buttons with their icons
      expect(freeButton).toBeInTheDocument();
      expect(within(freeButton).getByTestId('arrow-right-icon')).toBeInTheDocument();

      const plansButton = screen.getByRole('button', { name: /Andere Pläne ansehen/i });
      expect(plansButton).toBeInTheDocument();
      expect(within(plansButton).getByTestId('package-icon')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should navigate to pricing page when "Andere Pläne ansehen" is clicked', async () => {
      render(<SubscriptionLockedPage />);

      const plansButton = await screen.findByRole('button', { name: /Andere Pläne ansehen/i });
      await userEvent.click(plansButton);

      expect(mockPush).toHaveBeenCalledWith('/preise');
    });

    it('should call checkout API when "Mit kostenlosem Plan fortfahren" is clicked', async () => {
      const checkoutUrl = 'https://checkout.stripe.com/test-session';
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 'plan_1', priceId: 'price_free', position: 0, price: 0 }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ url: checkoutUrl }),
        }) as jest.Mock;

      render(<SubscriptionLockedPage />);

      const freeButton = await screen.findByRole('button', { name: /Mit kostenlosem Plan fortfahren/i });
      await userEvent.click(freeButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/stripe/checkout-session', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }));
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(checkoutUrl);
      });
    });

    it('should show error toast when free plan is not found', async () => {
      // Return plans without a free plan (price: 0)
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 'plan_1', priceId: 'price_paid', position: 1, price: 999 }]),
        })
      ) as jest.Mock;

      render(<SubscriptionLockedPage />);

      const freeButton = await screen.findByRole('button', { name: /Mit kostenlosem Plan fortfahren/i });
      await userEvent.click(freeButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "Fehler",
          description: "Kostenloser Plan konnte nicht gefunden werden.",
          variant: "destructive",
        }));
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error toast when plans API fails', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({}),
        })
      ) as jest.Mock;

      render(<SubscriptionLockedPage />);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "Fehler",
          description: "Die Abonnement-Pläne konnten nicht geladen werden.",
          variant: "destructive",
        }));
      });
    });

    it('should show error toast when initialization fails completely', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error'))) as jest.Mock;

      render(<SubscriptionLockedPage />);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "Fehler",
          description: "Die Seite konnte nicht geladen werden. Bitte versuchen Sie es später erneut.",
          variant: "destructive",
        }));
      });
    });
  });
});
