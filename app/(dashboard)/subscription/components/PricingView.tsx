import React from 'react';
import Pricing from '@/app/modern/components/pricing'; // Corrected Pricing component path
import { UserSubscriptionProfile } from '../client-page'; // Corrected UserProfile type import

interface PricingViewProps {
  profile: UserSubscriptionProfile;
  onSelectPlan: (planId: string) => void;
  isLoading: boolean;
}

const PricingViewComponent: React.FC<PricingViewProps> = ({ profile, onSelectPlan, isLoading }) => {
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
      {!profile.stripe_subscription_status && !profile.isTrialActive && ( // Added !profile.isTrialActive here to ensure it doesn't show for active trials
          <p className="mb-4 text-center">You are not currently subscribed. Choose a plan to get started!</p>
      )}
      <Pricing userProfile={profile} onSelectPlan={onSelectPlan} isLoading={isLoading} />
    </div>
  );
};

export default PricingViewComponent;
