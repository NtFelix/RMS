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
import { BetriebskostenEditModal } from "@/components/betriebskosten-edit-modal"; // Added
import { WasserzaehlerModal } from "@/components/wasserzaehler-modal"; // Added
import { KautionModal } from "@/components/kaution-modal"; // Added
// Assuming betriebskosten-actions.ts exports server actions, adjust if needed
// For now, let's assume no specific serverAction prop is needed for BetriebskostenEditModal
// as it seemed to handle its actions internally or via imported functions.
// We will check this during integration.
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"; // Added

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
    // Additions for Wohnung modal props
    wohnungApartmentLimit,
    wohnungIsActiveSubscription,
    wohnungApartmentCount, // Added
    // Aufgabe modal state and actions
    isAufgabeModalOpen,
    // ... (aufgabeInitialData, aufgabeModalOnSuccess are used internally by AufgabeEditModal)
    // closeAufgabeModal, // Also internal
    // openAufgabeModal, // Used by other components to open
    // Betriebskosten modal state (only need isBetriebskostenModalOpen for conditional rendering if any)
    isBetriebskostenModalOpen,
    // Confirmation Modal state
    isConfirmationModalOpen,
    confirmationModalConfig,
    closeConfirmationModal,
  } = useModalStore()

  return (
    <AuthProvider>
      <CommandMenu />
      <DashboardLayout>{children}</DashboardLayout>

      {/* Render modals: They control their own open/close state via the store */}
      {/* TenantEditModal needs serverAction. Other props are from store. */}
      <TenantEditModal serverAction={tenantServerAction} />

      {/* HouseEditModal needs serverAction. */}
      <HouseEditModal serverAction={houseServerAction} />

      {/* FinanceEditModal needs serverAction. */}
      <FinanceEditModal serverAction={financeServerAction} />

      {/* WohnungEditModal needs serverAction. */}
      {/* Also pass specific props if they are not part of the store's initialData object for wohnung */}
      <WohnungEditModal
        serverAction={wohnungServerAction}
        currentApartmentLimitFromProps={wohnungApartmentLimit}
        isActiveSubscriptionFromProps={wohnungIsActiveSubscription}
        currentApartmentCountFromProps={wohnungApartmentCount}
      />

      {/* AufgabeEditModal needs serverAction. */}
      <AufgabeEditModal serverAction={aufgabeServerAction} />

      {/* BetriebskostenEditModal - Assuming it handles its own server actions internally or doesn't need a generic one passed */}
      <BetriebskostenEditModal />

      {/* WasserzaehlerModal - Handles its own state via modal store */}
      <WasserzaehlerModal />

      {/* KautionModal - Handles its own state via modal store */}
      <KautionModal />

      {/* Global Confirmation Dialog */}
      {isConfirmationModalOpen && confirmationModalConfig && (
        <ConfirmationDialog
          isOpen={isConfirmationModalOpen}
          onClose={closeConfirmationModal}
          onConfirm={() => {
            if (confirmationModalConfig.onConfirm) {
              confirmationModalConfig.onConfirm();
            }
            // closeConfirmationModal(); // onConfirm in store should handle this
          }}
          title={confirmationModalConfig.title}
          description={confirmationModalConfig.description}
          confirmText={confirmationModalConfig.confirmText}
          cancelText={confirmationModalConfig.cancelText}
        />
      )}
    </AuthProvider>
  )
}
