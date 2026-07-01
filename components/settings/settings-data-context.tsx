"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { getUserProfileForSettings, getBillingAddress } from "@/app/user-profile-actions"
import type { UserProfileWithSubscription } from "@/types/user"

interface SettingsDataContextType {
  profile: UserProfileWithSubscription | null
  billingAddress: any
  isLoading: boolean
  isBillingLoading: boolean
  refreshData: () => Promise<void>
}

const SettingsDataContext = createContext<SettingsDataContextType | undefined>(undefined)

export function SettingsDataProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfileWithSubscription | null>(null)
  const [billingAddress, setBillingAddress] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBillingLoading, setIsBillingLoading] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const userProfileData = await getUserProfileForSettings()
      if (userProfileData && !('error' in userProfileData)) {
        const prof = userProfileData as UserProfileWithSubscription
        setProfile(prof)
        
        // Fetch billing address once profile is resolved
        if (prof.stripe_customer_id) {
          setIsBillingLoading(true)
          try {
            const billing = await getBillingAddress(prof.stripe_customer_id)
            if (billing && !('error' in billing)) {
              setBillingAddress(billing)
            }
          } catch (billingErr) {
            console.error("Error loading billing address:", billingErr)
          } finally {
            setIsBillingLoading(false)
          }
        }
      }
    } catch (err) {
      console.error("Error loading settings data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <SettingsDataContext.Provider
      value={{
        profile,
        billingAddress,
        isLoading,
        isBillingLoading,
        refreshData: loadData,
      }}
    >
      {children}
    </SettingsDataContext.Provider>
  )
}

export const useSettingsData = () => {
  const context = useContext(SettingsDataContext)
  if (!context) {
    throw new Error("useSettingsData must be used within SettingsDataProvider")
  }
  return context
}
