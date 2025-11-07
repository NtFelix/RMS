import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { StripePlan } from '@/types/stripe';

export interface ApartmentUsage {
  count: number;
  limit: number | null;
  isLoading: boolean;
  error: string | null;
  progressPercentage: number;
}

export function useApartmentUsage(user: User | null) {
  const [state, setState] = useState<{
    count: number;
    limit: number | null;
    isLoading: boolean;
    error: string | null;
  }>({
    count: 0,
    limit: null,
    isLoading: true,
    error: null,
  });

  const supabase = createClient();

  useEffect(() => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchApartmentData = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));

        // Fetch apartment count
        const { count, error: countError } = await supabase
          .from('Wohnungen')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (countError) throw countError;

        // Fetch apartment limit from profile and plan details
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('stripe_subscription_status, stripe_price_id')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        let apartmentLimit: number | null = null;

        if (profile && profile.stripe_subscription_status === 'active' && profile.stripe_price_id) {
            try {
              const response = await fetch('/api/stripe/plans');
              if (response.ok) {
                const plans = await response.json() as StripePlan[];
                const currentPlan = plans.find(plan => plan.priceId === profile.stripe_price_id);
                
                if (currentPlan && typeof currentPlan.limit_wohnungen === 'number' && currentPlan.limit_wohnungen > 0) {
                  apartmentLimit = currentPlan.limit_wohnungen;
                }
              }
            } catch (error) {
              console.error("Error fetching plan details:", error);
              // Don't throw here, just use the default unlimited state
            }
          }

        setState({
          count: count || 0,
          limit: apartmentLimit,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching apartment data:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch apartment data',
        }));
      }
    };

    fetchApartmentData();
  }, [user, supabase]);

  const progressPercentage = state.limit ? Math.min((state.count / state.limit) * 100, 100) : 0;

  return {
    count: state.count,
    limit: state.limit,
    isLoading: state.isLoading,
    error: state.error,
    progressPercentage,
  };
}
