"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  User as UserIcon,
  Lock,
  CreditCard,
  DownloadCloud,
  Info,
  Monitor,
  FlaskConical,
  Mail,
} from "lucide-react";
import { SettingsSidebar } from "../settings/sidebar"
import { useFeatureFlagEnabled } from "posthog-js/react";
import { POSTHOG_FEATURE_FLAGS } from "@/lib/constants";

// Dynamic imports for section components to improve bundle efficiency
const ProfileSection = dynamic(() => import("../settings/profile-section"), { ssr: false });
const DisplaySection = dynamic(() => import("../settings/display-section"), { ssr: false });
const SecuritySection = dynamic(() => import("../settings/security-section"), { ssr: false });
const SubscriptionSection = dynamic(() => import("../settings/subscription-section"), { ssr: false });
const ExportSection = dynamic(() => import("../settings/export-section"), { ssr: false });
const FeaturePreviewSection = dynamic(() => import("../settings/feature-preview-section"), { ssr: false });
const InformationSection = dynamic(() => import("../settings/information-section"), { ssr: false });
const MailSection = dynamic(() => import("../settings/mail-section"), { ssr: false });

type SettingsModalProps = { open: boolean; onOpenChange: (open: boolean) => void; initialTab?: string }

export function SettingsModal({ open, onOpenChange, initialTab = "profile" }: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 
        Reset activeTab via the 'key' prop on DialogContent instead of a useEffect.
        This ensures that every time the modal opens or the initialTab changes, 
        the internal state is fresh.
      */}
      <DialogContent 
        key={initialTab} 
        className="w-full h-[80vh] sm:max-w-4xl md:max-w-5xl max-h-[95vh] overflow-hidden p-0 mx-4 sm:mx-auto"
      >
        <SettingsModalContent initialTab={initialTab} />
      </DialogContent>
    </Dialog>
  )
}

function SettingsModalContent({ initialTab }: { initialTab: string }) {
  const [activeTab, setActiveTab] = useState<string>(initialTab)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false)
  const mailsEnabled = useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.MAILS_TAB)

  const tabs = [
    {
      value: "profile",
      label: "Profil",
      icon: UserIcon,
    },
    {
      value: "security",
      label: "Sicherheit",
      icon: Lock,
    },
    {
      value: "subscription",
      label: "Abo",
      icon: CreditCard,
    },
    ...(mailsEnabled ? [{
      value: "mail",
      label: "E-Mail",
      icon: Mail,
    }] : []),
    {
      value: "display",
      label: "Darstellung",
      icon: Monitor,
    },
    {
      value: "export",
      label: "Datenexport",
      icon: DownloadCloud,
    },
    {
      value: "feature-preview",
      label: "Vorschau",
      icon: FlaskConical,
    },
    {
      value: "information",
      label: "Mietevo",
      icon: Info,
    }
  ]

  // Refactor tab rendering to only instantiate the active section
  const renderActiveSection = () => {
    switch (activeTab) {
      case "profile": return <ProfileSection />
      case "security": return <SecuritySection />
      case "subscription": return <SubscriptionSection />
      case "mail": return <MailSection />
      case "display": return <DisplaySection />
      case "export": return <ExportSection />
      case "feature-preview": return <FeaturePreviewSection />
      case "information": return <InformationSection />
      default: return null
    }
  }

  return (
    <>
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
              {renderActiveSection()}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
