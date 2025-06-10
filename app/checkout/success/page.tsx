// app/checkout/success/page.tsx
import { Suspense } from 'react';
import SuccessContent from './success-content'; // Adjust path if necessary

// Basic loading component
function LoadingFallback() {
  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center text-center">
      <p className="text-lg">Loading payment confirmation...</p>
      {/* You could add a spinner or skeleton UI here */}
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuccessContent />
    </Suspense>
  );
}
