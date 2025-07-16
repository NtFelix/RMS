import React from 'react';
import { UserSubscriptionProfile } from '../client-page'; // Corrected UserProfile type import
import Pricing from '@/app/modern/components/pricing'; // Corrected Pricing component path

interface TrialViewProps {
  profile: UserSubscriptionProfile;
  daysRemaining: number;
  onSelectPlan: (planId: string) => void;
  isLoading: boolean;
}

const TrialView: React.FC<TrialViewProps> = ({ profile, daysRemaining, onSelectPlan, isLoading }) => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Subscription Management</h1>
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3">Your Free Trial</h2>
        <p className="mb-2">
          You are currently on a free trial.
        </p>
        {profile?.stripe_current_period_end && (
          <p className="mb-2">
            Your trial ends on: <strong>{new Date(profile.stripe_current_period_end).toLocaleDateString()}</strong> ({daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining).
          </p>
        )}
        <p className="mb-2">You can create up to <strong>5 Wohnungen</strong> during your trial.</p>
        <p className="mt-4">To continue using the service with more features and higher limits after your trial, please choose a subscription plan.</p>
      </div>
      <h2 className="text-xl font-bold mb-6 text-center">Choose a Plan to Activate After Trial</h2>
      <Pricing userProfile={profile} onSelectPlan={onSelectPlan} isLoading={isLoading} />
    </div>
  );
};

export default TrialView;
