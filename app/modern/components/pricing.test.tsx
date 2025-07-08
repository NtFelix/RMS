import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Pricing from './pricing'; // Adjust path as necessary

const mockPlansData = [
  {
    id: 'price_basic_monthly',
    productName: 'Basic',
    price: 1000,
    currency: 'usd',
    interval: 'month',
    interval_count: 1,
    features: ['Basic Feature 1', 'Basic Feature 2'],
    priceId: 'price_basic_monthly',
    position: 1,
    description: 'The Basic plan.',
  },
  {
    id: 'price_pro_monthly',
    productName: 'Pro',
    price: 2000,
    currency: 'usd',
    interval: 'month',
    interval_count: 1,
    features: ['Pro Feature 1', 'Pro Feature 2', 'Pro Feature 3'],
    priceId: 'price_pro_monthly',
    position: 2,
    popular: true,
    description: 'The Pro plan.',
  },
];

// Mock fetch for /api/stripe/plans
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockPlansData),
  })
) as jest.Mock;

const mockOnSelectPlan = jest.fn();
const mockOnManageSubscription = jest.fn();

// Helper to get button from a plan card
const getButtonFromPlanCard = (planName: string, buttonText?: string | RegExp) => {
  const planTitleElement = screen.getByText(planName);
  const cardElement = planTitleElement.closest('div[class*="CardHeader"]');
  expect(cardElement).not.toBeNull();
  const buttonElement = Array.from(cardElement!.parentElement!.querySelectorAll('button')).find(
    b => buttonText ? (typeof buttonText === 'string' ? b.textContent === buttonText : buttonText.test(b.textContent || '')) : true
  );
  return buttonElement;
};


describe('Pricing Component', () => {
  beforeEach(() => {
    mockOnSelectPlan.mockClear();
    mockOnManageSubscription.mockClear();
    (global.fetch as jest.Mock).mockClear();
    // Reset plans fetch mock for each test if it's modified by a specific test
    global.fetch = jest.fn(() =>
        Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPlansData),
        })
    ) as jest.Mock;
  });

  const defaultProps = {
    onSelectPlan: mockOnSelectPlan,
    onManageSubscription: mockOnManageSubscription,
    overallSubscriptionActive: false,
    activeTrial: false,
    currentPlanId: null,
    isProcessingCheckout: false,
    isProcessingPortalRedirect: false,
    stripeSubscriptionStatus: null, // Added to complete props
  };

  test('Scenario 1: User with no active subscription or trial', async () => {
    render(<Pricing {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('Basic')).toBeInTheDocument());

    const basicButton = getButtonFromPlanCard('Basic', 'Get Started');
    expect(basicButton).toBeEnabled();
    fireEvent.click(basicButton!);
    expect(mockOnSelectPlan).toHaveBeenCalledWith('price_basic_monthly');

    const proButton = getButtonFromPlanCard('Pro', 'Get Started');
    expect(proButton).toBeEnabled();
    fireEvent.click(proButton!);
    expect(mockOnSelectPlan).toHaveBeenCalledWith('price_pro_monthly');

    expect(screen.getByText(/All plans include a 14-day free trial/i)).toBeVisible();
  });

  test('Scenario 2: User with active trial (Pro plan is current)', async () => {
    render(
      <Pricing
        {...defaultProps}
        overallSubscriptionActive={true}
        activeTrial={true}
        currentPlanId="price_pro_monthly"
      />
    );
    await waitFor(() => expect(screen.getByText('Basic')).toBeInTheDocument());

    // Pro plan button (Current Plan)
    const proButton = getButtonFromPlanCard('Pro', 'Current Plan');
    expect(proButton).toBeInTheDocument();
    expect(proButton).toBeDisabled(); // "Current Plan" button is disabled
    fireEvent.click(proButton!); // Click to ensure onManageSubscription is NOT called for disabled current plan
    expect(mockOnManageSubscription).not.toHaveBeenCalled();


    // Basic plan button (Manage Subscription)
    const basicButton = getButtonFromPlanCard('Basic', 'Manage Subscription');
    expect(basicButton).toBeInTheDocument();
    expect(basicButton).toBeEnabled();
    fireEvent.click(basicButton!);
    expect(mockOnManageSubscription).toHaveBeenCalledTimes(1);

    expect(screen.queryByText(/All plans include a 14-day free trial/i)).not.toBeInTheDocument();
  });

  test('Scenario 3: User with active subscription (Basic plan is current)', async () => {
    render(
      <Pricing
        {...defaultProps}
        overallSubscriptionActive={true}
        activeTrial={false}
        currentPlanId="price_basic_monthly"
      />
    );
    await waitFor(() => expect(screen.getByText('Basic')).toBeInTheDocument());

    // Basic plan button (Current Plan)
    const basicButton = getButtonFromPlanCard('Basic', 'Current Plan');
    expect(basicButton).toBeInTheDocument();
    expect(basicButton).toBeDisabled(); // "Current Plan" button is disabled
    fireEvent.click(basicButton!);
    expect(mockOnManageSubscription).not.toHaveBeenCalled();

    // Pro plan button (Manage Subscription)
    const proButton = getButtonFromPlanCard('Pro', 'Manage Subscription');
    expect(proButton).toBeInTheDocument();
    expect(proButton).toBeEnabled();
    fireEvent.click(proButton!);
    expect(mockOnManageSubscription).toHaveBeenCalledTimes(1);

    expect(screen.queryByText(/All plans include a 14-day free trial/i)).not.toBeInTheDocument();
  });

  test('Scenario 4: User with active subscription (legacy plan, not displayed)', async () => {
    render(
      <Pricing
        {...defaultProps}
        overallSubscriptionActive={true}
        activeTrial={false}
        currentPlanId="price_legacy_plan"
      />
    );
    await waitFor(() => expect(screen.getByText('Basic')).toBeInTheDocument());

    // Both plans should show "Manage Subscription" and be enabled
    const basicButton = getButtonFromPlanCard('Basic', 'Manage Subscription');
    expect(basicButton).toBeInTheDocument();
    expect(basicButton).toBeEnabled();
    fireEvent.click(basicButton!);
    expect(mockOnManageSubscription).toHaveBeenCalledTimes(1);

    const proButton = getButtonFromPlanCard('Pro', 'Manage Subscription');
    expect(proButton).toBeInTheDocument();
    expect(proButton).toBeEnabled();
    fireEvent.click(proButton!);
    expect(mockOnManageSubscription).toHaveBeenCalledTimes(2);

    expect(screen.queryByText(/All plans include a 14-day free trial/i)).not.toBeInTheDocument();
  });

  test('Loading state: isProcessingCheckout disables "Get Started" buttons', async () => {
    render(<Pricing {...defaultProps} isProcessingCheckout={true} />);
    await waitFor(() => expect(screen.getByText('Basic')).toBeInTheDocument());

    const basicButton = getButtonFromPlanCard('Basic', 'Processing...');
    expect(basicButton).toBeInTheDocument();
    expect(basicButton).toBeDisabled();

    const proButton = getButtonFromPlanCard('Pro', 'Processing...');
    expect(proButton).toBeInTheDocument();
    expect(proButton).toBeDisabled();
  });

  test('Loading state: isProcessingPortalRedirect disables "Manage Subscription" and "Current Plan" buttons', async () => {
    render(
      <Pricing
        {...defaultProps}
        overallSubscriptionActive={true}
        currentPlanId="price_basic_monthly" // Basic is current
        isProcessingPortalRedirect={true}
      />
    );
    await waitFor(() => expect(screen.getByText('Basic')).toBeInTheDocument());

    // Basic plan button (Current Plan)
    const basicButton = getButtonFromPlanCard('Basic', 'Current Plan');
    expect(basicButton).toBeInTheDocument();
    expect(basicButton).toBeDisabled();

    // Pro plan button (Manage Subscription)
    const proButton = getButtonFromPlanCard('Pro', 'Manage Subscription');
    expect(proButton).toBeInTheDocument();
    expect(proButton).toBeDisabled();
  });
});
