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
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        // Toggle the command menu by using zustand's state directly, avoiding dependency on `open`
        useCommandMenu.setState((state) => ({ open: !state.open }))
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  return null
}

export default function DashboardOverlayLoader() {
  const commandMenuOpen = useCommandMenu((state) => state.open)
  const shouldLoadForModal = useModalStore((state) => {
    const isCoreModalOpen =
      state.isTenantModalOpen ||
      state.isHouseModalOpen ||
      state.isFinanceModalOpen ||
      state.isWohnungModalOpen ||
      state.isAufgabeModalOpen ||
      state.isBetriebskostenModalOpen ||
      state.isWasserzaehlerModalOpen ||
      state.isKautionModalOpen ||
      state.isHausOverviewModalOpen ||
      state.isWohnungOverviewModalOpen

    const isUtilityModalOpen =
      state.isApartmentTenantDetailsModalOpen ||
      state.isConfirmationModalOpen ||
      state.isTenantPaymentEditModalOpen ||
      state.isTenantPaymentOverviewModalOpen ||
      state.isTenantMailTemplatesModalOpen ||
      state.isTemplatesModalOpen

    const isFileOrAiModalOpen =
      state.isUploadModalOpen ||
      state.isFileRenameModalOpen ||
      state.isCreateFolderModalOpen ||
      state.isCreateFileModalOpen ||
      state.isFolderDeleteConfirmationModalOpen ||
      state.isFileMoveModalOpen ||
      state.isShareDocumentModalOpen ||
      state.isMarkdownEditorModalOpen ||
      state.isAIAssistantModalOpen

    const isMeterModalOpen =
      state.isAblesungenModalOpen ||
      state.isZaehlerModalOpen

    return (
      isCoreModalOpen ||
      isUtilityModalOpen ||
      isFileOrAiModalOpen ||
      isMeterModalOpen
    )
  })
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
