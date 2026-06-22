
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TOUR_STEPS } from '@/constants/onboarding-steps';

interface OnboardingState {
    isActive: boolean;
    currentStepIndex: number;
    hasSeenTour: boolean;

    startTour: () => void;
    stopTour: () => void;
    completeStep: (stepId: string) => void;
    goToPreviousStep: () => void;
    goToNextStep: () => void;
    resetTour: () => void;
    skipTour: () => void;
}

function captureGuideEvent(mode: string, progress: number) {
    try {
        // Dynamic import to avoid bundling posthog-js in server components
        const posthog = require('posthog-js');
        if (typeof window !== 'undefined' && posthog && posthog.has_opted_in_capturing?.()) {
            posthog.capture('mietevo_web_product_guide', {
                mode,
                progress,
                total_steps: TOUR_STEPS.length,
                source: 'onboarding_tour',
            });
        }
    } catch {
        // PostHog not available
    }
}

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set, get) => ({
            isActive: false,
            currentStepIndex: 0,
            hasSeenTour: false,

            startTour: () => {
                set({ isActive: true, currentStepIndex: 0, hasSeenTour: true });
            },

            stopTour: () => {
                const { currentStepIndex } = get();
                set({ isActive: false });
                captureGuideEvent('partial', currentStepIndex);
            },

            resetTour: () => {
                set({ isActive: true, currentStepIndex: 0, hasSeenTour: true });
            },

            skipTour: () => {
                set({ isActive: false, hasSeenTour: true });
                captureGuideEvent('partial', 0);
            },

            completeStep: (stepId: string) => {
                const { currentStepIndex, isActive } = get();
                if (!isActive) return;

                const currentStep = TOUR_STEPS[currentStepIndex];

                // Only advance if the completed step matches the current step
                if (currentStep && currentStep.id === stepId) {
                    const nextIndex = currentStepIndex + 1;
                    if (nextIndex >= TOUR_STEPS.length) {
                        // Tour finished
                        set({ isActive: false, currentStepIndex: 0 });
                        fetch('/api/user/onboarding', { method: 'POST' }).catch(console.error);
                        captureGuideEvent('completed', TOUR_STEPS.length);
                    } else {
                        set({ currentStepIndex: nextIndex });
                    }
                }
            },

            goToPreviousStep: () => {
                const { currentStepIndex } = get();
                if (currentStepIndex > 0) {
                    set({ currentStepIndex: currentStepIndex - 1 });
                }
            },

            goToNextStep: () => {
                const { currentStepIndex } = get();
                const nextIndex = currentStepIndex + 1;

                if (nextIndex >= TOUR_STEPS.length) {
                    // Tour finished
                    set({ isActive: false, currentStepIndex: 0 });
                    fetch('/api/user/onboarding', { method: 'POST' }).catch(console.error);
                    captureGuideEvent('completed', TOUR_STEPS.length);
                } else {
                    set({ currentStepIndex: nextIndex });
                }
            },
        }),
        {
            name: 'onboarding-storage',
            partialize: (state: OnboardingState) => ({ hasSeenTour: state.hasSeenTour }),
        }
    )
);
