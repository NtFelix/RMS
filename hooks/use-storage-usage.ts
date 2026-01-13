'use client';

import { useState, useEffect, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

export interface StorageUsage {
    usage: number; // Current usage in bytes
    limit: number; // Limit in bytes, 0 means no storage access
    isLoading: boolean;
    error: string | null;
    percentage: number; // Usage percentage (0-100)
    isOverLimit: boolean;
    isNearLimit: boolean; // Over 80% usage
    hasNoStorageAccess: boolean; // True if limit is 0 (no storage access)
}

/**
 * Hook to fetch and track storage usage against subscription limits.
 * Defaults to 0 storage (no access) if no valid limit is found.
 */
export function useStorageUsage(user: User | null, initialUsage?: number): StorageUsage {
    const [state, setState] = useState<{
        usage: number;
        limit: number;
        isLoading: boolean;
        error: string | null;
    }>({
        usage: initialUsage ?? 0,
        limit: 0, // Default to 0 (no storage access)
        isLoading: true,
        error: null,
    });

    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        if (!user) {
            setState(prev => ({ ...prev, isLoading: false, limit: 0 }));
            return;
        }

        const fetchStorageData = async () => {
            try {
                setState(prev => ({ ...prev, isLoading: true }));

                // Fetch storage usage via RPC
                const { data: usageData, error: usageError } = await supabase
                    .rpc('calculate_storage_usage', { target_user_id: user.id });

                if (usageError) throw usageError;

                // Fetch storage limit from profile and plan details
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('stripe_subscription_status, stripe_price_id')
                    .eq('id', user.id)
                    .single();

                if (profileError) throw profileError;

                // Default to 0 (no storage access)
                let storageLimit = 0;

                const isActiveOrTrialing = profile &&
                    (profile.stripe_subscription_status === 'active' ||
                        profile.stripe_subscription_status === 'trialing') &&
                    profile.stripe_price_id;

                if (isActiveOrTrialing) {
                    try {
                        const response = await fetch(`/api/stripe/plans/${profile.stripe_price_id}`);
                        if (response.ok) {
                            const planDetails = await response.json();

                            // The planDetails from /api/stripe/plans/[priceId] uses storageLimit 
                            // (matching the getPlanDetails return type)
                            if (planDetails && typeof planDetails.storageLimit === 'number') {
                                storageLimit = planDetails.storageLimit;
                            }
                        }
                    } catch (error) {
                        console.error("Error fetching plan details:", error);
                        // On error, default to 0 (no storage access)
                    }
                }

                setState({
                    usage: Number(usageData) || 0,
                    limit: storageLimit,
                    isLoading: false,
                    error: null,
                });
            } catch (error) {
                console.error('Error fetching storage data:', error);
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    limit: 0, // On error, default to no storage access
                    error: error instanceof Error ? error.message : 'Failed to fetch storage data',
                }));
            }
        };

        fetchStorageData();
    }, [user, supabase]);

    const hasNoStorageAccess = state.limit === 0;
    const percentage = state.limit > 0 ? Math.min((state.usage / state.limit) * 100, 100) : 100;
    const isOverLimit = state.usage >= state.limit;
    const isNearLimit = !hasNoStorageAccess && percentage >= 80 && !isOverLimit;

    return {
        usage: state.usage,
        limit: state.limit,
        isLoading: state.isLoading,
        error: state.error,
        percentage,
        isOverLimit,
        isNearLimit,
        hasNoStorageAccess,
    };
}

