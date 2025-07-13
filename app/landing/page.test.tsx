import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import LandingPage from './page'; // Adjust path if necessary

// Mock dependencies
const mockToast = jest.fn();
const mockRouterReplace = jest.fn();
const mockSearchParamsGet = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
    push: jest.fn(), // Add push if it's called elsewhere or for completeness
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

// Mock Supabase client if it's initialized during render and not just in event handlers
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      // Add other methods if needed by the component's rendering path
    },
    // Add other Supabase client features if necessary
  })),
}));

// Mock child components to simplify testing and avoid their internal logic/errors
jest.mock('../modern/components/navigation', () => () => <div data-testid="mock-navigation" />);
jest.mock('../modern/components/hero', () => () => <div data-testid="mock-hero" />);
jest.mock('../modern/components/features', () => () => <div data-testid="mock-features" />);
jest.mock('../modern/components/services', () => () => <div data-testid="mock-services" />);
jest.mock('../modern/components/pricing', () => () => <div data-testid="mock-pricing" />);

jest.mock('../modern/components/cta', () => () => <div data-testid="mock-cta" />);
jest.mock('../modern/components/footer', () => () => <div data-testid="mock-footer" />);


describe('LandingPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockToast.mockClear();
    mockRouterReplace.mockClear();
    mockSearchParamsGet.mockClear();
  });

  it('should display an error toast and clear query param when "profile_fetch_failed" error is present', () => {
    // Setup specific return value for this test
    mockSearchParamsGet.mockReturnValue('profile_fetch_failed');

    render(<LandingPage />);

    // Check if toast was called correctly
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Error",
      description: "Could not retrieve your user details. Please try logging in again or contact support if the issue persists.",
      variant: "destructive",
    });

    // Check if router.replace was called correctly
    expect(mockRouterReplace).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith('/landing', { scroll: false });
  });

  it('should not display an error toast if error query param is not present', () => {
    mockSearchParamsGet.mockReturnValue(null); // No error param

    render(<LandingPage />);

    expect(mockToast).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('should not display an error toast if error query param has a different value', () => {
    mockSearchParamsGet.mockReturnValue('some_other_error'); // Different error

    render(<LandingPage />);

    expect(mockToast).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled(); // router.replace should also not be called
  });
});
