"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import type { User } from "@supabase/supabase-js"
import {
  CustomDropdown,
  CustomDropdownItem,
  CustomDropdownLabel,
  CustomDropdownSeparator,
} from "@/components/ui/custom-dropdown"
import { Button } from "@/components/ui/button"
import { LogOut, Settings, FileText } from "lucide-react"
import { SettingsModal } from "@/components/settings-modal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { useModalStore } from "@/hooks/use-modal-store"
import { ARIA_LABELS, KEYBOARD_SHORTCUTS } from "@/lib/accessibility-constants"
import { useFeatureFlagEnabled } from "posthog-js/react"

export function UserSettings() {
  const router = useRouter()
  const [isLoadingLogout, setIsLoadingLogout] = useState(false)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [userName, setUserName] = useState("Lade...")
  const [userEmail, setUserEmail] = useState("")
  const [userInitials, setUserInitials] = useState("")
  const [apartmentCount, setApartmentCount] = useState(0)
  const [apartmentLimit, setApartmentLimit] = useState<number | null>(null)
  const supabase = createClient()
  const { openTemplatesModal } = useModalStore()
  const templateModalEnabled = useFeatureFlagEnabled('template-modal-enabled')

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoadingUser(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        console.error("Error fetching user:", authError?.message)
        setUserName("Nutzer")
        setUserEmail("Nicht angemeldet")
        setUserInitials("N")
        setIsLoadingUser(false)
        return
      }

      setUserEmail(user.email || "Keine E-Mail")

      const { first_name: rawFirstName, last_name: rawLastName } = user.user_metadata || {}

      const firstName = (typeof rawFirstName === 'string' ? rawFirstName.trim() : '')
      const lastName = (typeof rawLastName === 'string' ? rawLastName.trim() : '')

      if (firstName && lastName) {
        const fullName = `${firstName} ${lastName}`
        setUserName(fullName)
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
        setUserInitials(initials)
      } else if (firstName) {
        setUserName(firstName)
        setUserInitials(firstName.charAt(0).toUpperCase())
      } else {
        setUserName("Namen in Einstellungen festlegen")
        setUserInitials("?")
      }

      // Fetch apartment count directly from Supabase
      try {
        const { count, error: countError } = await supabase
          .from('Wohnungen')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        if (!countError && count !== null) {
          setApartmentCount(count)
        }
      } catch (error) {
        console.error("Error fetching apartment count:", error)
      }

      // Fetch apartment limit from profile and plan details
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('stripe_subscription_status, stripe_price_id')
          .eq('id', user.id)
          .single()

        if (profile) {
          const isTrialActive = profile.stripe_subscription_status === 'trialing'
          
          if (isTrialActive) {
            setApartmentLimit(5)
          } else if (profile.stripe_subscription_status === 'active' && profile.stripe_price_id) {
            try {
              // Fetch plan details from API route
              const response = await fetch('/api/stripe/plans')
              if (response.ok) {
                const plans = await response.json()
                const currentPlan = plans.find((plan: any) => plan.priceId === profile.stripe_price_id)
                
                if (currentPlan) {
                  if (currentPlan.limit_wohnungen === undefined || currentPlan.limit_wohnungen === null || currentPlan.limit_wohnungen <= 0) {
                    setApartmentLimit(null) // Unlimited
                  } else {
                    setApartmentLimit(currentPlan.limit_wohnungen)
                  }
                }
              }
            } catch (error) {
              console.error("Error fetching plan details:", error)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
      }

      setIsLoadingUser(false)
    }

    fetchUserData()
  }, [])

  const handleLogout = async () => {
    setIsLoadingLogout(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      router.push("/auth/login")
    } catch (error) {
      console.error("Error signing out:", error)
      setIsLoadingLogout(false)
    }
  }

  const progressPercentage = apartmentLimit ? Math.min((apartmentCount / apartmentLimit) * 100, 100) : 0

  return (
    <>
      <CustomDropdown
        align="end"
        className="w-56"
        trigger={
          <div
            className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white hover:text-gray-900 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md dark:hover:bg-gray-800 dark:hover:text-gray-100"
            aria-label="User menu"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={"/placeholder-user.jpg"} alt={userName} />
              <AvatarFallback className="bg-accent text-accent-foreground">{isLoadingUser ? "" : userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 text-left min-w-0">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {isLoadingUser ? "Lade..." : userName}
              </span>
              {!isLoadingUser && apartmentLimit !== null && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{apartmentCount} / {apartmentLimit} Wohnungen</span>
                  </div>
                  <Progress 
                    value={progressPercentage} 
                    className="h-1.5 bg-gray-200 dark:bg-gray-700 [&>div]:bg-accent" 
                  />
                </div>
              )}
              {!isLoadingUser && apartmentLimit === null && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Unbegrenzte Wohnungen
                </span>
              )}
            </div>
          </div>
        }
      >
        <CustomDropdownLabel>Mein Konto</CustomDropdownLabel>
        <CustomDropdownSeparator />
        {templateModalEnabled && (
          <CustomDropdownItem 
            onClick={() => openTemplatesModal()}
            aria-label={ARIA_LABELS.templatesModal}
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>Vorlagen</span>
          </CustomDropdownItem>
        )}
        <CustomDropdownItem onClick={() => setOpenModal(true)}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Einstellungen</span>
        </CustomDropdownItem>
        <CustomDropdownSeparator />
        <CustomDropdownItem 
          onClick={handleLogout} 
          disabled={isLoadingLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoadingLogout ? "Wird abgemeldet..." : "Abmelden"}</span>
        </CustomDropdownItem>
      </CustomDropdown>
      <SettingsModal open={openModal} onOpenChange={setOpenModal} />
    </>
  )
}
