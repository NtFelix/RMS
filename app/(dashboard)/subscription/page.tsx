// app/(dashboard)/subscription/page.tsx
export const runtime = 'edge'; // Added for Cloudflare Pages compatibility

import { getSubscriptionPageData } from '@/app/subscription-actions';
import ClientSubscriptionPage from './client-subscription-page'; // We will create this

export default async function SubscriptionPage() {
  const profileData = await getSubscriptionPageData();

  if ('error' in profileData) {
    // Handle error state, perhaps render a specific error component or pass error info
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p className="mb-4 text-red-500">
          Could not load your subscription details: {profileData.error}.
          {profileData.details && ` Details: ${profileData.details}`}
        </p>
        <p>Please refresh the page or try again later.</p>
      </div>
    );
  }

  // If data is successfully fetched, pass it to a client component
  return <ClientSubscriptionPage initialProfile={profileData} />;
}

// Comments explaining the refactor are fine, but actual logic/JSX beyond the main function's scope
// should not be present in this server component file.
