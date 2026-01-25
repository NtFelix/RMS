import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/types/supabase';

export function usePlanSelectionRedirect(
    sessionUser: User | null,
    userProfile: Profile | null,
    isProcessingCheckout: boolean,
    handleAuthFlow: (priceId: string, currentPath: string) => Promise<void>
) {
    const searchParams = useSearchParams();

    useEffect(() => {
        const priceId = searchParams.get('priceId');
        if (priceId && sessionUser && userProfile && !isProcessingCheckout) {
            // Clear the priceId from URL to prevent re-triggering on refresh
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('priceId');
            const searchStr = newParams.toString();
            const newUrl = `${window.location.pathname}${searchStr ? '?' + searchStr : ''}`;
            window.history.replaceState({}, '', newUrl);

            handleAuthFlow(priceId, window.location.pathname);
        }
    }, [searchParams, sessionUser, userProfile, isProcessingCheckout, handleAuthFlow]);
}
