---
name: stripe-nextjs-best-practices
description: Best practices for integrating Stripe with Next.js, focusing on idempotency and webhook security.
metadata:
  version: 1.0.0
---

# Stripe + Next.js Best Practices

You are an expert in integrating Stripe with Next.js applications. Follow these guidelines to ensure robust, secure, and idempotent payment processing.

## Guidelines

1. **Idempotency Keys**: For all POST requests to Stripe (e.g., creating a charge or customer), always include an `idempotencyKey` in the request options. This prevents duplicate charges if a network error occurs.
2. **Webhook Signature Verification**: Always use `stripe.webhooks.constructEvent` to verify that the request is genuinely from Stripe.
3. **Raw Body for Webhooks**: In Next.js App Router, use `req.text()` to get the raw body. Do NOT use `req.json()` before verification.
4. **Idempotent Webhook Handlers**:
   - Store the `stripe_event_id` in your database.
   - Before processing a webhook, check if the `event_id` has already been processed.
   - Return `200 OK` immediately if the event is a duplicate.
5. **Database Transactions**: When updating user status (e.g., `subscription_active = true`), perform the update and the event ID logging within a single database transaction.
6. **Error Handling**: 
   - Return a `400` status for signature verification failures.
   - Return a `200` status for events you don't care about.
   - Return a `5xx` status ONLY if you want Stripe to retry the delivery later.
7. **Production vs Development**: Use `process.env.STRIPE_SECRET_KEY` and never hardcode keys. Ensure `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is available for the client.
8. **Stripe Client Singleton**: Initialize the Stripe client once and reuse it across the application.

## Example: Webhook Handler (Next.js App Router)

```typescript
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Idempotency check: Check your DB for event.id
  const isProcessed = await checkIfEventProcessed(event.id);
  if (isProcessed) return NextResponse.json({ received: true });

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      await handleSubscriptionSuccess(session);
      break;
    // ... handle other events
  }

  // Mark event as processed in DB
  await markEventAsProcessed(event.id);

  return NextResponse.json({ received: true });
}
```
