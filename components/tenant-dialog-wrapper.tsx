"use client"

import { useState, useEffect } from "react"
import { TenantEditModal } from "@/components/tenant-edit-modal"

interface Mieter {
  id: string
  wohnung_id?: string
  name: string
  einzug?: string
  auszug?: string
  email?: string
  telefonnummer?: string
  notiz?: string
  nebenkosten?: number[]
  nebenkosten_datum?: string[]
}

interface TenantDialogWrapperProps {
  wohnungen: { id: string; name: string }[]
  mieter: Mieter[]
  serverAction: (formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>
  onEditExternal?: (id: string) => void
  onAddExternal?: () => void
  open: boolean
  editingId: string | null
  setOpen: (open: boolean) => void
  setEditingId: (id: string | null) => void
}

export function TenantDialogWrapper({ wohnungen, mieter, serverAction, onEditExternal, onAddExternal, open, editingId, setOpen, setEditingId }: TenantDialogWrapperProps) {
  useEffect(() => {
    const handleOpenAddMieterModal = () => {
      setEditingId(null)
      setOpen(true)
    }

    window.addEventListener("open-add-mieter-modal", handleOpenAddMieterModal)

    return () => {
      window.removeEventListener("open-add-mieter-modal", handleOpenAddMieterModal)
    }
  }, [setEditingId, setOpen])

  // Findet initiale Daten für Edit, falls editId gesetzt ist
  const initialData = editingId
    ? (() => {
        const m = mieter.find(m => m.id === editingId)
        return m
          ? {
              id: m.id,
              wohnung_id: m.wohnung_id || "",
              name: m.name,
              einzug: m.einzug || "",
              auszug: m.auszug || "",
              email: m.email || "",
              telefonnummer: m.telefonnummer || "",
              notiz: m.notiz || "",
              nebenkosten: m.nebenkosten ? m.nebenkosten.join(",") : "",
              nebenkosten_datum: m.nebenkosten_datum ? m.nebenkosten_datum.join(",") : ""
            }
          : undefined
      })()
    : undefined

  // Callback für Tabelle, um Edit zu starten
  function handleEdit(id: string) {
    setEditingId(id)
    setOpen(true)
    if (onEditExternal) onEditExternal(id)
  }

  // Callback für "Hinzufügen"
  function handleAdd() {
    setEditingId(null)
    setOpen(true)
    if (onAddExternal) onAddExternal()
  }

  return (
    <>
      {/* TenantEditModal für Hinzufügen/Bearbeiten */}
      <TenantEditModal
        open={open}
        onOpenChange={setOpen}
        wohnungen={wohnungen}
        initialData={initialData}
        serverAction={serverAction}
      />
      {/* Die Tabelle und der Add-Button müssen handleEdit und handleAdd als Props bekommen */}
      {/* Diese Logik wird in der Hauptseite verknüpft. */}
    </>
  )
}
