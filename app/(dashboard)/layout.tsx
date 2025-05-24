"use client" // Make this a client component

import type React from "react"
import { AuthProvider } from "@/components/auth-provider"
import { CommandMenu } from "@/components/command-menu"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useModalStore } from "@/hooks/use-modal-store" // Added
import { TenantEditModal } from "@/components/tenant-edit-modal" // Added
// Importing server action from its new location
import { handleSubmit as tenantServerAction } from "@/app/mieter-actions" // Adjusted import path
import { HouseEditModal } from "@/components/house-edit-modal" // Added
import { handleSubmit as houseServerAction } from "@/app/(dashboard)/haeuser/actions" // Added
import { FinanceEditModal } from "@/components/finance-edit-modal" // Added
import { financeServerAction } from "@/app/finanzen-actions" // Added - Adjusted path due to tool limitation
// createClient is not used in this step as per instructions, but imported if needed later
// import { createClient } from "@/utils/supabase/client";

export default function DashboardRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const {
    isTenantModalOpen,
    closeTenantModal,
    tenantInitialData,
    tenantModalWohnungen,
    // House modal state and actions
    isHouseModalOpen,
    closeHouseModal,
    houseInitialData,
    // Finance modal state and actions
    isFinanceModalOpen,
    closeFinanceModal,
    financeInitialData,
    financeModalWohnungen,
  } = useModalStore()

  return (
    <AuthProvider>
      <CommandMenu />
      <DashboardLayout>{children}</DashboardLayout>
      {/* Tenant Modal */}
      {isTenantModalOpen && (
        <TenantEditModal
          open={isTenantModalOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) closeTenantModal()
          }}
          wohnungen={tenantModalWohnungen}
          initialData={tenantInitialData}
          serverAction={tenantServerAction}
        />
      )}
      {/* House Modal */}
      {isHouseModalOpen && (
        <HouseEditModal
          open={isHouseModalOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) closeHouseModal()
          }}
          initialData={houseInitialData}
          serverAction={houseServerAction}
        />
      )}
      {/* Finance Modal */}
      {isFinanceModalOpen && (
        <FinanceEditModal
          open={isFinanceModalOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) closeFinanceModal()
          }}
          initialData={financeInitialData}
          initialWohnungen={financeModalWohnungen}
          serverAction={financeServerAction}
        />
      )}
    </AuthProvider>
  )
}
