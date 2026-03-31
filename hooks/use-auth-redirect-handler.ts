import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

export function useAuthRedirects(user: User | null, isLoadingUser: boolean) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam === 'profile_fetch_failed') {
            toast({
                title: "Error",
                description: "Could not retrieve your user details. Please try logging in again or contact support if the issue persists.",
                variant: "destructive",
            });

            // Remove the error param from URL without reloading
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('error');
            const searchStr = newParams.toString();
            const newUrl = `${window.location.pathname}${searchStr ? '?' + searchStr : ''}`;
            window.history.replaceState({}, '', newUrl);
        }
    }, [searchParams, toast]);

    useEffect(() => {
        if (isLoadingUser) {
            return;
        }

        const getStarted = searchParams.get('getStarted');
        if (getStarted === 'true' && !user) {
            router.push('/auth/login');
        }
    }, [searchParams, user, router, isLoadingUser]);
}
