'use server';

import { STRIPE_CONFIG } from '@/lib/constants/stripe';
import Stripe from 'stripe';

export async function getStripePlans() {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, STRIPE_CONFIG);
    
    // Fetch products and prices in parallel to eliminate waterfall
    const [products, prices] = await Promise.all([
      stripe.products.list({
        active: true,
        expand: ['data.default_price'],
      }),
      stripe.prices.list({
        active: true,
        expand: ['data.product'],
      })
    ]);

    // Transform Stripe data to our Plan interface
    const plans = prices.data
      .filter((price) => (price.product as Stripe.Product).active)
      .map((price) => {
        const product = price.product as Stripe.Product;
        const metadata = { ...product.metadata, ...price.metadata };
        
        return {
          id: price.id,
          priceId: price.id,
          name: product.name,
          productName: product.name,
          description: product.description || '',
          price: price.unit_amount || 0,
          currency: price.currency,
          interval: price.recurring?.interval || null,
          interval_count: price.recurring?.interval_count || null,
          features: metadata.features ? JSON.parse(metadata.features) : [],
          limit_wohnungen: metadata.limit_wohnungen ? parseInt(metadata.limit_wohnungen) : undefined,
          position: metadata.position ? parseInt(metadata.position) : 99,
          metadata: metadata,
        };
      });

    return { success: true, data: plans };
  } catch (error: any) {
    console.error('Error fetching Stripe plans:', error);
    return { success: false, error: error.message || 'Failed to fetch plans' };
  }
}
