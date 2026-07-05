"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { getUserProfileForSettings, getBillingAddress } from "@/app/user-profile-actions"
import type { UserProfileWithSubscription } from "@/types/user"
import type { BillingAddress } from "@/app/user-billing-actions"

interface SettingsDataContextType {
  profile: UserProfileWithSubscription | null
  billingAddress: BillingAddress | null
  isLoading: boolean
  isBillingLoading: boolean
  refreshData: () => Promise<void>
}

const SettingsDataContext = createContext<SettingsDataContextType | undefined>(undefined)

export function SettingsDataProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfileWithSubscription | null>(null)
  const [billingAddress, setBillingAddress] = useState<BillingAddress | null>(null)
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
            } else {
              setBillingAddress(null)
            }
          } catch (billingErr) {
            console.error("Error loading billing address:", billingErr)
            setBillingAddress(null)
          } finally {
            setIsBillingLoading(false)
          }
        } else {
          setBillingAddress(null)
        }
      } else {
        setProfile(null)
        setBillingAddress(null)
      }
    } catch (err) {
      console.error("Error loading settings data:", err)
      setProfile(null)
      setBillingAddress(null)
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
