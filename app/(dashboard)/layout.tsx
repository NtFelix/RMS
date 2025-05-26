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
import { WohnungEditModal } from "@/components/wohnung-edit-modal" // Added
import { wohnungServerAction } from "@/app/wohnungen-actions" // Added - Adjusted path
import { AufgabeEditModal } from "@/components/aufgabe-edit-modal" // Added
import { aufgabeServerAction } from "@/app/todos-actions" // Added
// createClient is not used in this step as per instructions, but imported if needed later
// import { createClient } from "@/utils/supabase/client";

export default function DashboardRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const {
    // Tenant modal state and actions
    isTenantModalOpen,
    closeTenantModal,
    tenantInitialData,
    tenantModalWohnungen,
    openTenantModal,
    // House modal state and actions
    isHouseModalOpen,
    houseInitialData,
    houseModalOnSuccess,
    openHouseModal,
    closeHouseModal,
    // Finance modal state and actions
    isFinanceModalOpen,
    financeInitialData,
    financeModalWohnungen,
    financeModalOnSuccess,
    openFinanceModal,
    closeFinanceModal,
    // Wohnung modal state and actions
    isWohnungModalOpen,
    wohnungInitialData,
    wohnungModalHaeuser,
    wohnungModalOnSuccess,
    openWohnungModal,
    closeWohnungModal,
    // Aufgabe modal state and actions
    isAufgabeModalOpen,
    aufgabeInitialData,
    openAufgabeModal,
    closeAufgabeModal,
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
          onSuccess={(data) => {
            // Call the success callback if it exists
            if (houseModalOnSuccess) {
              houseModalOnSuccess(data);
            }
            // Close the modal
            closeHouseModal();
          }}
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
          onSuccess={(data) => {
            // Call the success callback if it exists
            if (financeModalOnSuccess) {
              financeModalOnSuccess(data);
            }
            // Close the modal
            closeFinanceModal();
          }}
        />
      )}
      {/* Wohnung Modal */}
      {isWohnungModalOpen && (
        <WohnungEditModal
          open={isWohnungModalOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) closeWohnungModal()
          }}
          initialData={wohnungInitialData}
          initialHaeuser={wohnungModalHaeuser}
          serverAction={wohnungServerAction}
          onSuccess={(data) => {
            // Call the success callback if it exists
            if (wohnungModalOnSuccess) {
              wohnungModalOnSuccess(data);
            }
            // Close the modal
            closeWohnungModal();
          }}
        />
      )}
      {/* Aufgabe Modal */}
      {isAufgabeModalOpen && (
        <AufgabeEditModal
          open={isAufgabeModalOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) closeAufgabeModal();
          }}
          initialData={aufgabeInitialData}
          serverAction={aufgabeServerAction}
        />
      )}
    </AuthProvider>
  )
}
