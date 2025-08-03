import React from 'react';
import { UserSubscriptionProfile } from '../client-page'; // Corrected UserProfile type import
import { formatNumber } from '@/utils/format';
// Plan type is part of UserSubscriptionProfile.activePlan, no separate import needed if structure matches

interface ActiveSubscriptionViewProps {
  // Ensured profile type matches UserSubscriptionProfile and activePlan is expected to be non-null
  profile: UserSubscriptionProfile & { activePlan: NonNullable<UserSubscriptionProfile['activePlan']> };
  currentPeriodEnd: string | null;
}

const ActiveSubscriptionView: React.FC<ActiveSubscriptionViewProps> = ({ profile, currentPeriodEnd }) => {
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
           <p className="mb-2">Price: <strong>{formatNumber(activePlan.price / 100)} {activePlan.currency.toUpperCase()}</strong> / month</p>
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
      {/* Example: <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Manage Subscription</button> */}
    </div>
  );
};

export default ActiveSubscriptionView;
