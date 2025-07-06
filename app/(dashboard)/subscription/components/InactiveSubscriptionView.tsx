import React from 'react';
import { UserSubscriptionProfile } from '../client-page'; // Corrected UserProfile type import

interface InactiveSubscriptionViewProps {
  profile: UserSubscriptionProfile | null; // Profile can be null if still loading or error
}

const InactiveSubscriptionView: React.FC<InactiveSubscriptionViewProps> = ({ profile }) => {
  return (
    <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p>Your subscription status: <strong>{profile?.stripe_subscription_status || 'Unknown'}</strong>.</p>
        <p>If you believe this is an error, please contact support.</p>
        {/* Optionally, add a button to refresh or contact support */}
    </div>
  );
};

export default InactiveSubscriptionView;
