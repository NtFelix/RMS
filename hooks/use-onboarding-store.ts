
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
                set({ isActive: false });
            },

            resetTour: () => {
                set({ isActive: true, currentStepIndex: 0, hasSeenTour: true });
            },

            skipTour: () => {
                set({ isActive: false, hasSeenTour: true });
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
                } else {
                    set({ currentStepIndex: nextIndex });
                }
            },
        }),
        {
            name: 'onboarding-storage',
            partialize: (state: OnboardingState) => ({ hasSeenTour: state.hasSeenTour }), // Only persist hasSeenTour
        }
    )
);
