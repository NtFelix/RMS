"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { useModalStore } from "@/hooks/use-modal-store"

const DashboardOverlayHost = dynamic(() => import("./dashboard-overlay-host"), {
  ssr: false,
  loading: () => null,
})

function DashboardCommandHotkeys() {
  const open = useCommandMenu((state) => state.open)
  const setOpen = useCommandMenu((state) => state.setOpen)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(!open)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, setOpen])

  return null
}

export default function DashboardOverlayLoader() {
  const commandMenuOpen = useCommandMenu((state) => state.open)
  const shouldLoadForModal = useModalStore((state) =>
    state.isTenantModalOpen ||
    state.isHouseModalOpen ||
    state.isFinanceModalOpen ||
    state.isWohnungModalOpen ||
    state.isAufgabeModalOpen ||
    state.isBetriebskostenModalOpen ||
    state.isWasserzaehlerModalOpen ||
    state.isKautionModalOpen ||
    state.isHausOverviewModalOpen ||
    state.isWohnungOverviewModalOpen ||
    state.isApartmentTenantDetailsModalOpen ||
    state.isUploadModalOpen ||
    state.isConfirmationModalOpen ||
    state.isFileRenameModalOpen ||
    state.isCreateFolderModalOpen ||
    state.isCreateFileModalOpen ||
    state.isFolderDeleteConfirmationModalOpen ||
    state.isFileMoveModalOpen ||
    state.isShareDocumentModalOpen ||
    state.isMarkdownEditorModalOpen ||
    state.isTemplatesModalOpen ||
    state.isTenantMailTemplatesModalOpen ||
    state.isAIAssistantModalOpen ||
    state.isTenantPaymentEditModalOpen ||
    state.isTenantPaymentOverviewModalOpen ||
    state.isApplicantScoreModalOpen ||
    state.isMailPreviewModalOpen ||
    state.isAblesungenModalOpen ||
    state.isZaehlerModalOpen
  )
  const [shouldRenderHost, setShouldRenderHost] = useState(
    commandMenuOpen || shouldLoadForModal,
  )

  useEffect(() => {
    // Intentionally one-way: once the overlay host is loaded, keep it mounted
    // so subsequent modal opens do not pay the re-initialization cost again.
    if (commandMenuOpen || shouldLoadForModal) {
      setShouldRenderHost(true)
    }
  }, [commandMenuOpen, shouldLoadForModal])

  return (
    <>
      <DashboardCommandHotkeys />
      {shouldRenderHost ? <DashboardOverlayHost /> : null}
    </>
  )
}
