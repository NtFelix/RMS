
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingChecklistState {
    dismissed: boolean;
    dismiss: () => void;
    show: () => void;
}

function captureChecklistEvent(mode: 'dismissed' | 'shown') {
    try {
        // Dynamic import to avoid bundling posthog-js in server components
        const posthog = require('posthog-js');
        if (typeof window !== 'undefined' && posthog && posthog.has_opted_in_capturing?.()) {
            posthog.capture('mietevo_web_onboarding_checklist', {
                mode,
                source: 'onboarding_checklist',
            });
        }
    } catch {
        // PostHog not available
    }
}

export const useOnboardingStore = create<OnboardingChecklistState>()(
    persist(
        (set) => ({
            dismissed: false,

            dismiss: () => {
                set({ dismissed: true });
                captureChecklistEvent('dismissed');
            },

            show: () => {
                set({ dismissed: false });
                captureChecklistEvent('shown');
            },
        }),
        {
            name: 'onboarding-storage',
        }
    )
);
