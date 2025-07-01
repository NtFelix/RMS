// app/checkout/success/success-content.tsx
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type VerificationStatus = 'idle' | 'loading' | 'success' | 'error' | 'not_verified';

export default function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { toast } = useToast();

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setVerificationStatus('not_verified');
      setErrorMessage('No session ID found. Your payment cannot be verified at this moment.');
      toast({
        title: 'Verification Issue',
        description: 'No session ID found.',
        variant: 'destructive',
      });
      return;
    }

    const verifySession = async () => {
      setVerificationStatus('loading');
      setErrorMessage(null);
      setCustomerEmail(null);

      try {
        const response = await fetch('/api/stripe/verify-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json();

        if (response.ok) {
          if (data.payment_status === 'paid' || data.status === 'complete') {
            setVerificationStatus('success');
            setCustomerEmail(data.customer_email);
            toast({
              title: 'Payment Successful!',
              description: 'Your subscription has been activated.',
              variant: 'default', // Or 'success'
            });
          } else {
            setVerificationStatus('not_verified');
            setErrorMessage(`Payment status: ${data.payment_status}. Session status: ${data.status}. Please contact support if payment was made.`);
            toast({
              title: 'Payment Not Confirmed',
              description: 'Your payment could not be confirmed. Please contact support.',
              variant: 'destructive',
            });
          }
        } else {
          setVerificationStatus('error');
          setErrorMessage(data.error || 'Failed to verify session. Please contact support.');
          toast({
            title: 'Verification Error',
            description: data.error || 'An error occurred while verifying your payment.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        setVerificationStatus('error');
        const message = error instanceof Error ? error.message : 'An unknown network error occurred.';
        setErrorMessage(message);
        toast({
          title: 'Network Error',
          description: 'Could not connect to verification service. ' + message,
          variant: 'destructive',
        });
      }
    };

    verifySession();
  }, [sessionId, toast]);

  if (verificationStatus === 'loading') {
    return (
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-semibold mb-4">Verifying your payment details...</h1>
        <p>Please wait a moment.</p>
        {/* You could add a spinner here */}
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">Payment Successful!</h1>
        <p className="text-lg mb-6">
          Thank you for your purchase. Your subscription is now active.
        </p>
        {customerEmail && (
          <p className="mb-4">
            A confirmation email has been sent to <strong>{customerEmail}</strong>.
          </p>
        )}
        <p className="mb-8">
          You can now access all the premium features.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild>
            <Link href="/subscription">Go to My Subscription</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/home">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'error') {
    return (
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Error Verifying Payment</h1>
        <p className="text-lg mb-6">
          We encountered an error while trying to verify your payment.
        </p>
        {errorMessage && <p className="mb-4 text-sm text-red-700 bg-red-100 p-3 rounded-md">{errorMessage}</p>}
        <p className="mb-8">
          Please contact our support team for assistance.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild>
            <Link href="/">Back to Landing Page</Link>
          </Button>
          {/* <Button variant="outline" asChild> <Link href="/support">Contact Support</Link> </Button> */}
        </div>
      </div>
    );
  }

  if (verificationStatus === 'not_verified') {
    return (
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold text-orange-500 mb-4">Payment Not Verified</h1>
        <p className="text-lg mb-6">
          Your payment could not be fully confirmed at this moment.
        </p>
        {errorMessage && <p className="mb-4 text-sm text-orange-700 bg-orange-100 p-3 rounded-md">{errorMessage}</p>}
        <p className="mb-8">
          If you believe this is an error or your payment has been processed, please contact our support team.
        </p>
         <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild>
            <Link href="/">Back to Landing Page</Link>
          </Button>
           {/* <Button variant="outline" asChild> <Link href="/support">Contact Support</Link> </Button> */}
        </div>
      </div>
    );
  }

  // Fallback for 'idle' or any other unexpected status
  return (
     <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-semibold mb-4">Processing your request...</h1>
         <Button variant="link" asChild className="mt-4">
            <Link href="/">Go to Homepage</Link>
        </Button>
    </div>
  );
}
