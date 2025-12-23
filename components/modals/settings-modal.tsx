"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  User as UserIcon,
  Lock,
  CreditCard,
  DownloadCloud,
  Info,
  Monitor,
  FlaskConical,
} from "lucide-react";
import { SettingsSidebar } from "../settings/sidebar"
import type { Tab } from "@/types/settings"
import ProfileSection from "../settings/profile-section";
import DisplaySection from "../settings/display-section";
import SecuritySection from "../settings/security-section";
import SubscriptionSection from "../settings/subscription-section";
import ExportSection from "../settings/export-section";
import FeaturePreviewSection from "../settings/feature-preview-section";
import InformationSection from "../settings/information-section";

type SettingsModalProps = { open: boolean; onOpenChange: (open: boolean) => void }

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<string>("profile")
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false)

  const tabs: Tab[] = [
    {
      value: "profile",
      label: "Profil",
      icon: UserIcon,
      content: <ProfileSection />,
    },
    {
      value: "security",
      label: "Sicherheit",
      icon: Lock,
      content: <SecuritySection />,
    },
    {
      value: "subscription",
      label: "Abo",
      icon: CreditCard,
      content: <SubscriptionSection />,
    },
    {
      value: "display",
      label: "Darstellung",
      icon: Monitor,
      content: <DisplaySection />,
    },
    {
      value: "export",
      label: "Datenexport",
      icon: DownloadCloud,
      content: <ExportSection />,
    },
    {
      value: "feature-preview",
      label: "Vorschau",
      icon: FlaskConical,
      content: <FeaturePreviewSection />,
    },
    {
      value: "information",
      label: "Mietevo",
      icon: Info,
      content: <InformationSection />,
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-[80vh] max-w-5xl max-h-[95vh] overflow-hidden p-0 mx-4 sm:mx-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Einstellungen</DialogTitle>
          <DialogDescription>Benutzereinstellungen und Kontoverwaltung.</DialogDescription>
        </DialogHeader>

        <div className="flex h-full overflow-hidden">
          <SettingsSidebar
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="w-full max-w-none p-4 sm:p-6">
                {tabs.find(tab => tab.value === activeTab)?.content}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
