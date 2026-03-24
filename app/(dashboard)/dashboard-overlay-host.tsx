"use client"

import dynamic from "next/dynamic"
import { useCallback } from "react"
import { CommandMenu } from "@/components/search/command-menu"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { useModalStore } from "@/hooks/use-modal-store"
import { handleSubmit as tenantServerAction, updateKautionAction } from "@/app/mieter-actions"
import { handleSubmit as houseServerAction } from "@/app/(dashboard)/haeuser/actions"
import { financeServerAction } from "@/app/finanzen-actions"
import { wohnungServerAction } from "@/app/wohnungen-actions"
import { aufgabeServerAction } from "@/app/todos-actions"

const TenantEditModal = dynamic(
  () => import("@/components/tenants/tenant-edit-modal").then((mod) => mod.TenantEditModal),
  { ssr: false },
)
const HouseEditModal = dynamic(
  () => import("@/components/houses/house-edit-modal").then((mod) => mod.HouseEditModal),
  { ssr: false },
)
const FinanceEditModal = dynamic(
  () => import("@/components/finance/finance-edit-modal").then((mod) => mod.FinanceEditModal),
  { ssr: false },
)
const WohnungEditModal = dynamic(
  () => import("@/components/apartments/wohnung-edit-modal").then((mod) => mod.WohnungEditModal),
  { ssr: false },
)
const AufgabeEditModal = dynamic(
  () => import("@/components/tasks/aufgabe-edit-modal").then((mod) => mod.AufgabeEditModal),
  { ssr: false },
)
const BetriebskostenEditModal = dynamic(
  () => import("@/components/finance/betriebskosten-edit-modal").then((mod) => mod.BetriebskostenEditModal),
  { ssr: false },
)
const AblesungenModal = dynamic(
  () => import("@/components/meters/ablesungen-modal").then((mod) => mod.AblesungenModal),
  { ssr: false },
)
const ZaehlerModal = dynamic(
  () => import("@/components/meters/zaehler-modal").then((mod) => mod.ZaehlerModal),
  { ssr: false },
)
const WasserzaehlerModal = dynamic(
  () => import("@/components/water-meters/wasserzaehler-modal").then((mod) => mod.WasserzaehlerModal),
  { ssr: false },
)
const KautionModal = dynamic(
  () => import("@/components/tenants/kaution-modal").then((mod) => mod.KautionModal),
  { ssr: false },
)
const HausOverviewModal = dynamic(
  () => import("@/components/houses/haus-overview-modal").then((mod) => mod.HausOverviewModal),
  { ssr: false },
)
const WohnungOverviewModal = dynamic(
  () => import("@/components/apartments/wohnung-overview-modal").then((mod) => mod.WohnungOverviewModal),
  { ssr: false },
)
const ApartmentTenantDetailsModal = dynamic(
  () => import("@/components/apartments/apartment-tenant-details-modal").then((mod) => mod.ApartmentTenantDetailsModal),
  { ssr: false },
)
const FileUploadModal = dynamic(
  () => import("@/components/cloud-storage/file-upload-modal").then((mod) => mod.FileUploadModal),
  { ssr: false },
)
const FileRenameModal = dynamic(
  () => import("@/components/cloud-storage/file-rename-modal").then((mod) => mod.FileRenameModal),
  { ssr: false },
)
const CreateFolderModal = dynamic(
  () => import("@/components/cloud-storage/create-folder-modal").then((mod) => mod.CreateFolderModal),
  { ssr: false },
)
const CreateFileModal = dynamic(
  () => import("@/components/cloud-storage/create-file-modal").then((mod) => mod.CreateFileModal),
  { ssr: false },
)
const FolderDeleteConfirmationModal = dynamic(
  () => import("@/components/cloud-storage/folder-delete-confirmation-modal").then((mod) => mod.FolderDeleteConfirmationModal),
  { ssr: false },
)
const FileMoveModal = dynamic(
  () => import("@/components/cloud-storage/file-move-modal").then((mod) => mod.FileMoveModal),
  { ssr: false },
)
const ShareDocumentModal = dynamic(
  () => import("@/components/cloud-storage/share-document-modal").then((mod) => mod.ShareDocumentModal),
  { ssr: false },
)
const MarkdownEditorModal = dynamic(
  () => import("@/components/cloud-storage/markdown-editor-modal").then((mod) => mod.MarkdownEditorModal),
  { ssr: false },
)
const TemplatesModal = dynamic(
  () => import("@/components/templates/templates-modal").then((mod) => mod.TemplatesModal),
  { ssr: false },
)
const TenantMailTemplatesModal = dynamic(
  () => import("@/components/tenants/tenant-mail-templates-modal").then((mod) => mod.TenantMailTemplatesModal),
  { ssr: false },
)
const AIAssistantModal = dynamic(
  () => import("@/components/ai/ai-assistant-modal").then((mod) => mod.AIAssistantModal),
  { ssr: false },
)
const TenantPaymentEditModal = dynamic(
  () => import("@/components/tenants/tenant-payment-edit-modal"),
  { ssr: false },
)
const TenantPaymentOverviewModal = dynamic(
  () => import("@/components/tenants/tenant-payment-overview-modal"),
  { ssr: false },
)

export default function DashboardOverlayHost() {
  const {
    wohnungApartmentLimit,
    wohnungIsActiveSubscription,
    wohnungApartmentCount,
    isConfirmationModalOpen,
    confirmationModalConfig,
    closeConfirmationModal,
    isFileRenameModalOpen,
    fileRenameData,
    closeFileRenameModal,
    isCreateFolderModalOpen,
    createFolderModalData,
    closeCreateFolderModal,
    isCreateFileModalOpen,
    createFileModalData,
    closeCreateFileModal,
    isFolderDeleteConfirmationModalOpen,
    folderDeleteConfirmationData,
    closeFolderDeleteConfirmationModal,
    isFileMoveModalOpen,
    fileMoveData,
    closeFileMoveModal,
    isShareDocumentModalOpen,
    shareDocumentData,
    closeShareDocumentModal,
    isMarkdownEditorModalOpen,
    markdownEditorData,
    closeMarkdownEditorModal,
    isTemplatesModalOpen,
    templatesModalInitialCategory,
    closeTemplatesModal,
    isTenantMailTemplatesModalOpen,
    tenantMailTemplatesModalData,
    closeTenantMailTemplatesModal,
  } = useModalStore()

  const handleConfirm = useCallback(() => {
    if (confirmationModalConfig?.onConfirm) {
      confirmationModalConfig.onConfirm()
    }
  }, [confirmationModalConfig?.onConfirm])

  return (
    <>
      <CommandMenu />
      {/* Modals that manage their own open/close state internally */}
      <TenantEditModal serverAction={tenantServerAction} />
      <HouseEditModal serverAction={houseServerAction} />
      <FinanceEditModal serverAction={financeServerAction} />
      <WohnungEditModal
        serverAction={wohnungServerAction}
        currentApartmentLimitFromProps={wohnungApartmentLimit}
        isActiveSubscriptionFromProps={wohnungIsActiveSubscription}
        currentApartmentCountFromProps={wohnungApartmentCount}
      />
      <AufgabeEditModal serverAction={aufgabeServerAction} />
      <BetriebskostenEditModal />
      <ZaehlerModal />
      <WasserzaehlerModal />
      <AblesungenModal />
      <KautionModal serverAction={updateKautionAction} />
      <HausOverviewModal />
      <WohnungOverviewModal />
      <ApartmentTenantDetailsModal />
      <FileUploadModal />

      {/* Modals that require external data passed as props at mount time */}
      {isFileRenameModalOpen && fileRenameData && (
        <FileRenameModal
          isOpen={isFileRenameModalOpen}
          onClose={closeFileRenameModal}
          fileName={fileRenameData.fileName}
          onRename={fileRenameData.onRename}
        />
      )}
      {isCreateFolderModalOpen && createFolderModalData && (
        <CreateFolderModal
          isOpen={isCreateFolderModalOpen}
          onClose={closeCreateFolderModal}
          currentPath={createFolderModalData.currentPath}
          onFolderCreated={createFolderModalData.onFolderCreated}
        />
      )}
      {isCreateFileModalOpen && createFileModalData && (
        <CreateFileModal
          isOpen={isCreateFileModalOpen}
          onClose={closeCreateFileModal}
          currentPath={createFileModalData.currentPath}
          onFileCreated={createFileModalData.onFileCreated}
        />
      )}
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
      {isShareDocumentModalOpen && shareDocumentData && (
        <ShareDocumentModal
          isOpen={isShareDocumentModalOpen}
          onClose={closeShareDocumentModal}
          fileName={shareDocumentData.fileName}
          filePath={shareDocumentData.filePath}
        />
      )}
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
      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={closeTemplatesModal}
        initialCategory={templatesModalInitialCategory}
      />
      <TenantMailTemplatesModal
        isOpen={isTenantMailTemplatesModalOpen}
        onClose={closeTenantMailTemplatesModal}
        tenantName={tenantMailTemplatesModalData?.tenantName}
        tenantEmail={tenantMailTemplatesModalData?.tenantEmail}
      />
      <AIAssistantModal />
      <TenantPaymentEditModal />
      <TenantPaymentOverviewModal />
      {isConfirmationModalOpen && confirmationModalConfig && (
        <ConfirmationDialog
          isOpen={isConfirmationModalOpen}
          onClose={closeConfirmationModal}
          onConfirm={handleConfirm}
          title={confirmationModalConfig.title}
          description={confirmationModalConfig.description}
          confirmText={confirmationModalConfig.confirmText}
          cancelText={confirmationModalConfig.cancelText}
          variant={confirmationModalConfig.variant}
        />
      )}
    </>
  )
}
