"use client"

import { useMemo } from "react"
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
  Brain,
  Key,
  Bot,
} from "lucide-react"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { POSTHOG_FEATURE_FLAGS } from "@/lib/constants"

interface SettingsLayoutClientProps {
  children: React.ReactNode
  apiZugriffAktiviert?: boolean
  canManageOrg?: boolean
}

export function SettingsLayoutClient({
  children,
  apiZugriffAktiviert = false,
  canManageOrg = false,
}: SettingsLayoutClientProps) {
  const mailsEnabled = useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.MAILS_TAB)
  const aiAgentEnabled = useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.MIETEVO_AI_AGENT)

  const tabs = useMemo<Omit<Tab, "content">[]>(
    () => [
      { value: "profil", label: "Profil", icon: UserIcon, group: "Konto" },
      { value: "sicherheit", label: "Sicherheit", icon: Lock, group: "Konto" },
      { value: "abo", label: "Abo", icon: CreditCard, group: "Konto" },
      ...(mailsEnabled ? [{ value: "mail", label: "E-Mail", icon: Mail, group: "Konto" }] : []),
      { value: "darstellung", label: "Darstellung", icon: Monitor, group: "Konto" },
      { value: "datenexport", label: "Datenexport", icon: DownloadCloud, group: "Konto" },
      { value: "vorschau", label: "Vorschau", icon: FlaskConical, group: "Konto" },
      ...(aiAgentEnabled ? [{ value: "ki", label: "KI", icon: Brain, group: "Konto" }] : []),
      { value: "mietevo", label: "Mietevo", icon: Info, group: "Konto" },
      ...(canManageOrg && apiZugriffAktiviert ? [{ value: "api-keys", label: "API-Keys", icon: Key, group: "Organisation" }] : []),
      ...(canManageOrg ? [{ value: "mcp", label: "MCP-Server", icon: Bot, group: "Organisation" }] : []),
    ],
    [mailsEnabled, aiAgentEnabled, apiZugriffAktiviert, canManageOrg],
  )

  return (
    <div className="flex h-full gap-3 p-4">
      <SettingsSidebar tabs={tabs} />
      <div className="flex-1 overflow-y-auto min-w-0 p-4">
        {children}
      </div>
    </div>
  )
}
