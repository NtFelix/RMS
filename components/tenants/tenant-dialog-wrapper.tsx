"use client"

import { useState, useEffect } from "react"
import { TenantEditModal } from "@/components/tenants/tenant-edit-modal"

import { Tenant, NebenkostenEntry } from "@/types/Tenant"; // Import Tenant and NebenkostenEntry

interface Mieter extends Tenant {} // Extend the Tenant interface

interface TenantDialogWrapperProps {
  wohnungen: { id: string; name: string }[]
  mieter: Mieter[]
  serverAction: (formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>
  onEditExternal?: (id: string) => void
  onAddExternal?: () => void
  open: boolean
  editingId: string | null // This might become internal or managed by parent if wrapper still needed
  setOpen: (open: boolean) => void // This will be removed
  setEditingId: (id: string | null) => void // This might become internal or managed by parent
}

// Import useModalStore
import { useModalStore } from "@/hooks/use-modal-store";

export function TenantDialogWrapper({
  wohnungen,
  mieter,
  serverAction, // serverAction is passed to TenantEditModal via layout, not needed here if this wrapper doesn't render it.
                // However, TenantEditModal is already globally rendered.
  onEditExternal,
  onAddExternal,
  open, // Prop 'open' will be removed
  editingId, // Prop 'editingId' might be passed by parent to decide what data to load
  setOpen, // Prop 'setOpen' will be removed
  setEditingId // Prop 'setEditingId' might be used by parent
}: TenantDialogWrapperProps) {

  const { openTenantModal } = useModalStore();

  useEffect(() => {
    const handleOpenAddMieterModalEvent = () => { // Renamed to avoid conflict if `handleAdd` is kept
      // This event listener now directly opens the modal via store for a new tenant
      openTenantModal(undefined, wohnungen); // Pass undefined for initialData, and current wohnungen
      if (onAddExternal) onAddExternal(); // Call external callback if provided
    };

    window.addEventListener("open-add-mieter-modal", handleOpenAddMieterModalEvent);

    return () => {
      window.removeEventListener("open-add-mieter-modal", handleOpenAddMieterModalEvent);
    };
  }, [openTenantModal, wohnungen, onAddExternal]);


  // This function might be called by parent components that use this wrapper
  function handleEdit(id: string) {
    const tenantToEdit = mieter.find(m => m.id === id);
    if (tenantToEdit) {
      const formattedInitialData = {
        id: tenantToEdit.id,
        wohnung_id: tenantToEdit.wohnung_id || "",
        name: tenantToEdit.name,
        einzug: tenantToEdit.einzug || "",
        auszug: tenantToEdit.auszug || "",
        email: tenantToEdit.email || "",
        telefonnummer: tenantToEdit.telefonnummer || "",
        notiz: tenantToEdit.notiz || "",
        nebenkosten: tenantToEdit.nebenkosten || [],
      };
      openTenantModal(formattedInitialData, wohnungen);
    }
    if (onEditExternal) onEditExternal(id);
  }

  // This function might be called by parent components
  function handleAdd() {
    openTenantModal(undefined, wohnungen); // Open for new tenant
    if (onAddExternal) onAddExternal();
  }

  // The TenantEditModal is globally rendered via layout.tsx.
  // This wrapper's responsibility is now primarily to provide methods (handleEdit, handleAdd)
  // that can be called by its parent to trigger the modal via the store.
  // It no longer renders TenantEditModal directly.
  // If this wrapper was only for rendering the modal, it might be entirely removable,
  // and its parent would call useModalStore().openTenantModal directly.
  // For now, we'll assume it still serves a purpose for its parent, exposing handleEdit/handleAdd.

  // This component might not need to return any JSX if its only purpose was to encapsulate
  // the modal triggering logic, which is now shifted to store calls.
  // However, its parent component might still expect it to be part of the tree.
  // Returning null if it's purely logical now.
  return null;
  // If it was also rendering UI elements that trigger these actions, that UI would remain.
  // Based on the provided snippet, it only rendered the modal.
}
