"use client"

import dynamic from "next/dynamic"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { POSTHOG_FEATURE_FLAGS } from "@/lib/constants"
import { SupportButton } from "@/components/support/support-button"

const SupportPanel = dynamic(
  () => import("@/components/support/support-panel").then((mod) => mod.SupportPanel),
  { ssr: false },
)

export function SupportLauncher() {
  const supportEnabled = useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.SUPPORT_BUTTON)

  if (!supportEnabled) {
    return null
  }

  return (
    <>
      <div className="fixed bottom-24 right-4 z-40 md:bottom-6 md:right-6">
        <SupportButton />
      </div>
      <SupportPanel />
    </>
  )
}

