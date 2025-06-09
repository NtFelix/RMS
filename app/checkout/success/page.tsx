// app/checkout/success/page.tsx
"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation'; // For reading session_id if needed for client-side confirmation
import { Button } from '@/components/ui/button'; // Assuming Button component exists
import { useToast } from '@/hooks/use-toast'; // Assuming a toast hook exists

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { toast } = useToast();

  useEffect(() => {
    // You could use the session_id to make a request to your backend
    // to confirm the session details or update UI further, if necessary.
    // For now, we assume the webhook has handled the subscription update.
    if (sessionId) {
      console.log('Checkout session ID:', sessionId);
      toast({
        title: 'Payment Successful!',
        description: 'Your subscription has been activated.',
        variant: 'default', // Or 'success' if you have such a variant
      });
    }
  }, [sessionId, toast]);

  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4">Payment Successful!</h1>
      <p className="text-lg mb-6">
        Thank you for your purchase. Your subscription is now active.
      </p>
      <p className="mb-8">
        You will receive a confirmation email shortly. You can now access all the premium features.
      </p>
      <Button asChild>
        <Link href="/subscription">Go to My Subscription</Link>
      </Button>
      <Button variant="link" asChild className="mt-4">
        <Link href="/home">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
