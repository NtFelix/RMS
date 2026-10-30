"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

// Layout effect on the client so the reduced-motion shortcut lands before the first paint (no flash of 0).
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

// Cards that already counted up once in this browser session (survives client-side navigation, not a reload).
const countedUp = new Set<string>()

const FIRST_DURATION = 900
const REPEAT_DURATION = 450

interface CountUpOptions {
  /** Animation length in ms. Defaults to 900, or 450 when `memoryKey` has already counted up before. */
  duration?: number
  /** Identifies the number across mounts; coming back to a page or tab then counts up faster. */
  memoryKey?: string
  /** While false nothing runs and the hook rests at 0, so the count starts when the value is first shown. */
  enabled?: boolean
}

// Counts from the last displayed value to `target`: from 0 when the number first appears (page switch), from
// the old value when it changes later. The first render is 0 on server and client alike (stable hydration);
// reduced motion jumps to the final value. A `memoryKey` that already counted up once counts twice as fast.
// Without a numeric `target` nothing runs and the hook returns 0.
export function useCountUp(
  target: number | undefined,
  { duration, memoryKey, enabled = true }: CountUpOptions = {}
): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useIsomorphicLayoutEffect(() => {
    if (!enabled || target === undefined) {
      fromRef.current = 0
      setValue(0)
      return
    }

    const from = fromRef.current
    const length = duration ?? (memoryKey && countedUp.has(memoryKey) ? REPEAT_DURATION : FIRST_DURATION)
    if (from === target || length <= 0 || prefersReducedMotion()) {
      fromRef.current = target
      setValue(target)
      return
    }

    let frame = 0
    let startedAt: number | null = null
    const tick = (now: number) => {
      startedAt ??= now
      const progress = Math.min((now - startedAt) / length, 1)
      const next = progress === 1 ? target : from + (target - from) * easeOutCubic(progress)
      fromRef.current = next
      setValue(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
      else if (memoryKey) countedUp.add(memoryKey)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, enabled, duration, memoryKey])

  return value
}
