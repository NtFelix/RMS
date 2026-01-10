"use client"

import { MietevoAccountsSection } from "@/components/settings/mietevo-accounts-section"
import { EmailConnectionsSection } from "@/components/settings/email-connections-section"

/**
 * MailSection component for managing email accounts and connections.
 * 
 * This component has been refactored into smaller, focused sub-components:
 * - MietevoAccountsSection: Manages @mietevo.de email accounts
 * - EmailConnectionsSection: Handles external email connections (Outlook, Gmail, IMAP)
 * 
 * Logic has been extracted into custom hooks:
 * - useMietevoAccounts: State and actions for Mietevo email accounts
 * - useOutlookConnection: State and actions for Outlook connection and sync
 */
const MailSection = () => {
  return (
    <div className="space-y-6">
      <MietevoAccountsSection />
      <EmailConnectionsSection />
    </div>
  )
}

export default MailSection
