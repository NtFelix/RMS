"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import type { User } from "@supabase/supabase-js"
import posthog from "posthog-js"
import { resetSupportIdentity } from "@/lib/posthog-support"

type AuthContextType = {
  user: User | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setIsLoading(false)
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setUser(session.user)
        router.refresh()
      } else if (event === "SIGNED_OUT") {
        // Drop the previous user's support identity/widget session so the next login starts clean.
        resetSupportIdentity(posthog)
        setUser(null)
        router.refresh()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>
}
