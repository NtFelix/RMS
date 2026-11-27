"use client"

import { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from "react"
import { NO_SHELL, SecondaryRailContext, type SecondaryRailContextValue } from "./secondary-rail-context-value"

export function SecondaryRailProvider({ children }: { children: React.ReactNode }) {
  const [hostNode, setHostNode] = useState<HTMLElement | null>(null)
  const [railCount, setRailCount] = useState(0)
  const [hold, setHold] = useState({ count: 0, keepVisible: false })
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Visibility of the column as last rendered. When a navigation hides the old page (its rail unregisters) and only
  // the generic loading state of the route group can be shown yet (route not prefetched), the hold keeps the column
  // as it was; it then changes together with the new page in one step instead of collapsing and reopening, which
  // would shift the whole main area by the rail width. Read only in registerHold (an effect), never during render.
  const lastHasRail = useRef(false)

  const registerRail = useCallback(() => {
    setRailCount((count) => count + 1)
    return () => setRailCount((count) => count - 1)
  }, [])

  const registerHold = useCallback(() => {
    // Runs in the hold's layout effect, before the shell's own layout effect updates lastHasRail: it still holds
    // the visibility from before this navigation.
    const keepVisible = lastHasRail.current
    setHold((h) => ({ count: h.count + 1, keepVisible: h.count === 0 ? keepVisible : h.keepVisible }))
    return () => setHold((h) => ({ count: h.count - 1, keepVisible: h.count > 1 && h.keepVisible }))
  }, [])

  const hasRail = railCount > 0 || (hold.count > 0 && hold.keepVisible)

  useLayoutEffect(() => {
    lastHasRail.current = hasRail
  })

  const value = useMemo<SecondaryRailContextValue>(
    () => ({ hostNode, setHostNode, hasRail, registerRail, registerHold, drawerOpen, setDrawerOpen }),
    [hostNode, hasRail, registerRail, registerHold, drawerOpen],
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
