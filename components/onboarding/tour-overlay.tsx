"use client"

import { useEffect, useState, useRef } from "react"
import { useOnboardingStore } from "./store"
import { ONBOARDING_STEPS } from "./steps"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { completeOnboarding } from "@/app/user-profile-actions"

export function TourOverlay() {
  const {
    isOpen,
    currentStepIndex,
    nextStep,
    prevStep,
    stopTour,
    setHasCompletedOnboarding
  } = useOnboardingStore()

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const pathname = usePathname()
  const step = ONBOARDING_STEPS[currentStepIndex]
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Find target element
  useEffect(() => {
    if (!isOpen || !step) return

    const findTarget = () => {
      const element = document.getElementById(step.targetId)
      if (element) {
        const rect = element.getBoundingClientRect()
        // Only update if changed significantly to avoid jitter
        setTargetRect(prev => {
          if (!prev) return rect
          if (Math.abs(prev.x - rect.x) > 2 || Math.abs(prev.y - rect.y) > 2 ||
              Math.abs(prev.width - rect.width) > 2 || Math.abs(prev.height - rect.height) > 2) {
            return rect
          }
          return prev
        })
      } else {
        // If element not found, set rect to null (will show generic positioning)
        setTargetRect(null)
      }
    }

    findTarget()
    // Poll for position changes (animations, layout shifts)
    updateIntervalRef.current = setInterval(findTarget, 500)

    // Also listen to resize/scroll
    window.addEventListener("resize", findTarget)
    window.addEventListener("scroll", findTarget, true)

    return () => {
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current)
      window.removeEventListener("resize", findTarget)
      window.removeEventListener("scroll", findTarget, true)
    }
  }, [isOpen, step, currentStepIndex, pathname])

  // Don't render on server
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || !isOpen || !step) return null

  // Calculate Popover Position
  const popoverStyle: React.CSSProperties = {}
  if (targetRect) {
    // Basic positioning logic (prefer bottom, fallback to top)
    const spaceBelow = window.innerHeight - targetRect.bottom
    const placement = step.placement || (spaceBelow > 200 ? "bottom" : "top")

    if (placement === "bottom") {
      popoverStyle.top = targetRect.bottom + 12
      popoverStyle.left = targetRect.left + (targetRect.width / 2) - 160 // Center 320px width
    } else if (placement === "top") {
      popoverStyle.bottom = window.innerHeight - targetRect.top + 12
      popoverStyle.left = targetRect.left + (targetRect.width / 2) - 160
    }

    // Boundary checks
    // Check right edge
    if (targetRect.left + 160 > window.innerWidth) {
        popoverStyle.left = window.innerWidth - 330
    }
    // Check left edge
    if (Number(popoverStyle.left) < 10) popoverStyle.left = 10
  } else {
    // If target not found, show centered or bottom right
    popoverStyle.bottom = 20
    popoverStyle.right = 20
    popoverStyle.position = 'fixed'
  }

  const handleFinish = async () => {
    stopTour()
    setHasCompletedOnboarding(true)
    await completeOnboarding()
  }

  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1

  return createPortal(
    <AnimatePresence>
      {/* Target Highlight Ring */}
      {targetRect && (
        <motion.div
          key={`highlight-${step.id}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: "8px",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.5), 0 0 0 4px #7944FF",
            zIndex: 9998,
            pointerEvents: "none"
          }}
        />
      )}

      {/* Popover */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        key={`popover-${step.id}`}
        className="fixed z-[9999]"
        style={targetRect ? popoverStyle : { bottom: 24, right: 24 }}
      >
        <Card className="w-[320px] shadow-xl border-primary/20 bg-background rounded-3xl">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-start justify-between space-y-0">
            <CardTitle className="text-base font-semibold text-primary">
              {step.title}
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 -mr-2 -mt-2" onClick={stopTour}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-sm text-muted-foreground">
              {step.description}
            </p>
          </CardContent>
          <CardFooter className="px-4 pb-4 flex justify-between">
            <div className="flex gap-1">
              {currentStepIndex > 0 && (
                <Button variant="outline" size="sm" onClick={prevStep}>
                  Zurück
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <span className="text-xs text-muted-foreground self-center mr-2">
                {currentStepIndex + 1} / {ONBOARDING_STEPS.length}
              </span>
              {!step.waitForAction && (
                <Button size="sm" onClick={isLastStep ? handleFinish : nextStep}>
                  {isLastStep ? "Beenden" : "Weiter"}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
