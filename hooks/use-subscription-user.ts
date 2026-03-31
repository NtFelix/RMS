import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { Profile } from '@/types/supabase';

export function useSubscriptionUser() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchUserProfile = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_price_id')
                    .eq('id', userId)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    throw error;
                }
                setProfile(data as Profile | null);
            } catch (error) {
                console.error('Error fetching user profile:', error);
                setProfile(null);
            }
        };

        const fetchInitialUserAndProfile = async () => {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                await fetchUserProfile(user.id);
            } else {
                setProfile(null);
            }
            setIsLoading(false);
        };

        fetchInitialUserAndProfile();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            setUser(session?.user ?? null);
            if (event === 'SIGNED_IN' && session?.user) {
                await fetchUserProfile(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setProfile(null);
            }
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [supabase]);

    return { user, profile, isLoading };
}
