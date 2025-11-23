import { create } from 'zustand'

export interface TourStep {
  id: string
  targetId: string // The DOM ID to attach to
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  route?: string // If set, ensure we are on this route
  action?: 'click' | 'type' | 'wait' // Hint for the user
  waitForAction?: boolean // If true, the tour won't advance until the user performs the action (managed by external hooks)
}

interface OnboardingState {
  isOpen: boolean
  currentStepIndex: number
  hasCompletedOnboarding: boolean
  isLoading: boolean

  startTour: () => void
  stopTour: () => void
  nextStep: () => void
  prevStep: () => void
  setStep: (index: number) => void
  setHasCompletedOnboarding: (status: boolean) => void
  setIsLoading: (loading: boolean) => void
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  isOpen: false,
  currentStepIndex: 0,
  hasCompletedOnboarding: false,
  isLoading: true, // Start loading until we check the DB

  startTour: () => set({ isOpen: true, currentStepIndex: 0 }),
  stopTour: () => set({ isOpen: false }),
  nextStep: () => set((state) => ({ currentStepIndex: state.currentStepIndex + 1 })),
  prevStep: () => set((state) => ({ currentStepIndex: Math.max(0, state.currentStepIndex - 1) })),
  setStep: (index) => set({ currentStepIndex: index }),
  setHasCompletedOnboarding: (status) => set({ hasCompletedOnboarding: status }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}))
