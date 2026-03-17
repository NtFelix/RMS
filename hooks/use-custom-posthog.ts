'use client';

import { useEffect, useState } from 'react';

// Light-weight custom hook to replace `posthog-js/react` so `posthog-js` 
// is never bundled into the Cloudflare Edge Worker SSR chunk.
export function usePostHog() {
    const [ph, setPh] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('posthog-js').then((m) => {
                setPh(m.default);
            });
        }
    }, []);

    // Provide a safe fallback object so the app doesn't crash during SSR or before load
    return ph || {
        capture: () => {},
        identify: () => {},
        has_opted_in_capturing: () => false,
        has_opted_out_capturing: () => true,
        opt_out_capturing: () => {},
        opt_in_capturing: () => {},
        get_distinct_id: () => null,
        reloadFeatureFlags: () => {}
    };
}
