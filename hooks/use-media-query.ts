"use client"

import { useCallback, useSyncExternalStore } from "react"

// Reads the query synchronously on the client instead of in an effect. With useState + useEffect the first
// client render always saw `false`, so the dashboard rendered one frame with the desktop layout (wide sidebar,
// no mobile navigation) before settling on the real one. On the server (and while hydrating) it is still `false`.
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQuery = window.matchMedia(query)
      mediaQuery.addEventListener("change", onChange)
      return () => mediaQuery.removeEventListener("change", onChange)
    },
    [query]
  )
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
