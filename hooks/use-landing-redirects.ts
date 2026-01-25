import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

export function useLandingRedirects(sessionUser: User | null, isLoadingProfile: boolean, errorRedirectPath: string = '/') {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    // Handle Profile Error Toast
    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam === 'profile_fetch_failed') {
            toast({
                title: "Error",
                description: "Could not retrieve your user details. Please try logging in again or contact support if the issue persists.",
                variant: "destructive",
            });
            router.replace(errorRedirectPath, { scroll: false });
        }
    }, [searchParams, router, toast, errorRedirectPath]);

    // Handle "getStarted" URL parameter
    useEffect(() => {
        if (isLoadingProfile) {
            return;
        }

        const getStarted = searchParams.get('getStarted');
        if (getStarted === 'true' && !sessionUser) {
            router.push('/auth/login');
        }
    }, [searchParams, sessionUser, router, isLoadingProfile]);
}
