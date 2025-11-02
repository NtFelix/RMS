"use client" // Make this a client component
import type React from "react"
import dynamic from "next/dynamic"
import { AuthProvider } from "@/components/auth-provider"
import { CommandMenu } from "@/components/command-menu"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useModalStore } from "@/hooks/use-modal-store" // Added
// Importing server action from its new location
import { handleSubmit as tenantServerAction } from "@/app/mieter-actions" // Adjusted import path
import { handleSubmit as houseServerAction } from "@/app/(dashboard)/haeuser/actions" // Added
import { financeServerAction } from "@/app/finanzen-actions" // Added - Adjusted path due to tool limitation
import { wohnungServerAction } from "@/app/wohnungen-actions" // Added - Adjusted path
import { aufgabeServerAction } from "@/app/todos-actions" // Added
import { updateKautionAction } from "@/app/mieter-actions"; // Added
import { NestedDialogProvider } from "@/components/ui/nested-dialog"; // Added

// Dynamic imports for modals (loaded only when needed)
const TenantEditModal = dynamic(() => import("@/components/tenant-edit-modal").then(mod => ({ default: mod.TenantEditModal })), { ssr: false })
const HouseEditModal = dynamic(() => import("@/components/house-edit-modal").then(mod => ({ default: mod.HouseEditModal })), { ssr: false })
const FinanceEditModal = dynamic(() => import("@/components/finance-edit-modal").then(mod => ({ default: mod.FinanceEditModal })), { ssr: false })
const WohnungEditModal = dynamic(() => import("@/components/wohnung-edit-modal").then(mod => ({ default: mod.WohnungEditModal })), { ssr: false })
const AufgabeEditModal = dynamic(() => import("@/components/aufgabe-edit-modal").then(mod => ({ default: mod.AufgabeEditModal })), { ssr: false })
const BetriebskostenEditModal = dynamic(() => import("@/components/betriebskosten-edit-modal").then(mod => ({ default: mod.BetriebskostenEditModal })), { ssr: false })
const WasserzaehlerModal = dynamic(() => import("@/components/wasserzaehler-modal").then(mod => ({ default: mod.WasserzaehlerModal })), { ssr: false })
const KautionModal = dynamic(() => import("@/components/kaution-modal").then(mod => ({ default: mod.KautionModal })), { ssr: false })
const ConfirmationDialog = dynamic(() => import("@/components/ui/confirmation-dialog").then(mod => ({ default: mod.ConfirmationDialog })), { ssr: false })
const HausOverviewModal = dynamic(() => import("@/components/haus-overview-modal").then(mod => ({ default: mod.HausOverviewModal })), { ssr: false })
const WohnungOverviewModal = dynamic(() => import("@/components/wohnung-overview-modal").then(mod => ({ default: mod.WohnungOverviewModal })), { ssr: false })
const ApartmentTenantDetailsModal = dynamic(() => import("@/components/apartment-tenant-details-modal").then(mod => ({ default: mod.ApartmentTenantDetailsModal })), { ssr: false })
const FileUploadModal = dynamic(() => import("@/components/file-upload-modal").then(mod => ({ default: mod.FileUploadModal })), { ssr: false })
const FilePreviewModal = dynamic(() => import("@/components/file-preview-modal").then(mod => ({ default: mod.FilePreviewModal })), { ssr: false })
const FileRenameModal = dynamic(() => import("@/components/file-rename-modal").then(mod => ({ default: mod.FileRenameModal })), { ssr: false })
const CreateFolderModal = dynamic(() => import("@/components/create-folder-modal").then(mod => ({ default: mod.CreateFolderModal })), { ssr: false })
const CreateFileModal = dynamic(() => import("@/components/create-file-modal").then(mod => ({ default: mod.CreateFileModal })), { ssr: false })
const FolderDeleteConfirmationModal = dynamic(() => import("@/components/folder-delete-confirmation-modal").then(mod => ({ default: mod.FolderDeleteConfirmationModal })), { ssr: false })
const FileMoveModal = dynamic(() => import("@/components/file-move-modal").then(mod => ({ default: mod.FileMoveModal })), { ssr: false })
const ShareDocumentModal = dynamic(() => import("@/components/share-document-modal").then(mod => ({ default: mod.ShareDocumentModal })), { ssr: false })
const MarkdownEditorModal = dynamic(() => import("@/components/markdown-editor-modal").then(mod => ({ default: mod.MarkdownEditorModal })), { ssr: false })
const TemplatesModal = dynamic(() => import("@/components/templates-modal").then(mod => ({ default: mod.TemplatesModal })), { ssr: false })
const TenantMailTemplatesModal = dynamic(() => import("@/components/tenant-mail-templates-modal").then(mod => ({ default: mod.TenantMailTemplatesModal })), { ssr: false })
const AIAssistantModal = dynamic(() => import("@/components/ai-assistant-modal").then(mod => ({ default: mod.AIAssistantModal })), { ssr: false })

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
      {/* WasserzaehlerModal - Handles its own state via modal store */}
      <WasserzaehlerModal />
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
      {/* FilePreviewModal - Global file preview modal */}
      <FilePreviewModal />
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
    </AuthProvider>
  )
}
