import { GET } from './route'; // Assuming route.ts is in the same directory
import Stripe from 'stripe';

// Mock Stripe SDK
const mockStripePricesList = jest.fn();
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      prices: {
        list: mockStripePricesList,
      },
    };
  });
});

// Helper to simulate NextResponse.json - can be shared if multiple test files need it
const mockNextResponseJson = (body: any, options?: { status: number }) => {
  return {
    json: () => Promise.resolve(body),
    status: options?.status || 200,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    ok: (options?.status || 200) >= 200 && (options?.status || 200) < 300,
    text: () => Promise.resolve(JSON.stringify(body)),
    clone: function() { return this; }
  } as unknown as Response;
};

describe('API Route: /api/stripe/plans GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset process.env for Stripe key if modified in tests, though usually set globally for tests
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  it('should return 200 OK with transformed plan data on successful fetch', async () => {
    const mockStripePrice = {
      id: 'price_1',
      nickname: 'Pro Plan',
      unit_amount: 2000, // 20 USD
      currency: 'usd',
      recurring: { interval: 'month', interval_count: 1 },
      metadata: { features: 'feat1,feat2', limit_wohnungen: '10' },
      product: {
        id: 'prod_1',
        name: 'My Product', // Fallback if nickname is null
        metadata: {}, // Product metadata
      },
    };
    const mockStripePrice2 = {
      id: 'price_2',
      nickname: null, // Test fallback to product name
      unit_amount: 5000,
      currency: 'usd',
      recurring: { interval: 'year', interval_count: 1 },
      metadata: { features: 'featA,featB,featC', limit_wohnungen: '50' },
      product: {
        id: 'prod_2',
        name: 'Mega Product',
        metadata: { features: 'prod_feat_fallback' }, // Test fallback for features
      },
    };
     const mockStripePrice3_no_limit = {
      id: 'price_3',
      nickname: 'Unlimited Plan',
      unit_amount: 10000,
      currency: 'usd',
      recurring: { interval: 'month', interval_count: 1 },
      metadata: { features: 'unlimited_feat' }, // No limit_wohnungen
      product: {
        id: 'prod_3',
        name: 'Unlimited Product',
        metadata: {},
      },
    };


    mockStripePricesList.mockResolvedValueOnce({ data: [mockStripePrice, mockStripePrice2, mockStripePrice3_no_limit] });

    const request = new Request('http://localhost/api/stripe/plans');
    const response = await GET(request);
    const plans = await response.json();

    expect(response.status).toBe(200);
    expect(Stripe).toHaveBeenCalledWith(process.env.STRIPE_SECRET_KEY, expect.any(Object));
    expect(mockStripePricesList).toHaveBeenCalledWith({ active: true, expand: ['data.product'] });
    expect(plans).toHaveLength(3);

    expect(plans[0]).toEqual({
      id: 'price_1',
      priceId: 'price_1',
      name: 'Pro Plan',
      price: 2000,
      currency: 'usd',
      interval: 'month',
      interval_count: 1,
      features: ['feat1', 'feat2'],
      limit_wohnungen: 10,
    });
    expect(plans[1]).toEqual({
      id: 'price_2',
      priceId: 'price_2',
      name: 'Mega Product', // Fallback to product name
      price: 5000,
      currency: 'usd',
      interval: 'year',
      interval_count: 1,
      features: ['featA', 'featB', 'featC'],
      limit_wohnungen: 50,
    });
     expect(plans[2]).toEqual({
      id: 'price_3',
      priceId: 'price_3',
      name: 'Unlimited Plan',
      price: 10000,
      currency: 'usd',
      interval: 'month',
      interval_count: 1,
      features: ['unlimited_feat'],
      limit_wohnungen: null, // Parsed as null
    });
  });

  it('should return 200 OK with an empty array if no active plans found', async () => {
    mockStripePricesList.mockResolvedValueOnce({ data: [] });

    const request = new Request('http://localhost/api/stripe/plans');
    const response = await GET(request);
    const plans = await response.json();

    expect(response.status).toBe(200);
    expect(plans).toEqual([]);
  });

  it('should return 500 if Stripe API throws an error', async () => {
    mockStripePricesList.mockRejectedValueOnce(new Error('Stripe API Connection Error'));

    const request = new Request('http://localhost/api/stripe/plans');
    const response = await GET(request);
    const errorResponse = await response.json();

    expect(response.status).toBe(500);
    expect(errorResponse.error).toBe('Failed to fetch plans from Stripe.');
    expect(errorResponse.details).toBe('Stripe API Connection Error');
  });

  it('should return 500 if STRIPE_SECRET_KEY is not set', async () => {
    delete process.env.STRIPE_SECRET_KEY; // Temporarily remove for this test

    const request = new Request('http://localhost/api/stripe/plans');
    const response = await GET(request);
    const errorResponse = await response.json();

    expect(response.status).toBe(500);
    expect(errorResponse.error).toBe('Stripe secret key not configured.');
  });
});
