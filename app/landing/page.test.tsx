import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LandingPage from './page';

// Mock dependencies
const mockToast = jest.fn();
const mockRouterReplace = jest.fn();
const mockRouterPush = jest.fn();
const mockSearchParamsGet = jest.fn();

// Mock window.location.href
const originalWindowLocation = window.location;
beforeAll(() => {
  delete (window as any).location;
  window.location = { ...originalWindowLocation, href: '' }; // Ensure href is part of the mock
});
afterAll(() => {
  window.location = originalWindowLocation;
});
const mockWindowLocationHrefSet = jest.fn();
Object.defineProperty(window, 'location', {
  configurable: true,
  value: {
    ...originalWindowLocation, // Spread to keep other location properties
    set href(url: string) {
      mockWindowLocationHrefSet(url);
    },
    // Getter for href, if something in the code tries to read it
    get href() {
      return mockWindowLocationHrefSet.mock.calls[mockWindowLocationHrefSet.mock.calls.length - 1]?.[0] || '';
    }
  },
});


jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
    push: mockRouterPush,
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const mockSupabaseGetUser = jest.fn();
const mockSupabaseFrom = jest.fn().mockReturnThis();
const mockSupabaseSelect = jest.fn().mockReturnThis();
const mockSupabaseEq = jest.fn().mockReturnThis();
const mockSupabaseSingle = jest.fn();

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockSupabaseGetUser,
    },
    from: jest.fn(() => ({ // Mock 'from' at the top level of the client
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: mockSupabaseSingle,
    })),
  })),
}));

// Mock child components
jest.mock('../modern/components/navigation', () => () => <div data-testid="mock-navigation" />);
jest.mock('../modern/components/hero', () => () => <div data-testid="mock-hero" />);
jest.mock('../modern/components/features', () => () => <div data-testid="mock-features" />);
jest.mock('../modern/components/services', () => () => <div data-testid="mock-services" />);
// Mock Pricing component to allow triggering onManageSubscription
let mockOnManageSubscription: () => void = () => {};
jest.mock('../modern/components/pricing', () => (props: { onManageSubscription: () => void }) => {
  mockOnManageSubscription = props.onManageSubscription; // Capture the function
  return <button data-testid="mock-pricing-manage-button" onClick={() => mockOnManageSubscription()}>Manage Subscription</button>;
});
jest.mock('../modern/components/testimonials', () => () => <div data-testid="mock-testimonials" />);
jest.mock('../modern/components/cta', () => () => <div data-testid="mock-cta" />);
jest.mock('../modern/components/footer', () => () => <div data-testid="mock-footer" />);

// Mock global fetch
global.fetch = jest.fn() as jest.Mock;


describe('LandingPage', () => {
  beforeEach(() => {
    mockToast.mockClear();
    mockRouterReplace.mockClear();
    mockRouterPush.mockClear();
    mockSearchParamsGet.mockClear();
    mockSupabaseGetUser.mockClear();
    mockSupabaseSingle.mockClear();
    (global.fetch as jest.Mock).mockClear();
    mockWindowLocationHrefSet.mockClear();

    // Default Supabase mocks for general rendering
    mockSupabaseGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockSupabaseSingle.mockResolvedValue({ data: null, error: null }); // Default for profile fetch
  });

  describe('ProfileErrorToastHandler Logic', () => {
    it('should display an error toast and clear query param when "profile_fetch_failed" error is present', () => {
      mockSearchParamsGet.mockReturnValue('profile_fetch_failed');
      render(<LandingPage />);
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Could not retrieve your user details. Please try logging in again or contact support if the issue persists.",
        variant: "destructive",
      });
      expect(mockRouterReplace).toHaveBeenCalledWith('/landing', { scroll: false });
    });

    it('should not display an error toast if error query param is not present', () => {
      mockSearchParamsGet.mockReturnValue(null);
      render(<LandingPage />);
      expect(mockToast).not.toHaveBeenCalled();
    });
  });

  describe('redirectToCustomerPortal Functionality', () => {
    const mockUser = { id: 'user-id-123', email: 'test@example.com' };

    it('successfully redirects to customer portal if user is logged in and API call is successful', async () => {
      mockSupabaseGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://mock_portal_url.com' }),
      });

      render(<LandingPage />);

      const manageButton = screen.getByTestId('mock-pricing-manage-button');
      await act(async () => {
        fireEvent.click(manageButton);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/stripe/customer-portal', expect.any(Object));
      expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toEqual({ userId: mockUser.id, email: mockUser.email });
      await waitFor(() => expect(mockWindowLocationHrefSet).toHaveBeenCalledWith('https://mock_portal_url.com'));
    });

    it('shows an error toast if API call fails', async () => {
      mockSupabaseGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'API Error Occurred' }),
      });

      render(<LandingPage />);
      const manageButton = screen.getByTestId('mock-pricing-manage-button');
      await act(async () => {
        fireEvent.click(manageButton);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/stripe/customer-portal', expect.any(Object));
      await waitFor(() => expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'API Error Occurred',
        variant: 'destructive',
      }));
      expect(mockWindowLocationHrefSet).not.toHaveBeenCalled();
    });

    it('shows an error toast if customer portal URL is not in API response', async () => {
        mockSupabaseGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ someOtherData: 'no_url_here' }), // No URL
        });

        render(<LandingPage />);
        const manageButton = screen.getByTestId('mock-pricing-manage-button');
        await act(async () => {
          fireEvent.click(manageButton);
        });

        await waitFor(() => expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Customer portal URL not found in response.',
          variant: 'destructive',
        }));
        expect(mockWindowLocationHrefSet).not.toHaveBeenCalled();
      });

    it('shows an auth required toast if user is not logged in', async () => {
      mockSupabaseGetUser.mockResolvedValue({ data: { user: null }, error: null }); // No user

      render(<LandingPage />);
      const manageButton = screen.getByTestId('mock-pricing-manage-button');
      await act(async () => {
        fireEvent.click(manageButton);
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Authentication Required',
        description: 'Please log in to manage your subscription.',
        variant: 'default',
      });
      expect(mockWindowLocationHrefSet).not.toHaveBeenCalled();
    });
  });
});
