import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Pricing from './pricing';
import { usePostHog, useFeatureFlagEnabled } from 'posthog-js/react';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('posthog-js/react', () => ({
  usePostHog: jest.fn(),
  useFeatureFlagEnabled: jest.fn(),
}));

jest.mock('./waitlist-button', () => ({
  WaitlistButton: () => <div>WaitlistButton</div>,
}));

jest.mock('./faq', () => ({
  FAQ: () => <div>FAQ</div>,
}));

jest.mock('./preview-limit-notice-banner', () => ({
  PreviewLimitNoticeBanner: () => <div>PreviewLimitNoticeBanner</div>,
}));

const mockPlans = [
  {
    id: 'price_1',
    priceId: 'price_1',
    productName: 'Basis',
    price: 1000,
    currency: 'eur',
    interval: 'month',
    features: ['Feature 1', 'Feature 2'],
    position: 1,
  },
  {
    id: 'price_2',
    priceId: 'price_2',
    productName: 'Basis',
    price: 10000,
    currency: 'eur',
    interval: 'year',
    features: ['Feature 1', 'Feature 2'],
    position: 1,
  },
];

describe('Pricing Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePostHog as jest.Mock).mockReturnValue({
      capture: jest.fn(),
    });
    (useFeatureFlagEnabled as jest.Mock).mockReturnValue(false);
    
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPlans),
      })
    ) as jest.Mock;
  });

  it('renders pricing titles', async () => {
    render(<Pricing onSelectPlan={jest.fn()} userProfile={null} />);
    
    await waitFor(() => {
      expect(screen.getByText('Einfache, transparente Preise')).toBeInTheDocument();
    });
  });

  it('renders plan names after loading', async () => {
    render(<Pricing onSelectPlan={jest.fn()} userProfile={null} />);
    
    await waitFor(() => {
      // Find all elements with text 'Basis'. In the new layout, it appears in the card and the comparison table.
      const basisElements = screen.getAllByText('Basis');
      expect(basisElements.length).toBeGreaterThan(0);
    });
  });
});
