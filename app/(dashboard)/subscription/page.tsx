// app/(dashboard)/subscription/page.tsx
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

// The rest of the original page.tsx content will be moved to
// app/(dashboard)/subscription/client-subscription-page.tsx
// and refactored to accept initialProfile as a prop.

/*
  The original content of SubscriptionPage that was client-side:
  - useState for profile, isLoading, isFetchingStatus
  - useEffect for getProfile
  - handleSubscribeClick
  - UI rendering logic based on profile state

  This will be moved into a new client component:
  app/(dashboard)/subscription/client-subscription-page.tsx
*/
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p className="mb-4 text-red-500">Could not load your subscription details. Please refresh the page or try again later.</p>
      </div>
    );
  }

  // isTrialActive now comes from profile.isTrialActive
  // daysRemaining calculation needs to use profile.trial_ends_at and profile.isTrialActive
  let daysRemaining = 0;
  if (profile?.isTrialActive && profile?.trial_ends_at) {
    const trialEndsDate = new Date(profile.trial_ends_at);
    const now = new Date();
    const diffTime = Math.abs(trialEndsDate.getTime() - now.getTime());
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  if (profile?.isTrialActive) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Subscription Management</h1>
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Your Free Trial</h2>
          <p className="mb-2">
            You are currently on a free trial.
          </p>
          {profile?.trial_ends_at && (
            <p className="mb-2">
              Your trial ends on: <strong>{new Date(profile.trial_ends_at).toLocaleDateString()}</strong> ({daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining).
            </p>
          )}
          <p className="mb-2">You can create up to <strong>5 Wohnungen</strong> during your trial.</p>
          <p className="mt-4">To continue using the service with more features and higher limits after your trial, please choose a subscription plan.</p>
        </div>
        {/* Optionally, show pricing plans below or a button to view them */}
        <h2 className="text-xl font-bold mb-6 text-center">Choose a Plan to Activate After Trial</h2>
        <Pricing onSelectPlan={handleSubscribeClick} isLoading={isLoading} />
      </div>
    );
  }

  // User has an active PAID subscription (not our custom trial)
  // Use profile.isTrialActive from API
  if (!profile?.isTrialActive && profile?.hasActiveSubscription && profile.activePlan) {
    const { activePlan } = profile;
    const featuresList = activePlan.features || [];

    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Subscription Management</h1>
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Your Current Plan</h2>
          <p className="mb-2">
            You are currently subscribed to the <strong>{activePlan.name}</strong> plan.
          </p>
          {activePlan.price && activePlan.currency && (
             <p className="mb-2">Price: <strong>{(activePlan.price / 100).toFixed(2)} {activePlan.currency.toUpperCase()}</strong> / month</p>
          )}
          {currentPeriodEnd && (
            <p className="mb-2">
              Your subscription is active until: <strong>{currentPeriodEnd}</strong>
            </p>
          )}
           {profile.stripe_subscription_status && (
            <p className="mb-2">Status: <span className={`font-semibold ${profile.stripe_subscription_status === 'active' || profile.stripe_subscription_status === 'trialing' ? 'text-green-600' : 'text-orange-500'}`}>{profile.stripe_subscription_status}</span></p>
          )}
          {featuresList.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold">Plan Features:</h3>
              <ul className="list-disc list-inside pl-4">
                {featuresList.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          )}
          {activePlan.limitWohnungen && (
            <p className="mt-2">
              Wohnungen Limit: <strong>{activePlan.limitWohnungen}</strong>
            </p>
          )}
        </div>
        {/* TODO: Add button to manage subscription (portal) */}
      </div>
    );
  }

  const isPaidSubscriptionProblematic = ['canceled', 'incomplete', 'past_due', 'unpaid', 'incomplete_expired', null, undefined].includes(profile?.stripe_subscription_status);
  // Use profile.isTrialActive from API for showPricing logic
  const showPricing = !profile?.isTrialActive && (!profile?.hasActiveSubscription || isPaidSubscriptionProblematic);

  if (showPricing) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Choose Your Plan</h1>
        {profile.stripe_subscription_status && profile.stripe_subscription_status !== 'canceled' && (
            <p className="mb-4 text-center text-orange-500">
                Your current subscription status is: <strong>{profile.stripe_subscription_status}</strong>. You can choose a new plan below.
            </p>
        )}
        {profile.stripe_subscription_status === 'canceled' && (
             <p className="mb-4 text-center">Your previous subscription was canceled. You can subscribe to a new plan below.</p>
        )}
        {!profile.stripe_subscription_status && (
            <p className="mb-4 text-center">You are not currently subscribed. Choose a plan to get started!</p>
        )}
        <Pricing onSelectPlan={handleSubscribeClick} isLoading={isLoading} />
      </div>
    );
  }

  // Fallback for any other states, though ideally covered above
  return (
    <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p>Your subscription status: <strong>{profile.stripe_subscription_status || 'Unknown'}</strong>.</p>
        <p>If you believe this is an error, please contact support.</p>
    </div>
  );
}
