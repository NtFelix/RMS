'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

export interface StorageUsage {
    usage: number; // Current usage in bytes (pre-computed Organisation.speicher_bytes)
    limit: number; // Limit in bytes, 0 means no storage access
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>; // Re-reads the pre-computed usage, e.g. after an upload or delete
}

/** Reads the pre-computed storage usage of the organisation in bytes. */
async function readUsage(supabase: ReturnType<typeof createClient>): Promise<number> {
    const { data, error } = await supabase.rpc('calculate_storage_usage');
    if (error) throw error;
    return Number(data) || 0;
}

/**
 * Hook to fetch and track storage usage against subscription limits.
 * Defaults to 0 storage (no access) if no valid limit is found.
 * Derive over-limit / near-limit states with getStorageUsageState (lib/storage-usage.ts).
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

    // A usage lookup is ignored once a newer lookup has already been applied, so slower, older
    // responses cannot overwrite a fresher value. A newer lookup that failed does not block an older one.
    const issuedLookup = useRef(0);
    const appliedLookup = useRef(0);

    const refresh = useCallback(async () => {
        const lookup = ++issuedLookup.current;
        try {
            const usage = await readUsage(supabase);
            if (lookup < appliedLookup.current) return;
            appliedLookup.current = lookup;
            // Keep the same state object when nothing changed to avoid a re-render
            setState(prev => (prev.usage === usage ? prev : { ...prev, usage }));
        } catch (error) {
            console.error('Error refreshing storage usage:', error);
        }
    }, [supabase]);

    useEffect(() => {
        if (!user) {
            setState(prev => ({ ...prev, isLoading: false, limit: 0 }));
            return;
        }

        // Set by the cleanup: a result for a previous user (or an unmounted component) must not be written
        let cancelled = false;

        const fetchStorageData = async () => {
            try {
                setState(prev => (prev.isLoading ? prev : { ...prev, isLoading: true }));

                // Usage and profile are independent, only the plan lookup needs the profile
                const lookup = ++issuedLookup.current;
                const [usage, { data: profile, error: profileError }] = await Promise.all([
                    readUsage(supabase),
                    supabase
                        .from('profiles')
                        .select('stripe_subscription_status, stripe_price_id')
                        .eq('id', user.id)
                        .single(),
                ]);

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

                if (cancelled) return;

                // A newer refresh() may have finished while the plan was loading: keep its usage
                const usageIsCurrent = lookup >= appliedLookup.current;
                if (usageIsCurrent) appliedLookup.current = lookup;
                setState(prev => ({
                    usage: usageIsCurrent ? usage : prev.usage,
                    limit: storageLimit,
                    isLoading: false,
                    error: null,
                }));
            } catch (error) {
                if (cancelled) return;
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

        return () => {
            cancelled = true;
        };
    }, [user, supabase]);

    return {
        usage: state.usage,
        limit: state.limit,
        isLoading: state.isLoading,
        error: state.error,
        refresh,
    };
}
