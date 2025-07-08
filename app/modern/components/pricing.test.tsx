import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
    limit_wohnungen: 5,
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
    limit_wohnungen: 20,
    priceId: 'price_pro_monthly',
    position: 2,
    popular: true,
    description: 'The Pro plan.',
  },
];

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockPlansData),
  })
) as jest.Mock;

const mockOnSelectPlan = jest.fn();

describe('Pricing Component', () => {
  beforeEach(() => {
    // Clear mock call counts before each test
    mockOnSelectPlan.mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  test('Scenario 1: User with no active subscription or trial', async () => {
    render(
      <Pricing
        onSelectPlan={mockOnSelectPlan}
        overallSubscriptionActive={false}
        activeTrial={false}
        currentPlanId={null}
      />
    );

    // Wait for plans to load
    await waitFor(() => {
      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    // Check buttons
    const getStartedButtons = screen.getAllByText('Get Started');
    expect(getStartedButtons.length).toBe(mockPlansData.length);
    getStartedButtons.forEach(button => {
      expect(button).toBeEnabled();
    });

    // Check trial message
    expect(screen.getByText(/All plans include a 14-day free trial/i)).toBeVisible();
  });

  test('Scenario 2: User with an active trial (Pro plan)', async () => {
    render(
      <Pricing
        onSelectPlan={mockOnSelectPlan}
        overallSubscriptionActive={true}
        activeTrial={true}
        currentPlanId="price_pro_monthly" // Pro plan is the current one
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    // Pro plan button (current)
    const proPlanCard = screen.getByText('Pro').closest('div[class*="CardHeader"]');
    expect(proPlanCard).not.toBeNull();
    // Find button within the Pro plan card
    const proButton = Array.from(proPlanCard!.parentElement!.querySelectorAll('button')).find(b => b.textContent === 'Current Plan');
    expect(proButton).toBeInTheDocument();
    expect(proButton).toBeDisabled();

    // Basic plan button
    const basicPlanCard = screen.getByText('Basic').closest('div[class*="CardHeader"]');
    expect(basicPlanCard).not.toBeNull();
    const basicButton = Array.from(basicPlanCard!.parentElement!.querySelectorAll('button')).find(b => b.textContent === 'Get Started');
    expect(basicButton).toBeInTheDocument();
    expect(basicButton).toBeDisabled();

    // Check trial message
    expect(screen.queryByText(/All plans include a 14-day free trial/i)).not.toBeInTheDocument();
  });

  test('Scenario 3: User with active subscription (Basic plan)', async () => {
    render(
      <Pricing
        onSelectPlan={mockOnSelectPlan}
        overallSubscriptionActive={true}
        activeTrial={false}
        currentPlanId="price_basic_monthly" // Basic plan is current
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    // Basic plan button (current)
    const basicPlanCard = screen.getByText('Basic').closest('div[class*="CardHeader"]');
    expect(basicPlanCard).not.toBeNull();
    const basicButton = Array.from(basicPlanCard!.parentElement!.querySelectorAll('button')).find(b => b.textContent === 'Current Plan');
    expect(basicButton).toBeInTheDocument();
    expect(basicButton).toBeDisabled();

    // Pro plan button
    const proPlanCard = screen.getByText('Pro').closest('div[class*="CardHeader"]');
    expect(proPlanCard).not.toBeNull();
    const proButton = Array.from(proPlanCard!.parentElement!.querySelectorAll('button')).find(b => b.textContent === 'Get Started');
    expect(proButton).toBeInTheDocument();
    expect(proButton).toBeDisabled();

    // Check trial message
    expect(screen.queryByText(/All plans include a 14-day free trial/i)).not.toBeInTheDocument();
  });

  test('Scenario 4: User with active subscription (legacy plan not displayed)', async () => {
    render(
      <Pricing
        onSelectPlan={mockOnSelectPlan}
        overallSubscriptionActive={true}
        activeTrial={false}
        currentPlanId="price_legacy_plan" // Legacy plan
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    // All displayed plan buttons should be "Get Started" and disabled
    const getStartedButtons = screen.getAllByText('Get Started');
    expect(getStartedButtons.length).toBe(mockPlansData.length);
    getStartedButtons.forEach(button => {
      expect(button).toBeDisabled();
    });

    // Check trial message
    expect(screen.queryByText(/All plans include a 14-day free trial/i)).not.toBeInTheDocument();
  });
});
