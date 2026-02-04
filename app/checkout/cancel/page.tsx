
// app/checkout/cancel/page.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Assuming Button component exists
import { ROUTES } from '@/lib/constants';

export default function CheckoutCancelPage() {
  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold text-red-600 mb-4">Payment Cancelled</h1>
      <p className="text-lg mb-6">
        Your payment process was cancelled. You have not been charged.
      </p>
      <p className="mb-8">
        If you encountered any issues or have any questions, please feel free to contact our support.
        You can try subscribing again when you are ready.
      </p>
      <Button asChild>
        <Link href="/preise">View Subscription Options</Link>
      </Button>
      <Button variant="link" asChild className="mt-4">
        <Link href={ROUTES.HOME}>Back to Dashboard</Link>
      </Button>
    </div>
  );
}
