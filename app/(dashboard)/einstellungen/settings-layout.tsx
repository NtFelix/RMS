"use client"

import { useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SettingsSidebar } from "@/components/settings/sidebar"
import type { Tab } from "@/types/settings"
import {
  User as UserIcon,
  Lock,
  CreditCard,
  DownloadCloud,
  Info,
  Monitor,
  FlaskConical,
  Mail,
} from "lucide-react"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { POSTHOG_FEATURE_FLAGS } from "@/lib/constants"

export default function SettingsSidebarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const mailsEnabled = useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.MAILS_TAB)

  const tabs = useMemo<Omit<Tab, "content">[]>(
    () => [
      { value: "profil", label: "Profil", icon: UserIcon },
      { value: "sicherheit", label: "Sicherheit", icon: Lock },
      { value: "abo", label: "Abo", icon: CreditCard },
      ...(mailsEnabled ? [{ value: "mail", label: "E-Mail", icon: Mail }] : []),
      { value: "darstellung", label: "Darstellung", icon: Monitor },
      { value: "datenexport", label: "Datenexport", icon: DownloadCloud },
      { value: "vorschau", label: "Vorschau", icon: FlaskConical },
      { value: "mietevo", label: "Mietevo", icon: Info },
    ],
    [mailsEnabled],
  )

  useEffect(() => {
    for (const tab of tabs) {
      router.prefetch(`/einstellungen/${tab.value}`)
    }
  }, [router, tabs])

  return (
    <div className="flex h-full gap-3 p-4">
      <SettingsSidebar tabs={tabs} />
      <div className="flex-1 overflow-y-auto min-w-0 p-4">{children}</div>
    </div>
  )
}
