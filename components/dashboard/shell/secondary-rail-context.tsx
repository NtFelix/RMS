"use client"

import { useCallback, useContext, useMemo, useState } from "react"
import {
  NO_SHELL,
  SecondaryRailContext,
  type SecondaryRailContextValue,
} from "./secondary-rail-context-value"

export function SecondaryRailProvider({ children }: { children: React.ReactNode }) {
  const [hostNode, setHostNode] = useState<HTMLElement | null>(null)
  const [railCount, setRailCount] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const registerRail = useCallback(() => {
    setRailCount((count) => count + 1)
    return () => setRailCount((count) => count - 1)
  }, [])

  const value = useMemo<SecondaryRailContextValue>(
    () => ({ hostNode, setHostNode, hasRail: railCount > 0, registerRail, drawerOpen, setDrawerOpen }),
    [hostNode, railCount, registerRail, drawerOpen],
  )

  return <SecondaryRailContext.Provider value={value}>{children}</SecondaryRailContext.Provider>
}

/** The shell context, or null outside of a SecondaryRailProvider. */
export function useOptionalSecondaryRail() {
  return useContext(SecondaryRailContext)
}

export function useSecondaryRail(): SecondaryRailContextValue {
  return useContext(SecondaryRailContext) ?? NO_SHELL
}
