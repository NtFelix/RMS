import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SubscriptionSection from '@/components/settings/subscription-section';
import { getUserProfileForSettings } from '@/app/user-profile-actions';

jest.mock('@/app/user-profile-actions', () => ({
  getUserProfileForSettings: jest.fn(),
  createSetupIntent: jest.fn(),
}));

jest.mock('@/components/common/subscription-payment-methods', () => ({
  __esModule: true,
  default: () => <div data-testid="payment-methods" />,
}));

jest.mock('@/components/common/subscription-payment-history', () => ({
  __esModule: true,
  default: () => <div data-testid="payment-history" />,
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const GB = 1024 ** 3;

function mockProfile(overrides: Record<string, unknown> = {}) {
  (getUserProfileForSettings as jest.Mock).mockResolvedValue({
    id: 'user-1',
    email: 'test@example.com',
    stripe_subscription_status: 'active',
    hasActiveSubscription: true,
    currentWohnungenCount: 2,
    storageUsedBytes: 0.5 * GB,
    documentCount: 1234,
    activePlan: {
      priceId: 'price_1',
      name: 'Pro',
      price: 1000,
      currency: 'eur',
      features: [],
      limit_wohnungen: 10,
      storageLimit: GB,
    },
    ...overrides,
  });
}

describe('SubscriptionSection storage usage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows used storage, limit, percentage and document count', async () => {
    mockProfile();
    render(<SubscriptionSection />);

    const section = await screen.findByTestId('storage-usage');
    expect(section).toHaveTextContent('512.00 MB');
    expect(section).toHaveTextContent('/ 1.00 GB');
    expect(section).toHaveTextContent('50%');
    expect(section).toHaveTextContent('1.234');
    expect(screen.getByRole('progressbar', { name: 'Speicherauslastung' })).toHaveAttribute('aria-valuenow', '50');
    expect(section).not.toHaveTextContent('fast voll');
  });

  it('warns when the storage is almost full', async () => {
    mockProfile({ storageUsedBytes: 0.9 * GB });
    render(<SubscriptionSection />);

    expect(await screen.findByText('Ihr Speicher ist fast voll.')).toBeInTheDocument();
  });

  it('shows the limit reached message at 100 percent', async () => {
    mockProfile({ storageUsedBytes: GB });
    render(<SubscriptionSection />);

    expect(await screen.findByText(/Ihr Speicherlimit ist erreicht/)).toBeInTheDocument();
  });

  it('shows that storage is not included without an active plan', async () => {
    mockProfile({
      activePlan: null,
      hasActiveSubscription: false,
      stripe_subscription_status: 'inactive',
      storageUsedBytes: 0,
      documentCount: 0,
    });
    render(<SubscriptionSection />);

    await waitFor(() => expect(screen.getByTestId('storage-usage')).toBeInTheDocument());
    expect(screen.getByText('Nicht verfügbar')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: 'Speicherauslastung' })).not.toBeInTheDocument();
  });

  it('shows usage without a progress bar for unlimited plans', async () => {
    mockProfile({
      activePlan: {
        priceId: 'price_1',
        name: 'Unlimited',
        price: 1000,
        currency: 'eur',
        features: [],
        limit_wohnungen: null,
        storageLimit: null,
      },
    });
    render(<SubscriptionSection />);

    const section = await screen.findByTestId('storage-usage');
    expect(section).toHaveTextContent('512.00 MB');
    expect(screen.queryByRole('progressbar', { name: 'Speicherauslastung' })).not.toBeInTheDocument();
  });
});
