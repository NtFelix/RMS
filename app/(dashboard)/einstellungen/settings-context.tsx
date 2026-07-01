"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { User } from "@supabase/supabase-js"
import type { UserProfileForSettings } from "@/app/user-profile-actions"

export interface SettingsContextData {
  email?: string
  user?: {
    email: string
    firstName: string
    lastName: string
  }
  authUser?: User
  profile?: UserProfileForSettings | null
  profileError?: boolean
}

const SettingsDataContext = createContext<SettingsContextData | null>(null)

export function SettingsDataProvider({
  data,
  children,
}: {
  data: SettingsContextData
  children: ReactNode
}) {
  return (
    <SettingsDataContext.Provider value={data}>
      {children}
    </SettingsDataContext.Provider>
  )
}

export function useSettingsData(): SettingsContextData {
  const ctx = useContext(SettingsDataContext)
  if (!ctx) {
    throw new Error("useSettingsData must be used within a <SettingsDataProvider>")
  }
  return ctx
}
