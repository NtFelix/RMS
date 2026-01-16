"use client" // Make this a client component
import type React from "react"
import { Suspense } from "react"
import { AuthProvider } from "@/components/auth/auth-provider"
import { EmailVerificationNotifier } from "@/components/auth/email-verification-notifier"
import { CommandMenu } from "@/components/search/command-menu"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useModalStore } from "@/hooks/use-modal-store" // Added
import dynamic from 'next/dynamic'

// Importing server action from its new location
import { handleSubmit as tenantServerAction } from "@/app/mieter-actions" // Adjusted import path
import { handleSubmit as houseServerAction } from "@/app/(dashboard)/haeuser/actions" // Added
import { financeServerAction } from "@/app/finanzen-actions" // Added - Adjusted path due to tool limitation
import { wohnungServerAction } from "@/app/wohnungen-actions" // Added - Adjusted path
import { aufgabeServerAction } from "@/app/todos-actions" // Added
import { updateKautionAction } from "@/app/mieter-actions"; // Added

// Lazy load modals
const TenantEditModal = dynamic(() => import('@/components/tenants/tenant-edit-modal').then(mod => mod.TenantEditModal), { ssr: false })
const HouseEditModal = dynamic(() => import('@/components/houses/house-edit-modal').then(mod => mod.HouseEditModal), { ssr: false })
const FinanceEditModal = dynamic(() => import('@/components/finance/finance-edit-modal').then(mod => mod.FinanceEditModal), { ssr: false })
const WohnungEditModal = dynamic(() => import('@/components/apartments/wohnung-edit-modal').then(mod => mod.WohnungEditModal), { ssr: false })
const AufgabeEditModal = dynamic(() => import('@/components/tasks/aufgabe-edit-modal').then(mod => mod.AufgabeEditModal), { ssr: false })
const BetriebskostenEditModal = dynamic(() => import('@/components/finance/betriebskosten-edit-modal').then(mod => mod.BetriebskostenEditModal), { ssr: false })
const AblesungenModal = dynamic(() => import('@/components/meters/ablesungen-modal').then(mod => mod.AblesungenModal), { ssr: false })
const ZaehlerModal = dynamic(() => import('@/components/meters/zaehler-modal').then(mod => mod.ZaehlerModal), { ssr: false })
const KautionModal = dynamic(() => import('@/components/tenants/kaution-modal').then(mod => mod.KautionModal), { ssr: false })
const HausOverviewModal = dynamic(() => import('@/components/houses/haus-overview-modal').then(mod => mod.HausOverviewModal), { ssr: false })
const WohnungOverviewModal = dynamic(() => import('@/components/apartments/wohnung-overview-modal').then(mod => mod.WohnungOverviewModal), { ssr: false })
const ApartmentTenantDetailsModal = dynamic(() => import('@/components/apartments/apartment-tenant-details-modal').then(mod => mod.ApartmentTenantDetailsModal), { ssr: false })
const FileUploadModal = dynamic(() => import('@/components/cloud-storage/file-upload-modal').then(mod => mod.FileUploadModal), { ssr: false })
const FileRenameModal = dynamic(() => import('@/components/cloud-storage/file-rename-modal').then(mod => mod.FileRenameModal), { ssr: false })
const CreateFolderModal = dynamic(() => import('@/components/cloud-storage/create-folder-modal').then(mod => mod.CreateFolderModal), { ssr: false })
const CreateFileModal = dynamic(() => import('@/components/cloud-storage/create-file-modal').then(mod => mod.CreateFileModal), { ssr: false })
const FolderDeleteConfirmationModal = dynamic(() => import('@/components/cloud-storage/folder-delete-confirmation-modal').then(mod => mod.FolderDeleteConfirmationModal), { ssr: false })
const FileMoveModal = dynamic(() => import('@/components/cloud-storage/file-move-modal').then(mod => mod.FileMoveModal), { ssr: false })
const ShareDocumentModal = dynamic(() => import('@/components/cloud-storage/share-document-modal').then(mod => mod.ShareDocumentModal), { ssr: false })
const MarkdownEditorModal = dynamic(() => import('@/components/cloud-storage/markdown-editor-modal').then(mod => mod.MarkdownEditorModal), { ssr: false })
const TemplatesModal = dynamic(() => import('@/components/templates/templates-modal').then(mod => mod.TemplatesModal), { ssr: false })
const TenantMailTemplatesModal = dynamic(() => import('@/components/tenants/tenant-mail-templates-modal').then(mod => mod.TenantMailTemplatesModal), { ssr: false })
const AIAssistantModal = dynamic(() => import('@/components/ai/ai-assistant-modal').then(mod => mod.AIAssistantModal), { ssr: false })
// Default exports
const TenantPaymentEditModal = dynamic(() => import('@/components/tenants/tenant-payment-edit-modal'), { ssr: false })
const TenantPaymentOverviewModal = dynamic(() => import('@/components/tenants/tenant-payment-overview-modal'), { ssr: false })

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"; // Added
import { GlobalDragDropProvider } from "@/components/cloud-storage/global-drag-drop-provider"; // Added
import { NestedDialogProvider } from "@/components/ui/nested-dialog"; // Added
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";

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
    // File Rename Modal state
    isFileRenameModalOpen,
    fileRenameData,
    closeFileRenameModal,
    // Create Folder Modal state
    isCreateFolderModalOpen,
    createFolderModalData,
    closeCreateFolderModal,
    // Create File Modal state
    isCreateFileModalOpen,
    createFileModalData,
    closeCreateFileModal,
    // Folder Delete Confirmation Modal state
    isFolderDeleteConfirmationModalOpen,
    folderDeleteConfirmationData,
    closeFolderDeleteConfirmationModal,
    // File Move Modal state
    isFileMoveModalOpen,
    fileMoveData,
    closeFileMoveModal,
    // Share Document Modal state
    isShareDocumentModalOpen,
    shareDocumentData,
    closeShareDocumentModal,
    // Markdown Editor Modal state
    isMarkdownEditorModalOpen,
    markdownEditorData,
    closeMarkdownEditorModal,
    // Templates Modal state
    isTemplatesModalOpen,
    templatesModalInitialCategory,
    closeTemplatesModal,
    // Tenant Mail Templates Modal state
    isTenantMailTemplatesModalOpen,
    tenantMailTemplatesModalData,
    closeTenantMailTemplatesModal,
    // AI Assistant Modal state
    isAIAssistantModalOpen,
  } = useModalStore()

  return (
    <AuthProvider>
      <NestedDialogProvider>
        {/* Cross-tab email verification notifier */}
        <Suspense fallback={null}>
          <EmailVerificationNotifier />
        </Suspense>
        {/* <GlobalDragDropProvider> */}
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
        {/* ZaehlerModal - Manages all meter types (water, gas, electricity, heat) */}
        <ZaehlerModal />
        {/* AblesungenModal - Manages meter readings for all meter types */}
        <AblesungenModal />
        {/* KautionModal - Handles kaution management */}
        <KautionModal serverAction={updateKautionAction} />
        {/* HausOverviewModal - Displays Haus overview with all Wohnungen */}
        <HausOverviewModal />
        {/* WohnungOverviewModal - Displays Wohnung overview with all Mieter */}
        <WohnungOverviewModal />
        {/* ApartmentTenantDetailsModal - Displays detailed apartment-tenant information */}
        <ApartmentTenantDetailsModal />
        {/* FileUploadModal - Global file upload modal */}
        <FileUploadModal />
        {/* FileRenameModal - Global file rename modal */}
        {isFileRenameModalOpen && fileRenameData && (
          <FileRenameModal
            isOpen={isFileRenameModalOpen}
            onClose={closeFileRenameModal}
            fileName={fileRenameData.fileName}
            onRename={fileRenameData.onRename}
          />
        )}
        {/* CreateFolderModal - Global create folder modal */}
        {isCreateFolderModalOpen && createFolderModalData && (
          <CreateFolderModal
            isOpen={isCreateFolderModalOpen}
            onClose={closeCreateFolderModal}
            currentPath={createFolderModalData.currentPath}
            onFolderCreated={createFolderModalData.onFolderCreated}
          />
        )}
        {/* CreateFileModal - Global create file modal */}
        {isCreateFileModalOpen && createFileModalData && (
          <CreateFileModal
            isOpen={isCreateFileModalOpen}
            onClose={closeCreateFileModal}
            currentPath={createFileModalData.currentPath}
            onFileCreated={createFileModalData.onFileCreated}
          />
        )}
        {/* FolderDeleteConfirmationModal - Global folder delete confirmation modal */}
        {isFolderDeleteConfirmationModalOpen && folderDeleteConfirmationData && (
          <FolderDeleteConfirmationModal
            isOpen={isFolderDeleteConfirmationModalOpen}
            onClose={closeFolderDeleteConfirmationModal}
            folderName={folderDeleteConfirmationData.folderName}
            folderPath={folderDeleteConfirmationData.folderPath}
            fileCount={folderDeleteConfirmationData.fileCount}
            onConfirm={folderDeleteConfirmationData.onConfirm}
          />
        )}
        {/* FileMoveModal - Global file/folder move modal */}
        {isFileMoveModalOpen && fileMoveData && (
          <FileMoveModal
            isOpen={isFileMoveModalOpen}
            onClose={closeFileMoveModal}
            item={fileMoveData.item}
            itemType={fileMoveData.itemType}
            currentPath={fileMoveData.currentPath}
            userId={fileMoveData.userId}
            onMove={fileMoveData.onMove}
          />
        )}
        {/* ShareDocumentModal - Global document sharing modal */}
        {isShareDocumentModalOpen && shareDocumentData && (
          <ShareDocumentModal
            isOpen={isShareDocumentModalOpen}
            onClose={closeShareDocumentModal}
            fileName={shareDocumentData.fileName}
            filePath={shareDocumentData.filePath}
          />
        )}
        {/* MarkdownEditorModal - Global markdown editor modal */}
        {isMarkdownEditorModalOpen && markdownEditorData && (
          <MarkdownEditorModal
            isOpen={isMarkdownEditorModalOpen}
            onClose={closeMarkdownEditorModal}
            filePath={markdownEditorData.filePath}
            fileName={markdownEditorData.fileName}
            initialContent={markdownEditorData.initialContent}
            isNewFile={markdownEditorData.isNewFile}
            onSave={markdownEditorData.onSave}
          />
        )}
        {/* TemplatesModal - Global templates management modal */}
        <TemplatesModal
          isOpen={isTemplatesModalOpen}
          onClose={closeTemplatesModal}
          initialCategory={templatesModalInitialCategory}
        />
        {/* TenantMailTemplatesModal - Read-only mail templates for tenants */}
        <TenantMailTemplatesModal
          isOpen={isTenantMailTemplatesModalOpen}
          onClose={closeTenantMailTemplatesModal}
          tenantName={tenantMailTemplatesModalData?.tenantName}
          tenantEmail={tenantMailTemplatesModalData?.tenantEmail}
        />
        {/* AI Assistant Modal - Global AI assistant modal */}
        <AIAssistantModal />
        {/* Tenant Payment Edit Modal */}
        <TenantPaymentEditModal />
        {/* Tenant Payment Overview Modal */}
        <TenantPaymentOverviewModal />
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
            variant={confirmationModalConfig.variant}
          />
        )}
        {/* </GlobalDragDropProvider> */}
      </NestedDialogProvider>
      <OnboardingTour />
    </AuthProvider>
  )
}
