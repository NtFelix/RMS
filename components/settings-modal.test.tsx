import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsModal } from './settings-modal';
import { useToast } from '@/hooks/use-toast';
import * as userProfileActions from '@/app/user-profile-actions';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/app/user-profile-actions', () => ({
  ...jest.requireActual('@/app/user-profile-actions'),
  getUserProfileForSettings: jest.fn(),
  getBillingAddress: jest.fn(),
}));

// Mock child components to isolate the SettingsModal
jest.mock('@/components/subscription-payment-methods', () => () => <div data-testid="payment-methods-mock" />);
jest.mock('@/components/subscription-payment-history', () => () => <div data-testid="payment-history-mock" />);
jest.mock('@/hooks/useDataExport', () => ({
    useDataExport: () => ({
        isExporting: false,
        handleDataExport: jest.fn(),
    }),
}));


jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('next-themes', () => ({
  useTheme: () => ({
    setTheme: jest.fn(),
    theme: 'light',
  }),
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            user_metadata: { first_name: 'Test', last_name: 'User' },
            email: 'test@example.com',
          },
        },
      }),
      reauthenticate: jest.fn().mockResolvedValue({ error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    functions: {
        invoke: jest.fn().mockResolvedValue({ error: null })
    }
  }),
}));

describe('SettingsModal', () => {
  let mockToast: jest.Mock;
  let mockGetUserProfile: jest.Mock;
  let mockGetBillingAddress: jest.Mock;

  beforeEach(() => {
    mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    mockGetUserProfile = userProfileActions.getUserProfileForSettings as jest.Mock;
    mockGetBillingAddress = userProfileActions.getBillingAddress as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should display user profile and subscription data on successful fetch', async () => {
    // Arrange
    mockGetUserProfile.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      currentWohnungenCount: 5,
      activePlan: {
        productName: 'Premium Plan',
        price: 2999,
        currency: 'eur',
        interval: 'month',
        limitWohnungen: 10,
      },
      stripe_subscription_status: 'active',
      stripe_customer_id: 'cus_123',
    });
    mockGetBillingAddress.mockResolvedValue({
        line1: '123 Main St',
        city: 'Anytown',
        postal_code: '12345',
        country: 'US',
    });

    render(<SettingsModal open={true} onOpenChange={jest.fn()} />);

    // Assert Profile tab content is loaded first
    await waitFor(() => {
        expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
        expect(screen.getByDisplayValue('User')).toBeInTheDocument();
        expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
    });

    // Act: Switch to subscription tab
    fireEvent.click(screen.getByRole('button', { name: /abo/i }));

    // Assert Subscription tab content
    await waitFor(() => {
      expect(screen.getByText('Premium Plan')).toBeInTheDocument();
      expect(screen.getByText('Aktiv')).toBeInTheDocument();
      expect(screen.getByText('5 / 10')).toBeInTheDocument();
      expect(screen.getByTestId('payment-methods-mock')).toBeInTheDocument();
      expect(screen.getByTestId('payment-history-mock')).toBeInTheDocument();
    });

    // Ensure no error toast was shown
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('should not show a toast notification when profile is not found', async () => {
    // Arrange
    mockGetUserProfile.mockResolvedValue({
      error: 'Profil nicht gefunden',
      details: 'Kein Profil in der Datenbank gefunden',
    });

    render(<SettingsModal open={true} onOpenChange={jest.fn()} />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: /abo/i }));

    // Assert
    await waitFor(() => {
      // Check that the inline error message is displayed
      expect(screen.getByText(/Abo-Details konnten nicht geladen werden/i)).toBeInTheDocument();
    });

    // Verify that the toast function was not called
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('should show a toast notification for other errors', async () => {
    // Arrange
    mockGetUserProfile.mockResolvedValue({
      error: 'Some other error',
      details: 'An unexpected error occurred',
    });

    render(<SettingsModal open={true} onOpenChange={jest.fn()} />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: /abo/i }));

    // Assert
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Fehler',
        description: 'Abo-Details konnten nicht geladen werden: Some other error',
        variant: 'destructive',
      });
    });
  });
});