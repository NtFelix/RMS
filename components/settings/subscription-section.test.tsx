import React from 'react';
import { render, screen } from '@testing-library/react';
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

const basePlan = {
  priceId: 'price_1',
  name: 'Pro',
  price: 1000,
  currency: 'eur',
  features: [],
  limit_wohnungen: 10,
  storageLimit: GB,
};

function mockProfile(overrides: Record<string, unknown> = {}) {
  (getUserProfileForSettings as jest.Mock).mockResolvedValue({
    id: 'user-1',
    email: 'test@example.com',
    stripe_subscription_status: 'active',
    hasActiveSubscription: true,
    currentWohnungenCount: 2,
    storageUsedBytes: 0.5 * GB,
    documentCount: 1234,
    activePlan: basePlan,
    ...overrides,
  });
}

describe('SubscriptionSection storage usage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests the storage statistics together with the profile', async () => {
    mockProfile();
    render(<SubscriptionSection />);

    await screen.findByTestId('storage-usage');
    expect(getUserProfileForSettings).toHaveBeenCalledWith({ includeStorage: true });
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

  it.each([
    ['almost full', 0.9 * GB, /Ihr Speicher ist fast voll/],
    ['at the limit', GB, /Ihr Speicherlimit ist erreicht/],
  ])('shows a warning when the storage is %s', async (_label, usedBytes, message) => {
    mockProfile({ storageUsedBytes: usedBytes });
    render(<SubscriptionSection />);

    expect(await screen.findByText(message)).toBeInTheDocument();
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

    await screen.findByTestId('storage-usage');
    expect(screen.getByText('Nicht verfügbar')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: 'Speicherauslastung' })).not.toBeInTheDocument();
  });

  it('does not claim that storage is missing from the plan when the plan lookup failed', async () => {
    mockProfile({
      activePlan: null,
      hasActiveSubscription: false,
      stripe_subscription_status: 'active',
    });
    render(<SubscriptionSection />);

    const section = await screen.findByTestId('storage-usage');
    expect(section).toHaveTextContent('512.00 MB');
    expect(section).not.toHaveTextContent('Nicht verfügbar');
    expect(section).not.toHaveTextContent('nicht enthalten');
  });

  it('does not show 100% before the limit is reached', async () => {
    mockProfile({ storageUsedBytes: 0.996 * GB });
    render(<SubscriptionSection />);

    await screen.findByTestId('storage-usage');
    expect(screen.getByRole('progressbar', { name: 'Speicherauslastung' })).toHaveAttribute('aria-valuenow', '99');
  });

  it('shows usage without a progress bar for unlimited plans', async () => {
    mockProfile({ activePlan: { ...basePlan, limit_wohnungen: null, storageLimit: null } });
    render(<SubscriptionSection />);

    const section = await screen.findByTestId('storage-usage');
    expect(section).toHaveTextContent('512.00 MB');
    expect(screen.queryByRole('progressbar', { name: 'Speicherauslastung' })).not.toBeInTheDocument();
  });

  it('does not present missing statistics as 0 B', async () => {
    mockProfile({ storageUsedBytes: undefined, documentCount: undefined });
    render(<SubscriptionSection />);

    const section = await screen.findByTestId('storage-usage');
    expect(section).toHaveTextContent('konnte nicht geladen werden');
    expect(section).not.toHaveTextContent('0 B');
  });
});
