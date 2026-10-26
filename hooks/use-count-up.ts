"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

// Layout effect on the client so the reduced-motion shortcut lands before the first paint (no flash of 0).
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

interface CountUpOptions {
  /** Animation length in ms. */
  duration?: number
  /** While false nothing runs and the hook rests at 0, so the count starts when the value is first shown. */
  enabled?: boolean
}

// Counts from the last displayed value to `target`: from 0 when the number first appears (page switch, the
// skeleton is replaced), from the old value when it changes later (a filter, a tab). The first render is
// 0 on server and client alike, which keeps hydration stable; users who prefer reduced motion get the final
// value straight away.
export function useCountUp(target: number, { duration = 900, enabled = true }: CountUpOptions = {}): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useIsomorphicLayoutEffect(() => {
    if (!enabled) {
      fromRef.current = 0
      setValue(0)
      return
    }

    const from = fromRef.current
    if (from === target || duration <= 0 || prefersReducedMotion()) {
      fromRef.current = target
      setValue(target)
      return
    }

    let frame = 0
    let startedAt: number | null = null
    const tick = (now: number) => {
      startedAt ??= now
      const progress = Math.min((now - startedAt) / duration, 1)
      const next = progress === 1 ? target : from + (target - from) * easeOutCubic(progress)
      fromRef.current = next
      setValue(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, enabled, duration])

  return value
}
