"use client"

import { useEffect } from "react"
import { useOnboardingStore } from "./store"
import { getUserProfileForSettings } from "@/app/user-profile-actions"

export function OnboardingInitializer() {
  const {
    setHasCompletedOnboarding,
    startTour,
    setIsLoading,
    hasCompletedOnboarding
  } = useOnboardingStore()

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const profile = await getUserProfileForSettings()
        if ('error' in profile) {
          console.error("Error fetching profile for onboarding:", profile.error)
          setIsLoading(false)
          return
        }

        const completed = !!profile.onboarding_completed
        setHasCompletedOnboarding(completed)

        if (!completed) {
            startTour()
        }
      } catch (error) {
        console.error("Failed to initialize onboarding:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [setHasCompletedOnboarding, startTour, setIsLoading])

  return null
}
